from __future__ import annotations

import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any, AsyncIterator, Literal, cast

import httpx
from fastapi import Depends, FastAPI, Header, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
import yaml

from mash.api import MashHostConfig, create_app as create_mash_api_app
from mash.logging import EventLogger
from mash.memory.search.service import MemorySearchService
from mash.memory.search.types import FusionWeights, RetrievalConfig
from mash.runtime import AgentHost

from ..app import build_host
from ..artifacts.service.context import build_tool_context as build_artifact_context
from ..artifacts.service.repo import list_artifacts, read_artifact, search_artifacts
from ..experimentation.service.context import (
    build_tool_context as build_experiment_context,
)
from ..experimentation.service.tool_entrypoints import (
    compile_experiment_analysis_sql,
    list_experiment_configs_tool,
    read_experiment_config_tool,
)
from ..metrics_layer.service.context import build_tool_context as build_metrics_context
from ..metrics_layer.service.tool_entrypoints import (
    compile_metric_configs_to_sql,
    list_metrics_layer_configs,
    read_metrics_layer_config,
)
from ..skill_library.repo import list_skills, read_skill, search_skills
from ..shared.runtime_paths import workspace_dir
from .auth import TokenError, issue_token, verify_token
from .store import BetaStore
from .visualizations import (
    BigQueryExecutionError,
    build_experiment_analysis,
    build_metric_visualization,
)

LOGGER = logging.getLogger(__name__)
DATA_AGENT_ID = "data"


class LoginHandleRequest(BaseModel):
    username: str


class CreateSessionRequest(BaseModel):
    label: str | None = None


class SendMessageRequest(BaseModel):
    message: str


class CommandRequest(BaseModel):
    surface: Literal["metrics", "experiments", "artifacts", "skills"]
    operation: str
    args: dict[str, Any] = Field(default_factory=dict)


@dataclass(frozen=True)
class BetaConfig:
    allowed_users: set[str]
    auth_secret: str
    token_ttl_seconds: int
    database_url: str
    cors_allowed_origins: tuple[str, ...]
    workspace_name: str = "marketing_db"

    @classmethod
    def from_env(cls) -> "BetaConfig":
        return cls(
            allowed_users=_parse_allowed_users(os.getenv("CREW_BETA_ALLOWED_USERS")),
            auth_secret=_resolve_auth_secret(),
            token_ttl_seconds=max(
                60,
                int(os.getenv("CREW_BETA_TOKEN_TTL_SECONDS", "604800")),
            ),
            database_url=_resolve_database_url(),
            cors_allowed_origins=_resolve_cors_allowed_origins(),
        )


@dataclass
class BetaAppState:
    host: AgentHost
    store: BetaStore
    config: BetaConfig
    mash_api_app: FastAPI


class AppError(RuntimeError):
    def __init__(
        self,
        *,
        status_code: int,
        message: str,
        code: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message
        self.code = code
        self.details = details or {}


def create_beta_app(
    *,
    host: AgentHost | None = None,
    config: BetaConfig | None = None,
) -> FastAPI:
    resolved_host = host or build_host()
    resolved_config = config or BetaConfig.from_env()

    @asynccontextmanager
    async def _lifespan(application: FastAPI):
        store = BetaStore(resolved_config.database_url)
        await store.open()
        await resolved_host.start()
        mash_api_config = MashHostConfig()
        mash_api_app = create_mash_api_app(resolved_host, config=mash_api_config)
        mash_api_app.state.runtime_state = SimpleNamespace(
            host=resolved_host,
            api_key=None,
            observability_enabled=mash_api_config.enable_observability,
            default_events_limit=max(1, int(mash_api_config.default_events_limit)),
            default_search_limit=max(1, int(mash_api_config.default_search_limit)),
        )
        application.state.beta = BetaAppState(
            host=resolved_host,
            store=store,
            config=resolved_config,
            mash_api_app=mash_api_app,
        )
        try:
            yield
        finally:
            state = getattr(application.state, "beta", None)
            if state is not None:
                await state.store.close()
            await resolved_host.close()
            application.state.beta = None

    app = FastAPI(title="Crew Beta BFF", version="0.1.0", lifespan=_lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_config.cors_allowed_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def _app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.get("/health")
    async def health(request: Request) -> dict[str, Any]:
        state = _beta_state(request)
        return {
            "data": {
                "status": "ok",
                "service": "crew-beta-bff",
                "primary_agent_id": DATA_AGENT_ID,
                "workspace": state.config.workspace_name,
            }
        }

    @app.post("/login/handle")
    async def login_handle(
        payload: LoginHandleRequest,
        request: Request,
    ) -> dict[str, Any]:
        state = _beta_state(request)
        username = _normalize_username(payload.username)
        LOGGER.info("beta login attempt", extra={"username": username})
        if username not in state.config.allowed_users:
            raise AppError(
                status_code=403,
                code="FORBIDDEN",
                message="user is not allowed for beta access",
            )

        user = await state.store.ensure_user(username)
        token = issue_token(
            secret=state.config.auth_secret,
            user_id=str(user["id"]),
            username=str(user["username"]),
            ttl_seconds=state.config.token_ttl_seconds,
        )
        return {
            "data": {
                "token": token,
                "user": _serialize_user(user),
            }
        }

    @app.get("/me")
    async def me(current_user: dict[str, Any] = Depends(_require_user)) -> dict[str, Any]:
        return {"data": {"user": _serialize_user(current_user)}}

    @app.get("/sessions")
    async def list_user_sessions(
        request: Request,
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        state = _beta_state(request)
        sessions = await state.store.list_sessions_for_user(str(current_user["id"]))
        agent = _data_agent(request)
        enriched_sessions = [
            await _enrich_session_record(agent, session)
            for session in sessions
        ]
        return {"data": {"sessions": enriched_sessions}}

    @app.post("/sessions")
    async def create_session(
        payload: CreateSessionRequest,
        request: Request,
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        state = _beta_state(request)
        session_id = f"{DATA_AGENT_ID}_{uuid.uuid4().hex}"
        session = await state.store.create_session(
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

    @app.get("/sessions/search")
    async def search_sessions(
        request: Request,
        q: str = Query(...),
        limit: int = Query(default=10, ge=1, le=50),
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        state = _beta_state(request)
        query = q.strip()
        if not query:
            raise AppError(
                status_code=400,
                code="INVALID_REQUEST",
                message="q is required",
            )
        owned_session_ids = await state.store.list_session_ids_for_user(
            str(current_user["id"])
        )
        agent = _data_agent(request)
        search_service = _build_memory_search_service(agent)
        internal_limit = min(max(limit * 10, 100), 500)
        search_queries = (
            [query]
            if query.startswith("@user:") or query.startswith("@agent:")
            else [f"@user:{query}", f"@agent:{query}"]
        )
        raw_results = []
        try:
            for search_query in search_queries:
                raw_results.extend(
                    await search_service.search(
                        search_query,
                        app_id=DATA_AGENT_ID,
                        limit=internal_limit,
                    )
                )
        except ValueError as exc:
            raise AppError(
                status_code=400,
                code="INVALID_REQUEST",
                message=str(exc),
            ) from exc
        ranked_results: dict[tuple[str, str], dict[str, Any]] = {}
        for item in raw_results:
            key = (item.turn_id, item.session_id)
            payload = {
                "turn_id": item.turn_id,
                "session_id": item.session_id,
                "similarity_score": item.similarity_score,
                "preview": item.preview,
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

    @app.get("/sessions/{session_id}")
    async def get_session(
        session_id: str,
        request: Request,
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        session = await _owned_session(request, current_user, session_id)
        runtime = await _data_agent(request).get_session_info(session_id)
        await _beta_state(request).store.touch_session(session_id)
        return {"data": {"session": session, "runtime": runtime}}

    @app.get("/sessions/{session_id}/history")
    async def get_session_history(
        session_id: str,
        request: Request,
        limit: int | None = Query(default=None, ge=1),
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        await _owned_session(request, current_user, session_id)
        turns = await _data_agent(request).get_history_turns(session_id, limit=limit)
        await _beta_state(request).store.touch_session(session_id)
        return {
            "data": {
                "session_id": session_id,
                "turns": [_normalize_history_turn(turn) for turn in turns],
            }
        }

    @app.get("/sessions/{session_id}/signals")
    async def get_session_signals(
        session_id: str,
        request: Request,
        limit: int | None = Query(default=None, ge=1),
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        await _owned_session(request, current_user, session_id)
        agent = _data_agent(request)
        await _beta_state(request).store.touch_session(session_id)
        return {
            "data": {
                "agent_id": agent.app_id,
                "session_id": session_id,
                "definitions": agent.get_signal_definitions(),
                "turns": await agent.get_session_signals(session_id, limit=limit),
            }
        }

    @app.get("/sessions/{session_id}/turns/{turn_id}/trace")
    async def get_turn_trace(
        session_id: str,
        turn_id: str,
        request: Request,
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        await _owned_session(request, current_user, session_id)
        normalized_turn_id = str(turn_id or "").strip()
        if not normalized_turn_id:
            raise AppError(
                status_code=400,
                code="INVALID_REQUEST",
                message="turn_id is required",
            )

        app = _beta_state(request).mash_api_app
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://mash-internal",
        ) as client:
            response = await client.get(
                "/api/v1/telemetry/reasoning-trace",
                params={
                    "agent_id": DATA_AGENT_ID,
                    "session_id": session_id,
                    "trace_id": normalized_turn_id,
                },
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
        await _beta_state(request).store.touch_session(session_id)
        return {
            "data": {
                "source": "runtime_event_log",
                "agent_id": DATA_AGENT_ID,
                "session_id": session_id,
                "turn_id": normalized_turn_id,
                "trace_id": normalized_turn_id,
                "trace": trace,
            }
        }

    @app.post("/sessions/{session_id}/messages")
    async def send_message(
        session_id: str,
        payload: SendMessageRequest,
        request: Request,
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        await _owned_session(request, current_user, session_id)
        message = str(payload.message or "").strip()
        if not message:
            raise AppError(
                status_code=400,
                code="INVALID_REQUEST",
                message="message is required",
            )
        client = _data_client(request)
        try:
            request_id = await client.post_request(message, session_id=session_id)
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
        await _beta_state(request).store.touch_session(session_id)
        LOGGER.info(
            "beta message submitted",
            extra={
                "user_id": current_user["id"],
                "session_id": session_id,
                "request_id": request_id,
            },
        )
        return {"data": {"request_id": request_id}}

    @app.get("/sessions/{session_id}/requests/{request_id}/events")
    async def stream_request_events(
        session_id: str,
        request_id: str,
        request: Request,
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> StreamingResponse:
        await _owned_session(request, current_user, session_id)
        client = _data_client(request)

        async def _generate():
            sequence = 0
            try:
                stream = cast(
                    AsyncIterator[dict[str, Any]],
                    client.stream_response(request_id.strip()),
                )
                async for event in stream:
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

        await _beta_state(request).store.touch_session(session_id)
        return StreamingResponse(
            _generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
        )

    @app.post("/command")
    async def run_command(
        payload: CommandRequest,
        request: Request,
        current_user: dict[str, Any] = Depends(_require_user),
    ) -> dict[str, Any]:
        del request
        del current_user
        result = _execute_command(payload)
        LOGGER.info(
            "beta command executed",
            extra={"surface": payload.surface, "operation": payload.operation},
        )
        return result

    return app


def build_beta_app() -> FastAPI:
    return create_beta_app()


def _beta_state(request: Request) -> BetaAppState:
    state = getattr(request.app.state, "beta", None)
    if state is None:
        raise AppError(
            status_code=503,
            code="RUNTIME_NOT_READY",
            message="beta backend is not initialized",
        )
    return state


def _data_agent(request: Request):
    return _beta_state(request).host.get_agent(DATA_AGENT_ID)


def _data_client(request: Request):
    return _beta_state(request).host.get_client(DATA_AGENT_ID)


def _serialize_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(user["id"]),
        "username": str(user["username"]),
        "display_name": user.get("display_name"),
        "status": str(user["status"]),
        "created_at": float(user["created_at"]),
    }


def _normalize_username(value: str) -> str:
    normalized = str(value or "").strip().lower()
    if normalized.startswith("@"):
        normalized = normalized[1:]
    if not normalized:
        raise AppError(
            status_code=400,
            code="INVALID_REQUEST",
            message="username is required",
        )
    return normalized


def _normalize_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    text = value.strip()
    return text or None


def _parse_allowed_users(raw_value: str | None) -> set[str]:
    raw = str(raw_value or "").strip()
    if not raw:
        return set()
    if raw.startswith("["):
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            raise RuntimeError("CREW_BETA_ALLOWED_USERS json must be a list")
        return {_normalize_username(str(item)) for item in parsed}
    return {
        _normalize_username(item)
        for item in raw.split(",")
        if str(item).strip()
    }


def _resolve_auth_secret() -> str:
    configured = str(os.getenv("CREW_BETA_AUTH_SECRET") or "").strip()
    if configured:
        return configured
    return "crew-beta-local-dev-secret-change-me"


def _resolve_database_url() -> str:
    configured = str(os.getenv("CREW_DATABASE_URL") or "").strip()
    if configured:
        return configured
    raise RuntimeError("CREW_DATABASE_URL must be set for the beta backend")


def _resolve_cors_allowed_origins() -> tuple[str, ...]:
    configured = str(os.getenv("CREW_BETA_CORS_ALLOWED_ORIGINS") or "").strip()
    if configured:
        if configured.startswith("["):
            parsed = json.loads(configured)
            if not isinstance(parsed, list):
                raise RuntimeError("CREW_BETA_CORS_ALLOWED_ORIGINS json must be a list")
            values = [str(item).strip().rstrip("/") for item in parsed if str(item).strip()]
        else:
            values = [
                item.strip().rstrip("/")
                for item in configured.split(",")
                if item.strip()
            ]
        if values:
            return tuple(values)

    return (
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    )


async def _require_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)
    state = _beta_state(request)
    try:
        payload = verify_token(secret=state.config.auth_secret, token=token)
    except TokenError as exc:
        raise AppError(
            status_code=401,
            code="UNAUTHORIZED",
            message=str(exc),
        ) from exc

    user = await state.store.get_user_by_id(payload.user_id)
    if user is None or str(user["status"]) != "active":
        raise AppError(
            status_code=401,
            code="UNAUTHORIZED",
            message="user is not active",
        )
    return user


def _extract_bearer_token(authorization: str | None) -> str:
    raw = str(authorization or "").strip()
    if not raw.lower().startswith("bearer "):
        raise AppError(
            status_code=401,
            code="UNAUTHORIZED",
            message="bearer token is required",
        )
    token = raw[7:].strip()
    if not token:
        raise AppError(
            status_code=401,
            code="UNAUTHORIZED",
            message="bearer token is required",
        )
    return token


async def _owned_session(
    request: Request,
    current_user: dict[str, Any],
    session_id: str,
) -> dict[str, Any]:
    normalized = str(session_id or "").strip()
    if not normalized:
        raise AppError(
            status_code=400,
            code="INVALID_REQUEST",
            message="session_id is required",
        )
    session = await _beta_state(request).store.get_session(normalized)
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


def _build_memory_search_service(agent: Any) -> MemorySearchService:
    return MemorySearchService(
        agent.memory_store,
        event_logger=EventLogger(agent.runtime_store),
        retrieval_config=RetrievalConfig(enable_keyword=True, enable_semantic=False),
        fusion_weights=FusionWeights(keyword_weight=1.0, semantic_weight=0.0),
    )


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
            "is_error": bool(result_payload.get("is_error")) if isinstance(result_payload, dict) else False,
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
        total_tokens = int(total_raw) if total_raw is not None else input_tokens + output_tokens
    except (TypeError, ValueError):
        return None

    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
    }


def _normalize_history_turn(turn: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(turn)
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
                    "action_type": str(item.get("action_type") or "").strip() or "unknown",
                    "title": str(item.get("title") or "").strip() or "Execution step",
                    "assistant_text": _normalize_optional_text(
                        str(item.get("assistant_text") or "")
                    ),
                    "tool_calls": _normalize_reasoning_tool_calls(item.get("tool_calls")),
                    "token_usage": _coerce_usage_map(item.get("token_usage")),
                    "duration_ms": _coerce_reasoning_duration(item),
                    "results": [],
                }
            )

    error_payload = payload.get("error")
    error_message = None
    if isinstance(error_payload, dict):
        error_message = _normalize_optional_text(str(error_payload.get("message") or ""))

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


async def _enrich_session_record(agent: Any, session: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(session)
    session_id = str(session.get("session_id") or "").strip()
    if not session_id:
        normalized["preview_text"] = None
        normalized["last_message_at"] = None
        normalized["turn_count"] = 0
        return normalized

    turns = await agent.get_history_turns(session_id)
    normalized_turns = [
        _normalize_history_turn(turn)
        for turn in turns
        if isinstance(turn, dict)
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


def _execute_command(payload: CommandRequest) -> dict[str, Any]:
    workspace_root = workspace_dir("marketing_db", require_exists=True)
    args = dict(payload.args or {})
    if "dataset_id" in args:
        args.pop("dataset_id", None)

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
                                {"metric_name": args.get("metric_name"), "error": str(exc)}
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
                                {"metric_name": args.get("metric_name"), "error": str(exc)}
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
