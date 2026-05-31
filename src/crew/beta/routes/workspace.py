from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from ...shared.workspaces import list_workspaces, resolve_workspace
from ..app import AppError, _require_user

router = APIRouter()


@router.get("/workspace")
async def list_available_workspaces(
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    del current_user
    return {"data": {"workspaces": list_workspaces()}}


@router.get("/workspace/{workspace_id}")
async def get_workspace(
    workspace_id: str,
    current_user: dict[str, Any] = Depends(_require_user),
) -> dict[str, Any]:
    del current_user
    try:
        workspace = resolve_workspace(workspace_id)
    except ValueError as exc:
        raise AppError(
            status_code=404,
            code="WORKSPACE_NOT_FOUND",
            message=str(exc),
        ) from exc
    return {"data": workspace}
