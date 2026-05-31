from __future__ import annotations

import contextvars
import uuid
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

try:  # pragma: no cover - depends on Mash runtime internals
    from mash.logging import get_request_id
except Exception:  # pragma: no cover
    get_request_id = None  # type: ignore[assignment]

from .runtime_paths import selected_workspace_name, workspace_dir

_workspace_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "crew_workspace_id",
    default=None,
)
_request_workspaces: dict[str, str] = {}


@contextmanager
def bound_workspace(workspace_id: str) -> Iterator[None]:
    normalized = selected_workspace_name(workspace_id)
    token = _workspace_id.set(normalized)
    try:
        yield
    finally:
        _workspace_id.reset(token)


def register_request_workspace(request_id: str | None, workspace_id: str) -> None:
    normalized_request_id = str(request_id or "").strip()
    if not normalized_request_id:
        return
    _request_workspaces[normalized_request_id] = selected_workspace_name(workspace_id)


def register_workflow_task_workspaces(
    *,
    workflow_id: str,
    run_id: str,
    tasks: list[dict[str, object]],
    workspace_id: str,
) -> None:
    normalized_workspace = selected_workspace_name(workspace_id)
    for task in tasks:
        task_id = str(task.get("task_id") or "").strip()
        agent_id = str(task.get("agent_id") or "").strip()
        if not task_id or not agent_id:
            continue
        session_id = (
            f"workflow:{workflow_id}:task:{task_id}:run:{run_id}"
        )
        request_id = str(
            uuid.uuid5(uuid.NAMESPACE_URL, f"mash.workflow.task:{agent_id}:{session_id}")
        )
        _request_workspaces[request_id] = normalized_workspace


def current_workspace_id() -> str:
    direct = _workspace_id.get()
    if direct:
        return direct
    if get_request_id is not None:
        request_id = str(get_request_id() or "").strip()
        if request_id and request_id in _request_workspaces:
            return _request_workspaces[request_id]
    raise RuntimeError("Crew workspace context is not available")


def current_workspace_dir() -> Path:
    return workspace_dir(current_workspace_id(), require_exists=True)
