"""Repository helpers for artifact files."""

from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any, Dict, List, Optional

from .context import ToolContext
from .parser import parse_and_validate_artifact
from .pathing import resolve_artifact_path


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
    for path in sorted(artifacts_root.glob("*.md")):
        payload = _read_artifact_payload(path)
        frontmatter = payload["frontmatter"]
        if normalized_kind and frontmatter["kind"] != normalized_kind:
            continue
        entries.append(
            {
                "artifact_id": frontmatter["artifact_id"],
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
    payload = parse_and_validate_artifact(content)
    frontmatter = payload["frontmatter"]
    return {
        "artifact_id": normalized_id,
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
    for path in sorted(context["artifacts_root"].glob("*.md")):
        payload = _read_artifact_payload(path)
        frontmatter = payload["frontmatter"]
        sections = payload["sections"]
        haystacks = {
            "title": frontmatter["title"].lower(),
            "description": frontmatter["description"].lower(),
            "kind": frontmatter["kind"].lower(),
            "summary": str(sections.get("Summary", "")).lower(),
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


def write_new_artifact_file(context: ToolContext, artifact_markdown: str) -> Dict[str, Any]:
    root = context["root"]
    payload = parse_and_validate_artifact(artifact_markdown)
    frontmatter = payload["frontmatter"]
    path, artifact_id = resolve_artifact_path(context, frontmatter["artifact_id"])
    if path.exists():
        raise ValueError(f"artifact already exists: {path.relative_to(root).as_posix()}")

    path.write_text(artifact_markdown.rstrip() + "\n", encoding="utf-8")
    return {
        "status": "written",
        "artifact_id": artifact_id,
        "title": frontmatter["title"],
        "path": path.relative_to(root).as_posix(),
        "bytes_written": len(artifact_markdown.encode("utf-8")),
        "sha256": hashlib.sha256(artifact_markdown.encode("utf-8")).hexdigest(),
    }


def _read_artifact_payload(path: Path) -> Dict[str, Any]:
    content = path.read_text(encoding="utf-8")
    payload = parse_and_validate_artifact(content)
    payload["content"] = content
    return payload


def _build_preview(payload: Dict[str, Any]) -> str:
    sections = payload["sections"]
    if "Summary" in sections and sections["Summary"].strip():
        return sections["Summary"].strip()[:200]
    return str(payload["frontmatter"]["description"])[:200]
