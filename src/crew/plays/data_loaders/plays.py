"""``crm_db.plays`` — the play definitions the agent creates for a run.

One row per play, a handful per run. The copy is written once per play as a template
and personalized per org at render time, so the two tables join on ``play_id`` and
anything downstream can produce the per-org message without the agent in the loop.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any, Optional

from google.cloud import bigquery

from ..context import PlayRuntimeContext

SOURCE_ID = "plays"

_SLUG_RE = re.compile(r"[^a-z0-9]+")



def table_ref(ctx: PlayRuntimeContext) -> str:
    return ctx.entity_table_ref(ctx.crm_dataset_id, SOURCE_ID)


def play_id_for(run_id: str, play_name: str) -> str:
    """``{run_id}:{slug}`` — stable for a given run and play name."""

    slug = _SLUG_RE.sub("-", play_name.strip().lower()).strip("-")
    return f"{run_id}:{slug or 'play'}"


def insert_play(
    ctx: PlayRuntimeContext,
    *,
    play_id: str,
    run_id: str,
    workflow_id: str,
    play_name: str,
    criteria: str,
    copy_template: str,
    template_vars: dict[str, Any],
) -> None:
    ctx.execute_write(
        f"""
        INSERT INTO {table_ref(ctx)} (
          play_id, run_id, workflow_id, play_name,
          criteria, copy_template, template_vars, created_at
        ) VALUES (
          @play_id, @run_id, @workflow_id, @play_name,
          @criteria, @copy_template, PARSE_JSON(@template_vars), @now
        )
        """,
        [
            bigquery.ScalarQueryParameter("play_id", "STRING", play_id),
            bigquery.ScalarQueryParameter("run_id", "STRING", run_id),
            bigquery.ScalarQueryParameter("workflow_id", "STRING", workflow_id),
            bigquery.ScalarQueryParameter("play_name", "STRING", play_name),
            bigquery.ScalarQueryParameter("criteria", "STRING", criteria),
            bigquery.ScalarQueryParameter("copy_template", "STRING", copy_template),
            bigquery.ScalarQueryParameter(
                "template_vars", "STRING", json.dumps(template_vars, ensure_ascii=True)
            ),
            bigquery.ScalarQueryParameter(
                "now", "TIMESTAMP", datetime.now(timezone.utc)
            ),
        ],
    )


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
