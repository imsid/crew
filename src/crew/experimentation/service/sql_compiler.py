"""SQL compiler helpers for experiment analysis."""

from __future__ import annotations

from typing import Any, Dict

from ...agents.data.config import BIGQUERY_PROJECT_ID
from ...metrics_layer.service.pathing import normalize_identifier
from ...metrics_layer.service.sql_compiler import (
    _build_source_dimension_map,
    _compile_simple_metric_expr,
)
from .constants import EXPOSURE_TABLE_COLUMNS, EXPOSURE_TABLE_NAME


def compile_experiment_plan(
    dataset_id: str,
    experiment_name: str,
    experiment_cfg: Dict[str, Any],
    semantics: Dict[str, Any],
) -> Dict[str, Any]:
    experiment_id = semantics["experiment_id"]
    experiment_version = semantics["experiment_version"]
    subject_type = semantics["subject_type"]
    control_variant = semantics["control_variant"]
    variants = semantics["variants"]
    metric_entries = semantics["metric_entries"]
    source_cache = semantics["source_cache"]

    exposure_sql = build_exposure_summary_sql(
        dataset_id=dataset_id,
        experiment_id=experiment_id,
        experiment_version=experiment_version,
        subject_type=subject_type,
    )

    metric_plans = []
    for metric in semantics["metrics"]:
        metric_entry = metric_entries[metric["metric_id"]]
        metric_cfg = metric_entry["config"]
        source_cfg = source_cache[metric["source_id"]]
        metric_expr, warnings = _compile_simple_metric_expr(
            metric_cfg["expr"], source_cfg=source_cfg
        )
        dimension_map = _build_source_dimension_map(source_cfg=source_cfg)
        subject_expr = dimension_map[metric["subject_key"]]
        ts_expr = dimension_map[metric["timestamp_key"]]
        source_dataset = normalize_identifier(source_cfg.get("dataset"), "source.dataset")
        source_table = normalize_identifier(source_cfg.get("table"), "source.table")
        metric_sql = build_metric_summary_sql(
            dataset_id=dataset_id,
            experiment_id=experiment_id,
            experiment_version=experiment_version,
            subject_type=subject_type,
            source_dataset=source_dataset,
            source_table=source_table,
            subject_expr=subject_expr,
            ts_expr=ts_expr,
            metric_expr=metric_expr,
            metric_filters=metric_cfg.get("filters"),
            attribution_window_days=metric["attribution_window_days"],
        )
        metric_plans.append(
            {
                "metric_id": metric["metric_id"],
                "source_id": metric["source_id"],
                "subject_key": metric["subject_key"],
                "timestamp_key": metric["timestamp_key"],
                "attribution_window_days": metric["attribution_window_days"],
                "sql": metric_sql,
                "expected_columns": [
                    "variant_id",
                    "exposed_subjects",
                    "observed_subjects",
                    "metric_sum",
                    "metric_sum_squares",
                ],
                "warnings": warnings,
            }
        )

    return {
        "dataset_id": dataset_id,
        "name": experiment_name,
        "experiment_id": experiment_id,
        "label": experiment_cfg.get("label"),
        "experiment_version": experiment_version,
        "subject_type": subject_type,
        "control_variant": control_variant,
        "variants": variants,
        "exposure_table": {
            "table_name": EXPOSURE_TABLE_NAME,
            "columns": EXPOSURE_TABLE_COLUMNS,
            "invariants": [
                "canonical exposure is the first occurred_at per experiment/version/subject",
                "cross-variant reassignment marks a subject as contaminated",
                "SRM uses canonical first exposures only",
            ],
        },
        "allocation_weights": semantics["allocation_weights"],
        "plans": {
            "exposure_summary": {
                "sql": exposure_sql,
                "expected_columns": [
                    "variant_id",
                    "canonical_subjects",
                    "contaminated_subjects",
                ],
            },
            "metric_summaries": metric_plans,
        },
    }


def _build_table_ref(dataset_id: str, table_name: str) -> str:
    if BIGQUERY_PROJECT_ID:
        return f"`{BIGQUERY_PROJECT_ID}.{dataset_id}.{table_name}`"
    return f"`{dataset_id}.{table_name}`"


def build_exposure_summary_sql(
    dataset_id: str,
    experiment_id: str,
    experiment_version: str,
    subject_type: str,
) -> str:
    exposure_table_ref = _build_table_ref(dataset_id, EXPOSURE_TABLE_NAME)
    return f"""WITH exposure_candidates AS (
  SELECT
    exposure_event_id,
    occurred_at,
    experiment_id,
    experiment_version,
    variant_id,
    assignment_unit_type,
    assignment_unit_id
  FROM {exposure_table_ref}
  WHERE experiment_id = '{experiment_id}'
    AND experiment_version = '{experiment_version}'
    AND assignment_unit_type = '{subject_type}'
),
variant_counts AS (
  SELECT
    assignment_unit_id,
    COUNT(DISTINCT variant_id) AS variant_count
  FROM exposure_candidates
  GROUP BY assignment_unit_id
),
canonical_exposures AS (
  SELECT
    exposure_event_id,
    occurred_at,
    experiment_id,
    experiment_version,
    variant_id,
    assignment_unit_type,
    assignment_unit_id
  FROM exposure_candidates
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY experiment_id, experiment_version, assignment_unit_type, assignment_unit_id
    ORDER BY occurred_at ASC, exposure_event_id ASC
  ) = 1
)
SELECT
  ce.variant_id,
  COUNT(*) AS canonical_subjects,
  COUNTIF(vc.variant_count > 1) AS contaminated_subjects
FROM canonical_exposures ce
JOIN variant_counts vc
  USING (assignment_unit_id)
GROUP BY ce.variant_id
ORDER BY ce.variant_id"""


def build_metric_summary_sql(
    dataset_id: str,
    experiment_id: str,
    experiment_version: str,
    subject_type: str,
    source_dataset: str,
    source_table: str,
    subject_expr: str,
    ts_expr: str,
    metric_expr: str,
    metric_filters: Any,
    attribution_window_days: int,
) -> str:
    exposure_table_ref = _build_table_ref(dataset_id, EXPOSURE_TABLE_NAME)
    source_table_ref = _build_table_ref(source_dataset, source_table)
    join_filter_sql = ""
    if isinstance(metric_filters, list):
        cleaned_filters = [
            str(value).strip() for value in metric_filters if str(value).strip()
        ]
        if cleaned_filters:
            join_filter_sql = "".join(f"\n   AND ({clause})" for clause in cleaned_filters)
    return f"""WITH exposure_candidates AS (
  SELECT
    exposure_event_id,
    occurred_at,
    experiment_id,
    experiment_version,
    variant_id,
    assignment_unit_type,
    assignment_unit_id
  FROM {exposure_table_ref}
  WHERE experiment_id = '{experiment_id}'
    AND experiment_version = '{experiment_version}'
    AND assignment_unit_type = '{subject_type}'
),
variant_counts AS (
  SELECT
    assignment_unit_id,
    COUNT(DISTINCT variant_id) AS variant_count
  FROM exposure_candidates
  GROUP BY assignment_unit_id
),
canonical_exposures AS (
  SELECT
    exposure_event_id,
    occurred_at,
    experiment_id,
    experiment_version,
    variant_id,
    assignment_unit_type,
    assignment_unit_id
  FROM exposure_candidates
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY experiment_id, experiment_version, assignment_unit_type, assignment_unit_id
    ORDER BY occurred_at ASC, exposure_event_id ASC
  ) = 1
),
eligible_exposures AS (
  SELECT
    ce.variant_id,
    ce.assignment_unit_id,
    ce.occurred_at
  FROM canonical_exposures ce
  JOIN variant_counts vc
    USING (assignment_unit_id)
  WHERE vc.variant_count = 1
),
subject_metric_values AS (
  SELECT
    ee.variant_id,
    ee.assignment_unit_id AS subject_id,
    COALESCE({metric_expr}, 0) AS metric_value
  FROM eligible_exposures ee
  LEFT JOIN {source_table_ref} src
    ON CAST(ee.assignment_unit_id AS STRING) = CAST({subject_expr} AS STRING)
   AND {ts_expr} >= ee.occurred_at
   AND {ts_expr} < TIMESTAMP_ADD(ee.occurred_at, INTERVAL {attribution_window_days} DAY)
{join_filter_sql}
  GROUP BY ee.variant_id, subject_id
)
SELECT
  variant_id,
  COUNT(*) AS exposed_subjects,
  COUNTIF(metric_value IS NOT NULL) AS observed_subjects,
  SUM(metric_value) AS metric_sum,
  SUM(metric_value * metric_value) AS metric_sum_squares
FROM subject_metric_values
GROUP BY variant_id
ORDER BY variant_id"""
