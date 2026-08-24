"""``crm_db.play_candidates`` — the shared candidate table.

One row per (run_id, org_id). Every play workflow writes its run here, so nothing in
the schema names a play or a workflow's particular signals: the per-workflow facts
live inside two JSON snapshots (``org_snapshot`` = who the org is, ``usage_snapshot``
= why it qualified), and ``play_id`` is the only column the agent writes.

Field names supplied by the agent (``order_by``, ``where``) are compiled against the
snapshot keys the run actually has — never interpolated as given — and literals bind
as query parameters.
"""

from __future__ import annotations

import json
import re
from datetime import date, datetime, timezone
from typing import Any, Iterable, Optional

from google.cloud import bigquery
from pydantic import BaseModel, Field

from ..context import PlayRuntimeContext

SOURCE_ID = "play_candidates"

# select_candidates never returns more than this, whatever the caller asks for. A run
# is a few hundred orgs at most; the agent works from ordered slices, not the whole set.
MAX_ROWS = 200

# Columns a caller may name directly. Everything else has to be a snapshot key.
SCALAR_COLUMNS = ("org_id", "org_name")
SNAPSHOT_COLUMNS = ("org_snapshot", "usage_snapshot")

_ORDER_BY_RE = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(ASC|DESC)?\s*$", re.I)
_PREDICATE_RE = re.compile(r"^\s*([A-Za-z_][A-Za-z0-9_]*)\s*(>=|<=|!=|=|>|<)\s*(.+?)\s*$")



class CandidateRecord(BaseModel):
    """One qualifying org as a workflow's selection produces it, before it is written."""

    org_id: str
    org_name: str
    org_snapshot: dict[str, Any] = Field(default_factory=dict)
    usage_snapshot: dict[str, Any] = Field(default_factory=dict)


def table_ref(ctx: PlayRuntimeContext) -> str:
    return ctx.entity_table_ref(ctx.crm_dataset_id, SOURCE_ID)


# --------------------------------------------------------------------------------------
# Writes
# --------------------------------------------------------------------------------------


def insert_run(
    ctx: PlayRuntimeContext,
    *,
    run_id: str,
    workflow_id: str,
    records: Iterable[CandidateRecord],
) -> int:
    """Write one run's candidates: delete the run's rows, then insert them.

    Delete-then-insert rather than MERGE because ``run_id`` owns the whole set — a
    retried step replaces exactly its own rows, and an org that no longer qualifies
    isn't left behind.
    """

    rows = list(records)
    table = table_ref(ctx)
    ctx.execute_write(
        f"DELETE FROM {table} WHERE run_id = @run_id",
        [bigquery.ScalarQueryParameter("run_id", "STRING", run_id)],
    )
    if not rows:
        return 0

    values = ", ".join(
        f"(@run_id, @workflow_id, @now, @now, @org_id_{i}, @org_name_{i}, "
        f"PARSE_JSON(@org_snapshot_{i}), PARSE_JSON(@usage_snapshot_{i}), NULL)"
        for i in range(len(rows))
    )
    params: list[Any] = [
        bigquery.ScalarQueryParameter("run_id", "STRING", run_id),
        bigquery.ScalarQueryParameter("workflow_id", "STRING", workflow_id),
        bigquery.ScalarQueryParameter("now", "TIMESTAMP", _now()),
    ]
    for i, row in enumerate(rows):
        params += [
            bigquery.ScalarQueryParameter(f"org_id_{i}", "STRING", row.org_id),
            bigquery.ScalarQueryParameter(f"org_name_{i}", "STRING", row.org_name),
            bigquery.ScalarQueryParameter(
                f"org_snapshot_{i}", "STRING", _dump_json(row.org_snapshot)
            ),
            bigquery.ScalarQueryParameter(
                f"usage_snapshot_{i}", "STRING", _dump_json(row.usage_snapshot)
            ),
        ]

    ctx.execute_write(
        f"""
        INSERT INTO {table} (
          run_id, workflow_id, created_at, updated_at,
          org_id, org_name, org_snapshot, usage_snapshot, play_id
        ) VALUES {values}
        """,
        params,
    )
    return len(rows)


def set_play_id(
    ctx: PlayRuntimeContext, *, run_id: str, play_id: str, org_ids: list[str]
) -> int:
    """Stamp ``play_id`` onto the run's unassigned rows for ``org_ids``.

    Only touches rows where ``play_id IS NULL``, so an org is never silently moved
    from one play to another. Returns the number of rows updated.
    """

    before = coverage(ctx, run_id)["unassigned_remaining"]
    ctx.execute_write(
        f"""
        UPDATE {table_ref(ctx)}
        SET play_id = @play_id, updated_at = @now
        WHERE run_id = @run_id AND org_id IN UNNEST(@org_ids) AND play_id IS NULL
        """,
        [
            bigquery.ScalarQueryParameter("run_id", "STRING", run_id),
            bigquery.ArrayQueryParameter("org_ids", "STRING", list(org_ids)),
            bigquery.ScalarQueryParameter("play_id", "STRING", play_id),
            bigquery.ScalarQueryParameter("now", "TIMESTAMP", _now()),
        ],
    )
    return before - coverage(ctx, run_id)["unassigned_remaining"]


# --------------------------------------------------------------------------------------
# Reads
# --------------------------------------------------------------------------------------


def select_candidates(
    ctx: PlayRuntimeContext,
    *,
    run_id: str,
    limit: int = 50,
    offset: int = 0,
    order_by: Optional[str] = None,
    where: Optional[str] = None,
) -> list[dict[str, Any]]:
    """The run's rows with both snapshots decoded and flattened onto each row.

    ``order_by`` ("dollars_at_risk DESC") and ``where`` ("decay_pct >= 0.4 AND
    plan_tier = 'enterprise'") name snapshot fields; both compile to JSON extraction.
    """

    keys = snapshot_keys(ctx, run_id)
    params: list[Any] = [bigquery.ScalarQueryParameter("run_id", "STRING", run_id)]
    predicates = ["run_id = @run_id"] + (
        _compile_where(where, keys, params) if where else []
    )
    order_sql = _compile_order_by(order_by, keys) if order_by else "org_id ASC"

    rows = ctx.query(
        f"""
        SELECT org_id, org_name, play_id,
               TO_JSON_STRING(org_snapshot) AS org_snapshot,
               TO_JSON_STRING(usage_snapshot) AS usage_snapshot
        FROM {table_ref(ctx)}
        WHERE {' AND '.join(predicates)}
        ORDER BY {order_sql}
        LIMIT {max(1, min(int(limit or 50), MAX_ROWS))} OFFSET {max(0, int(offset or 0))}
        """,
        params,
    )
    return [_flatten(row) for row in rows]


def count_candidates(
    ctx: PlayRuntimeContext, *, run_id: str, where: Optional[str] = None
) -> int:
    """How many of the run's rows match ``where`` (the un-paged total)."""

    keys = snapshot_keys(ctx, run_id)
    params: list[Any] = [bigquery.ScalarQueryParameter("run_id", "STRING", run_id)]
    predicates = ["run_id = @run_id"] + (
        _compile_where(where, keys, params) if where else []
    )
    rows = ctx.query(
        f"SELECT COUNT(*) AS n FROM {table_ref(ctx)} WHERE {' AND '.join(predicates)}",
        params,
    )
    return int(rows[0]["n"]) if rows else 0


def select_org_ids(ctx: PlayRuntimeContext, *, run_id: str, org_ids: list[str]) -> dict[str, Optional[str]]:
    """``org_id -> play_id`` for the requested orgs that are in the run."""

    rows = ctx.query(
        f"""
        SELECT org_id, play_id FROM {table_ref(ctx)}
        WHERE run_id = @run_id AND org_id IN UNNEST(@org_ids)
        """,
        [
            bigquery.ScalarQueryParameter("run_id", "STRING", run_id),
            bigquery.ArrayQueryParameter("org_ids", "STRING", list(org_ids)),
        ],
    )
    return {str(row["org_id"]): row.get("play_id") for row in rows}


def coverage(ctx: PlayRuntimeContext, run_id: str) -> dict[str, int]:
    """Assignment coverage for a run — the agent's completion check."""

    rows = ctx.query(
        f"""
        SELECT COUNT(*) AS total, COUNTIF(play_id IS NULL) AS unassigned
        FROM {table_ref(ctx)} WHERE run_id = @run_id
        """,
        [bigquery.ScalarQueryParameter("run_id", "STRING", run_id)],
    )
    row = rows[0] if rows else {"total": 0, "unassigned": 0}
    return {
        "candidate_count": int(row["total"]),
        "unassigned_remaining": int(row["unassigned"]),
    }


def snapshot_keys(ctx: PlayRuntimeContext, run_id: str) -> dict[str, dict[str, str]]:
    """``field -> {container, json_type}`` for every key present on the run's rows.

    Read off the data rather than off the declared schema, so a field the schema
    promises but the selection never wrote is caught here instead of at render time.
    """

    rows = ctx.query(
        f"""
        WITH keys AS (
          SELECT 'org_snapshot' AS container, k AS field,
                 JSON_TYPE(org_snapshot[k]) AS json_type
          FROM {table_ref(ctx)}, UNNEST(JSON_KEYS(org_snapshot, 1)) AS k
          WHERE run_id = @run_id
          UNION ALL
          SELECT 'usage_snapshot' AS container, k AS field,
                 JSON_TYPE(usage_snapshot[k]) AS json_type
          FROM {table_ref(ctx)}, UNNEST(JSON_KEYS(usage_snapshot, 1)) AS k
          WHERE run_id = @run_id
        )
        SELECT container, field, ANY_VALUE(json_type) AS json_type
        FROM keys GROUP BY container, field
        """,
        [bigquery.ScalarQueryParameter("run_id", "STRING", run_id)],
    )
    return {
        str(row["field"]): {
            "container": str(row["container"]),
            "json_type": str(row["json_type"] or "string"),
        }
        for row in rows
    }


# --------------------------------------------------------------------------------------
# Field-name compilation
# --------------------------------------------------------------------------------------


def field_sql(field: str, keys: dict[str, dict[str, str]]) -> str:
    """Compile a caller-supplied field name to SQL, or reject it."""

    if field in SCALAR_COLUMNS:
        return field
    spec = keys.get(field)
    if spec is None:
        raise ValueError(
            f"unknown field '{field}'. Available: "
            f"{', '.join(sorted(set(SCALAR_COLUMNS) | set(keys)))}"
        )
    extract = f"JSON_VALUE({spec['container']}, '$.{field}')"
    if spec["json_type"] == "number":
        return f"SAFE_CAST({extract} AS FLOAT64)"
    if spec["json_type"] == "boolean":
        return f"SAFE_CAST({extract} AS BOOL)"
    return extract


def _compile_order_by(order_by: str, keys: dict[str, dict[str, str]]) -> str:
    terms = []
    for clause in order_by.split(","):
        match = _ORDER_BY_RE.match(clause)
        if not match:
            raise ValueError(
                f"order_by term '{clause.strip()}' must be '<field> [ASC|DESC]'"
            )
        terms.append(
            f"{field_sql(match.group(1), keys)} {(match.group(2) or 'ASC').upper()}"
        )
    return ", ".join(terms)


def _compile_where(
    where: str, keys: dict[str, dict[str, str]], params: list[Any]
) -> list[str]:
    """AND-joined ``<field> <op> <literal>`` predicates; literals bind as parameters."""

    compiled: list[str] = []
    for index, clause in enumerate(re.split(r"\s+AND\s+", where, flags=re.I)):
        match = _PREDICATE_RE.match(clause)
        if not match:
            raise ValueError(
                f"where term '{clause.strip()}' must be '<field> <op> <value>' with "
                "op one of = != > >= < <=, joined by AND"
            )
        field, op, literal = match.group(1), match.group(2), match.group(3)
        value, bq_type = _parse_literal(literal)
        name = f"w{index}"
        params.append(bigquery.ScalarQueryParameter(name, bq_type, value))
        left = field_sql(field, keys)
        if bq_type == "FLOAT64" and not left.startswith("SAFE_CAST"):
            left = f"SAFE_CAST({left} AS FLOAT64)"
        compiled.append(f"{left} {op} @{name}")
    return compiled


def _parse_literal(literal: str) -> tuple[Any, str]:
    text = literal.strip()
    if len(text) >= 2 and text[0] in "'\"" and text[-1] == text[0]:
        return text[1:-1], "STRING"
    if text.lower() in ("true", "false"):
        return text.lower() == "true", "BOOL"
    try:
        return float(text), "FLOAT64"
    except ValueError:
        return text, "STRING"


# --------------------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------------------


def _flatten(row: dict[str, Any]) -> dict[str, Any]:
    """One candidate as flat scalars: snapshot keys sit alongside org_id/org_name."""

    flat: dict[str, Any] = {
        "org_id": row["org_id"],
        "org_name": row["org_name"],
        "play_id": row.get("play_id"),
    }
    for column in SNAPSHOT_COLUMNS:
        payload = json.loads(row[column]) if row.get(column) else {}
        if isinstance(payload, dict):
            flat.update(payload)
    return flat


def _dump_json(payload: dict[str, Any]) -> str:
    return json.dumps(payload, ensure_ascii=True, default=_json_default)


def _json_default(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return str(value)


def _now() -> datetime:
    return datetime.now(timezone.utc)
