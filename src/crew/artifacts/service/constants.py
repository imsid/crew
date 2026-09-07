"""Constants for artifact services."""

from __future__ import annotations

import re
from pathlib import Path

ARTIFACTS_ROOT = Path("artifacts")
ARTIFACT_SCHEMA_ROOT = Path(__file__).resolve().parents[1] / "schema"
ARTIFACT_SCHEMA_PATH = ARTIFACT_SCHEMA_ROOT / "ARTIFACT.md"
ARTIFACT_REQUIRED_FRONTMATTER_FIELDS = [
    "artifact_id",
    "format",
    "source_agent",
    "title",
    "description",
    "kind",
    "session_id",
    "updated_at",
]
ARTIFACT_REQUIRED_SECTIONS = ["summary", "next steps"]
ARTIFACT_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")
SUPPORTED_ARTIFACT_FORMATS = ("markdown", "html")
ARTIFACT_FORMAT_TO_EXTENSION = {
    "markdown": ".md",
    "html": ".html",
}
ARTIFACT_EXTENSION_TO_FORMAT = {
    extension: artifact_format
    for artifact_format, extension in ARTIFACT_FORMAT_TO_EXTENSION.items()
}


def artifact_contract_hint() -> str:
    """The document contract in one line, for tool descriptions and parse errors.

    Both places quote the same string, so what a caller is told up front and what it
    is told on failure can never drift apart.
    """

    fields = ", ".join(ARTIFACT_REQUIRED_FRONTMATTER_FIELDS)
    sections = ", ".join(f"## {name.title()}" for name in ARTIFACT_REQUIRED_SECTIONS)
    return (
        "An artifact document opens with a YAML frontmatter block delimited by --- "
        f"lines, carrying: {fields}. artifact_id must match "
        f"{ARTIFACT_ID_RE.pattern} (no colons, slashes or dots). format is markdown "
        f"or html. Markdown bodies must include the sections: {sections}."
    )
