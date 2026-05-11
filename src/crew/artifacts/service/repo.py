"""Repository helpers for artifact files."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from .constants import ARTIFACT_REQUIRED_FRONTMATTER_FIELDS
from .context import ToolContext
from .parser import parse_and_validate_artifact
from .pathing import (
    artifact_format_for_path,
    iter_artifact_paths,
    list_existing_artifact_paths,
    normalize_artifact_format,
    resolve_artifact_path,
)


def list_artifacts(
    context: ToolContext,
    *,
    kind_filter: Optional[str] = None,
    limit: Optional[int] = None,
) -> Dict[str, Any]:
    artifacts_root = context["artifacts_root"]
    root = context["root"]
    normalized_kind = str(kind_filter).strip() if isinstance(kind_filter, str) and kind_filter.strip() else None
    normalized_limit = None if limit is None else max(1, int(limit))

    entries: List[Dict[str, Any]] = []
    for path in iter_artifact_paths(artifacts_root):
        payload = _read_artifact_payload(path)
        frontmatter = payload["frontmatter"]
        if normalized_kind and frontmatter["kind"] != normalized_kind:
            continue
        entries.append(
            {
                "artifact_id": frontmatter["artifact_id"],
                "format": frontmatter["format"],
                "title": frontmatter["title"],
                "description": frontmatter["description"],
                "kind": frontmatter["kind"],
                "source_agent": frontmatter["source_agent"],
                "session_id": frontmatter["session_id"],
                "updated_at": frontmatter["updated_at"],
                "path": path.relative_to(root).as_posix(),
            }
        )
        if normalized_limit is not None and len(entries) >= normalized_limit:
            break

    return {
        "root": artifacts_root.relative_to(root).as_posix(),
        "kind": normalized_kind,
        "count": len(entries),
        "artifacts": entries,
    }


def read_artifact(context: ToolContext, artifact_id: Any) -> Dict[str, Any]:
    root = context["root"]
    path, normalized_id = resolve_artifact_path(context, artifact_id)
    if not path.exists() or not path.is_file():
        raise ValueError(f"artifact file not found: {path.relative_to(root).as_posix()}")

    content = path.read_text(encoding="utf-8")
    payload = parse_and_validate_artifact(
        content,
        default_format=artifact_format_for_path(path),
    )
    frontmatter = payload["frontmatter"]
    return {
        "artifact_id": normalized_id,
        "format": frontmatter["format"],
        "path": path.relative_to(root).as_posix(),
        "size": len(content),
        "frontmatter": frontmatter,
        "sections": payload["sections"],
        "ordered_sections": payload["ordered_sections"],
        "content": content,
    }


def search_artifacts(
    context: ToolContext,
    *,
    query: str,
    limit: int,
) -> Dict[str, Any]:
    if not isinstance(query, str) or not query.strip():
        raise ValueError("query is required")
    normalized_query = query.strip()
    query_tokens = [token for token in normalized_query.lower().split() if token]
    if not query_tokens:
        raise ValueError("query must contain searchable text")

    matches: List[Dict[str, Any]] = []
    for path in iter_artifact_paths(context["artifacts_root"]):
        payload = _read_artifact_payload(path)
        frontmatter = payload["frontmatter"]
        sections = payload["sections"]
        haystacks = {
            "title": frontmatter["title"].lower(),
            "description": frontmatter["description"].lower(),
            "kind": frontmatter["kind"].lower(),
            "summary": (
                str(sections.get("Summary", "")).lower()
                if frontmatter["format"] == "markdown"
                else ""
            ),
            "content": payload["content"].lower(),
        }
        score = 0
        for token in query_tokens:
            if token in haystacks["title"]:
                score += 5
            if token in haystacks["description"]:
                score += 3
            if token in haystacks["summary"]:
                score += 4
            if token in haystacks["kind"]:
                score += 2
            if token in haystacks["content"]:
                score += 1
        if score <= 0:
            continue
        matches.append(
            {
                "artifact_id": frontmatter["artifact_id"],
                "format": frontmatter["format"],
                "title": frontmatter["title"],
                "description": frontmatter["description"],
                "kind": frontmatter["kind"],
                "source_agent": frontmatter["source_agent"],
                "session_id": frontmatter["session_id"],
                "updated_at": frontmatter["updated_at"],
                "score": score,
                "preview": _build_preview(payload),
                "path": path.relative_to(context["root"]).as_posix(),
            }
        )

    matches.sort(
        key=lambda item: (
            -int(item["score"]),
            str(item["updated_at"]),
            str(item["artifact_id"]),
        )
    )
    return {
        "query": normalized_query,
        "count": min(len(matches), limit),
        "results": matches[:limit],
    }


def write_new_artifact_file(
    context: ToolContext,
    artifact_content: Any = None,
    *,
    artifact_document: Any = None,
    artifact_markdown: Any = None,
    format: Any = None,
) -> Dict[str, Any]:
    root = context["root"]
    raw_document = _coalesce_artifact_document(
        artifact_document=artifact_document,
        artifact_content=artifact_content,
        artifact_markdown=artifact_markdown,
    )
    normalized_format = _resolve_requested_format(
        raw_document,
        requested_format=format,
        artifact_markdown=artifact_markdown,
    )
    artifact_document_text, payload = _normalize_artifact_document(
        raw_document,
        artifact_format=normalized_format,
    )
    frontmatter = payload["frontmatter"]
    existing = list_existing_artifact_paths(context, frontmatter["artifact_id"])
    if existing:
        raise ValueError(
            f"artifact already exists: {existing[0].relative_to(root).as_posix()}"
        )
    path, artifact_id = resolve_artifact_path(
        context,
        frontmatter["artifact_id"],
        format=frontmatter["format"],
    )

    path.write_text(artifact_document_text.rstrip() + "\n", encoding="utf-8")
    return {
        "status": "written",
        "artifact_id": artifact_id,
        "format": frontmatter["format"],
        "title": frontmatter["title"],
        "path": path.relative_to(root).as_posix(),
        "updated_at": frontmatter["updated_at"],
        "bytes_written": len(artifact_document_text.encode("utf-8")),
        "sha256": hashlib.sha256(artifact_document_text.encode("utf-8")).hexdigest(),
    }


def _read_artifact_payload(path: Path) -> Dict[str, Any]:
    content = path.read_text(encoding="utf-8")
    payload = parse_and_validate_artifact(
        content,
        default_format=artifact_format_for_path(path),
    )
    payload["content"] = content
    return payload


def _build_preview(payload: Dict[str, Any]) -> str:
    sections = payload["sections"]
    if payload["frontmatter"]["format"] == "markdown" and "Summary" in sections and sections["Summary"].strip():
        return sections["Summary"].strip()[:200]
    return str(payload["frontmatter"]["description"])[:200]


def _coalesce_artifact_document(
    *,
    artifact_document: Any,
    artifact_content: Any,
    artifact_markdown: Any,
) -> str:
    for candidate in (artifact_document, artifact_content, artifact_markdown):
        if candidate is not None:
            return str(candidate)
    raise ValueError(
        "artifact content is required; provide artifact_document, artifact_content, or artifact_markdown"
    )


def _resolve_requested_format(
    artifact_document: str,
    *,
    requested_format: Any,
    artifact_markdown: Any,
) -> str:
    if requested_format is not None:
        return normalize_artifact_format(requested_format)
    if artifact_markdown is not None:
        return "markdown"
    parsed = parse_and_validate_artifact(artifact_document)
    return normalize_artifact_format(parsed["frontmatter"]["format"])


def _normalize_artifact_document(
    artifact_document: str,
    *,
    artifact_format: str,
) -> tuple[str, Dict[str, Any]]:
    payload = parse_and_validate_artifact(
        artifact_document,
        default_format=artifact_format,
    )
    frontmatter = dict(payload["frontmatter"])
    frontmatter["updated_at"] = _current_utc_timestamp()
    frontmatter["format"] = normalize_artifact_format(frontmatter["format"])
    payload["frontmatter"] = frontmatter
    return _render_artifact_document(frontmatter, str(payload["body"])), payload


def _current_utc_timestamp() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _render_artifact_document(frontmatter: Dict[str, Any], body: str) -> str:
    lines = ["---"]
    for field in ARTIFACT_REQUIRED_FRONTMATTER_FIELDS:
        lines.append(f"{field}: {frontmatter[field]}")
    for key in sorted(frontmatter):
        if key not in ARTIFACT_REQUIRED_FRONTMATTER_FIELDS:
            lines.append(f"{key}: {frontmatter[key]}")
    lines.extend(["---", "", body.strip()])
    return "\n".join(lines).rstrip() + "\n"
