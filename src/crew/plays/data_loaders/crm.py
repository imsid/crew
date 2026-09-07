"""``crm_db`` reads used while selecting play candidates.

Usage identifies an account signal, but the judgment on the other side also needs to know
who the company is. Those facts live in ``accounts`` and ``company_enrichment``, so the
selection step reads them here and lands them in ``org_snapshot`` — the agent works from
the candidate table alone and never joins anything itself.

The join (``accounts.domain`` -> ``company_enrichment.domain``) is declared in the
source configs, so this is one entity read, not a hand-written join.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Iterable

from ...metrics_layer.service.plan import BindParam
from ..context import PlayRuntimeContext

SOURCE_ID = "accounts"

# What Growth judgment needs: ownership, company shape, headroom, and timing.
ATTRIBUTES = (
    "org_id",
    "owner",
    "segment",
    "lifecycle_stage",
    "thesis",
    "industry",
    "headcount",
    "funding_stage",
    "last_raised_date",
    "hiring_signals",
)


def read_account_context(
    ctx: PlayRuntimeContext, org_ids: Iterable[str]
) -> dict[str, dict[str, Any]]:
    """``org_id -> {field: value}`` for the orgs given, empty fields dropped.

    A field the warehouse has no value for is left out rather than written as null:
    snapshot keys are read off the data, so a null would declare a field the agent
    cannot sort or filter on.
    """

    ids = [str(org_id) for org_id in org_ids]
    if not ids:
        return {}

    rows = ctx.read_entity(
        ctx.crm_dataset_id,
        SOURCE_ID,
        attributes=list(ATTRIBUTES),
        filters=["org_id IN UNNEST(@org_ids)"],
        parameters=[BindParam(name="org_ids", type="ARRAY<STRING>", value=ids)],
        limit=len(ids),
    )
    return {str(row["org_id"]): _clean(row) for row in rows if row.get("org_id")}


def open_opportunity_org_ids(
    ctx: PlayRuntimeContext, org_ids: Iterable[str]
) -> set[str]:
    """The supplied orgs that already have an open sales opportunity."""

    ids = [str(org_id) for org_id in org_ids]
    if not ids:
        return set()

    rows = ctx.compile_and_run(
        ctx.crm_dataset_id,
        "open_opps_by_org",
        dimensions=["org_id"],
        filters=["is_open = TRUE", "org_id IN UNNEST(@org_ids)"],
        parameters=[BindParam(name="org_ids", type="ARRAY<STRING>", value=ids)],
        limit=len(ids),
    )
    return {str(row["org_id"]) for row in rows if row.get("org_id")}


def _clean(row: dict[str, Any]) -> dict[str, Any]:
    return {
        key: (value.isoformat() if isinstance(value, date) else value)
        for key, value in row.items()
        if key != "org_id" and value is not None and value != ""
    }


__all__ = [
    "ATTRIBUTES",
    "SOURCE_ID",
    "open_opportunity_org_ids",
    "read_account_context",
]
