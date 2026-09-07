"""Step 1 of ``consumption-dip`` — the precheck.

Gates the usage panel, writes the run's candidate rows, and hands the agent the
vocabulary it needs to reason about them. It is the only write outside ``commit-plays``.

This step hands the next one a :class:`CandidateSet`: the selected rows and the schema
that explains what every snapshot field means and how it is measured. The agent needs no
database read.
"""

from __future__ import annotations

from mash.workflows import CodeStep, StepContext
from ....shared.runtime_paths import workspace_dir
from ...context import PlayRuntimeContext
from ...data_loaders import crm, play_candidates
from ...data_loaders.play_candidates import CandidateRecord
from ...data_loaders.usage import pull_usage_panel
from ..contracts import CandidateSet, PlayWorkflowInput
from .constants import WORKFLOW_ID

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
        "description": "Account age at as_of_date.",
    },
    # From crm_db (accounts joined to company_enrichment). Present when the warehouse
    # has a value; an org with no enrichment row simply lacks these keys.
    "owner": {
        "type": "string",
        "unit": "name",
        "description": "Account owner or CSM, when assigned.",
    },
    "segment": {
        "type": "string",
        "unit": "enum",
        "description": "hobbyist | startup | midmarket | enterprise.",
    },
    "lifecycle_stage": {
        "type": "string",
        "unit": "enum",
        "description": "Where the account sits in its lifecycle, e.g. customer.",
    },
    "thesis": {
        "type": "string",
        "unit": "text",
        "description": "The account team's standing read on this org, if any.",
    },
    "industry": {
        "type": "string",
        "unit": "text",
        "description": "What the company does, e.g. Financial Services.",
    },
    "headcount": {
        "type": "integer",
        "unit": "people",
        "description": "Company headcount, used to interpret adoption headroom.",
    },
    "funding_stage": {
        "type": "string",
        "unit": "enum",
        "description": "Bootstrapped | Seed | Series A/B/C | Public.",
    },
    "last_raised_date": {
        "type": "string",
        "unit": "date",
        "description": "Date of the company's latest funding round, YYYY-MM-DD.",
    },
    "hiring_signals": {
        "type": "integer",
        "unit": "open_roles",
        "description": "Number of open engineering roles.",
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



def select_candidates(
    ctx: PlayRuntimeContext, as_of_date: str
) -> list[CandidateRecord]:
    """The deterministic WHO: gate the usage panel and shape each org's snapshots.

    This gate is the only thing that decides which orgs are in a run. The agent decides
    what to do about them and never re-litigates membership.
    """

    panel, _selection_sql = pull_usage_panel(ctx, as_of_date)
    candidates = [
        row
        for row in panel
        if row.decay_pct >= MIN_DECAY_PCT
        and row.sustained_days >= MIN_SUSTAINED_DAYS
        and row.age_days >= MIN_AGE_DAYS
        and row.plan_tier != "free"
        and row.consumption_mrr > IGNORE_REVENUE
    ]
    # Who the org is, for the orgs that passed. One read for the whole run, so the
    # agent gets headroom and timing off the candidate row and never queries crm_db.
    account_context = crm.read_account_context(ctx, [row.org_id for row in candidates])
    records = [
        CandidateRecord(
            org_id=row.org_id,
            org_name=row.org_name,
            org_snapshot={
                "plan_tier": row.plan_tier,
                "consumption_mrr": row.consumption_mrr,
                "account_age_days": row.age_days,
                **account_context.get(row.org_id, {}),
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
    return records


def _select_step(ctx: PlayRuntimeContext):
    def run(inp: PlayWorkflowInput, step_ctx: StepContext) -> CandidateSet:
        # The gate's first act: a workspace that does not exist fails here, before the
        # run costs a selection query and an agent turn. Every later use of it is an
        # explicit bind — nothing in this workflow resolves a workspace from config.
        workspace_dir(inp.workspace_id, require_exists=True)

        records = select_candidates(ctx, inp.as_of_date)
        play_candidates.insert_run(
            ctx,
            run_id=step_ctx.run_id,
            workflow_id=WORKFLOW_ID,
            records=records,
        )
        return CandidateSet(
            as_of_date=inp.as_of_date,
            org_snapshot_schema=ORG_SNAPSHOT_SCHEMA,
            usage_snapshot_schema=USAGE_SNAPSHOT_SCHEMA,
            candidates=records,
        )

    return run


def build_select_play_candidates_step(ctx: PlayRuntimeContext) -> CodeStep:
    return CodeStep(
        step_id="select-play-candidates",
        run=_select_step(ctx),
        input=PlayWorkflowInput,
        output=CandidateSet,
    )


__all__ = [
    "CandidateSet",
    "ORG_SNAPSHOT_SCHEMA",
    "USAGE_SNAPSHOT_SCHEMA",
    "build_select_play_candidates_step",
    "select_candidates",
]
