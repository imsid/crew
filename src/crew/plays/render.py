"""Copy templates: validating one, and rendering it for an org.

Pure functions — a play's template plus a candidate row is all it takes, so a sender
or an export can produce the per-org message without the agent in the loop. Nothing
here touches BigQuery.
"""

from __future__ import annotations

import re
from typing import Any, Optional

from .data_loaders.play_candidates import SCALAR_COLUMNS, SNAPSHOT_COLUMNS

PLACEHOLDER_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")


def _percent0(value: Any) -> str:
    return f"{float(value) * 100:.0f}%"


def _percent1(value: Any) -> str:
    return f"{float(value) * 100:.1f}%"


def _usd0(value: Any) -> str:
    return f"${float(value):,.0f}"


def _usd2(value: Any) -> str:
    return f"${float(value):,.2f}"


def _integer(value: Any) -> str:
    return f"{int(round(float(value))):,}"


def _number(value: Any) -> str:
    return f"{float(value):,.2f}"


FORMATTERS = {
    "percent0": _percent0,
    "percent1": _percent1,
    "usd0": _usd0,
    "usd2": _usd2,
    "integer": _integer,
    "number": _number,
    "text": str,
}


def validate_template(
    copy_template: str,
    template_vars: dict[str, dict[str, Any]],
    keys: dict[str, dict[str, str]],
) -> None:
    """Raise unless every placeholder is declared and resolves against ``keys``.

    ``keys`` is the run's *actual* snapshot keys, so this rejects a template that
    references a field the selection never wrote — a stronger check than comparing
    against the declared schema.
    """

    placeholders = set(PLACEHOLDER_RE.findall(copy_template or ""))
    missing = sorted(placeholders - set(template_vars or {}))
    if missing:
        raise ValueError(
            "copy_template references undeclared variables: "
            f"{', '.join(missing)}. Declare each one in template_vars."
        )

    available = sorted(set(SCALAR_COLUMNS) | set(keys))
    for name, spec in (template_vars or {}).items():
        source = str((spec or {}).get("source") or "").strip()
        if resolve_source(source, keys) is None:
            raise ValueError(
                f"template variable '{name}' reads '{source}', which is not a field "
                f"on this run. Available: {', '.join(available)}"
            )
        fmt = (spec or {}).get("format")
        if fmt and fmt not in FORMATTERS:
            raise ValueError(
                f"template variable '{name}' has unknown format '{fmt}'. "
                f"Available: {', '.join(sorted(FORMATTERS))}"
            )


def resolve_source(source: str, keys: dict[str, dict[str, str]]) -> Optional[str]:
    """A source is a bare column or ``<snapshot>.<field>``; returns the flat row key."""

    text = str(source or "").strip()
    if text in SCALAR_COLUMNS:
        return text
    if "." in text:
        container, _, field = text.partition(".")
        spec = keys.get(field)
        if container in SNAPSHOT_COLUMNS and spec and spec["container"] == container:
            return field
        return None
    return text if text in keys else None


def render(
    copy_template: str,
    template_vars: dict[str, Any],
    candidate: dict[str, Any],
) -> str:
    """Render one play's copy for one flattened candidate row."""

    def substitute(match: re.Match[str]) -> str:
        spec = (template_vars or {}).get(match.group(1))
        if not spec:
            return match.group(0)
        source = str(spec.get("source") or "")
        value = candidate.get(source.partition(".")[2] or source)
        if value is None:
            return ""
        formatter = FORMATTERS.get(spec.get("format") or "text", str)
        try:
            return formatter(value)
        except (TypeError, ValueError):
            return str(value)

    return PLACEHOLDER_RE.sub(substitute, copy_template or "")
