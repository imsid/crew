from __future__ import annotations

import json
import time
import uuid
from typing import Any, AsyncIterator
from urllib.parse import quote

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse
from ...shared.workspaces import resolve_workspace
from ...app import DEFAULT_HOST_ID
from ..app import (
    DATA_AGENT_ID,
    LOGGER,
    AppError,
    CreateSessionRequest,
    InteractionResponseRequest,
    SendMessageRequest,
    _beta_state,
    _normalize_optional_text,
    _require_user,
)

router = APIRouter()


@router.get("/sessions")
async def list_user_sessions(
    workspace_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    state = _beta_state(request)
    sessions = await state.store.list_sessions_for_user(
        workspace_id=workspace_id,
        user_id=str(current_user["id"]),
    )
    enriched_sessions = [
        await _enrich_session_record(request, session) for session in sessions
    ]
    return {"data": {"sessions": enriched_sessions}}


@router.post("/sessions")
async def create_session(
    workspace_id: str,
    payload: CreateSessionRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    state = _beta_state(request)
    session_id = f"{DATA_AGENT_ID}_{uuid.uuid4().hex}"
    session = await state.store.create_session(
        workspace_id=workspace_id,
        session_id=session_id,
        user_id=str(current_user["id"]),
        agent_id=DATA_AGENT_ID,
        label=_normalize_optional_text(payload.label),
    )
    LOGGER.info(
        "beta session created",
        extra={"user_id": current_user["id"], "session_id": session_id},
    )
    return {"data": session}


@router.get("/sessions/search")
async def search_sessions(
    workspace_id: str,
    request: Request,
    q: str = Query(...),
    limit: int = Query(default=10, ge=1, le=50),
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    state = _beta_state(request)
    query = q.strip()
    if not query:
        raise AppError(
            status_code=400,
            code="INVALID_REQUEST",
            message="q is required",
        )
    owned_session_ids = await state.store.list_session_ids_for_user(
        workspace_id=workspace_id,
        user_id=str(current_user["id"]),
    )
    internal_limit = min(max(limit * 10, 100), 500)
    search_queries = (
        [query]
        if query.startswith("@user:") or query.startswith("@agent:")
        else [f"@user:{query}", f"@agent:{query}"]
    )
    raw_results = []
    try:
        for search_query in search_queries:
            result = await _beta_state(request).host_client.data(
                "GET",
                "/api/v1/telemetry/memory/search",
                params={
                    "q": search_query,
                    "app_id": DATA_AGENT_ID,
                    "limit": min(internal_limit, 50),
                },
            )
            if isinstance(result, dict):
                raw_results.extend(result.get("results") or [])
    except Exception as exc:
        raise AppError(
            status_code=400,
            code="INVALID_REQUEST",
            message=str(exc),
        ) from exc
    ranked_results: dict[tuple[str, str], dict[str, Any]] = {}
    for item in raw_results:
        # mash's one-trace-per-turn model identifies turns by trace_id; the beta
        # API continues to expose it to the frontend as turn_id.
        if not isinstance(item, dict):
            continue
        key = (str(item.get("trace_id") or ""), str(item.get("session_id") or ""))
        payload = {
            "turn_id": str(item.get("trace_id") or ""),
            "session_id": str(item.get("session_id") or ""),
            "similarity_score": float(item.get("similarity_score") or 0.0),
            "preview": item.get("preview"),
        }
        current = ranked_results.get(key)
        if current is None or float(payload["similarity_score"]) > float(
            current["similarity_score"]
        ):
            ranked_results[key] = payload
    results = [
        item
        for item in sorted(
            ranked_results.values(),
            key=lambda result: (
                -float(result["similarity_score"]),
                str(result["turn_id"]),
            ),
        )
        if item["session_id"] in owned_session_ids
    ][:limit]
    LOGGER.info(
        "beta session search",
        extra={
            "user_id": current_user["id"],
            "query": query,
            "result_count": len(results),
        },
    )
    return {"data": {"query": query, "results": results}}


@router.get("/sessions/{session_id}")
async def get_session(
    workspace_id: str,
    session_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    session = await _owned_session(request, current_user, workspace_id, session_id)
    runtime = await _beta_state(request).host_client.data(
        "GET", f"/api/v1/agent/{quote(DATA_AGENT_ID, safe='')}/sessions/{quote(session_id, safe='')}"
    )
    runtime = dict(runtime or {})
    try:
        host = await _beta_state(request).host_client.data(
            "GET", f"/api/v1/hosts/{quote(DEFAULT_HOST_ID, safe='')}"
        )
        primary = host.get("primary") if isinstance(host, dict) else None
        runtime["primary_agent_id"] = (
            primary.get("agent_id") if isinstance(primary, dict) else DATA_AGENT_ID
        )
        runtime["subagent_ids"] = [
            str(item.get("agent_id"))
            for item in (host.get("subagents") or [])
            if isinstance(item, dict) and item.get("agent_id")
        ] if isinstance(host, dict) else []
    except Exception:
        runtime.setdefault("primary_agent_id", DATA_AGENT_ID)
        runtime["subagent_ids"] = []
    await _beta_state(request).store.touch_session(
        workspace_id=workspace_id,
        session_id=session_id,
    )
    return {"data": {"session": session, "runtime": runtime}}


@router.get("/sessions/{session_id}/history")
async def get_session_history(
    workspace_id: str,
    session_id: str,
    request: Request,
    limit: int | None = Query(default=None, ge=1),
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    await _owned_session(request, current_user, workspace_id, session_id)
    data = await _beta_state(request).host_client.data(
        "GET",
        f"/api/v1/agent/{quote(DATA_AGENT_ID, safe='')}/sessions/{quote(session_id, safe='')}/history",
        params={"limit": limit} if limit is not None else None,
    )
    turns = data.get("turns") if isinstance(data, dict) else []
    await _beta_state(request).store.touch_session(
        workspace_id=workspace_id,
        session_id=session_id,
    )
    return {
        "data": {
            "session_id": session_id,
            "turns": [_normalize_history_turn(turn) for turn in turns],
        }
    }


@router.get("/sessions/{session_id}/signals")
async def get_session_signals(
    workspace_id: str,
    session_id: str,
    request: Request,
    limit: int | None = Query(default=None, ge=1),
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    await _owned_session(request, current_user, workspace_id, session_id)
    data = await _beta_state(request).host_client.data(
        "GET",
        f"/api/v1/agent/{quote(DATA_AGENT_ID, safe='')}/sessions/{quote(session_id, safe='')}/signals",
        params={"limit": limit} if limit is not None else None,
    )
    await _beta_state(request).store.touch_session(
        workspace_id=workspace_id,
        session_id=session_id,
    )
    return {
        "data": data,
    }


@router.get("/sessions/{session_id}/turns/{turn_id}/trace")
async def get_turn_trace(
    workspace_id: str,
    session_id: str,
    turn_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    is_workflow_session = session_id.startswith("workflow:")
    if not is_workflow_session:
        await _owned_session(request, current_user, workspace_id, session_id)
    normalized_turn_id = str(turn_id or "").strip()
    if not normalized_turn_id:
        raise AppError(
            status_code=400,
            code="INVALID_REQUEST",
            message="turn_id is required",
        )

    agent_id = DATA_AGENT_ID
    response = await _beta_state(request).host_client.request(
        "GET",
        "/api/v1/agent/"
        f"{quote(agent_id, safe='')}/session/"
        f"{quote(session_id, safe='')}/trace/"
        f"{quote(normalized_turn_id, safe='')}/reasoning",
    )
    payload = response.json()
    if not response.is_success:
        error = payload.get("error") if isinstance(payload, dict) else None
        raise AppError(
            status_code=response.status_code,
            code=str((error or {}).get("code") or "MASH_PROXY_ERROR"),
            message=str((error or {}).get("message") or "Mash API request failed"),
            details=dict((error or {}).get("details") or {}),
        )

    trace_payload = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(trace_payload, dict):
        raise AppError(
            status_code=502,
            code="MASH_PROXY_ERROR",
            message="Mash API response missing data payload",
        )
    trace = _normalize_reasoning_trace(
        trace_payload,
        trace_id=normalized_turn_id,
    )
    if not is_workflow_session:
        await _beta_state(request).store.touch_session(
            workspace_id=workspace_id,
            session_id=session_id,
        )
    return {
        "data": {
            "source": "runtime_event_log",
            "agent_id": agent_id,
            "session_id": session_id,
            "turn_id": normalized_turn_id,
            "trace_id": normalized_turn_id,
            "trace": trace,
        }
    }


@router.post("/sessions/{session_id}/messages")
async def send_message(
    workspace_id: str,
    session_id: str,
    payload: SendMessageRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    await _owned_session(request, current_user, workspace_id, session_id)
    message = str(payload.message or "").strip()
    if not message:
        raise AppError(
            status_code=400,
            code="INVALID_REQUEST",
            message="message is required",
        )
    try:
        # Submit to the crew host (not the bare data agent) so the data
        # primary is wired with the pm subagent for this request. Workspace is
        # trusted caller metadata, invisible to the model and inherited by
        # delegated subagent requests in Mash >= 0.18.
        accepted = await _beta_state(request).host_client.data(
            "POST",
            f"/api/v1/hosts/{quote(DEFAULT_HOST_ID, safe='')}/request",
            json={
                "message": message,
                "session_id": session_id,
                "metadata": {"workspace": workspace_id},
            },
        )
        request_id = str((accepted or {}).get("request_id") or "")
        if not request_id:
            raise ValueError("Mash host response missing request_id")
        await _beta_state(request).store.record_session_request(
            request_id=request_id,
            session_id=session_id,
        )
    except Exception as exc:
        LOGGER.exception(
            "beta message proxy failed",
            extra={"user_id": current_user["id"], "session_id": session_id},
        )
        raise AppError(
            status_code=502,
            code="MASH_PROXY_ERROR",
            message=f"failed to submit message: {exc}",
        ) from exc
    await _beta_state(request).store.touch_session(
        workspace_id=workspace_id,
        session_id=session_id,
    )
    LOGGER.info(
        "beta message submitted",
        extra={
            "user_id": current_user["id"],
            "session_id": session_id,
            "request_id": request_id,
        },
    )
    return {"data": {"request_id": request_id}}


@router.get("/sessions/{session_id}/requests/{request_id}/events")
async def stream_request_events(
    workspace_id: str,
    session_id: str,
    request_id: str,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> StreamingResponse:
    _require_workspace(workspace_id)
    await _owned_session(request, current_user, workspace_id, session_id)
    await _require_request_session(request, request_id, session_id)
    async def _generate():
        sequence = 0
        try:
            async for event in _iter_host_sse(
                request,
                f"/api/v1/agent/{quote(DATA_AGENT_ID, safe='')}"
                f"/request/{quote(request_id.strip(), safe='')}/events",
            ):
                sequence += 1
                event_name = str(event.get("event") or "message")
                payload = event.get("data")
                yield _build_sse_payload(
                    event_name,
                    _normalize_stream_payload(
                        event_name=event_name,
                        payload=payload,
                        sequence=sequence,
                    ),
                )
                if event_name in {"request.completed", "request.error"}:
                    break
        except Exception as exc:
            LOGGER.exception(
                "beta event proxy failed",
                extra={
                    "user_id": current_user["id"],
                    "session_id": session_id,
                    "request_id": request_id,
                },
            )
            yield _build_sse_payload(
                "request.error",
                _normalize_stream_payload(
                    event_name="request.error",
                    payload={
                        "request_id": request_id.strip(),
                        "status": "error",
                        "error": str(exc),
                    },
                    sequence=sequence + 1,
                ),
            )

    await _beta_state(request).store.touch_session(
        workspace_id=workspace_id,
        session_id=session_id,
    )
    return StreamingResponse(
        _generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/sessions/{session_id}/requests/{request_id}/interaction")
async def post_interaction_response(
    workspace_id: str,
    session_id: str,
    request_id: str,
    payload: InteractionResponseRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    _require_workspace(workspace_id)
    await _owned_session(request, current_user, workspace_id, session_id)
    await _require_request_session(request, request_id, session_id)
    result = await _beta_state(request).host_client.data(
        "POST",
        f"/api/v1/agent/{quote(DATA_AGENT_ID, safe='')}"
        f"/request/{quote(request_id.strip(), safe='')}/interaction",
        json={
            "interaction_id": payload.interaction_id,
            "response": payload.response,
        },
    )
    return {"data": result}


async def _owned_session(
    request: Request,
    current_user: dict[str, Any],
    workspace_id: str,
    session_id: str,
) -> dict[str, Any]:
    normalized = str(session_id or "").strip()
    if not normalized:
        raise AppError(
            status_code=400,
            code="INVALID_REQUEST",
            message="session_id is required",
        )
    session = await _beta_state(request).store.get_session(
        workspace_id=workspace_id,
        session_id=normalized,
    )
    if session is None:
        raise AppError(
            status_code=404,
            code="SESSION_NOT_FOUND",
            message="session not found",
        )
    if str(session["user_id"]) != str(current_user["id"]):
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="session does not belong to the current user",
        )
    return session


async def _require_request_session(
    request: Request, request_id: str, session_id: str
) -> None:
    belongs = await _beta_state(request).store.request_belongs_to_session(
        request_id=request_id.strip(),
        session_id=session_id,
    )
    if not belongs:
        raise AppError(
            status_code=403,
            code="FORBIDDEN",
            message="request does not belong to the session",
        )


def _require_workspace(workspace_id: str) -> None:
    try:
        resolve_workspace(workspace_id)
    except ValueError as exc:
        raise AppError(
            status_code=404,
            code="WORKSPACE_NOT_FOUND",
            message=str(exc),
        ) from exc


async def _iter_host_sse(
    request: Request, path: str
) -> AsyncIterator[dict[str, Any]]:
    async with _beta_state(request).host_client.stream("GET", path) as response:
        if not response.is_success:
            await response.aread()
            try:
                payload = response.json()
            except ValueError:
                payload = {}
            error = payload.get("error") if isinstance(payload, dict) else None
            raise AppError(
                status_code=response.status_code,
                code=str((error or {}).get("code") or "MASH_PROXY_ERROR"),
                message=str((error or {}).get("message") or "Mash stream failed"),
            )
        event_name: str | None = None
        data_lines: list[str] = []
        async for raw_line in response.aiter_lines():
            line = raw_line.strip()
            if not line:
                if event_name and data_lines:
                    try:
                        payload = json.loads("\n".join(data_lines))
                    except json.JSONDecodeError:
                        payload = {"raw": "\n".join(data_lines)}
                    yield {
                        "event": event_name,
                        "data": payload,
                    }
                event_name = None
                data_lines = []
                continue
            if line.startswith(":"):
                continue
            if line.startswith("event:"):
                event_name = line[6:].strip()
            elif line.startswith("data:"):
                data_lines.append(line[5:].strip())


def _build_sse_payload(event_name: str, payload: Any) -> str:
    return f"event: {event_name}\ndata: {json.dumps(payload, ensure_ascii=True)}\n\n"


def _normalize_stream_payload(
    *,
    event_name: str,
    payload: Any,
    sequence: int,
) -> dict[str, Any]:
    normalized: dict[str, Any]
    if isinstance(payload, dict):
        normalized = dict(payload)
    else:
        normalized = {"value": payload}

    normalized["runtime_event"] = _build_runtime_event(
        event_name=event_name,
        payload=normalized,
        sequence=sequence,
    )
    trace = _build_trace_event(event_name=event_name, payload=normalized)
    if trace is not None:
        normalized["trace"] = trace
    usage = _extract_usage(normalized)
    if usage is not None:
        normalized["usage"] = usage
    return normalized


def _build_runtime_event(
    *,
    event_name: str,
    payload: dict[str, Any],
    sequence: int,
) -> dict[str, Any]:
    event_type = None
    trace_id = _normalize_optional_text(str(payload.get("trace_id") or ""))
    step_key = _normalize_optional_text(str(payload.get("step_key") or ""))
    loop_index = payload.get("loop_index")
    status = str(payload.get("status") or "").strip() or None
    token_usage = _extract_trace_usage(payload)

    if event_name == "agent.trace":
        event_type = _normalize_optional_text(str(payload.get("event_type") or ""))
        loop_index = payload.get("loop_index")
        nested_payload = payload.get("payload")
        if status is None and isinstance(nested_payload, dict):
            status = _normalize_optional_text(str(nested_payload.get("status") or ""))

    label_source = event_type or event_name
    return {
        "sequence": int(sequence),
        "event": event_name,
        "event_type": event_type,
        "label": _humanize_runtime_label(label_source),
        "status": status or _default_runtime_status(event_name),
        "trace_id": trace_id,
        "step_key": step_key,
        "loop_index": loop_index,
        "timestamp": float(time.time()),
        "token_usage": token_usage,
    }


def _build_trace_event(
    *,
    event_name: str,
    payload: dict[str, Any],
) -> dict[str, Any] | None:
    runtime_event = payload.get("runtime_event")
    if not isinstance(runtime_event, dict):
        return None

    trace_id = _normalize_optional_text(str(runtime_event.get("trace_id") or ""))
    step_key = _normalize_optional_text(str(runtime_event.get("step_key") or ""))
    loop_index = runtime_event.get("loop_index")
    step_index = None
    if isinstance(loop_index, int) and loop_index >= 0:
        step_index = loop_index + 1

    if event_name == "request.started":
        return {
            "kind": "status",
            "status": "started",
            "trace_id": trace_id,
            "title": "Agent execution started",
        }

    if event_name == "request.completed":
        return {
            "kind": "status",
            "status": "completed",
            "trace_id": trace_id,
            "title": "Execution complete",
        }

    if event_name == "request.error":
        return {
            "kind": "status",
            "status": "error",
            "trace_id": trace_id,
            "title": "Execution failed",
            "error": payload.get("error"),
        }

    if event_name == "request.interaction.create":
        return {
            "kind": "interaction-create",
            "interaction_id": payload.get("interaction_id"),
            "interaction_type": payload.get("type"),
            "prompt": payload.get("prompt"),
            "schema": payload.get("schema"),
            "timeout_seconds": payload.get("timeout_seconds"),
        }

    if event_name == "request.interaction.ack":
        return {
            "kind": "interaction-ack",
            "interaction_id": payload.get("interaction_id"),
            "response": payload.get("response"),
        }

    event_type = str(payload.get("event_type") or "")
    trace_payload = payload.get("payload")
    if not isinstance(trace_payload, dict):
        return None

    if event_type == "runtime.llm.think.completed":
        action_type = str(trace_payload.get("action_type") or "").strip() or "unknown"
        return {
            "kind": "step",
            "trace_id": trace_id,
            "step_key": step_key,
            "step_index": step_index,
            "action_type": action_type,
            "title": _trace_step_title(action_type),
            "assistant_text": _normalize_optional_text(
                str(trace_payload.get("assistant_text") or "")
            ),
            "tool_calls": _normalize_trace_tool_calls(trace_payload.get("tool_calls")),
            "token_usage": _coerce_usage_map(trace_payload.get("token_usage")),
            "duration_ms": _coerce_int(trace_payload.get("duration_ms")),
        }

    if event_type in {
        "runtime.tool.call.completed",
        "runtime.subagent.call.completed",
    }:
        result_payload = trace_payload.get("result")
        result_metadata = (
            dict(result_payload.get("metadata") or {})
            if isinstance(result_payload, dict)
            else {}
        )
        return {
            "kind": "tool-result",
            "trace_id": trace_id,
            "step_key": step_key,
            "step_index": step_index,
            "tool_call_id": _normalize_optional_text(
                str(trace_payload.get("tool_call_id") or "")
            ),
            "tool_name": _normalize_optional_text(
                str(trace_payload.get("tool_name") or "")
            ),
            "duration_ms": _coerce_int(trace_payload.get("duration_ms")),
            "is_error": (
                bool(result_payload.get("is_error"))
                if isinstance(result_payload, dict)
                else False
            ),
            "metadata": result_metadata,
        }

    if event_type == "runtime.step.failed":
        return {
            "kind": "status",
            "status": "error",
            "trace_id": trace_id,
            "step_key": step_key,
            "step_index": step_index,
            "title": "Step failed",
            "error": trace_payload.get("error"),
        }

    return None


def _trace_step_title(action_type: str) -> str:
    if action_type == "tool_call":
        return "Calling tools"
    if action_type == "finish":
        return "Finishing execution"
    if action_type == "response":
        return "Generating response"
    return titleize_runtime_value(action_type)


def _normalize_trace_tool_calls(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "id": _normalize_optional_text(str(item.get("id") or "")),
                "name": _normalize_optional_text(str(item.get("name") or "")),
                "arguments": dict(item.get("arguments") or {}),
            }
        )
    return normalized


def _coerce_int(value: Any) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _default_runtime_status(event_name: str) -> str:
    if event_name == "request.error":
        return "error"
    if event_name == "request.completed":
        return "completed"
    if event_name == "request.started":
        return "started"
    if event_name == "request.accepted":
        return "accepted"
    if event_name == "request.interaction.create":
        return "waiting"
    if event_name == "request.interaction.ack":
        return "running"
    return "running"


def _humanize_runtime_label(value: str | None) -> str:
    normalized = str(value or "").strip().replace(".", " ").replace("_", " ")
    if not normalized:
        return "Runtime event"
    return " ".join(part.capitalize() for part in normalized.split())


def titleize_runtime_value(value: str | None) -> str:
    normalized = str(value or "").strip().replace(".", " ").replace("_", " ")
    if not normalized:
        return "Unknown"
    return " ".join(part.capitalize() for part in normalized.split())


def _extract_usage(payload: dict[str, Any]) -> dict[str, int] | None:
    response = payload.get("response")
    if isinstance(response, dict):
        metadata = response.get("metadata")
        if isinstance(metadata, dict):
            usage = _coerce_usage_map(metadata.get("token_usage"))
            if usage is not None:
                return usage
    metadata = payload.get("response_metadata")
    if isinstance(metadata, dict):
        usage = _coerce_usage_map(metadata.get("token_usage"))
        if usage is not None:
            return usage
    return _extract_trace_usage(payload)


def _extract_trace_usage(payload: dict[str, Any]) -> dict[str, int] | None:
    direct = _coerce_usage_map(payload.get("token_usage"))
    if direct is not None:
        return direct

    if {"input_tokens", "output_tokens"} <= set(payload.keys()):
        return _coerce_usage_map(
            {
                "input_tokens": payload.get("input_tokens"),
                "output_tokens": payload.get("output_tokens"),
                "total_tokens": payload.get("total_tokens"),
            }
        )

    nested_payload = payload.get("payload")
    if isinstance(nested_payload, dict):
        return _extract_trace_usage(nested_payload)
    return None


def _coerce_usage_map(value: Any) -> dict[str, int] | None:
    if not isinstance(value, dict):
        return None

    input_raw = value.get("input_tokens", value.get("input"))
    output_raw = value.get("output_tokens", value.get("output"))
    total_raw = value.get("total_tokens")
    if input_raw is None or output_raw is None:
        return None

    try:
        input_tokens = int(input_raw)
        output_tokens = int(output_raw)
        total_tokens = (
            int(total_raw) if total_raw is not None else input_tokens + output_tokens
        )
    except (TypeError, ValueError):
        return None

    usage = {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
    }
    # mash >= 0.7 reports prompt-cache hits. Per-step trace payloads key them
    # cache_read/cache_write; trace/session aggregates use the *_tokens form.
    # Surface them only when present so plain turns keep their existing shape.
    cache_read = _coerce_int(value.get("cache_read_tokens", value.get("cache_read")))
    cache_write = _coerce_int(value.get("cache_write_tokens", value.get("cache_write")))
    if cache_read is not None:
        usage["cache_read_tokens"] = cache_read
    if cache_write is not None:
        usage["cache_write_tokens"] = cache_write
    return usage


def _normalize_history_turn(turn: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(turn)
    # mash's one-trace-per-turn model keys turns by trace_id; the beta API and
    # frontend address turns by turn_id (the value the trace endpoint expects).
    if "turn_id" not in normalized and normalized.get("trace_id") is not None:
        normalized["turn_id"] = normalized["trace_id"]
    metadata = normalized.get("metadata")
    usage = None
    if isinstance(metadata, dict):
        usage = _coerce_usage_map(metadata.get("token_usage"))
    normalized["usage"] = usage
    return normalized


def _normalize_reasoning_trace(
    payload: dict[str, Any],
    *,
    trace_id: str,
) -> dict[str, Any]:
    steps_payload = payload.get("steps")
    normalized_steps: list[dict[str, Any]] = []
    if isinstance(steps_payload, list):
        for index, item in enumerate(steps_payload, start=1):
            if not isinstance(item, dict):
                continue
            normalized_steps.append(
                {
                    "step_index": _coerce_reasoning_step_index(
                        item.get("step"),
                        item.get("step_index"),
                        fallback=index,
                    ),
                    "step_key": None,
                    "action_type": str(item.get("action_type") or "").strip()
                    or "unknown",
                    "title": str(item.get("title") or "").strip() or "Execution step",
                    "assistant_text": _normalize_optional_text(
                        str(item.get("assistant_text") or "")
                    ),
                    "tool_calls": _normalize_reasoning_tool_calls(
                        item.get("tool_calls")
                    ),
                    "token_usage": _coerce_usage_map(item.get("token_usage")),
                    "duration_ms": _coerce_reasoning_duration(item),
                    "results": [],
                }
            )

    error_payload = payload.get("error")
    error_message = None
    if isinstance(error_payload, dict):
        error_message = _normalize_optional_text(
            str(error_payload.get("message") or "")
        )

    status = str(payload.get("status") or "").strip().lower()
    if status == "completed":
        normalized_status = "completed"
    elif status == "error":
        normalized_status = "error"
    else:
        normalized_status = "started"

    return {
        "status": normalized_status,
        "title": _reasoning_trace_title(normalized_status, normalized_steps),
        "trace_id": trace_id,
        "error": error_message,
        "steps": normalized_steps,
        "summary": dict(payload.get("summary") or {}),
    }


def _coerce_reasoning_step_index(*values: Any, fallback: int) -> int:
    for value in values:
        coerced = _coerce_int(value)
        if coerced is not None and coerced > 0:
            return coerced
    return fallback


def _coerce_reasoning_duration(step: dict[str, Any]) -> int | None:
    for key in ("total_duration_ms", "think_duration_ms", "act_duration_ms"):
        coerced = _coerce_int(step.get(key))
        if coerced is not None:
            return coerced
    return None


def _normalize_reasoning_tool_calls(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in value:
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "id": _normalize_optional_text(str(item.get("id") or "")),
                "name": _normalize_optional_text(str(item.get("name") or "")),
                "arguments": dict(item.get("arguments") or {}),
            }
        )
    return normalized


def _reasoning_trace_title(
    status: str,
    steps: list[dict[str, Any]],
) -> str:
    if status == "error":
        return "Execution failed"
    if status == "completed":
        return "Execution complete"
    if steps:
        return "Execution summary"
    return "Agent execution started"


async def _enrich_session_record(
    request: Request, session: dict[str, Any]
) -> dict[str, Any]:
    normalized = dict(session)
    session_id = str(session.get("session_id") or "").strip()
    if not session_id:
        normalized["preview_text"] = None
        normalized["last_message_at"] = None
        normalized["turn_count"] = 0
        return normalized

    try:
        data = await _beta_state(request).host_client.data(
            "GET",
            f"/api/v1/agent/{quote(DATA_AGENT_ID, safe='')}"
            f"/sessions/{quote(session_id, safe='')}/history",
        )
        turns = data.get("turns") if isinstance(data, dict) else []
    except Exception:
        # Crew owns the session record. A host outage should not make it
        # disappear from the user's list.
        turns = []
    normalized_turns = [
        _normalize_history_turn(turn) for turn in turns if isinstance(turn, dict)
    ]
    normalized["preview_text"] = _session_preview_text(normalized_turns)
    normalized["last_message_at"] = (
        normalized_turns[-1].get("created_at") if normalized_turns else None
    )
    normalized["turn_count"] = len(normalized_turns)
    return normalized


def _session_preview_text(turns: list[dict[str, Any]]) -> str | None:
    if not turns:
        return None
    last_turn = turns[-1]
    candidates = [
        str(last_turn.get("agent_response") or "").strip(),
        str(last_turn.get("user_message") or "").strip(),
    ]
    for candidate in candidates:
        if candidate:
            return candidate
    return None
