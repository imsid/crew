"""Typed returns for the deterministic warehouse reads.

These are the shapes the code half of the 'Own NRR' motion produces: one row per
org for the dip signal (:class:`UsageRow`) and for the product-qualified-account
signal (:class:`ExpansionCandidate`). Fields a code step cannot fill from the
warehouse alone are ``Optional`` and default ``None``.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


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


class ExpansionCandidate(BaseModel):
    """A product-qualified account as the warehouse and CRM reads see it."""

    # --- set by warehouse.compute_expansion_signals ---
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

    # --- filled from crm.resolve_accounts / crm.read_enrichment ---
    domain: Optional[str] = None
    segment: Optional[str] = None
    headcount: Optional[int] = None
    funding_stage: Optional[str] = None
    last_raised_date: Optional[str] = None
    hiring_signals: Optional[int] = None
    tech_stack: Optional[str] = None
    consumption_mrr: Optional[float] = None


__all__ = ["UsageRow", "ExpansionCandidate"]
