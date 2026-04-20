from __future__ import annotations

import json
from pathlib import Path

from crew.experimentation.service.context import build_tool_context
from crew.experimentation.service.tool_entrypoints import (
    compile_experiment_analysis_sql,
    compute_experiment_analysis,
)


def _workspace_root(root: Path) -> Path:
    return root / "marketing_db"


def _write_source(root: Path, *, subject_lines: str, ts_line: str) -> None:
    metrics_root = _workspace_root(root) / "metrics_layer" / "configs"
    (metrics_root / "sources").mkdir(parents=True, exist_ok=True)
    (metrics_root / "metrics").mkdir(parents=True, exist_ok=True)
    (metrics_root / "sources" / "conversion_events.yml").write_text(
        f"""kind: source
version: 1
id: conversion_events
dataset: marketing_db
table: conversion_events
subject:
{subject_lines}
{ts_line}
dimensions:
  - name: conversion_id
    expr: conversion_id
    data_type: INT64
  - name: customer_id
    expr: customer_id
    data_type: STRING
  - name: workspace_id
    expr: workspace_id
    data_type: STRING
  - name: created_at
    expr: created_at
    data_type: TIMESTAMP
measures:
  - name: conversion_count
    expr: conversion_id
    agg: COUNT_DISTINCT
    data_type: INT64
""",
        encoding="utf-8",
    )
    (metrics_root / "metrics" / "conversions_total.yml").write_text(
        """kind: metric
version: 1
id: conversions_total
label: Total Conversions
type: simple
base_source: conversion_events
expr: conversion_count
dimensions:
  - customer_id
format: "#,##0"
""",
        encoding="utf-8",
    )


def _write_experiment(root: Path, metric_id: str = "conversions_total") -> None:
    experiments_root = (
        _workspace_root(root)
        / "experimentation"
        / "configs"
        / "experiments"
    )
    experiments_root.mkdir(parents=True, exist_ok=True)
    (experiments_root / "signup_checkout_test.yml").write_text(
        f"""kind: experiment
version: 1
id: signup_checkout_test
label: Signup Checkout Test
dataset: marketing_db
experiment_version: v1
control_variant: control
subject_type: customer
variants:
  - id: control
    allocation_weight: 0.5
  - id: treatment
    allocation_weight: 0.5
metrics:
  - metric_id: {metric_id}
    attribution_window_days: 14
""",
        encoding="utf-8",
    )


def test_compile_experiment_analysis_sql_uses_subject_and_ts(tmp_path: Path) -> None:
    _write_source(
        tmp_path, subject_lines="  - customer_id\n", ts_line="ts: created_at\n"
    )
    _write_experiment(tmp_path)
    context = build_tool_context(_workspace_root(tmp_path))

    result = compile_experiment_analysis_sql(
        {"name": "signup_checkout_test"},
        context,
    )

    assert result.is_error is False
    payload = json.loads(result.content)
    exposure_sql = payload["plans"]["exposure_summary"]["sql"]
    metric_sql = payload["plans"]["metric_summaries"][0]["sql"]
    assert "experiment_exposures" in exposure_sql
    assert "assignment_unit_type = 'customer'" in exposure_sql
    assert (
        "CAST(ee.assignment_unit_id AS STRING) = CAST(customer_id AS STRING)"
        in metric_sql
    )
    assert "created_at >= ee.occurred_at" in metric_sql
    assert "INTERVAL 14 DAY" in metric_sql


def test_compile_experiment_analysis_rejects_unknown_metric(tmp_path: Path) -> None:
    _write_source(
        tmp_path, subject_lines="  - customer_id\n", ts_line="ts: created_at\n"
    )
    _write_experiment(tmp_path, metric_id="missing_metric")
    context = build_tool_context(_workspace_root(tmp_path))

    result = compile_experiment_analysis_sql(
        {"name": "signup_checkout_test"},
        context,
    )

    assert result.is_error is True
    assert "was not found in metrics_layer configs" in result.content


def test_compile_experiment_analysis_rejects_missing_ts(tmp_path: Path) -> None:
    _write_source(tmp_path, subject_lines="  - customer_id\n", ts_line="")
    _write_experiment(tmp_path)
    context = build_tool_context(_workspace_root(tmp_path))

    result = compile_experiment_analysis_sql(
        {"name": "signup_checkout_test"},
        context,
    )

    assert result.is_error is True
    assert "must define ts" in result.content


def test_compile_experiment_analysis_rejects_multi_subject_sources(
    tmp_path: Path,
) -> None:
    _write_source(
        tmp_path,
        subject_lines="  - customer_id\n  - workspace_id\n",
        ts_line="ts: created_at\n",
    )
    _write_experiment(tmp_path)
    context = build_tool_context(_workspace_root(tmp_path))

    result = compile_experiment_analysis_sql(
        {"name": "signup_checkout_test"},
        context,
    )

    assert result.is_error is True
    assert "must define exactly one subject" in result.content


def test_compute_experiment_analysis_returns_srm_output(tmp_path: Path) -> None:
    context = build_tool_context(_workspace_root(tmp_path))
    result = compute_experiment_analysis(
        {
            "control_variant": "control",
            "allocation_weights": {"control": 0.5, "treatment": 0.5},
            "exposure_counts": [
                {"variant_id": "control", "canonical_subjects": 100},
                {"variant_id": "treatment", "canonical_subjects": 98},
            ],
            "metric_summaries": [],
        },
        context,
    )

    assert result.is_error is False
    payload = json.loads(result.content)
    assert payload["srm"]["observed_counts"]["control"] == 100
    assert "p_value" in payload["srm"]


def test_compile_experiment_analysis_rejects_workspace_dataset_mismatch(
    tmp_path: Path,
) -> None:
    _write_source(
        tmp_path, subject_lines="  - customer_id\n", ts_line="ts: created_at\n"
    )
    _write_experiment(tmp_path, metric_id="conversions_total")
    experiment_path = (
        _workspace_root(tmp_path)
        / "experimentation"
        / "configs"
        / "experiments"
        / "signup_checkout_test.yml"
    )
    experiment_path.write_text(
        experiment_path.read_text(encoding="utf-8").replace(
            "dataset: marketing_db",
            "dataset: sales_db",
        ),
        encoding="utf-8",
    )
    context = build_tool_context(_workspace_root(tmp_path))

    result = compile_experiment_analysis_sql(
        {"name": "signup_checkout_test"},
        context,
    )

    assert result.is_error is True
    assert "experiment.dataset 'sales_db' must match selected workspace 'marketing_db'" in result.content
