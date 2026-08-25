"""``crm_db`` — who the org is, for the snapshot the selection step writes.

The dip gate is pure usage, but the judgment on the other side of it is not: the same
40% drop means one thing at a 60-person Series B and another at a 3,200-person public
company. Those facts live in ``accounts`` and ``company_enrichment``, so the selection
step reads them here and lands them in ``org_snapshot`` — the agent works from the
candidate table alone and never joins anything itself.

The join (``accounts.domain`` -> ``company_enrichment.domain``) is declared in the
source configs, so this is one entity read, not a hand-written join.
"""

from __future__ import annotations

from datetime import date
from typing import Any, Iterable

from ...metrics_layer.service.plan import BindParam
from ..context import PlayRuntimeContext

SOURCE_ID = "accounts"

# What the growth judgment needs: who owns the account, what kind of company it is,
# how much room it has to grow, and whether it is growing right now.
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


def _clean(row: dict[str, Any]) -> dict[str, Any]:
    return {
        key: (value.isoformat() if isinstance(value, date) else value)
        for key, value in row.items()
        if key != "org_id" and value is not None and value != ""
    }


__all__ = ["ATTRIBUTES", "SOURCE_ID", "read_account_context"]
