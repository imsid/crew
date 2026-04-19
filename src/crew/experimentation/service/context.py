"""Context helpers for experimentation tools."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from ...metrics_layer.service.context import resolve_workspace_path
from ...metrics_layer.service.constants import METRICS_LAYER_CONFIG_ROOT
from .constants import EXPERIMENTATION_CONFIG_ROOT, EXPERIMENTATION_SCHEMA_ROOT

ToolContext = Dict[str, Any]


def build_tool_context(workspace_root: Path) -> ToolContext:
    root = workspace_root.resolve()
    experimentation_root = resolve_workspace_path(
        EXPERIMENTATION_CONFIG_ROOT.as_posix(), root
    )
    experimentation_root.mkdir(parents=True, exist_ok=True)
    metrics_root = resolve_workspace_path(METRICS_LAYER_CONFIG_ROOT.as_posix(), root)
    metrics_root.mkdir(parents=True, exist_ok=True)
    return {
        "root": root,
        "experimentation_root": experimentation_root,
        "metrics_root": metrics_root,
        "schema_root": EXPERIMENTATION_SCHEMA_ROOT.resolve(),
    }

