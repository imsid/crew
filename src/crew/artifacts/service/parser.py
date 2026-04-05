"""Markdown parsing and validation helpers for artifacts."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List

import yaml

from .constants import (
    ARTIFACT_REQUIRED_FRONTMATTER_FIELDS,
    ARTIFACT_REQUIRED_SECTIONS,
)
from .pathing import normalize_artifact_id


@dataclass(frozen=True)
class ParsedArtifact:
    frontmatter: Dict[str, Any]
    body: str
    sections: Dict[str, str]
    ordered_sections: List[str]


def parse_artifact_markdown(markdown_text: str) -> ParsedArtifact:
    if not isinstance(markdown_text, str) or not markdown_text.strip():
        raise ValueError("artifact markdown must be a non-empty string")

    lines = markdown_text.splitlines()
    if not lines or lines[0].strip() != "---":
        raise ValueError("artifact markdown must start with YAML frontmatter")

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
    sections = _parse_sections(body_lines)
    return ParsedArtifact(
        frontmatter=frontmatter,
        body=body,
        sections=sections,
        ordered_sections=list(sections.keys()),
    )


def validate_parsed_artifact(parsed: ParsedArtifact) -> Dict[str, Any]:
    frontmatter = dict(parsed.frontmatter)
    for field in ARTIFACT_REQUIRED_FRONTMATTER_FIELDS:
        value = frontmatter.get(field)
        if value is None:
            raise ValueError(f"frontmatter field '{field}' is required")
        normalized_value = str(value).strip()
        if not normalized_value:
            raise ValueError(f"frontmatter field '{field}' is required")
        frontmatter[field] = normalized_value

    frontmatter["artifact_id"] = normalize_artifact_id(frontmatter["artifact_id"])

    normalized_sections = {name.strip().lower(): content for name, content in parsed.sections.items()}
    for required in ARTIFACT_REQUIRED_SECTIONS:
        content = normalized_sections.get(required)
        if not isinstance(content, str) or not content.strip():
            raise ValueError(f"required section '## {required.title()}' is missing")

    return frontmatter


def parse_and_validate_artifact(markdown_text: str) -> Dict[str, Any]:
    parsed = parse_artifact_markdown(markdown_text)
    validated_frontmatter = validate_parsed_artifact(parsed)
    return {
        "frontmatter": validated_frontmatter,
        "body": parsed.body,
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
