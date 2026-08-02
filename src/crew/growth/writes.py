"""Write seam over ``crm_db`` — the deliberate sibling of the semantic read layer.

The metrics layer is a read model; writes need idempotent MERGE-by-key / UPDATE
semantics, not a query compiler, so they live here. The physical table is resolved from
the source config (``ctx.entity_table_ref``) so the read and write sides share one
declared schema. There is no real outbound — the final code steps record a ``play`` /
``thesis`` and stop.

Writes are idempotent by ``play_id`` (MERGE upsert); ``play_id`` is derived from
``run_id + org_id`` so a retried step overwrites its own row rather than duplicating.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from google.cloud import bigquery

from .context import CrewGrowthRuntimeContext


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_play(ctx: CrewGrowthRuntimeContext, play: dict[str, Any]) -> None:
    """Upsert one play by play_id (idempotent across step retries)."""

    now = _now_iso()
    table = ctx.entity_table_ref(ctx.crm_dataset_id, "plays")
    sql = f"""
    MERGE {table} T
    USING (
      SELECT @play_id AS play_id, @org_id AS org_id, @workflow_id AS workflow_id,
             @run_id AS run_id, @play_type AS play_type, @segment AS segment,
             @status AS status, @holdout_arm AS holdout_arm,
             @dollars_at_risk AS dollars_at_risk, @draft_copy AS draft_copy,
             @thesis AS thesis, @outcome AS outcome
    ) S
    ON T.play_id = S.play_id
    WHEN MATCHED THEN UPDATE SET
      org_id = S.org_id, workflow_id = S.workflow_id, run_id = S.run_id,
      play_type = S.play_type, segment = S.segment, status = S.status,
      holdout_arm = S.holdout_arm, dollars_at_risk = S.dollars_at_risk,
      draft_copy = S.draft_copy, thesis = S.thesis, outcome = S.outcome,
      updated_at = @now
    WHEN NOT MATCHED THEN INSERT (
      play_id, org_id, workflow_id, run_id, play_type, segment, status,
      holdout_arm, dollars_at_risk, draft_copy, thesis, outcome, created_at, updated_at
    ) VALUES (
      S.play_id, S.org_id, S.workflow_id, S.run_id, S.play_type, S.segment, S.status,
      S.holdout_arm, S.dollars_at_risk, S.draft_copy, S.thesis, S.outcome, @now, @now
    )
    """
    params = [
        bigquery.ScalarQueryParameter("play_id", "STRING", play["play_id"]),
        bigquery.ScalarQueryParameter("org_id", "STRING", play["org_id"]),
        bigquery.ScalarQueryParameter("workflow_id", "STRING", play["workflow_id"]),
        bigquery.ScalarQueryParameter("run_id", "STRING", play.get("run_id")),
        bigquery.ScalarQueryParameter("play_type", "STRING", play["play_type"]),
        bigquery.ScalarQueryParameter("segment", "STRING", play.get("segment")),
        bigquery.ScalarQueryParameter("status", "STRING", play["status"]),
        bigquery.ScalarQueryParameter("holdout_arm", "STRING", play.get("holdout_arm")),
        bigquery.ScalarQueryParameter(
            "dollars_at_risk", "FLOAT64", play.get("dollars_at_risk")
        ),
        bigquery.ScalarQueryParameter("draft_copy", "STRING", play.get("draft_copy")),
        bigquery.ScalarQueryParameter("thesis", "STRING", play.get("thesis")),
        bigquery.ScalarQueryParameter("outcome", "STRING", play.get("outcome")),
        bigquery.ScalarQueryParameter("now", "STRING", now),
    ]
    ctx.execute_write(sql, params)


def update_account_thesis(
    ctx: CrewGrowthRuntimeContext, org_id: str, thesis: str
) -> None:
    """Write the workflow's thesis back to the account (keeps the record true)."""

    table = ctx.entity_table_ref(ctx.crm_dataset_id, "accounts")
    sql = f"""
    UPDATE {table}
    SET thesis = @thesis, updated_at = @now
    WHERE org_id = @org_id
    """
    params = [
        bigquery.ScalarQueryParameter("thesis", "STRING", thesis),
        bigquery.ScalarQueryParameter("org_id", "STRING", org_id),
        bigquery.ScalarQueryParameter("now", "STRING", _now_iso()),
    ]
    ctx.execute_write(sql, params)


__all__ = ["write_play", "update_account_thesis"]
