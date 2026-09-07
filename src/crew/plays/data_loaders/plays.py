"""``crm_db.plays`` — the play definitions a run's curation produces.

One row per play, a handful per run. The copy is written once per play as a template
and personalized per org at render time, so the two tables join on ``play_id`` and
anything downstream can produce the per-org message without the agent in the loop.

The write comes in two halves. ``upsert_plays_statement`` builds the SQL and its
parameters without running anything, so the commit step can put it in one transaction
alongside the assignments; ``upsert_plays`` is the thin executor for callers that write
the plays on their own.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Optional

from google.cloud import bigquery
from pydantic import BaseModel, Field

from ..context import PlayRuntimeContext

SOURCE_ID = "plays"

_SLUG_RE = re.compile(r"[^a-z0-9]+")

# The struct one play arrives as. ``template_vars`` travels as a JSON string because
# BigQuery has no JSON query-parameter type; the statement PARSE_JSONs it back.
_PLAY_STRUCT_TYPE = bigquery.StructQueryParameterType(
    bigquery.ScalarQueryParameterType("STRING", name="play_id"),
    bigquery.ScalarQueryParameterType("STRING", name="play_name"),
    bigquery.ScalarQueryParameterType("STRING", name="criteria"),
    bigquery.ScalarQueryParameterType("STRING", name="copy_template"),
    bigquery.ScalarQueryParameterType("STRING", name="template_vars"),
)


class PlayRecord(BaseModel):
    """One play as a workflow's curation produces it, before it is written."""

    play_name: str
    criteria: str
    copy_template: str
    template_vars: dict[str, Any] = Field(default_factory=dict)



def table_ref(ctx: PlayRuntimeContext) -> str:
    return ctx.entity_table_ref(ctx.crm_dataset_id, SOURCE_ID)


def play_id_for(run_id: str, play_name: str) -> str:
    """``{run_id}:{slug}`` — stable for a given run and play name."""

    slug = _SLUG_RE.sub("-", play_name.strip().lower()).strip("-")
    return f"{run_id}:{slug or 'play'}"


def upsert_plays_statement(
    ctx: PlayRuntimeContext,
    *,
    run_id: str,
    workflow_id: str,
    records: list[PlayRecord],
    now: Optional[datetime] = None,
) -> tuple[str, list[Any]]:
    """The SQL and parameters that write a run's plays, without running them.

    One set-based ``MERGE`` over an ``ARRAY<STRUCT>`` parameter, whatever the number of
    plays: a per-play ``INSERT`` would collide on ``@play_id`` once several of them share
    a script's parameter namespace.

    ``MERGE`` rather than ``INSERT`` because ``play_id_for`` is deterministic, so a retry
    after a partial commit would otherwise duplicate every row. ``created_at`` is set
    once, on the insert, so a rewrite does not move the row to another partition.
    """

    table = table_ref(ctx)
    values = [
        bigquery.StructQueryParameter(
            None,
            bigquery.ScalarQueryParameter(
                "play_id", "STRING", play_id_for(run_id, record.play_name)
            ),
            bigquery.ScalarQueryParameter("play_name", "STRING", record.play_name),
            bigquery.ScalarQueryParameter("criteria", "STRING", record.criteria),
            bigquery.ScalarQueryParameter(
                "copy_template", "STRING", record.copy_template
            ),
            bigquery.ScalarQueryParameter(
                "template_vars",
                "STRING",
                json.dumps(record.template_vars, ensure_ascii=True),
            ),
        )
        for record in records
    ]
    sql = f"""
        MERGE {table} AS target
        USING UNNEST(@plays) AS source
        ON target.play_id = source.play_id
        WHEN MATCHED THEN UPDATE SET
          run_id = @run_id,
          workflow_id = @workflow_id,
          play_name = source.play_name,
          criteria = source.criteria,
          copy_template = source.copy_template,
          template_vars = PARSE_JSON(source.template_vars)
        WHEN NOT MATCHED THEN INSERT (
          play_id, run_id, workflow_id, play_name,
          criteria, copy_template, template_vars, created_at
        ) VALUES (
          source.play_id, @run_id, @workflow_id, source.play_name,
          source.criteria, source.copy_template,
          PARSE_JSON(source.template_vars), @now
        )
        """
    params: list[Any] = [
        bigquery.ArrayQueryParameter("plays", _PLAY_STRUCT_TYPE, values),
        bigquery.ScalarQueryParameter("run_id", "STRING", run_id),
        bigquery.ScalarQueryParameter("workflow_id", "STRING", workflow_id),
        bigquery.ScalarQueryParameter(
            "now", "TIMESTAMP", now or datetime.now(timezone.utc)
        ),
    ]
    return sql, params


def upsert_plays(
    ctx: PlayRuntimeContext,
    *,
    run_id: str,
    workflow_id: str,
    records: list[PlayRecord],
) -> None:
    """Write a run's plays on their own. The commit step composes the builder instead."""

    if not records:
        return
    sql, params = upsert_plays_statement(
        ctx, run_id=run_id, workflow_id=workflow_id, records=records
    )
    ctx.execute_write(sql, params)


def select_play(
    ctx: PlayRuntimeContext, *, run_id: str, play_id: str
) -> Optional[dict[str, Any]]:
    """One play by id, or None. ``template_vars`` comes back decoded."""

    rows = _select(ctx, "AND play_id = @play_id", [
        bigquery.ScalarQueryParameter("run_id", "STRING", run_id),
        bigquery.ScalarQueryParameter("play_id", "STRING", play_id),
    ])
    return rows[0] if rows else None


def select_run_plays(ctx: PlayRuntimeContext, *, run_id: str) -> list[dict[str, Any]]:
    """Every play defined for a run, oldest first."""

    return _select(
        ctx, "", [bigquery.ScalarQueryParameter("run_id", "STRING", run_id)]
    )


def _select(
    ctx: PlayRuntimeContext, extra_predicate: str, params: list[Any]
) -> list[dict[str, Any]]:
    rows = ctx.query(
        f"""
        SELECT play_id, run_id, workflow_id, play_name, criteria,
               copy_template, TO_JSON_STRING(template_vars) AS template_vars
        FROM {table_ref(ctx)}
        WHERE run_id = @run_id {extra_predicate}
        ORDER BY created_at ASC
        """,
        params,
    )
    for row in rows:
        row["template_vars"] = json.loads(row["template_vars"] or "{}")
    return rows
