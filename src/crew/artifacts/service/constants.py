"""Constants for artifact services."""

from __future__ import annotations

import re
from pathlib import Path

ARTIFACTS_ROOT = Path("artifacts")
ARTIFACT_SCHEMA_ROOT = Path(__file__).resolve().parents[1] / "schema"
ARTIFACT_SCHEMA_PATH = ARTIFACT_SCHEMA_ROOT / "ARTIFACT.md"
ARTIFACT_REQUIRED_FRONTMATTER_FIELDS = [
    "artifact_id",
    "source_agent",
    "title",
    "description",
    "kind",
    "session_id",
    "updated_at",
]
ARTIFACT_REQUIRED_SECTIONS = ["summary", "next steps"]
ARTIFACT_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")
