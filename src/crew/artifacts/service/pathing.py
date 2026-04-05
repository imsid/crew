"""Path and identifier helpers for artifact services."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Tuple

from .constants import ARTIFACT_ID_RE
from .context import ToolContext


def normalize_artifact_id(value: Any, field_name: str = "artifact_id") -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} is required")
    normalized = value.strip()
    if normalized.endswith(".md"):
        normalized = normalized[:-3]
    if "/" in normalized or "\\" in normalized:
        raise ValueError(f"{field_name} must not contain path separators")
    if not ARTIFACT_ID_RE.fullmatch(normalized):
        raise ValueError(
            f"{field_name} must match regex {ARTIFACT_ID_RE.pattern}"
        )
    return normalized


def resolve_artifact_path(context: ToolContext, artifact_id: Any) -> Tuple[Path, str]:
    normalized_id = normalize_artifact_id(artifact_id)
    artifacts_root = context["artifacts_root"].resolve()
    resolved = (artifacts_root / f"{normalized_id}.md").resolve()
    if not resolved.is_relative_to(artifacts_root):
        raise ValueError("artifact path resolved outside artifact root")
    return resolved, normalized_id
