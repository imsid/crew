"""Workflow 1a — Consumption Dip Rescue (daily; stops the leak).

A consumption tool has no cancel event, so a code step manufactures the churn-equivalent
signal (usage decay off the org's own baseline) and the crew acts before the revenue is
gone. Five steps, sorted along the judgment/computation line:

  pull_usage_panel   (code)  — per-org token series + 4-week baseline
  score_and_gate     (code)  — decay/sustained/age gate, revenue-weight → segment, dedupe
  diagnose_dip       (agent) — which surface dropped, power-user vs. broad, root cause
  select_and_draft   (agent) — choose motion by segment+tier, draft the copy
  assign_and_deliver (code)  — holdout split, write play + thesis back (STOPS before outbound)

Thresholds mirror src/crew/context/sales/revenue-strategy.md §2.
"""

from __future__ import annotations

from mash.workflows import AgentStep, CodeStep, StepContext, WorkflowSpec

from . import crm, writes
from .context import CrewGrowthRuntimeContext
from .models import (
    DipCandidate,
    DipRescueInput,
    DipRescueState,
    DipRescueSummary,
    UsagePanel,
    UsageRow,
)
from .warehouse import pull_usage_panel

WORKFLOW_ID = "consumption-dip-rescue"
# Read-only sub-workflow: the WHO half only (pull + gate/segment), no agent, no writes.
WHO_WORKFLOW_ID = "consumption-dip-who"
GROWTH_AGENT_ID = "growth"

# Gate (all must hold).
MIN_DECAY_PCT = 0.30
MIN_SUSTAINED_DAYS = 5
MIN_AGE_DAYS = 21

# Severity segmentation by revenue-weight (monthly consumption revenue).
CRITICAL_REVENUE = 2000.0
HIGH_REVENUE = 500.0
IGNORE_REVENUE = 100.0  # at/below this (e.g. free hobbyists) → log only, no play


def _segment(revenue_weight: float, plan_tier: str) -> str:
    if plan_tier == "enterprise" or revenue_weight >= CRITICAL_REVENUE:
        return "critical"
    if revenue_weight >= HIGH_REVENUE:
        return "high"
    return "watch"


def _classify(
    panel: list[UsageRow], open_play_orgs: set[str]
) -> tuple[list[DipCandidate], list[str], list[str]]:
    """Pure gate + segmentation over a usage panel.

    Deterministic and agent-independent: this is the authoritative source of *who*
    gets a play. The agent steps only add the diagnosis/copy for these candidates.
    """
    candidates: list[DipCandidate] = []
    skipped_dedupe: list[str] = []
    ignored: list[str] = []
    for row in panel:
        if not (
            row.decay_pct >= MIN_DECAY_PCT
            and row.sustained_days >= MIN_SUSTAINED_DAYS
            and row.age_days >= MIN_AGE_DAYS
        ):
            continue
        if row.plan_tier == "free" or row.consumption_mrr <= IGNORE_REVENUE:
            ignored.append(row.org_id)
            continue
        if row.org_id in open_play_orgs:
            skipped_dedupe.append(row.org_id)
            continue
        candidates.append(
            DipCandidate(
                org_id=row.org_id,
                org_name=row.org_name,
                plan_tier=row.plan_tier,
                segment=_segment(row.consumption_mrr, row.plan_tier),
                decay_pct=row.decay_pct,
                sustained_days=row.sustained_days,
                revenue_weight=row.consumption_mrr,
                dollars_at_risk=round(row.consumption_mrr * row.decay_pct, 2),
            )
        )
    candidates.sort(key=lambda c: c.dollars_at_risk, reverse=True)
    return candidates, skipped_dedupe, ignored


# --------------------------------------------------------------------------------------
# Step 1 — pull_usage_panel (code)
# --------------------------------------------------------------------------------------


def _build_pull_usage_panel(ctx: CrewGrowthRuntimeContext):
    def run(inp: DipRescueInput, _ctx: StepContext) -> UsagePanel:
        panel = pull_usage_panel(ctx, inp.as_of_date)
        return UsagePanel(as_of_date=inp.as_of_date, panel=panel)

    return run


# --------------------------------------------------------------------------------------
# Step 2 — score_and_gate (code)
# --------------------------------------------------------------------------------------


def _build_score_and_gate(ctx: CrewGrowthRuntimeContext):
    def run(inp: UsagePanel, _ctx: StepContext) -> DipRescueState:
        gated_orgs = [
            row.org_id
            for row in inp.panel
            if row.decay_pct >= MIN_DECAY_PCT
            and row.sustained_days >= MIN_SUSTAINED_DAYS
            and row.age_days >= MIN_AGE_DAYS
        ]
        open_plays = crm.open_plays_for(ctx, gated_orgs)
        candidates, skipped_dedupe, ignored = _classify(inp.panel, open_plays)
        return DipRescueState(
            as_of_date=inp.as_of_date,
            candidates=candidates,
            skipped_dedupe=skipped_dedupe,
            ignored=ignored,
        )

    return run


# --------------------------------------------------------------------------------------
# Step 5 — assign_and_deliver (code); STOPS before real outbound
# --------------------------------------------------------------------------------------


def _build_assign_and_deliver(ctx: CrewGrowthRuntimeContext):
    def run(inp: DipRescueState, step_ctx: StepContext) -> DipRescueSummary:
        dry_run = bool(step_ctx.workflow_input.get("dry_run", False))
        as_of_date = str(step_ctx.workflow_input.get("as_of_date") or inp.as_of_date)

        # Re-derive the authoritative WHO deterministically (agents own only the WHAT,
        # which we overlay by org_id). This keeps the summary correct even if an agent
        # step dropped or mangled the container's bookkeeping fields.
        panel = pull_usage_panel(ctx, as_of_date)
        gated_orgs = [
            row.org_id
            for row in panel
            if row.decay_pct >= MIN_DECAY_PCT
            and row.sustained_days >= MIN_SUSTAINED_DAYS
            and row.age_days >= MIN_AGE_DAYS
        ]
        open_plays = crm.open_plays_for(ctx, gated_orgs)
        candidates, skipped_dedupe, ignored = _classify(panel, open_plays)
        judgment = {c.org_id: c for c in inp.candidates}

        plays: list[dict] = []
        treatment_count = 0
        holdout_count = 0
        total_at_risk = 0.0

        for base in candidates:
            enriched = judgment.get(base.org_id)
            cand = base.model_copy(
                update={
                    "dip_surface": enriched.dip_surface if enriched else None,
                    "breadth": enriched.breadth if enriched else None,
                    "root_cause": enriched.root_cause if enriched else None,
                    "play_type": enriched.play_type if enriched else None,
                    "draft_copy": enriched.draft_copy if enriched else None,
                }
            )
            total_at_risk += cand.dollars_at_risk
            # Critical retention fires are never gambled in a holdout.
            arm = "treatment" if cand.segment == "critical" else crm.holdout_arm(cand.org_id)
            play_id = f"{step_ctx.run_id}:{cand.org_id}"
            thesis = " ".join(
                part
                for part in (
                    cand.root_cause,
                    f"[{cand.breadth} decay on {cand.dip_surface}]"
                    if cand.dip_surface
                    else None,
                )
                if part
            ).strip() or None

            if arm == "control":
                holdout_count += 1
                status, copy = "held_out", None
            else:
                treatment_count += 1
                status, copy = "ready_to_send", cand.draft_copy

            record = {
                "play_id": play_id,
                "org_id": cand.org_id,
                "workflow_id": WORKFLOW_ID,
                "run_id": step_ctx.run_id,
                "play_type": cand.play_type or "sales_assisted_checkin",
                "segment": cand.segment,
                "status": status,
                "holdout_arm": arm,
                "dollars_at_risk": cand.dollars_at_risk,
                "draft_copy": copy,
                "thesis": thesis,
                "outcome": None,
            }
            if not dry_run:
                writes.write_play(ctx, record)
                if arm == "treatment" and thesis:
                    writes.update_account_thesis(ctx, cand.org_id, thesis)
            plays.append(
                {
                    "org_id": cand.org_id,
                    "org_name": cand.org_name,
                    "segment": cand.segment,
                    "play_type": record["play_type"],
                    "status": status,
                    "holdout_arm": arm,
                    "dollars_at_risk": cand.dollars_at_risk,
                }
            )

        return DipRescueSummary(
            as_of_date=as_of_date,
            dry_run=dry_run,
            total_at_risk=round(total_at_risk, 2),
            plays_created=len(plays),
            treatment_count=treatment_count,
            holdout_count=holdout_count,
            skipped_dedupe=skipped_dedupe,
            ignored=ignored,
            plays=plays,
        )

    return run


# --------------------------------------------------------------------------------------
# Workflow assembly
# --------------------------------------------------------------------------------------


def build_dip_rescue_workflow(ctx: CrewGrowthRuntimeContext) -> WorkflowSpec:
    return WorkflowSpec(
        workflow_id=WORKFLOW_ID,
        input_model=DipRescueInput,
        steps=[
            CodeStep(
                step_id="pull-usage-panel",
                run=_build_pull_usage_panel(ctx),
                input=DipRescueInput,
                output=UsagePanel,
            ),
            CodeStep(
                step_id="score-and-gate",
                run=_build_score_and_gate(ctx),
                input=UsagePanel,
                output=DipRescueState,
            ),
            AgentStep(
                step_id="diagnose-dip",
                agent_id=GROWTH_AGENT_ID,
                input=DipRescueState,
                output=DipRescueState,
                skill_name="diagnosing-consumption-dips",
            ),
            AgentStep(
                step_id="select-and-draft-play",
                agent_id=GROWTH_AGENT_ID,
                input=DipRescueState,
                output=DipRescueState,
                skill_name="selecting-nrr-plays",
            ),
            CodeStep(
                step_id="assign-and-deliver",
                run=_build_assign_and_deliver(ctx),
                input=DipRescueState,
                output=DipRescueSummary,
                agent_ids=(GROWTH_AGENT_ID,),
            ),
        ],
    )


def build_dip_rescue_who_workflow(ctx: CrewGrowthRuntimeContext) -> WorkflowSpec:
    """Read-only sub-workflow of ``consumption-dip-rescue``: the WHO half only.

    Reuses the two authoritative code steps (``pull_usage_panel`` -> ``score_and_gate``)
    and terminates at the gated/segmented candidate set. It drops the agent WHAT steps
    (diagnose/select) and the ``assign_and_deliver`` step entirely, so nothing is written
    to CRM or the warehouse — this only reports *who* would be targeted.
    """
    return WorkflowSpec(
        workflow_id=WHO_WORKFLOW_ID,
        input_model=DipRescueInput,
        steps=[
            CodeStep(
                step_id="pull-usage-panel",
                run=_build_pull_usage_panel(ctx),
                input=DipRescueInput,
                output=UsagePanel,
            ),
            CodeStep(
                step_id="score-and-gate",
                run=_build_score_and_gate(ctx),
                input=UsagePanel,
                output=DipRescueState,
            ),
        ],
    )


__all__ = [
    "build_dip_rescue_workflow",
    "build_dip_rescue_who_workflow",
    "WORKFLOW_ID",
    "WHO_WORKFLOW_ID",
]
