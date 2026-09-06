"""Validate and render play copy from self-contained template values."""

from __future__ import annotations

import re
from typing import Any, Callable

PLACEHOLDER_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")


def _percent(value: Any) -> str:
    return f"{float(value) * 100:.0f}%"


def _usd(value: Any) -> str:
    return f"${float(value):,.0f}"


def _integer(value: Any) -> str:
    return f"{int(round(float(value))):,}"


def _number(value: Any) -> str:
    return f"{float(value):,.2f}"


FORMATTERS: dict[str, Callable[[Any], str]] = {
    "percent": _percent,
    "usd": _usd,
    "integer": _integer,
    "number": _number,
    "text": str,
}
_NUMERIC_FORMATS = {"percent", "usd", "integer", "number"}


def validate_template(
    copy_template: str,
    template_vars: dict[str, dict[str, Any]],
    candidates: list[dict[str, Any]],
) -> None:
    """Raise unless the template renders for every candidate on the play."""

    placeholders = set(PLACEHOLDER_RE.findall(copy_template or ""))
    declared = set(template_vars or {})
    missing_declarations = sorted(placeholders - declared)
    unused_declarations = sorted(declared - placeholders)

    problems: list[str] = []
    if missing_declarations:
        problems.append(
            "undeclared template variables: " + ", ".join(missing_declarations)
        )
    if unused_declarations:
        problems.append(
            "template variables not used by copy_template: "
            + ", ".join(unused_declarations)
        )

    for name, spec in (template_vars or {}).items():
        fmt = str((spec or {}).get("format") or "text")
        if fmt not in FORMATTERS:
            problems.append(
                f"template variable '{name}' has unknown format '{fmt}'. Available: "
                + ", ".join(sorted(FORMATTERS))
            )

    for candidate in candidates:
        org_id = str(candidate.get("org_id") or "(unknown org)")
        missing_values = sorted(placeholders - set(candidate))
        if missing_values:
            problems.append(
                f"candidate '{org_id}' is missing values for: "
                + ", ".join(missing_values)
            )
            continue
        for name in sorted(placeholders):
            spec = template_vars.get(name) or {}
            fmt = str(spec.get("format") or "text")
            formatter = FORMATTERS.get(fmt)
            if formatter is None:
                continue
            value = candidate[name]
            if fmt in _NUMERIC_FORMATS and (
                isinstance(value, bool) or not isinstance(value, (int, float))
            ):
                problems.append(
                    f"candidate '{org_id}' value for '{name}' is incompatible with "
                    f"format '{fmt}'"
                )
                continue
            try:
                formatter(value)
            except (TypeError, ValueError):
                problems.append(
                    f"candidate '{org_id}' value for '{name}' is incompatible with "
                    f"format '{spec.get('format') or 'text'}'"
                )

    if problems:
        raise ValueError("; ".join(problems))


def render(
    copy_template: str,
    template_vars: dict[str, Any],
    candidate: dict[str, Any],
) -> str:
    """Render one play's copy for one candidate."""

    def substitute(match: re.Match[str]) -> str:
        name = match.group(1)
        spec = template_vars.get(name) or {}
        formatter = FORMATTERS[str(spec.get("format") or "text")]
        return formatter(candidate[name])

    return PLACEHOLDER_RE.sub(substitute, copy_template or "")


__all__ = ["FORMATTERS", "render", "validate_template"]
