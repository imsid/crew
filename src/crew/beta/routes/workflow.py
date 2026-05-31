from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from mash.workflows import DuplicateWorkflowRunError, WorkflowNotFoundError

from ...shared.runtime_context import get_runtime_context
from ...shared.workspace_context import bound_workspace, register_workflow_task_workspaces
from ...shared.workspaces import resolve_workspace
from ...workflow.service import (
    WorkflowError,
    WorkflowService,
)
from ..app import (
    LOGGER,
    AppError,
    WorkflowRunRequest,
    _beta_state,
    _normalize_optional_text,
    _require_user,
)
from .sessions import (
    _build_sse_payload,
    _normalize_stream_payload,
)

router = APIRouter()


@router.get("/workflow")
async def list_workflows(
    workspace_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    workflow_service = _beta_state(request).host.get_workflow_service()
    workflows = await workflow_service.list_workflows()
    publishing_service = _workflow_service(request)
    authored = {
        bundle["workflow"]["workflow_id"]: bundle
        for bundle in await publishing_service.list_published_workflows()
    }
    enriched: list[dict[str, Any]] = []
    for workflow in workflows:
        item = dict(workflow) if isinstance(workflow, dict) else workflow
        if isinstance(item, dict):
            bundle = authored.get(str(item.get("workflow_id") or ""))
            if bundle is not None:
                item.update(_serialize_authored_workflow_bundle(bundle))
        enriched.append(item)
    return {"data": {"workflows": enriched}}


@router.get("/workflow/{workflow_id}")
async def get_workflow(
    workspace_id: str,
    workflow_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    normalized_workflow_id = workflow_id.strip()
    try:
        bundle = await _workflow_service(request).get_workflow(
            normalized_workflow_id
        )
    except WorkflowError:
        bundle = None
    if bundle is not None:
        return {"data": _serialize_authored_workflow_bundle(bundle)}

    workflow_service = _beta_state(request).host.get_workflow_service()
    for workflow in await workflow_service.list_workflows():
        if not isinstance(workflow, dict):
            continue
        if str(workflow.get("workflow_id") or "") == normalized_workflow_id:
            return {"data": workflow}
    raise AppError(
        status_code=404,
        code="WORKFLOW_NOT_FOUND",
        message=f"workflow '{normalized_workflow_id}' was not found",
    )


@router.post("/workflow/validate")
async def validate_authored_workflow(
    workspace_id: str,
    payload: dict[str, Any],
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    try:
        normalized = await _workflow_service(request).validate_definition(
            payload
        )
    except WorkflowError as exc:
        raise AppError(
            status_code=422,
            code="WORKFLOW_VALIDATION_FAILED",
            message=str(exc),
        ) from exc
    return {"data": {"valid": True, "definition": normalized}}


@router.post("/workflow")
async def publish_authored_workflow(
    workspace_id: str,
    payload: dict[str, Any],
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    try:
        published = await _workflow_service(request).publish_workflow(
            payload
        )
    except WorkflowError as exc:
        raise AppError(
            status_code=422,
            code="WORKFLOW_PUBLISH_FAILED",
            message=str(exc),
        ) from exc
    return {"data": published}


@router.post("/workflow/{workflow_id}/disable")
async def disable_authored_workflow(
    workspace_id: str,
    workflow_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    try:
        workflow = await _workflow_service(request).disable_workflow(
            workflow_id
        )
    except WorkflowError as exc:
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=str(exc),
        ) from exc
    return {"data": workflow}


@router.post("/workflow/{workflow_id}/run")
async def run_workflow(
    workspace_id: str,
    workflow_id: str,
    payload: WorkflowRunRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    workflow_service = _beta_state(request).host.get_workflow_service()
    await _validate_authored_workflow_input(request, workflow_id.strip(), payload.input)
    try:
        with bound_workspace(workspace_id):
            run = await workflow_service.run_workflow(
                workflow_id.strip(),
                dedup_key=_normalize_optional_text(payload.dedup_key),
                workflow_input=payload.input,
            )
        register_workflow_task_workspaces(
            workflow_id=workflow_id.strip(),
            run_id=str(run.run_id),
            tasks=await _workflow_tasks(request, workflow_id.strip()),
            workspace_id=workspace_id,
        )
    except WorkflowNotFoundError as exc:
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=str(exc),
        ) from exc
    except DuplicateWorkflowRunError as exc:
        raise AppError(
            status_code=409,
            code="DUPLICATE_WORKFLOW_RUN",
            message=str(exc),
            details={"existing_run_id": exc.existing_run.run_id},
        ) from exc
    except Exception as exc:
        raise AppError(
            status_code=500,
            code="WORKFLOW_RUN_FAILED",
            message=str(exc),
        ) from exc
    return {"data": _serialize_workflow_run_started(run)}


@router.get("/workflow/{workflow_id}/runs/{run_id}")
async def get_workflow_run(
    workspace_id: str,
    workflow_id: str,
    run_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    workflow_service = _beta_state(request).host.get_workflow_service()
    try:
        run = await workflow_service.get_run(workflow_id.strip(), run_id.strip())
    except WorkflowNotFoundError as exc:
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=str(exc),
        ) from exc
    return {"data": _serialize_workflow_run_status(run)}


@router.get("/workflow/{workflow_id}/runs")
async def list_workflow_runs(
    workspace_id: str,
    workflow_id: str,
    request: Request,
    limit: int | None = Query(default=5, ge=1, le=50),
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    workflow_service = _beta_state(request).host.get_workflow_service()
    try:
        runs = await workflow_service.list_runs(
            workflow_id.strip(),
            limit=limit or 5,
            sort_desc=True,
        )
    except WorkflowNotFoundError as exc:
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=str(exc),
        ) from exc
    return {
        "data": {
            "workflow_id": workflow_id.strip(),
            "runs": [_serialize_workflow_run_summary(run) for run in runs],
        }
    }


@router.get("/workflow/{workflow_id}/runs/{run_id}/events")
async def stream_workflow_run_events(
    workspace_id: str,
    workflow_id: str,
    run_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> StreamingResponse:
    _require_workspace(workspace_id)
    del current_user
    normalized_workflow_id = workflow_id.strip()
    normalized_run_id = run_id.strip()

    async def _generate():
        sequence = 0
        workflow_service = _beta_state(request).host.get_workflow_service()

        try:
            stream = None
            for attempt in range(40):
                try:
                    stream = await workflow_service.stream_run_events(
                        normalized_workflow_id,
                        normalized_run_id,
                    )
                    break
                except WorkflowNotFoundError:
                    if attempt == 39:
                        raise
                    yield ": waiting for workflow events\n\n"
                    await asyncio.sleep(0.25)

            if stream is None:
                raise WorkflowNotFoundError(
                    f"workflow run '{normalized_run_id}' was not found"
                )

            async for event in stream:
                event_name = str(getattr(event, "event", "") or "message")
                payload = getattr(event, "data", {}) or {}
                sequence += 1
                yield _build_sse_payload(
                    event_name,
                    _normalize_stream_payload(
                        event_name=event_name,
                        payload=payload,
                        sequence=sequence,
                    ),
                )
                if event_name in {"workflow.completed", "workflow.error"}:
                    return
        except Exception as exc:
            if not isinstance(exc, WorkflowNotFoundError):
                LOGGER.exception(
                    "beta workflow event stream failed",
                    extra={
                        "workflow_id": normalized_workflow_id,
                        "run_id": normalized_run_id,
                    },
                )
            yield _build_sse_payload(
                "workflow.error",
                _normalize_stream_payload(
                    event_name="workflow.error",
                    payload={
                        "workflow_id": normalized_workflow_id,
                        "run_id": normalized_run_id,
                        "status": "error",
                        "error": str(exc),
                    },
                    sequence=sequence + 1,
                ),
            )

    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


def _serialize_workflow_run_started(run: Any) -> dict[str, Any]:
    return {
        "run_id": run.run_id,
        "workflow_id": run.workflow_id,
        "status": run.status,
    }


def _serialize_workflow_run_status(run: Any) -> dict[str, Any]:
    return {
        "run_id": run.run_id,
        "workflow_id": run.workflow_id,
        "dedup_key": run.dedup_key,
        "status": run.status,
        "created_at": run.created_at,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "error": run.error,
        "output": run.output,
    }


def _serialize_workflow_run_summary(run: Any) -> dict[str, Any]:
    return {
        "run_id": run.run_id,
        "workflow_id": run.workflow_id,
        "dedup_key": run.dedup_key,
        "status": run.status,
        "created_at": run.created_at,
        "started_at": run.started_at,
        "finished_at": run.finished_at,
        "error": run.error,
        "summary": getattr(run, "summary", None),
    }


def _serialize_authored_workflow_bundle(bundle: dict[str, Any]) -> dict[str, Any]:
    workflow = dict(bundle["workflow"])
    skill = dict(bundle["skill"] or {})
    tasks = [dict(task) for task in bundle["tasks"]]
    workflow["source"] = "crew-authored"
    workflow["skill"] = {
        "skill_id": skill.get("skill_id"),
        "name": skill.get("name"),
        "description": skill.get("description"),
        "status": skill.get("status"),
    }
    workflow["tasks"] = [
        {
            "task_id": task["task_id"],
            "agent_id": task["agent_id"],
            "position": task["position"],
            "title": task["title"],
            "structured_output": task["structured_output"],
        }
        for task in tasks
    ]
    return workflow


async def _validate_authored_workflow_input(
    request: Request, workflow_id: str, workflow_input: dict[str, Any]
) -> None:
    try:
        bundle = await _workflow_service(request).get_workflow(workflow_id)
    except WorkflowError:
        return
    workflow = bundle["workflow"]
    if workflow.get("status") != "published":
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=f"workflow '{workflow_id}' is not published",
        )
    schema = workflow.get("input_schema")
    if not isinstance(schema, dict) or schema.get("type") != "object":
        return
    required = schema.get("required")
    if isinstance(required, list):
        missing = [str(key) for key in required if str(key) not in workflow_input]
        if missing:
            raise AppError(
                status_code=422,
                code="INVALID_WORKFLOW_INPUT",
                message=f"workflow_input missing required fields: {', '.join(missing)}",
            )


def _workflow_service(request: Request) -> WorkflowService:
    del request
    return get_runtime_context().workflow


def _require_workspace(workspace_id: str) -> None:
    try:
        resolve_workspace(workspace_id)
    except ValueError as exc:
        raise AppError(
            status_code=404,
            code="WORKSPACE_NOT_FOUND",
            message=str(exc),
        ) from exc


async def _workflow_tasks(request: Request, workflow_id: str) -> list[dict[str, object]]:
    for workflow in await _beta_state(request).host.get_workflow_service().list_workflows():
        if not isinstance(workflow, dict):
            continue
        if str(workflow.get("workflow_id") or "") != workflow_id:
            continue
        tasks = workflow.get("tasks")
        if isinstance(tasks, list):
            return [dict(task) for task in tasks if isinstance(task, dict)]
    return []
