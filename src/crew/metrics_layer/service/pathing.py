"""Path and identifier helpers for metrics layer services."""

from __future__ import annotations

from pathlib import Path
from typing import Any, List, Tuple

from .constants import IDENTIFIER_RE, KIND_TO_SUBDIR
from .context import ToolContext


def normalize_identifier(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} is required")
    normalized = value.strip()
    if normalized.endswith(".yml"):
        normalized = normalized[:-4]
    if "/" in normalized or "\\" in normalized:
        raise ValueError(f"{field_name} must not contain path separators")
    if not IDENTIFIER_RE.fullmatch(normalized):
        raise ValueError(f"{field_name} must match regex {IDENTIFIER_RE.pattern}")
    return normalized


def ensure_kind(raw_kind: Any) -> str:
    if not isinstance(raw_kind, str):
        raise ValueError("kind is required")
    kind = raw_kind.strip().lower()
    if kind not in KIND_TO_SUBDIR:
        raise ValueError("kind must be one of: source, metric")
    return kind


def resolve_workspace_dataset_id(context: ToolContext, dataset_id: Any = None) -> str:
    workspace_dataset = normalize_identifier(context["root"].name, "workspace")
    if dataset_id is None:
        return workspace_dataset
    normalized_dataset = normalize_identifier(dataset_id, "dataset_id")
    if normalized_dataset != workspace_dataset:
        raise ValueError(
            f"dataset_id '{normalized_dataset}' does not match selected workspace '{workspace_dataset}'"
        )
    return workspace_dataset


def resolve_config_path(
    context: ToolContext,
    kind: str,
    name: Any,
    dataset_id: Any = None,
) -> Tuple[Path, str, str]:
    normalized_dataset = resolve_workspace_dataset_id(context, dataset_id)
    normalized_name = normalize_identifier(name, "name")
    subdir = KIND_TO_SUBDIR[kind]
    metrics_root = context["metrics_root"].resolve()
    resolved = (metrics_root / subdir / f"{normalized_name}.yml").resolve()
    if not resolved.is_relative_to(metrics_root):
        raise ValueError("config path resolved outside metrics root")
    return resolved, normalized_dataset, normalized_name


def normalize_identifier_list(
    raw_value: Any, field_name: str, required: bool = False
) -> List[str]:
    if raw_value is None:
        if required:
            raise ValueError(f"{field_name} is required")
        return []
    if not isinstance(raw_value, list):
        raise ValueError(f"{field_name} must be an array")

    result: List[str] = []
    seen = set()
    for value in raw_value:
        normalized = normalize_identifier(value, f"{field_name}[]")
        if normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    if required and not result:
        raise ValueError(f"{field_name} must include at least one value")
    return result
