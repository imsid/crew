from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request

from ..auth import issue_token
from ..app import (
    DATA_AGENT_ID,
    LOGGER,
    AppError,
    LoginHandleRequest,
    _beta_state,
    _normalize_username,
    _require_user,
    _serialize_user,
)

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict[str, Any]:
    state = _beta_state(request)
    return {
        "data": {
            "status": "ok",
            "service": "crew-beta-bff",
            "primary_agent_id": DATA_AGENT_ID,
        }
    }


@router.post("/login/handle")
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


@router.get("/me")
async def me(
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    return {"data": {"user": _serialize_user(current_user)}}
