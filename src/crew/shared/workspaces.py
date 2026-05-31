from __future__ import annotations

from pathlib import Path
from typing import Any

from .runtime_paths import WORKSPACE_NAME_RE, selected_workspace_name, workspace_dir, workspace_root_dir


def resolve_workspace(workspace_id: str) -> dict[str, Any]:
    name = selected_workspace_name(workspace_id)
    path = workspace_dir(name, require_exists=True)
    return _workspace_payload(name, path)


def list_workspaces() -> list[dict[str, Any]]:
    root = workspace_root_dir()
    if not root.exists():
        return []
    items: list[dict[str, Any]] = []
    for path in sorted(root.iterdir(), key=lambda item: item.name):
        if not path.is_dir() or not WORKSPACE_NAME_RE.fullmatch(path.name):
            continue
        items.append(_workspace_payload(path.name, path.resolve()))
    return items


def _workspace_payload(workspace_id: str, path: Path) -> dict[str, Any]:
    return {
        "workspace_id": workspace_id,
        "dataset_id": workspace_id,
        "path": path.as_posix(),
    }
