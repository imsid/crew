"""Expansion/PQA selection and shared-workflow wiring."""

from __future__ import annotations

from typing import Any

from crew.agents.growth.spec import GrowthAgentSpec
from crew.plays.data_loaders import crm
from crew.plays.data_loaders.usage import ExpansionCandidate
from crew.plays.workflows.consumption_dip.run import build_consumption_dip_workflow
from crew.plays.workflows.expansion_pqa.run import build_expansion_pqa_workflow
from crew.plays.workflows.expansion_pqa.select_play_candidates import select_candidates


def _signal(
    org_id: str,
    *,
    pqa_raw: float,
    surface: str | None = None,
) -> ExpansionCandidate:
    return ExpansionCandidate(
        org_id=org_id,
        org_name=f"Account {org_id}",
        plan_tier="business",
        token_slope=0.5,
        active_dev_growth=0.4,
        active_users_start=3,
        active_users_now=9,
        new_surface_adopted=surface is not None,
        new_surface=surface,
        pqa_raw=pqa_raw,
    )


def test_selector_enriches_orders_and_excludes_open_opportunities(monkeypatch) -> None:
    signals = [
        _signal("small", pqa_raw=70.0),
        _signal("open", pqa_raw=99.0),
        _signal("large", pqa_raw=94.9, surface="workflow"),
    ]
    monkeypatch.setattr(
        "crew.plays.workflows.expansion_pqa.select_play_candidates.compute_expansion_signals",
        lambda _ctx, _date: signals,
    )
    monkeypatch.setattr(
        crm,
        "open_opportunity_org_ids",
        lambda _ctx, _ids: {"open"},
    )
    monkeypatch.setattr(
        crm,
        "read_account_context",
        lambda _ctx, _ids: {
            "small": {"segment": "startup", "headcount": 12},
            "large": {"segment": "enterprise", "headcount": 4000},
        },
    )

    records = select_candidates(object(), "2026-05-29")

    assert [record.org_id for record in records] == ["large", "small"]
    assert records[0].org_snapshot == {
        "plan_tier": "business",
        "segment": "enterprise",
        "headcount": 4000,
    }
    assert records[0].usage_snapshot == {
        "as_of_date": "2026-05-29",
        "token_slope": 0.5,
        "active_dev_growth": 0.4,
        "active_users_start": 3,
        "active_users_now": 9,
        "new_surface_adopted": True,
        "new_surface": "workflow",
        "pqa_raw": 94.9,
    }
    assert "new_surface" not in records[1].usage_snapshot


def test_empty_signal_set_returns_an_empty_candidate_set(monkeypatch) -> None:
    monkeypatch.setattr(
        "crew.plays.workflows.expansion_pqa.select_play_candidates.compute_expansion_signals",
        lambda _ctx, _date: [],
    )
    monkeypatch.setattr(crm, "open_opportunity_org_ids", lambda _ctx, ids: set())
    seen: list[list[str]] = []
    monkeypatch.setattr(
        crm,
        "read_account_context",
        lambda _ctx, ids: seen.append(list(ids)) or {},
    )

    assert select_candidates(object(), "2026-05-29") == []
    assert seen == [[]]


class _CRMContext:
    crm_dataset_id = "crm_db"

    def __init__(self) -> None:
        self.call: dict[str, Any] = {}

    def compile_and_run(self, dataset_id: str, metric_name: str, **kwargs):
        self.call = {"dataset_id": dataset_id, "metric_name": metric_name, **kwargs}
        return [{"org_id": "open"}]


def test_open_opportunity_lookup_uses_the_semantic_metric() -> None:
    ctx = _CRMContext()

    assert crm.open_opportunity_org_ids(ctx, ["open", "clear"]) == {"open"}
    assert ctx.call["metric_name"] == "open_opps_by_org"
    assert "is_open = TRUE" in ctx.call["filters"]


def test_both_workflows_share_steps_but_load_different_skills() -> None:
    ctx = object()
    dip = build_consumption_dip_workflow(ctx)
    expansion = build_expansion_pqa_workflow(ctx)

    assert [step.step_id for step in dip.steps] == [step.step_id for step in expansion.steps]
    assert dip.steps[1].skill_name == "consumption-dip"
    assert expansion.steps[1].skill_name == "expansion-pqa"


def test_growth_agent_registers_the_expansion_skill() -> None:
    skills = {skill.name for skill in GrowthAgentSpec().build_skills().list_skills()}

    assert {"consumption-dip", "expansion-pqa"} <= skills
