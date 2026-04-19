"""Experimentation schema loading helpers."""

from __future__ import annotations

from pathlib import Path
from typing import Tuple

from ...metrics_layer.service.yaml_schema import validate_yaml_text
from ...metrics_layer.service.yaml_schema import describe_schema_path
from .context import ToolContext


def load_experimentation_schema_text(
    context: ToolContext, schema_kind: str
) -> Tuple[Path, str]:
    schema_root = context["schema_root"]
    root = context["root"]
    schema_path = schema_root / f"{schema_kind}.schema.yml"
    if not schema_path.exists() or not schema_path.is_file():
        raise ValueError(
            f"schema not found: {describe_schema_path(schema_path, root)}"
        )
    return schema_path, schema_path.read_text(encoding="utf-8")


__all__ = ["load_experimentation_schema_text", "validate_yaml_text"]
