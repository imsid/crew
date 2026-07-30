"""Workflow 1b — Expansion / PQA Engine (weekly; drives the expansion).

Internal usage says *who is growing*; company enrichment says *how big the ceiling is* and
whether now is the moment. The agent fuses them — the same 3->9 dev delta is a ceiling in a
12-person startup and a beachhead in a 4,000-person enterprise. Five steps:

  compute_expansion_signals (code)  — token slope, active-dev growth, new surface → raw PQA
  resolve_and_enrich_company (code) — org → domain → headcount/funding/hiring/tech (dedupe)
  build_expansion_thesis     (agent)— usage × headroom × timing → motion, TAM, confidence
  personalize_play           (agent)— self-serve nudge vs. sales briefing with evidence
  route_and_record           (code) — holdout split, write PQA + thesis back (STOPS before send)

Thresholds mirror src/crew/context/sales/revenue-strategy.md §3–§5.
"""

from __future__ import annotations

from mash.workflows import AgentStep, CodeStep, StepContext, WorkflowSpec

from . import crm, writes
from .context import CrewGrowthRuntimeContext
from .models import ExpansionCandidate, ExpansionInput, ExpansionState, ExpansionSummary
from .warehouse import compute_expansion_signals

WORKFLOW_ID = "expansion-pqa"
# Read-only sub-workflow: the WHO half only (signals + enrichment), no agent, no writes.
WHO_WORKFLOW_ID = "expansion-pqa-who"
GROWTH_AGENT_ID = "growth"


def _compose_thesis(cand: ExpansionCandidate, motion: str) -> str:
    """Deterministic thesis from the surviving structured fields (fallback)."""
    lead = "Sales expansion" if motion == "sales" else "Self-serve expansion"
    headroom = (
        f"{cand.active_users_now} active devs in a {cand.headcount}-person "
        f"{cand.funding_stage or 'unknown-stage'} company"
        if cand.headcount is not None
        else f"{cand.active_users_now} active devs"
    )
    parts = [
        f"{lead}: PQA {cand.pqa_raw}",
        f"{headroom}",
        f"token slope {cand.token_slope:+.2f}, {cand.active_users_start}->{cand.active_users_now} devs",
    ]
    if cand.new_surface_adopted and cand.new_surface:
        parts.append(f"newly adopted {cand.new_surface}")
    if cand.tam_estimate:
        parts.append(f"TAM {cand.tam_estimate}")
    if cand.confidence is not None:
        parts.append(f"confidence {cand.confidence}")
    return ". ".join(parts) + "."


def _compute_and_dedupe(
    ctx: CrewGrowthRuntimeContext, as_of_date: str
) -> tuple[list[ExpansionCandidate], list[str]]:
    """Authoritative WHO: raw PQA candidates minus those with an open opportunity."""
    candidates = compute_expansion_signals(ctx, as_of_date)
    open_opps = crm.open_opps_for(ctx, [c.org_id for c in candidates])
    kept = [c for c in candidates if c.org_id not in open_opps]
    skipped = [c.org_id for c in candidates if c.org_id in open_opps]
    return kept, skipped


def _enrich(
    ctx: CrewGrowthRuntimeContext, candidates: list[ExpansionCandidate]
) -> list[ExpansionCandidate]:
    """Attach Attio account + Clay firmographics (company headroom)."""
    accounts = crm.resolve_accounts(ctx, [c.org_id for c in candidates])
    domains = [a.get("domain") for a in accounts.values() if a.get("domain")]
    enrichment = crm.read_enrichment(ctx, domains)
    enriched: list[ExpansionCandidate] = []
    for cand in candidates:
        acct = accounts.get(cand.org_id, {})
        domain = acct.get("domain")
        enr = enrichment.get(domain, {}) if domain else {}
        enriched.append(
            cand.model_copy(
                update={
                    "domain": domain,
                    "segment": acct.get("segment"),
                    "consumption_mrr": acct.get("consumption_mrr"),
                    "headcount": enr.get("headcount"),
                    "funding_stage": enr.get("funding_stage"),
                    "last_raised_date": enr.get("last_raised_date"),
                    "hiring_signals": enr.get("hiring_signals"),
                    "tech_stack": enr.get("tech_stack"),
                }
            )
        )
    return enriched


# --------------------------------------------------------------------------------------
# Step 1 — compute_expansion_signals (code)
# --------------------------------------------------------------------------------------


def _build_compute_expansion_signals(ctx: CrewGrowthRuntimeContext):
    def run(inp: ExpansionInput, _ctx: StepContext) -> ExpansionState:
        kept, skipped = _compute_and_dedupe(ctx, inp.as_of_date)
        return ExpansionState(
            as_of_date=inp.as_of_date, candidates=kept, skipped_dedupe=skipped
        )

    return run


# --------------------------------------------------------------------------------------
# Step 2 — resolve_and_enrich_company (code)
# --------------------------------------------------------------------------------------


def _build_resolve_and_enrich_company(ctx: CrewGrowthRuntimeContext):
    def run(inp: ExpansionState, _ctx: StepContext) -> ExpansionState:
        return ExpansionState(
            as_of_date=inp.as_of_date,
            candidates=_enrich(ctx, inp.candidates),
            skipped_dedupe=inp.skipped_dedupe,
        )

    return run


# --------------------------------------------------------------------------------------
# Step 5 — route_and_record (code); STOPS before real send
# --------------------------------------------------------------------------------------


def _build_route_and_record(ctx: CrewGrowthRuntimeContext):
    def run(inp: ExpansionState, step_ctx: StepContext) -> ExpansionSummary:
        dry_run = bool(step_ctx.workflow_input.get("dry_run", False))
        as_of_date = str(step_ctx.workflow_input.get("as_of_date") or inp.as_of_date)

        # Re-derive the authoritative WHO + enrichment deterministically; overlay the
        # agent's thesis/motion/copy by org_id so a mangled container can't corrupt it.
        base, skipped_dedupe = _compute_and_dedupe(ctx, as_of_date)
        base = _enrich(ctx, base)
        judgment = {c.org_id: c for c in inp.candidates}

        plays: list[dict] = []
        treatment_count = 0
        holdout_count = 0
        sales_briefings = 0
        self_serve_nudges = 0

        for b in base:
            j = judgment.get(b.org_id)
            cand = b.model_copy(
                update={
                    "motion": j.motion if j else None,
                    "tam_estimate": j.tam_estimate if j else None,
                    "confidence": j.confidence if j else None,
                    "thesis": j.thesis if j else None,
                    "play_type": j.play_type if j else None,
                    "draft_copy": j.draft_copy if j else None,
                }
            )
            arm = crm.holdout_arm(cand.org_id)
            motion = (cand.motion or "self_serve").lower()
            # Compose a durable thesis from the structured fields (a long free-text
            # thesis can be dropped crossing the second agent step; the short scalars
            # survive). Prefer the agent's paragraph when it carried through.
            thesis = cand.thesis or _compose_thesis(cand, motion)
            play_type = cand.play_type or (
                "sales_expansion_briefing" if motion == "sales" else "self_serve_upgrade_nudge"
            )
            play_id = f"{step_ctx.run_id}:{cand.org_id}"

            if arm == "control":
                holdout_count += 1
                status, copy = "held_out", None
            else:
                treatment_count += 1
                status = "briefing_ready" if motion == "sales" else "ready_to_send"
                copy = cand.draft_copy
                if motion == "sales":
                    sales_briefings += 1
                else:
                    self_serve_nudges += 1

            record = {
                "play_id": play_id,
                "org_id": cand.org_id,
                "workflow_id": WORKFLOW_ID,
                "run_id": step_ctx.run_id,
                "play_type": play_type,
                "segment": cand.segment or "startup",
                "status": status,
                "holdout_arm": arm,
                "dollars_at_risk": None,  # expansion is upside, not at-risk
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
                    "pqa_raw": cand.pqa_raw,
                    "motion": motion,
                    "play_type": play_type,
                    "status": status,
                    "holdout_arm": arm,
                    "headcount": cand.headcount,
                    "tam_estimate": cand.tam_estimate,
                    "confidence": cand.confidence,
                }
            )

        return ExpansionSummary(
            as_of_date=as_of_date,
            dry_run=dry_run,
            candidates_qualified=len(base),
            plays_created=len(plays),
            sales_briefings=sales_briefings,
            self_serve_nudges=self_serve_nudges,
            treatment_count=treatment_count,
            holdout_count=holdout_count,
            skipped_dedupe=skipped_dedupe,
            plays=plays,
        )

    return run


# --------------------------------------------------------------------------------------
# Workflow assembly
# --------------------------------------------------------------------------------------


def build_expansion_workflow(ctx: CrewGrowthRuntimeContext) -> WorkflowSpec:
    return WorkflowSpec(
        workflow_id=WORKFLOW_ID,
        input_model=ExpansionInput,
        steps=[
            CodeStep(
                step_id="compute-expansion-signals",
                run=_build_compute_expansion_signals(ctx),
                input=ExpansionInput,
                output=ExpansionState,
            ),
            CodeStep(
                step_id="resolve-and-enrich-company",
                run=_build_resolve_and_enrich_company(ctx),
                input=ExpansionState,
                output=ExpansionState,
            ),
            AgentStep(
                step_id="build-expansion-thesis",
                agent_id=GROWTH_AGENT_ID,
                input=ExpansionState,
                output=ExpansionState,
                skill_name="building-expansion-thesis",
            ),
            AgentStep(
                step_id="personalize-play",
                agent_id=GROWTH_AGENT_ID,
                input=ExpansionState,
                output=ExpansionState,
                skill_name="selecting-nrr-plays",
            ),
            CodeStep(
                step_id="route-and-record",
                run=_build_route_and_record(ctx),
                input=ExpansionState,
                output=ExpansionSummary,
                agent_ids=(GROWTH_AGENT_ID,),
            ),
        ],
    )


def build_expansion_who_workflow(ctx: CrewGrowthRuntimeContext) -> WorkflowSpec:
    """Read-only sub-workflow of ``expansion-pqa``: the WHO half only.

    Reuses the two authoritative code steps (``compute_expansion_signals`` ->
    ``resolve_and_enrich_company``) and terminates at the enriched candidate set. It
    drops the agent WHAT steps (thesis/personalize) and the ``route_and_record`` step
    entirely, so nothing is written to CRM or the warehouse — this only reports *who*
    qualifies for expansion.
    """
    return WorkflowSpec(
        workflow_id=WHO_WORKFLOW_ID,
        input_model=ExpansionInput,
        steps=[
            CodeStep(
                step_id="compute-expansion-signals",
                run=_build_compute_expansion_signals(ctx),
                input=ExpansionInput,
                output=ExpansionState,
            ),
            CodeStep(
                step_id="resolve-and-enrich-company",
                run=_build_resolve_and_enrich_company(ctx),
                input=ExpansionState,
                output=ExpansionState,
            ),
        ],
    )


__all__ = [
    "build_expansion_workflow",
    "build_expansion_who_workflow",
    "WORKFLOW_ID",
    "WHO_WORKFLOW_ID",
]
