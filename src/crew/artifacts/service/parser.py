"""Markdown parsing and validation helpers for artifacts."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from html.parser import HTMLParser
import re
from typing import Any, Dict, List

import yaml

from .constants import (
    ARTIFACT_REQUIRED_FRONTMATTER_FIELDS,
    ARTIFACT_REQUIRED_SECTIONS,
)
from .pathing import normalize_artifact_format, normalize_artifact_id


@dataclass(frozen=True)
class ParsedArtifact:
    frontmatter: Dict[str, Any]
    body: str
    format: str
    sections: Dict[str, str]
    ordered_sections: List[str]


BODY_PATTERN = re.compile(r"<body\b[^>]*>(?P<content>[\s\S]*?)</body>", re.IGNORECASE)
CONTENT_TAG_PATTERN = re.compile(
    r"<(svg|canvas|table|img|video|audio|iframe|object|embed)\b",
    re.IGNORECASE,
)


class _ArtifactHTMLInspector(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.has_visible_content = False
        self.has_embedded_media = False
        self.external_dependency_error: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_map = {key.lower(): value for key, value in attrs}
        normalized_tag = tag.lower()
        if normalized_tag in {"svg", "canvas", "table", "img", "video", "audio"}:
            self.has_embedded_media = True
        if normalized_tag == "script" and attr_map.get("src"):
            self.external_dependency_error = "html artifacts must not use external script src dependencies"
        if normalized_tag == "link" and attr_map.get("href"):
            self.external_dependency_error = "html artifacts must not use external stylesheet links"

    def handle_data(self, data: str) -> None:
        if data.strip():
            self.has_visible_content = True


def parse_artifact_document(
    artifact_text: str,
    *,
    default_format: str | None = None,
) -> ParsedArtifact:
    if not isinstance(artifact_text, str) or not artifact_text.strip():
        raise ValueError("artifact document must be a non-empty string")

    lines = artifact_text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("artifact document must start with YAML frontmatter")

    end_idx = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_idx = idx
            break
    if end_idx is None:
        raise ValueError("artifact frontmatter is missing closing ---")

    frontmatter_text = "\n".join(lines[1:end_idx])
    try:
        frontmatter = yaml.safe_load(frontmatter_text) or {}
    except Exception as exc:
        raise ValueError(f"failed to parse artifact frontmatter: {exc}") from exc
    if not isinstance(frontmatter, dict):
        raise ValueError("artifact frontmatter must parse to an object")

    body_lines = lines[end_idx + 1 :]
    body = "\n".join(body_lines).strip()
    artifact_format = normalize_artifact_format(
        frontmatter.get("format"),
        default=default_format or "markdown",
    )
    sections = _parse_sections(body_lines) if artifact_format == "markdown" else {}
    return ParsedArtifact(
        frontmatter=frontmatter,
        body=body,
        format=artifact_format,
        sections=sections,
        ordered_sections=list(sections.keys()),
    )


def validate_parsed_artifact(parsed: ParsedArtifact) -> Dict[str, Any]:
    frontmatter = dict(parsed.frontmatter)
    frontmatter["format"] = parsed.format
    for field in ARTIFACT_REQUIRED_FRONTMATTER_FIELDS:
        value = frontmatter.get(field)
        if value is None:
            raise ValueError(f"frontmatter field '{field}' is required")
        normalized_value = _normalize_frontmatter_value(field, value)
        if not normalized_value:
            raise ValueError(f"frontmatter field '{field}' is required")
        frontmatter[field] = normalized_value

    frontmatter["artifact_id"] = normalize_artifact_id(frontmatter["artifact_id"])
    frontmatter["format"] = normalize_artifact_format(frontmatter["format"])

    if frontmatter["format"] == "markdown":
        normalized_sections = {
            name.strip().lower(): content for name, content in parsed.sections.items()
        }
        for required in ARTIFACT_REQUIRED_SECTIONS:
            content = normalized_sections.get(required)
            if not isinstance(content, str) or not content.strip():
                raise ValueError(f"required section '## {required.title()}' is missing")
    else:
        _validate_html_body(parsed.body)

    return frontmatter


def parse_and_validate_artifact(
    artifact_text: str,
    *,
    default_format: str | None = None,
) -> Dict[str, Any]:
    parsed = parse_artifact_document(artifact_text, default_format=default_format)
    validated_frontmatter = validate_parsed_artifact(parsed)
    return {
        "frontmatter": validated_frontmatter,
        "body": parsed.body,
        "format": parsed.format,
        "sections": dict(parsed.sections),
        "ordered_sections": list(parsed.ordered_sections),
    }


def _parse_sections(body_lines: List[str]) -> Dict[str, str]:
    sections: Dict[str, List[str]] = {}
    current_heading: str | None = None
    for line in body_lines:
        if line.startswith("## "):
            current_heading = line[3:].strip()
            sections.setdefault(current_heading, [])
            continue
        if current_heading is not None:
            sections[current_heading].append(line)

    return {
        heading: "\n".join(lines).strip()
        for heading, lines in sections.items()
    }


def _normalize_frontmatter_value(field: str, value: Any) -> str:
    if field == "updated_at":
        return _normalize_updated_at(value)
    if field == "format":
        return normalize_artifact_format(value)
    return str(value).strip()


def _normalize_updated_at(value: Any) -> str:
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.isoformat(timespec="seconds")
        return value.isoformat(timespec="seconds").replace("+00:00", "Z")
    if isinstance(value, date):
        return value.isoformat()
    return str(value).strip()


def _validate_html_body(body: str) -> None:
    if not isinstance(body, str) or not body.strip():
        raise ValueError("html artifact body must be non-empty")
    match = BODY_PATTERN.search(body)
    if not match:
        raise ValueError("html artifact must include a <body>...</body> block")
    inspector = _ArtifactHTMLInspector()
    fragment = match.group("content")
    try:
        inspector.feed(fragment)
    except Exception as exc:
        raise ValueError(f"html artifact body could not be parsed: {exc}") from exc
    if inspector.external_dependency_error:
        raise ValueError(inspector.external_dependency_error)
    has_non_text_content = bool(CONTENT_TAG_PATTERN.search(fragment)) or inspector.has_embedded_media
    if not inspector.has_visible_content and not has_non_text_content:
        raise ValueError("html artifact body must contain visible content")
