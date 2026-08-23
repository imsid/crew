"""Read seam over ``crm_db`` for the code steps.

Stands in for Attio (system of record) + Clay (enrichment) until real integrations
are wired. Both reads compile through the semantic layer as entity reads: account
resolution and company enrichment. The metrics layer is a read model — nothing here
writes.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Iterable

from ..metrics_layer.service.plan import BindParam
from .context import PlayRuntimeContext


def _as_str(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


# --------------------------------------------------------------------------------------
# Reads
# --------------------------------------------------------------------------------------


def resolve_accounts(
    ctx: PlayRuntimeContext, org_ids: Iterable[str]
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
    ctx: PlayRuntimeContext, domains: Iterable[str]
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


__all__ = ["resolve_accounts", "read_enrichment"]
