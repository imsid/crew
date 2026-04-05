"""Context helpers for artifact tools."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from ...metrics_layer.service.context import resolve_workspace_path
from .constants import ARTIFACTS_ROOT, ARTIFACT_SCHEMA_ROOT

ToolContext = Dict[str, Any]


def build_tool_context(workspace_root: Path) -> ToolContext:
    root = workspace_root.resolve()
    artifacts_root = resolve_workspace_path(ARTIFACTS_ROOT.as_posix(), root)
    artifacts_root.mkdir(parents=True, exist_ok=True)
    return {
        "root": root,
        "artifacts_root": artifacts_root,
        "schema_root": ARTIFACT_SCHEMA_ROOT.resolve(),
    }
