"""Compiled query plan value objects for the metrics layer.

A ``CompiledPlan`` is the single artifact the compiler produces and the runtime
executes: it carries the SQL, the (bound) query parameters, and the row shape so
callers never re-parse SQL to know what comes back.

Phase 0 introduces the container with parity behavior — ``parameters`` is empty (dates
are still inlined as literals) and ``to_tool_dict()`` reproduces the exact dict the
agent tool has always returned. Later phases populate ``parameters`` (typed binds) and
grow ``row_shape`` without changing this shape.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

# Matches ``@name`` parameter references in SQL (identifier chars only).
_PARAM_REF_RE = re.compile(r"@([A-Za-z_][A-Za-z0-9_]*)")


def _render_scalar_literal(value: Any, sql_type: str) -> str:
    if value is None:
        return "NULL"
    if sql_type == "DATE":
        return f"DATE '{value}'"
    if sql_type in {"TIMESTAMP", "DATETIME"}:
        return f"{sql_type} '{value}'"
    if sql_type == "BOOL":
        return "TRUE" if value else "FALSE"
    if sql_type in {"INT64", "FLOAT64", "NUMERIC"}:
        return repr(value) if sql_type == "FLOAT64" else str(value)
    # STRING and anything else: single-quote and escape.
    escaped = str(value).replace("\\", "\\\\").replace("'", "\\'")
    return f"'{escaped}'"


@dataclass(frozen=True)
class BindParam:
    """A typed query parameter, bound to a BigQuery named parameter at execute time."""

    name: str
    type: str
    value: Any = None

    def _upper_type(self) -> str:
        return self.type.strip().upper()

    def to_bigquery(self) -> Any:
        from google.cloud import bigquery

        upper = self._upper_type()
        if upper.startswith("ARRAY<") and upper.endswith(">"):
            element_type = upper[len("ARRAY<") : -1].strip()
            return bigquery.ArrayQueryParameter(
                self.name, element_type, list(self.value or [])
            )
        return bigquery.ScalarQueryParameter(self.name, upper, self.value)

    def render_literal(self) -> str:
        """Inline SQL literal for the value (agent path: ``execute_sql_readonly``).

        The Google BigQuery MCP ``execute_sql_readonly`` tool takes only a SQL string
        and no bind values, so the agent path renders literals; the in-process path
        binds real parameters via ``to_bigquery``.
        """
        upper = self._upper_type()
        if upper.startswith("ARRAY<") and upper.endswith(">"):
            element_type = upper[len("ARRAY<") : -1].strip()
            items = ", ".join(
                _render_scalar_literal(item, element_type) for item in (self.value or [])
            )
            return f"[{items}]"
        return _render_scalar_literal(self.value, upper)


@dataclass(frozen=True)
class Column:
    """One column in a plan's result set."""

    name: str
    data_type: Optional[str] = None


@dataclass
class CompiledPlan:
    """The compiler's output: executable SQL plus the metadata to run and read it."""

    metric_name: str
    source_id: str
    table_ref: str
    sql: str
    dimensions: List[str]
    filters: List[str]
    order_by: List[Dict[str, str]]
    limit: int
    warnings: List[str]
    parameters: List[BindParam] = field(default_factory=list)
    row_shape: List[Column] = field(default_factory=list)
    # Value-column names in select order (one entry for a single-metric plan whose
    # column is ``metric_value``; one per metric for a multi-metric plan).
    metric_names: List[str] = field(default_factory=list)

    def render_inline(self) -> str:
        """SQL with every known ``@param`` replaced by its literal value.

        Used for the agent path (``execute_sql_readonly`` accepts no bind values). Names
        not in ``parameters`` are left untouched, so stray ``@`` inside string literals
        is safe.
        """
        if not self.parameters:
            return self.sql
        literals = {param.name: param.render_literal() for param in self.parameters}

        def _sub(match: "re.Match[str]") -> str:
            name = match.group(1)
            return literals.get(name, match.group(0))

        return _PARAM_REF_RE.sub(_sub, self.sql)

    def to_tool_dict(self) -> Dict[str, Any]:
        """The historical agent-tool dict shape (kept byte-stable for JSON parity).

        ``sql`` is inline-rendered so the agent can run it via ``execute_sql_readonly``
        with no bind values.
        """
        return {
            "metric_name": self.metric_name,
            "source_id": self.source_id,
            "table_ref": self.table_ref,
            "sql": self.render_inline(),
            "dimensions": self.dimensions,
            "filters": self.filters,
            "order_by": self.order_by,
            "limit": self.limit,
            "warnings": self.warnings,
        }


__all__ = ["BindParam", "Column", "CompiledPlan"]
