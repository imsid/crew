"""Path helpers for experimentation configs."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Tuple

from ...metrics_layer.service.pathing import (
    normalize_identifier,
    resolve_workspace_dataset_id,
)
from .context import ToolContext


def resolve_experiment_config_path(
    context: ToolContext, name: Any, dataset_id: Any = None
) -> Tuple[Path, str, str]:
    normalized_dataset = resolve_workspace_dataset_id(context, dataset_id)
    normalized_name = normalize_identifier(name, "name")
    experimentation_root = context["experimentation_root"].resolve()
    resolved = (experimentation_root / "experiments" / f"{normalized_name}.yml").resolve()
    if not resolved.is_relative_to(experimentation_root):
        raise ValueError("config path resolved outside experimentation root")
    return resolved, normalized_dataset, normalized_name
