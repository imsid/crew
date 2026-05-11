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
