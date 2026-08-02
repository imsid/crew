"""Typed step I/O for the Growth Crew workflows.

Both workflows thread a single growing **state container** forward: code steps and
agent steps enrich the same shape (the framework merges ``workflow_input ⊕ prev_output``
into each step's input, so the running state must live in the output that threads on).
Fields an agent step fills are ``Optional`` and default ``None`` — a code step sets the
numeric facts, the agent step adds judgment and copies the rest through unchanged.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


# =====================================================================================
# Workflow 1a — Consumption Dip Rescue
# =====================================================================================


class DipRescueInput(BaseModel):
    """``workflow_input`` for consumption-dip-rescue."""

    as_of_date: str = Field(description="Run date, YYYY-MM-DD (the 'today' of the run).")
    dry_run: bool = Field(
        default=False,
        description="When true, the final step computes plays but does not write to crm_db.",
    )


class UsageRow(BaseModel):
    """One org's usage panel: token trajectory vs. its own baseline."""

    org_id: str
    org_name: str
    plan_tier: str
    baseline_tokens: float  # trailing 4-week avg daily tokens (weeks -5..-1)
    current_tokens: float  # trailing 7-day avg daily tokens
    decay_pct: float  # (baseline - current) / baseline
    sustained_days: int  # consecutive recent days below 0.8 x baseline
    age_days: int  # account age at as_of (guards onboarding ramps)
    active_users: int
    consumption_mrr: float  # revenue-weight: base fee + trailing-30d token $


class UsagePanel(BaseModel):
    as_of_date: str
    panel: list[UsageRow] = Field(default_factory=list)


class DipCandidate(BaseModel):
    """A gated dip, enriched in place by the diagnose and select agent steps."""

    # --- set by score_and_gate (code) ---
    org_id: str
    org_name: str
    plan_tier: str
    segment: str  # critical | high | watch
    decay_pct: float
    sustained_days: int
    revenue_weight: float  # monthly consumption revenue
    dollars_at_risk: float  # revenue_weight x decay_pct

    # --- added by diagnose_dip (agent) ---
    dip_surface: Optional[str] = None  # which surface dropped hardest
    breadth: Optional[str] = None  # "power_user" | "broad" | "unknown"
    root_cause: Optional[str] = None  # one-line hypothesis

    # --- added by select_and_draft_play (agent) ---
    play_type: Optional[str] = None  # from the CRO play catalog
    draft_copy: Optional[str] = None


class DipRescueState(BaseModel):
    """Container threaded through gate -> diagnose -> select."""

    as_of_date: str
    candidates: list[DipCandidate] = Field(default_factory=list)
    skipped_dedupe: list[str] = Field(default_factory=list)  # org_ids with open plays
    ignored: list[str] = Field(default_factory=list)  # sub-threshold / $0 orgs


class DipRescueSummary(BaseModel):
    """Final result of assign_and_deliver."""

    as_of_date: str
    dry_run: bool
    total_at_risk: float
    plays_created: int
    treatment_count: int
    holdout_count: int
    skipped_dedupe: list[str] = Field(default_factory=list)
    ignored: list[str] = Field(default_factory=list)
    plays: list[dict] = Field(default_factory=list)  # compact record of what was written


# =====================================================================================
# Workflow 1b — Expansion / PQA Engine
# =====================================================================================


class ExpansionInput(BaseModel):
    """``workflow_input`` for expansion-pqa."""

    as_of_date: str = Field(description="Run date, YYYY-MM-DD.")
    dry_run: bool = Field(default=False)


class ExpansionCandidate(BaseModel):
    """A product-qualified account, enriched in place down the pipeline."""

    # --- set by compute_expansion_signals (code) ---
    org_id: str
    org_name: str
    plan_tier: str
    token_slope: float  # recent-window token growth (fraction)
    active_dev_growth: float  # recent active-dev growth (fraction)
    active_users_start: int
    active_users_now: int
    new_surface_adopted: bool
    new_surface: Optional[str] = None
    pqa_raw: float  # 0-100 raw product-qualified-account score

    # --- added by resolve_and_enrich_company (code) ---
    domain: Optional[str] = None
    segment: Optional[str] = None
    headcount: Optional[int] = None
    funding_stage: Optional[str] = None
    last_raised_date: Optional[str] = None
    hiring_signals: Optional[int] = None
    tech_stack: Optional[str] = None
    consumption_mrr: Optional[float] = None

    # --- added by build_expansion_thesis (agent) ---
    motion: Optional[str] = None  # "self_serve" | "sales"
    tam_estimate: Optional[str] = None
    confidence: Optional[float] = None
    thesis: Optional[str] = None

    # --- added by personalize_play (agent) ---
    play_type: Optional[str] = None
    draft_copy: Optional[str] = None


class ExpansionState(BaseModel):
    """Container threaded through compute -> enrich -> thesis -> personalize."""

    as_of_date: str
    candidates: list[ExpansionCandidate] = Field(default_factory=list)
    skipped_dedupe: list[str] = Field(default_factory=list)  # org_ids with open opps


class ExpansionSummary(BaseModel):
    as_of_date: str
    dry_run: bool
    candidates_qualified: int
    plays_created: int
    sales_briefings: int
    self_serve_nudges: int
    treatment_count: int
    holdout_count: int
    skipped_dedupe: list[str] = Field(default_factory=list)
    plays: list[dict] = Field(default_factory=list)


__all__ = [
    "DipRescueInput",
    "UsageRow",
    "UsagePanel",
    "DipCandidate",
    "DipRescueState",
    "DipRescueSummary",
    "ExpansionInput",
    "ExpansionCandidate",
    "ExpansionState",
    "ExpansionSummary",
]
