"""Path and identifier helpers for artifact services."""

from __future__ import annotations

from pathlib import Path
from typing import Any, List, Tuple

from .constants import (
    ARTIFACT_EXTENSION_TO_FORMAT,
    ARTIFACT_FORMAT_TO_EXTENSION,
    ARTIFACT_ID_RE,
    SUPPORTED_ARTIFACT_FORMATS,
)
from .context import ToolContext


def normalize_artifact_id(value: Any, field_name: str = "artifact_id") -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} is required")
    normalized = value.strip()
    lowered = normalized.lower()
    for extension in ARTIFACT_EXTENSION_TO_FORMAT:
        if lowered.endswith(extension):
            normalized = normalized[: -len(extension)]
            break
    if "/" in normalized or "\\" in normalized:
        raise ValueError(f"{field_name} must not contain path separators")
    if not ARTIFACT_ID_RE.fullmatch(normalized):
        raise ValueError(
            f"{field_name} must match regex {ARTIFACT_ID_RE.pattern}"
        )
    return normalized


def normalize_artifact_format(
    value: Any,
    *,
    field_name: str = "format",
    default: str | None = None,
) -> str:
    candidate = default if value is None else value
    if not isinstance(candidate, str) or not candidate.strip():
        raise ValueError(f"{field_name} is required")
    normalized = candidate.strip().lower()
    if normalized not in SUPPORTED_ARTIFACT_FORMATS:
        supported = ", ".join(SUPPORTED_ARTIFACT_FORMATS)
        raise ValueError(f"{field_name} must be one of: {supported}")
    return normalized


def artifact_extension_for_format(artifact_format: Any) -> str:
    normalized = normalize_artifact_format(artifact_format)
    return ARTIFACT_FORMAT_TO_EXTENSION[normalized]


def artifact_format_for_path(path: Path) -> str:
    try:
        return ARTIFACT_EXTENSION_TO_FORMAT[path.suffix.lower()]
    except KeyError as exc:
        raise ValueError(f"unsupported artifact extension: {path.suffix}") from exc


def list_existing_artifact_paths(context: ToolContext, artifact_id: Any) -> List[Path]:
    normalized_id = normalize_artifact_id(artifact_id)
    artifacts_root = context["artifacts_root"].resolve()
    matches: List[Path] = []
    for extension in ARTIFACT_EXTENSION_TO_FORMAT:
        resolved = (artifacts_root / f"{normalized_id}{extension}").resolve()
        if not resolved.is_relative_to(artifacts_root):
            raise ValueError("artifact path resolved outside artifact root")
        if resolved.exists() and resolved.is_file():
            matches.append(resolved)
    return matches


def iter_artifact_paths(artifacts_root: Path) -> List[Path]:
    paths = [
        path
        for extension in ARTIFACT_EXTENSION_TO_FORMAT
        for path in artifacts_root.glob(f"*{extension}")
        if path.is_file()
    ]
    return sorted(paths, key=lambda path: (path.stem, path.suffix))


def resolve_artifact_path(
    context: ToolContext,
    artifact_id: Any,
    *,
    format: Any | None = None,
) -> Tuple[Path, str]:
    normalized_id = normalize_artifact_id(artifact_id)
    artifacts_root = context["artifacts_root"].resolve()
    if format is not None:
        extension = artifact_extension_for_format(format)
        resolved = (artifacts_root / f"{normalized_id}{extension}").resolve()
        if not resolved.is_relative_to(artifacts_root):
            raise ValueError("artifact path resolved outside artifact root")
        return resolved, normalized_id

    matches = list_existing_artifact_paths(context, normalized_id)
    if not matches:
        default_extension = artifact_extension_for_format("markdown")
        missing = artifacts_root / f"{normalized_id}{default_extension}"
        raise ValueError(f"artifact file not found: {missing.relative_to(context['root']).as_posix()}")
    if len(matches) > 1:
        conflict_paths = ", ".join(
            path.relative_to(context["root"]).as_posix() for path in matches
        )
        raise ValueError(f"multiple artifact files share artifact_id '{normalized_id}': {conflict_paths}")
    return matches[0], normalized_id
