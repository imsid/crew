from __future__ import annotations

import asyncio
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from mash.workflows import DuplicateWorkflowRunError, WorkflowNotFoundError

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
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    del current_user
    workflow_service = _beta_state(request).host.get_workflow_service()
    return {"data": {"workflows": await workflow_service.list_workflows()}}


@router.post("/workflow/{workflow_id}/run")
async def run_workflow(
    workflow_id: str,
    payload: WorkflowRunRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    del current_user
    workflow_service = _beta_state(request).host.get_workflow_service()
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
    workflow_id: str,
    run_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
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
    workflow_id: str,
    request: Request,
    limit: int | None = Query(default=5, ge=1, le=50),
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
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
    workflow_id: str,
    run_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> StreamingResponse:
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
