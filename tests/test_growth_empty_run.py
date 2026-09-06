"""An empty candidate set is a valid outcome, not a failure.

The code step still writes the run (zero rows) and the agent step still runs. The skill
returns an empty curation, and generic candidate reads remain well-defined for callers.
"""

from __future__ import annotations

from typing import Any

import pytest

from crew.agents.growth.prompt import build_base_prompt
from crew.plays.data_loaders import play_candidates


class _FakeContext:
    """Answers the two shapes of query the loader issues, off in-memory rows."""

    crm_dataset_id = "crm_db"

    def __init__(self, rows: list[dict[str, Any]] | None = None) -> None:
        self.rows = rows or []
        self.queries: list[str] = []

    def entity_table_ref(self, dataset_id: str, source_id: str) -> str:
        return f"`test.{dataset_id}.{source_id}`"

    def query(self, sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
        self.queries.append(sql)
        if "COUNT(*)" in sql:
            return [{"n": len(self.rows)}]
        if "JSON_KEYS" in sql:
            if not self.rows:
                return []
            return [
                {
                    "container": "usage_snapshot",
                    "field": "dollars_at_risk",
                    "json_type": "number",
                }
            ]
        return list(self.rows)


def test_empty_run_reads_back_empty_rather_than_rejecting_the_field() -> None:
    ctx = _FakeContext(rows=[])

    rows = play_candidates.select_candidates(
        ctx, run_id="run-1", limit=200, order_by="dollars_at_risk DESC"
    )

    assert rows == []


def test_empty_run_counts_zero_under_a_snapshot_filter() -> None:
    ctx = _FakeContext(rows=[])

    assert play_candidates.count_candidates(
        ctx, run_id="run-1", where="decay_pct >= 0.4"
    ) == 0


def test_unknown_field_still_rejected_when_the_run_has_rows() -> None:
    ctx = _FakeContext(
        rows=[
            {
                "org_id": "org-1",
                "org_name": "Atlas Systems",
                "play_id": None,
                "org_snapshot": "{}",
                "usage_snapshot": '{"dollars_at_risk": 972.6}',
            }
        ]
    )

    with pytest.raises(ValueError, match="unknown field 'not_a_field'"):
        play_candidates.select_candidates(
            ctx, run_id="run-1", order_by="not_a_field DESC"
        )


def test_empty_run_rule_does_not_leak_into_the_reusable_agent_prompt() -> None:
    """The workflow always loads its named skill before asking for the curation."""

    assert "candidate_count" not in build_base_prompt()
    assert "no candidates" not in build_base_prompt()


def test_growth_agent_has_no_warehouse_connection() -> None:
    """The agent works from the candidate row alone — no SQL, no MCP escape hatch."""

    from crew.agents.growth.spec import GrowthAgentSpec

    prompt = build_base_prompt()

    assert GrowthAgentSpec().build_mcp_servers() == []
    assert GrowthAgentSpec().build_tools().list_tools() == []
    assert "execute_sql" not in prompt
    assert "MCP" not in prompt
