from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from mash.workflows import (
    DuplicateWorkflowRunError,
    WorkflowInputValidationError,
    WorkflowNotFoundError,
)

from ...app import DEFAULT_HOST_ID
from ...shared.workspaces import resolve_workspace
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
    workflow_service = _workflow_service(request)
    workflows = await workflow_service.list_workflows()
    # Chat routes through the default host, so the runner lists the workflows
    # attached to it (pool defaults — the masher suite — plus any host extras).
    attached = set(_beta_state(request).host.get_host(DEFAULT_HOST_ID).workflows)
    workflows = [
        workflow
        for workflow in workflows
        if str(workflow.get("workflow_id") or "") in attached
    ]
    return {"data": {"workflows": workflows}}


@router.get("/workflow/{workflow_id}")
async def get_workflow(
    workspace_id: str,
    workflow_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    try:
        definition = await _workflow_service(request).get_workflow_definition(
            workflow_id.strip()
        )
    except (WorkflowNotFoundError, ValueError) as exc:
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=str(exc),
        ) from exc
    return {"data": definition}


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
    workflow_service = _workflow_service(request)
    try:
        run = await workflow_service.run_workflow(
            workflow_id.strip(),
            dedup_key=_normalize_optional_text(payload.dedup_key),
            workflow_input=payload.input,
        )
    except WorkflowNotFoundError as exc:
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=str(exc),
        ) from exc
    except WorkflowInputValidationError as exc:
        raise AppError(
            status_code=422,
            code="INVALID_WORKFLOW_INPUT",
            message=str(exc),
            details={"errors": exc.errors},
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
    workflow_service = _workflow_service(request)
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
    status: str | None = Query(default=None),
    start_time: str | None = Query(default=None),
    end_time: str | None = Query(default=None),
    limit: int | None = Query(default=50, ge=1, le=200),
    offset: int | None = Query(default=0, ge=0),
    sort_desc: bool = Query(default=True),
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    workflow_service = _workflow_service(request)
    resolved_limit = max(1, int(limit or 50))
    resolved_offset = max(0, int(offset or 0))
    try:
        runs = await workflow_service.list_runs(
            workflow_id.strip(),
            status=_normalize_optional_text(status),
            start_time=_normalize_optional_text(start_time),
            end_time=_normalize_optional_text(end_time),
            limit=resolved_limit + 1,
            offset=resolved_offset,
            sort_desc=sort_desc,
        )
    except WorkflowNotFoundError as exc:
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=str(exc),
        ) from exc
    has_more = len(runs) > resolved_limit
    visible_runs = runs[:resolved_limit]
    return {
        "data": {
            "workflow_id": workflow_id.strip(),
            "runs": [_serialize_workflow_run_summary(run) for run in visible_runs],
            "limit": resolved_limit,
            "offset": resolved_offset,
            "has_more": has_more,
        }
    }


@router.post("/workflow/{workflow_id}/runs/{run_id}/resume")
async def resume_workflow_run(
    workspace_id: str,
    workflow_id: str,
    run_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    workflow_service = _workflow_service(request)
    try:
        run = await workflow_service.resume_run(workflow_id.strip(), run_id.strip())
    except WorkflowNotFoundError as exc:
        raise AppError(
            status_code=404,
            code="WORKFLOW_NOT_FOUND",
            message=str(exc),
        ) from exc
    except Exception as exc:
        raise AppError(
            status_code=500,
            code="WORKFLOW_RESUME_FAILED",
            message=str(exc),
        ) from exc
    return {"data": _serialize_workflow_run_started(run)}


@router.get("/workflow/{workflow_id}/runs/{run_id}/step-events")
async def list_workflow_run_step_events(
    workspace_id: str,
    workflow_id: str,
    run_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    del current_user
    workflow_service = _workflow_service(request)
    try:
        events = await workflow_service.list_run_step_events(
            workflow_id.strip(), run_id.strip()
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
            "run_id": run_id.strip(),
            "events": events,
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
        workflow_service = _workflow_service(request)

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
                if event.comment:
                    yield f": {event.comment}\n\n"
                    continue
                event_name = str(event.event or "message")
                sequence += 1
                yield _build_sse_payload(
                    event_name,
                    _normalize_stream_payload(
                        event_name=event_name,
                        payload=event.data or {},
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
        "workflow_input": run.workflow_input,
        "session_id": run.session_id,
        "result": run.result,
        "steps": run.steps,
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
    }


def _workflow_service(request: Request):
    return _beta_state(request).host.get_workflow_service()


def _require_workspace(workspace_id: str) -> None:
    try:
        resolve_workspace(workspace_id)
    except ValueError as exc:
        raise AppError(
            status_code=404,
            code="WORKSPACE_NOT_FOUND",
            message=str(exc),
        ) from exc
