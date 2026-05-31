from __future__ import annotations

from fastapi import FastAPI

from .auth import router as auth_router
from .command import router as command_router
from .sessions import router as sessions_router
from .workspace import router as workspace_router
from .workflow import router as workflow_router


def include_routes(app: FastAPI) -> None:
    app.include_router(auth_router)
    app.include_router(workspace_router)
    app.include_router(workflow_router, prefix="/workspace/{workspace_id}")
    app.include_router(sessions_router, prefix="/workspace/{workspace_id}")
    app.include_router(command_router, prefix="/workspace/{workspace_id}")
