"""Read seam over ``crm_db`` for the code steps.

Stands in for Attio (system of record) + Clay (enrichment) until real integrations
are wired. All reads compile through the semantic layer: dedupe checks (metric reads),
account resolution and company enrichment (entity reads). Writes live in the sibling
``writes`` module — the metrics layer is a read model.
"""

from __future__ import annotations

import hashlib
from datetime import date, datetime
from typing import Any, Iterable

from ..metrics_layer.service.plan import BindParam
from .context import CrewGrowthRuntimeContext

OPEN_PLAY_STATUSES = ("ready_to_send", "briefing_ready")


def _as_str(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


# --------------------------------------------------------------------------------------
# Reads
# --------------------------------------------------------------------------------------


def open_plays_for(ctx: CrewGrowthRuntimeContext, org_ids: Iterable[str]) -> set[str]:
    """Org ids that already have an open play (Dip Rescue dedupe target)."""
    ids = list(org_ids)
    if not ids:
        return set()

    # DISTINCT org_id == GROUP BY org_id; the count in metric_value is unused.
    rows = ctx.compile_and_run(
        ctx.crm_dataset_id,
        "open_plays_by_org",
        dimensions=["org_id"],
        filters=[
            "status IN UNNEST(@open_statuses)",
            "org_id IN UNNEST(@org_ids)",
        ],
        parameters=[
            BindParam("open_statuses", "ARRAY<STRING>", list(OPEN_PLAY_STATUSES)),
            BindParam("org_ids", "ARRAY<STRING>", ids),
        ],
    )
    return {r["org_id"] for r in rows}


def open_opps_for(ctx: CrewGrowthRuntimeContext, org_ids: Iterable[str]) -> set[str]:
    """Org ids with an open opportunity (Expansion/PQA dedupe target)."""
    ids = list(org_ids)
    if not ids:
        return set()

    rows = ctx.compile_and_run(
        ctx.crm_dataset_id,
        "open_opps_by_org",
        dimensions=["org_id"],
        filters=[
            "is_open = TRUE",
            "org_id IN UNNEST(@org_ids)",
        ],
        parameters=[BindParam("org_ids", "ARRAY<STRING>", ids)],
    )
    return {r["org_id"] for r in rows}


def resolve_accounts(
    ctx: CrewGrowthRuntimeContext, org_ids: Iterable[str]
) -> dict[str, dict[str, Any]]:
    """Attio-style account record per org id (domain, segment, owner, mrr, thesis)."""
    ids = list(org_ids)
    if not ids:
        return {}

    rows = ctx.read_entity(
        ctx.crm_dataset_id,
        "accounts",
        attributes=[
            "org_id",
            "account_name",
            "domain",
            "owner",
            "segment",
            "lifecycle_stage",
            "plan_tier",
            "consumption_mrr",
            "active_users",
            "thesis",
        ],
        filters=["org_id IN UNNEST(@org_ids)"],
        parameters=[BindParam("org_ids", "ARRAY<STRING>", ids)],
    )
    return {r["org_id"]: {k: _as_str(v) for k, v in r.items()} for r in rows}


def read_enrichment(
    ctx: CrewGrowthRuntimeContext, domains: Iterable[str]
) -> dict[str, dict[str, Any]]:
    """Clay-style firmographics per domain."""
    doms = [d for d in domains if d]
    if not doms:
        return {}

    rows = ctx.read_entity(
        ctx.crm_dataset_id,
        "company_enrichment",
        attributes=[
            "domain",
            "company_name",
            "headcount",
            "funding_stage",
            "last_raised_date",
            "hiring_signals",
            "tech_stack",
            "industry",
            "is_personal_domain",
        ],
        filters=["domain IN UNNEST(@domains)"],
        parameters=[BindParam("domains", "ARRAY<STRING>", doms)],
    )
    # _as_str renders last_raised_date (DATE) to an ISO string, matching the prior
    # CAST(... AS STRING) and keeping the dict JSON-safe.
    return {r["domain"]: {k: _as_str(v) for k, v in r.items()} for r in rows}


def holdout_arm(org_id: str) -> str:
    """Deterministic ~10% holdout (revenue-strategy.md §6)."""

    digest = int(hashlib.md5(org_id.encode()).hexdigest(), 16)
    return "control" if digest % 10 == 0 else "treatment"


__all__ = [
    "OPEN_PLAY_STATUSES",
    "open_plays_for",
    "open_opps_for",
    "resolve_accounts",
    "read_enrichment",
    "holdout_arm",
]
