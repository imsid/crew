"""Step 1 of ``expansion-pqa`` — select and snapshot eligible PQAs."""

from __future__ import annotations

from mash.workflows import CodeStep, StepContext

from ....shared.runtime_paths import workspace_dir
from ...context import PlayRuntimeContext
from ...data_loaders import crm, play_candidates
from ...data_loaders.play_candidates import CandidateRecord
from ...data_loaders.usage import compute_expansion_signals
from ..contracts import CandidateSet, PlayWorkflowInput
from .constants import WORKFLOW_ID


ORG_SNAPSHOT_SCHEMA: dict[str, dict[str, str]] = {
    "plan_tier": {
        "type": "string",
        "unit": "enum",
        "description": "free | team | business | enterprise.",
    },
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
        "description": "What the company does, when known.",
    },
    "headcount": {
        "type": "integer",
        "unit": "people",
        "description": "Company headcount, used to judge adoption headroom.",
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
    "token_slope": {
        "type": "number",
        "unit": "fraction",
        "description": "Recent four-week token growth versus the prior four weeks.",
    },
    "active_dev_growth": {
        "type": "number",
        "unit": "fraction",
        "description": "Recent active-developer growth versus the prior window.",
    },
    "active_users_start": {
        "type": "integer",
        "unit": "developers",
        "description": "Active developers in the prior comparison window.",
    },
    "active_users_now": {
        "type": "integer",
        "unit": "developers",
        "description": "Active developers at the end of the recent window.",
    },
    "new_surface_adopted": {
        "type": "boolean",
        "unit": "boolean",
        "description": "Whether the org recently began using a product surface.",
    },
    "new_surface": {
        "type": "string",
        "unit": "surface_name",
        "description": "The recently adopted surface, when one exists.",
    },
    "pqa_raw": {
        "type": "number",
        "unit": "score_0_100",
        "description": "Deterministic raw PQA score from usage growth and adoption.",
    },
}


def select_candidates(
    ctx: PlayRuntimeContext, as_of_date: str
) -> list[CandidateRecord]:
    """Select qualified PQAs not already covered by an open opportunity."""

    signals = compute_expansion_signals(ctx, as_of_date)
    open_opps = crm.open_opportunity_org_ids(ctx, [row.org_id for row in signals])
    eligible = [row for row in signals if row.org_id not in open_opps]
    account_context = crm.read_account_context(ctx, [row.org_id for row in eligible])

    records = [
        CandidateRecord(
            org_id=row.org_id,
            org_name=row.org_name,
            org_snapshot={
                "plan_tier": row.plan_tier,
                **account_context.get(row.org_id, {}),
            },
            usage_snapshot={
                "as_of_date": as_of_date,
                "token_slope": row.token_slope,
                "active_dev_growth": row.active_dev_growth,
                "active_users_start": row.active_users_start,
                "active_users_now": row.active_users_now,
                "new_surface_adopted": row.new_surface_adopted,
                **({"new_surface": row.new_surface} if row.new_surface else {}),
                "pqa_raw": row.pqa_raw,
            },
        )
        for row in eligible
    ]
    records.sort(key=lambda record: record.usage_snapshot["pqa_raw"], reverse=True)
    return records


def _select_step(ctx: PlayRuntimeContext):
    def run(inp: PlayWorkflowInput, step_ctx: StepContext) -> CandidateSet:
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
    "ORG_SNAPSHOT_SCHEMA",
    "USAGE_SNAPSHOT_SCHEMA",
    "build_select_play_candidates_step",
    "select_candidates",
]
