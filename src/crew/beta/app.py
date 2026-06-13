from __future__ import annotations

import json
import logging
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any, Literal

from fastapi import FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from mash.api import MashHostConfig
from mash.api import create_app as create_mash_api_app
from mash.api.logging import PostgresAPIEventStore
from mash.api.routes.common import AppRuntimeState
from mash.runtime import AgentPool
from pydantic import BaseModel, Field

from ..app import build_pool, define_default_host
from ..shared.workspace_context import register_request_workspace
from ..shared.runtime_context import clear_runtime_context, set_runtime_context
from .auth import TokenError, verify_token
from .store import BetaStore
from ..workflow.service import WorkflowService

LOGGER = logging.getLogger(__name__)
DATA_AGENT_ID = "data"


class LoginHandleRequest(BaseModel):
    username: str


class CreateSessionRequest(BaseModel):
    label: str | None = None


class SendMessageRequest(BaseModel):
    message: str


class CommandRequest(BaseModel):
    surface: Literal["metrics", "experiments", "artifacts", "skills", "workflows"]
    operation: str
    args: dict[str, Any] = Field(default_factory=dict)


class InteractionResponseRequest(BaseModel):
    interaction_id: str
    response: Any


class WorkflowRunRequest(BaseModel):
    dedup_key: str | None = None
    input: dict[str, Any] = Field(default_factory=dict)


@dataclass(frozen=True)
class BetaConfig:
    allowed_users: set[str]
    auth_secret: str
    token_ttl_seconds: int
    database_url: str
    cors_allowed_origins: tuple[str, ...]

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
    host: AgentPool
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
    host: AgentPool | None = None,
    config: BetaConfig | None = None,
) -> FastAPI:
    resolved_host = host or build_pool()
    resolved_config = config or BetaConfig.from_env()

    # The mash host API is built once and mounted at /host (below) so the CLI
    # and stock mash tooling reach the same in-process host the BFF uses. It is
    # also driven internally over ASGITransport for the proxy routes.
    mash_api_config = MashHostConfig()
    mash_api_app = create_mash_api_app(resolved_host, config=mash_api_config)

    @asynccontextmanager
    async def _lifespan(application: FastAPI):
        store = BetaStore(resolved_config.database_url)
        await store.open()
        resolved_host.configure_runtime_database_url(
            mash_api_config.resolved_runtime_database_url()
        )
        await resolved_host.start()
        # Bind each request to its session's workspace. Requests arrive both
        # from the BFF's own routes and from the CLI shell driving the mounted
        # /host API; both execute in this process, so wrapping the pool's
        # submit registers request_id -> workspace from the session's row,
        # keeping the data agent's tools scoped to the right workspace.
        _original_submit = resolved_host.submit_host_request

        async def _submit_host_request(host_id, *, message, session_id, structured_output=None):
            accepted = await _original_submit(
                host_id,
                message=message,
                session_id=session_id,
                structured_output=structured_output,
            )
            request_id = accepted.get("request_id") if isinstance(accepted, dict) else None
            workspace = await store.get_workspace_for_session(session_id)
            if request_id and workspace:
                register_request_workspace(str(request_id), workspace)
            return accepted

        resolved_host.submit_host_request = _submit_host_request  # type: ignore[method-assign]
        # Mounted sub-app lifespans do not run, so populate runtime_state the
        # way create_app's own lifespan would. api_key stays None: the mash API
        # is exposed only on the BFF's port for local CLI use.
        api_event_store = PostgresAPIEventStore(
            mash_api_config.resolved_runtime_database_url() or ""
        )
        await api_event_store.open()
        mash_api_app.state.runtime_state = AppRuntimeState(
            pool=resolved_host,
            api_event_store=api_event_store,
            api_key=None,
            observability_enabled=mash_api_config.enable_observability,
            default_events_limit=max(1, int(mash_api_config.default_events_limit)),
            default_search_limit=max(1, int(mash_api_config.default_search_limit)),
        )
        primary_agent_id = define_default_host(resolved_host).primary
        workflow = WorkflowService(
            store=store,
            host=resolved_host,
            primary_agent_id=primary_agent_id,
        )
        set_runtime_context(
            store=store,
            host=resolved_host,
            primary_agent_id=primary_agent_id,
            workflow=workflow,
        )

        await workflow.republish_published_workflows()
        application.state.beta = BetaAppState(
            host=resolved_host,
            store=store,
            config=resolved_config,
            mash_api_app=mash_api_app,
        )
        try:
            yield
        finally:
            try:
                state = getattr(application.state, "beta", None)
                if state is not None:
                    await state.store.close()
                await api_event_store.close()
                await resolved_host.close()
            finally:
                clear_runtime_context()
                application.state.beta = None

    app = FastAPI(title="Crew Beta BFF", version="0.1.0", lifespan=_lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(resolved_config.cors_allowed_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Expose the shared mash host API (and telemetry UI) on the BFF's port so
    # the CLI and stock mash tooling drive the same host: the mash API lives
    # under /host (e.g. /host/api/v1/..., /host/telemetry).
    app.mount("/host", mash_api_app)

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

    from .routes import include_routes

    include_routes(app)

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
    return {_normalize_username(item) for item in raw.split(",") if str(item).strip()}


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
            values = [
                str(item).strip().rstrip("/") for item in parsed if str(item).strip()
            ]
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
