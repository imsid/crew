from __future__ import annotations

import json
import logging
import os
from contextlib import AsyncExitStack, asynccontextmanager
from dataclasses import dataclass
from typing import Any, Literal

import httpx
from fastapi import Depends, FastAPI, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from starlette.background import BackgroundTask

from .auth import TokenError, verify_token
from .host_client import MashHostClient, MashHostError
from .store import BetaStore

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


@dataclass(frozen=True)
class BetaConfig:
    allowed_users: set[str]
    auth_secret: str
    token_ttl_seconds: int
    database_url: str
    host_url: str
    host_api_key: str
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
            host_url=_require_env("CREW_HOST_URL"),
            host_api_key=_require_env("MASH_API_KEY"),
            cors_allowed_origins=_resolve_cors_allowed_origins(),
        )


@dataclass
class BetaAppState:
    store: BetaStore
    config: BetaConfig
    host_client: MashHostClient


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
    config: BetaConfig | None = None,
    host_transport: httpx.AsyncBaseTransport | None = None,
    host_app: FastAPI | None = None,
) -> FastAPI:
    resolved_config = config or BetaConfig.from_env()
    resolved_transport = host_transport
    if host_app is not None and resolved_transport is None:
        resolved_transport = httpx.ASGITransport(app=host_app)

    @asynccontextmanager
    async def _lifespan(application: FastAPI):
        store = BetaStore(resolved_config.database_url)
        host_client = MashHostClient(
            resolved_config.host_url,
            resolved_config.host_api_key,
            transport=resolved_transport,
        )
        async with AsyncExitStack() as stack:
            if host_app is not None:
                await stack.enter_async_context(
                    host_app.router.lifespan_context(host_app)
                )
            await store.open()
            await host_client.open()
            application.state.beta = BetaAppState(
                store=store,
                config=resolved_config,
                host_client=host_client,
            )
            try:
                yield
            finally:
                application.state.beta = None
                await host_client.close()
                await store.close()

    app = FastAPI(title="Crew API", version="0.1.0", lifespan=_lifespan)
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

    @app.exception_handler(MashHostError)
    async def _mash_host_error_handler(
        _: Request, exc: MashHostError
    ) -> JSONResponse:
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

    @app.api_route(
        "/host/{path:path}",
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    )
    async def host_passthrough(
        path: str,
        request: Request,
        current_user: dict[str, Any] = Depends(_require_user),
    ):
        del current_user
        normalized_path = path.lstrip("/")
        allowed = (
            "api/v1/agent",
            "api/v1/hosts",
            "api/v1/workflow",
            "api/v1/tools",
            "api/v1/skills",
        )
        if not any(
            normalized_path == prefix or normalized_path.startswith(prefix + "/")
            for prefix in allowed
        ):
            raise AppError(
                status_code=404,
                code="HOST_PATH_NOT_ALLOWED",
                message="Mash host path is not exposed by crew-api",
            )
        state = _beta_state(request)
        body = await request.body()
        excluded = {
            "authorization",
            "cookie",
            "host",
            "content-length",
            "connection",
            "transfer-encoding",
            "keep-alive",
            "proxy-authenticate",
            "proxy-authorization",
            "te",
            "trailer",
            "upgrade",
        }
        headers = {
            key: value
            for key, value in request.headers.items()
            if key.lower() not in excluded
        }
        upstream_request = state.host_client.client.build_request(
            request.method,
            f"/{normalized_path}",
            params=request.query_params,
            content=body,
            headers=headers,
        )
        try:
            upstream = await state.host_client.client.send(
                upstream_request, stream=True
            )
        except httpx.HTTPError as exc:
            raise AppError(
                status_code=502,
                code="MASH_PROXY_ERROR",
                message=f"Mash host request failed: {exc}",
            ) from exc
        response_headers = {
            key: value
            for key, value in upstream.headers.items()
            if key.lower() not in excluded
        }
        return StreamingResponse(
            upstream.aiter_raw(),
            status_code=upstream.status_code,
            headers=response_headers,
            background=BackgroundTask(upstream.aclose),
        )

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


def _require_env(name: str) -> str:
    configured = str(os.getenv(name) or "").strip()
    if configured:
        return configured
    raise RuntimeError(f"{name} must be set for the beta backend")


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


async def _resolve_active_user(
    state: BetaAppState, token: str
) -> dict[str, Any] | None:
    try:
        payload = verify_token(secret=state.config.auth_secret, token=token)
    except TokenError:
        return None
    user = await state.store.get_user_by_id(payload.user_id)
    if user is None or str(user["status"]) != "active":
        return None
    return user


async def _require_user(
    request: Request,
    authorization: str | None = Header(default=None),
) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)
    user = await _resolve_active_user(_beta_state(request), token)
    if user is None:
        raise AppError(
            status_code=401,
            code="UNAUTHORIZED",
            message="a valid crew token is required",
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
