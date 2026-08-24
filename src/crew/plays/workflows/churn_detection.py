"""Churn detection — ``consumption-dip-rescue``.

A consumption tool has no cancel event: revenue leaks silently as usage decays, so
the churn-equivalent signal has to be manufactured from the usage trajectory itself.

  select-play-candidates  (code)  — gate the usage panel, write the run's rows
  curate-plays            (agent) — define a few plays, assign every org, write the artifact

The rows never pass through the model. Step 1 hands step 2 a :class:`CandidateSet` —
the run id, the SQL that produced it, the count, and what every snapshot field means
and is measured in — and the agent reads the rows back out of BigQuery by ``run_id``.
"""

from __future__ import annotations

from typing import Optional

from mash.workflows import AgentStep, CodeStep, StepContext, WorkflowSpec
from pydantic import BaseModel, Field

from ..context import PlayRuntimeContext
from ..data_loaders import play_candidates
from ..data_loaders.play_candidates import CandidateRecord
from ..data_loaders.usage import pull_usage_panel

WORKFLOW_ID = "consumption-dip-rescue"
SKILL_NAME = "churn-prevention-strategy"
GROWTH_AGENT_ID = "growth"

# The gate — all must hold. Mirrors src/crew/context/sales/revenue-strategy.md §2.
MIN_DECAY_PCT = 0.30
MIN_SUSTAINED_DAYS = 5
MIN_AGE_DAYS = 21

IGNORE_REVENUE = 100.0  # at/below this (free hobbyists) → not worth a play

# Declared next to the code that builds the snapshots, so the two can't drift. They do
# double duty: they tell the agent what each field means and what unit it is in, and
# they bound the variables a play's copy template may reference.
ORG_SNAPSHOT_SCHEMA: dict[str, dict[str, str]] = {
    "plan_tier": {
        "type": "string",
        "unit": "enum",
        "description": "free | team | business | enterprise.",
    },
    "consumption_mrr": {
        "type": "number",
        "unit": "usd_per_month",
        "description": "Plan base fee plus trailing-30d token dollars.",
    },
    "account_age_days": {
        "type": "integer",
        "unit": "days",
        "description": "Account age at as_of_date. The gate excludes onboarding ramps.",
    },
}

USAGE_SNAPSHOT_SCHEMA: dict[str, dict[str, str]] = {
    "as_of_date": {
        "type": "string",
        "unit": "date",
        "description": "The date the signal was measured, YYYY-MM-DD.",
    },
    "baseline_tokens": {
        "type": "number",
        "unit": "tokens_per_day",
        "description": "Mean daily tokens over the org's own 4-week baseline window.",
    },
    "current_tokens": {
        "type": "number",
        "unit": "tokens_per_day",
        "description": "Mean daily tokens over the trailing 7 days.",
    },
    "decay_pct": {
        "type": "number",
        "unit": "fraction",
        "description": "Drop from the org's own 4-week baseline. 0.48 = down 48%.",
    },
    "sustained_days": {
        "type": "integer",
        "unit": "days",
        "description": "Consecutive recent days below 0.8x baseline.",
    },
    "active_users": {
        "type": "integer",
        "unit": "developers",
        "description": "Active developers on the latest day in the window.",
    },
    "dollars_at_risk": {
        "type": "number",
        "unit": "usd_per_month",
        "description": "Monthly consumption revenue x decay_pct.",
    },
}


class ChurnRunInput(BaseModel):
    """Workflow input: which day the signal is measured against."""

    as_of_date: str


class CandidateSet(BaseModel):
    """Step 1 → step 2. Everything about the run except the rows themselves."""

    run_id: str
    workflow_id: str
    as_of_date: str
    candidate_count: int
    selection_sql: str
    org_snapshot_schema: dict[str, dict[str, str]] = Field(default_factory=dict)
    usage_snapshot_schema: dict[str, dict[str, str]] = Field(default_factory=dict)


class CurationSummary(BaseModel):
    """The agent step's output: the run's bookkeeping. The content is the artifact."""

    run_id: str
    workflow_id: str
    plays_created: int
    orgs_assigned: int
    unassigned_remaining: int
    artifact_id: Optional[str] = None
    notes: Optional[str] = None


def select_candidates(
    ctx: PlayRuntimeContext, as_of_date: str
) -> tuple[list[CandidateRecord], str]:
    """The deterministic WHO: gate the usage panel and shape each org's snapshots.

    Returns the rows plus the SQL that produced them. This gate is the only thing that
    decides which orgs are in a run — the agent decides what to do about them and
    never re-litigates membership.
    """

    panel, selection_sql = pull_usage_panel(ctx, as_of_date)
    candidates = [
        row
        for row in panel
        if row.decay_pct >= MIN_DECAY_PCT
        and row.sustained_days >= MIN_SUSTAINED_DAYS
        and row.age_days >= MIN_AGE_DAYS
        and row.plan_tier != "free"
        and row.consumption_mrr > IGNORE_REVENUE
    ]
    records = [
        CandidateRecord(
            org_id=row.org_id,
            org_name=row.org_name,
            org_snapshot={
                "plan_tier": row.plan_tier,
                "consumption_mrr": row.consumption_mrr,
                "account_age_days": row.age_days,
            },
            usage_snapshot={
                "as_of_date": as_of_date,
                "baseline_tokens": row.baseline_tokens,
                "current_tokens": row.current_tokens,
                "decay_pct": row.decay_pct,
                "sustained_days": row.sustained_days,
                "active_users": row.active_users,
                "dollars_at_risk": round(row.consumption_mrr * row.decay_pct, 2),
            },
        )
        for row in candidates
    ]
    records.sort(key=lambda r: r.usage_snapshot["dollars_at_risk"], reverse=True)
    return records, selection_sql


def _select_step(ctx: PlayRuntimeContext):
    def run(inp: ChurnRunInput, step_ctx: StepContext) -> CandidateSet:
        records, selection_sql = select_candidates(ctx, inp.as_of_date)
        count = play_candidates.insert_run(
            ctx,
            run_id=step_ctx.run_id,
            workflow_id=WORKFLOW_ID,
            records=records,
        )
        return CandidateSet(
            run_id=step_ctx.run_id,
            workflow_id=WORKFLOW_ID,
            as_of_date=inp.as_of_date,
            candidate_count=count,
            selection_sql=selection_sql,
            org_snapshot_schema=ORG_SNAPSHOT_SCHEMA,
            usage_snapshot_schema=USAGE_SNAPSHOT_SCHEMA,
        )

    return run


def build_churn_detection_workflow(ctx: PlayRuntimeContext) -> WorkflowSpec:
    return WorkflowSpec(
        workflow_id=WORKFLOW_ID,
        input_model=ChurnRunInput,
        steps=[
            CodeStep(
                step_id="select-play-candidates",
                run=_select_step(ctx),
                input=ChurnRunInput,
                output=CandidateSet,
            ),
            AgentStep(
                step_id="curate-plays",
                agent_id=GROWTH_AGENT_ID,
                input=CandidateSet,
                output=CurationSummary,
                skill_name=SKILL_NAME,
            ),
        ],
    )


__all__ = [
    "CandidateSet",
    "ChurnRunInput",
    "CurationSummary",
    "SKILL_NAME",
    "WORKFLOW_ID",
    "build_churn_detection_workflow",
    "select_candidates",
]
