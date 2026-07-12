from __future__ import annotations

import json
from typing import Any
from urllib.parse import quote

import yaml
from fastapi import APIRouter, Depends, Request

from ...artifacts.service.context import build_tool_context as build_artifact_context
from ...artifacts.service.repo import list_artifacts, read_artifact, search_artifacts
from ...experimentation.service.context import (
    build_tool_context as build_experiment_context,
)
from ...experimentation.service.tool_entrypoints import (
    compile_experiment_analysis_sql,
    list_experiment_configs_tool,
    read_experiment_config_tool,
)
from ...metrics_layer.service.context import build_tool_context as build_metrics_context
from ...metrics_layer.service.tool_entrypoints import (
    compile_metric_configs_to_sql,
    list_metrics_layer_configs,
    read_metrics_layer_config,
)
from ...shared.runtime_paths import workspace_dir
from ...shared.workspaces import resolve_workspace
from ...skill.service import list_skills, read_skill, search_skills
from ..app import (
    LOGGER,
    AppError,
    BetaAppState,
    CommandRequest,
    _beta_state,
    _normalize_optional_text,
    _require_user,
)
from ..visualizations import (
    BigQueryExecutionError,
    build_experiment_analysis,
    build_metric_visualization,
)

router = APIRouter()


@router.post("/command")
async def run_command(
    workspace_id: str,
    payload: CommandRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    del current_user
    _require_workspace(workspace_id)
    result = await _execute_command(payload, _beta_state(request), workspace_id)
    LOGGER.info(
        "beta command executed",
        extra={"surface": payload.surface, "operation": payload.operation},
    )
    return result


async def _execute_command(
    payload: CommandRequest, state: BetaAppState, workspace_id: str
) -> dict[str, Any]:
    args = dict(payload.args or {})
    if "dataset_id" in args:
        args.pop("dataset_id", None)

    if payload.surface == "workflows":
        if payload.operation == "list":
            result = await state.host_client.data(
                "GET", "/api/v1/workflow", params={"host": "datasquad"}
            )
            data = result if isinstance(result, dict) else {"workflows": []}
        elif payload.operation == "run":
            workflow_id = _require_command_text(args.get("workflow_id"), "workflow_id")
            workflow_input = args.get("input", {})
            if not isinstance(workflow_input, dict):
                raise AppError(
                    status_code=422,
                    code="INVALID_COMMAND",
                    message="workflow input must be a JSON object",
                )
            result = await state.host_client.data(
                "POST",
                f"/api/v1/workflow/{quote(workflow_id, safe='')}/run",
                json={
                    "dedup_key": _normalize_optional_text(
                        str(args.get("dedup_key") or "")
                    ),
                    "input": workflow_input,
                },
            )
            data = dict(result or {})
        elif payload.operation == "status":
            workflow_id = _require_command_text(args.get("workflow_id"), "workflow_id")
            run_id = _require_command_text(args.get("run_id"), "run_id")
            result = await state.host_client.data(
                "GET",
                f"/api/v1/workflow/{quote(workflow_id, safe='')}"
                f"/runs/{quote(run_id, safe='')}",
            )
            data = dict(result or {})
        else:
            raise _invalid_operation(payload.surface, payload.operation)
        return _command_success(payload.surface, payload.operation, data)

    workspace_root = workspace_dir(workspace_id, require_exists=True)

    if payload.surface == "metrics":
        context = build_metrics_context(workspace_root)
        if payload.operation == "list":
            data = _unwrap_tool_result(list_metrics_layer_configs({}, context))
        elif payload.operation == "show":
            data = _unwrap_tool_result(
                read_metrics_layer_config(
                    {"kind": args.get("kind"), "name": args.get("name")},
                    context,
                )
            )
            if isinstance(data, dict):
                data["document"] = _parse_yaml_document(data.get("content"))
        elif payload.operation == "compile":
            compile_args = {
                "metric_names": args.get("metric_names"),
                "dimensions": args.get("dimensions"),
                "filters": args.get("filters"),
                "order_by": args.get("order_by"),
                "limit": args.get("limit"),
                "date_range": args.get("date_range"),
            }
            data = _unwrap_tool_result(
                compile_metric_configs_to_sql(compile_args, context)
            )
        elif payload.operation == "visualize":
            try:
                data = build_metric_visualization(args, context)
            except ValueError as exc:
                raise _map_command_error(
                    json.dumps(
                        {
                            "status": "validation_failed",
                            "dataset_id": args.get("dataset_id"),
                            "errors": [
                                {
                                    "metric_name": args.get("metric_name"),
                                    "error": str(exc),
                                }
                            ],
                        },
                        ensure_ascii=True,
                        indent=2,
                    )
                ) from exc
            except BigQueryExecutionError as exc:
                raise _map_command_error(
                    json.dumps(
                        {
                            "status": "query_failed",
                            "dataset_id": context.get("dataset_id"),
                            "errors": [
                                {
                                    "metric_name": args.get("metric_name"),
                                    "error": str(exc),
                                }
                            ],
                        },
                        ensure_ascii=True,
                        indent=2,
                    )
                ) from exc
        else:
            raise _invalid_operation(payload.surface, payload.operation)
        return _command_success(payload.surface, payload.operation, data)

    if payload.surface == "experiments":
        context = build_experiment_context(workspace_root)
        if payload.operation == "list":
            data = _unwrap_tool_result(list_experiment_configs_tool({}, context))
        elif payload.operation == "show":
            data = _unwrap_tool_result(
                read_experiment_config_tool({"name": args.get("name")}, context)
            )
            if isinstance(data, dict):
                data["document"] = _parse_yaml_document(data.get("content"))
        elif payload.operation == "plan":
            data = _unwrap_tool_result(
                compile_experiment_analysis_sql({"name": args.get("name")}, context)
            )
        elif payload.operation == "analyze":
            try:
                data = build_experiment_analysis(args, context)
            except ValueError as exc:
                raise _map_command_error(
                    json.dumps(
                        {
                            "status": "validation_failed",
                            "dataset_id": args.get("dataset_id"),
                            "errors": [
                                {"experiment_name": args.get("name"), "error": str(exc)}
                            ],
                        },
                        ensure_ascii=True,
                        indent=2,
                    )
                ) from exc
            except BigQueryExecutionError as exc:
                raise _map_command_error(
                    json.dumps(
                        {
                            "status": "query_failed",
                            "dataset_id": context.get("dataset_id"),
                            "errors": [
                                {"experiment_name": args.get("name"), "error": str(exc)}
                            ],
                        },
                        ensure_ascii=True,
                        indent=2,
                    )
                ) from exc
        else:
            raise _invalid_operation(payload.surface, payload.operation)
        return _command_success(payload.surface, payload.operation, data)

    if payload.surface == "artifacts":
        context = build_artifact_context(workspace_root)
        try:
            if payload.operation == "list":
                data = list_artifacts(
                    context,
                    kind_filter=args.get("kind"),
                    limit=args.get("limit"),
                )
            elif payload.operation == "show":
                data = read_artifact(context, artifact_id=args.get("artifact_id"))
            elif payload.operation == "search":
                data = search_artifacts(
                    context,
                    query=str(args.get("query") or ""),
                    limit=int(args.get("limit") or 10),
                )
            else:
                raise _invalid_operation(payload.surface, payload.operation)
        except ValueError as exc:
            raise _map_command_error(str(exc)) from exc
        return _command_success(payload.surface, payload.operation, data)

    if payload.surface == "skills":
        try:
            if payload.operation == "list":
                data = list_skills(limit=args.get("limit"))
            elif payload.operation == "show":
                data = read_skill(skill_id=args.get("skill_id"))
            elif payload.operation == "search":
                data = search_skills(
                    query=str(args.get("query") or ""),
                    limit=int(args.get("limit") or 10),
                )
            else:
                raise _invalid_operation(payload.surface, payload.operation)
        except ValueError as exc:
            raise _map_command_error(str(exc)) from exc
        return _command_success(payload.surface, payload.operation, data)

    raise _invalid_operation(payload.surface, payload.operation)


def _require_command_text(value: Any, field_name: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise AppError(
            status_code=422,
            code="INVALID_COMMAND",
            message=f"{field_name} is required",
        )
    return text


def _unwrap_tool_result(result: Any) -> Any:
    if not result.is_error:
        try:
            return json.loads(result.content)
        except json.JSONDecodeError:
            return {"content": result.content}

    raise _map_command_error(result.content)


def _parse_yaml_document(raw_content: Any) -> dict[str, Any] | None:
    if not isinstance(raw_content, str) or not raw_content.strip():
        return None
    try:
        parsed = yaml.safe_load(raw_content)
    except yaml.YAMLError:
        return None
    if isinstance(parsed, dict):
        return parsed
    return None


def _map_command_error(message: str) -> AppError:
    normalized = str(message or "").strip()
    details: dict[str, Any] | None = None
    try:
        parsed = json.loads(normalized)
    except json.JSONDecodeError:
        parsed = None

    if isinstance(parsed, dict):
        details = parsed
        status = str(parsed.get("status") or "").strip().lower()
        if status in {"compile_failed", "validation_failed"}:
            return AppError(
                status_code=422,
                code="COMMAND_VALIDATION_FAILED",
                message=normalized,
                details=details,
            )
        if status == "query_failed":
            return AppError(
                status_code=502,
                code="COMMAND_EXECUTION_FAILED",
                message=normalized,
                details=details,
            )
        if "not found" in normalized.lower():
            return AppError(
                status_code=404,
                code="COMMAND_NOT_FOUND",
                message=normalized,
                details=details,
            )
        return AppError(
            status_code=400,
            code="COMMAND_FAILED",
            message=normalized,
            details=details,
        )

    lowered = normalized.lower()
    if "not found" in lowered:
        return AppError(
            status_code=404,
            code="COMMAND_NOT_FOUND",
            message=normalized,
        )
    return AppError(
        status_code=400,
        code="COMMAND_FAILED",
        message=normalized,
    )


def _invalid_operation(surface: str, operation: str) -> AppError:
    return AppError(
        status_code=400,
        code="INVALID_OPERATION",
        message=f"unsupported command operation '{operation}' for surface '{surface}'",
    )


def _command_success(surface: str, operation: str, data: Any) -> dict[str, Any]:
    return {
        "surface": surface,
        "operation": operation,
        "ok": True,
        "data": data,
    }


def _require_workspace(workspace_id: str) -> None:
    try:
        resolve_workspace(workspace_id)
    except ValueError as exc:
        raise AppError(
            status_code=404,
            code="WORKSPACE_NOT_FOUND",
            message=str(exc),
        ) from exc
