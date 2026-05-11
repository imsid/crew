"""Visualization query helpers for beta surfaces."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Literal, Optional

import google.auth
import httpx
from google.auth.transport.requests import Request

from ..agents.data.config import BIGQUERY_PROJECT_ID
from ..experimentation.service.config_repo import (
    load_experiment_config,
    validate_experiment_semantics,
)
from ..experimentation.service.sql_compiler import compile_experiment_plan
from ..experimentation.service.stats_engine import compute_experiment_results
from ..metrics_layer.service.config_repo import (
    load_metric_entries_by_dataset,
    load_source_config,
)
from ..metrics_layer.service.context import ToolContext as MetricsToolContext
from ..metrics_layer.service.pathing import normalize_identifier, resolve_workspace_dataset_id
from ..metrics_layer.service.query_args import (
    normalize_date_range,
    normalize_filters,
    normalize_limit,
)
from ..metrics_layer.service.sql_compiler import (
    _build_source_dimension_map,
    _compile_metric_sql_expr,
)

DateGrain = Literal["day", "week", "month"]


class BigQueryExecutionError(RuntimeError):
    """Raised when BigQuery execution fails."""


@dataclass
class BigQueryQueryRunner:
    project_id: str | None = BIGQUERY_PROJECT_ID
    timeout_ms: int = 30_000
    max_poll_attempts: int = 8

    def execute(self, sql: str) -> list[dict[str, Any]]:
        if not self.project_id:
            raise BigQueryExecutionError("BIGQUERY_PROJECT_ID is not configured")

        try:
            access_token = _generate_access_token()
            headers = {
                "Authorization": f"Bearer {access_token}",
                "x-goog-user-project": self.project_id,
            }
            payload = {"query": sql, "useLegacySql": False, "timeoutMs": self.timeout_ms}
            endpoint = f"https://bigquery.googleapis.com/bigquery/v2/projects/{self.project_id}/queries"

            with httpx.Client(timeout=30.0) as client:
                response = client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

                for _attempt in range(self.max_poll_attempts):
                    if data.get("jobComplete", True):
                        return _collect_bigquery_rows(client, headers, self.project_id, data)
                    job_reference = data.get("jobReference") or {}
                    job_id = job_reference.get("jobId")
                    location = job_reference.get("location")
                    if not job_id:
                        break
                    params = {"location": location} if location else None
                    poll = client.get(
                        f"https://bigquery.googleapis.com/bigquery/v2/projects/{self.project_id}/queries/{job_id}",
                        headers=headers,
                        params=params,
                    )
                    poll.raise_for_status()
                    data = poll.json()
        except BigQueryExecutionError:
            raise
        except httpx.HTTPStatusError as exc:
            detail = _describe_bigquery_http_error(exc)
            raise BigQueryExecutionError(
                f"BigQuery query execution failed: {detail}"
            ) from exc
        except Exception as exc:
            raise BigQueryExecutionError(f"BigQuery query execution failed: {exc}") from exc

        raise BigQueryExecutionError("BigQuery query did not complete within polling budget")


def build_metric_visualization(
    args: Dict[str, Any],
    context: MetricsToolContext,
    *,
    runner: BigQueryQueryRunner | None = None,
) -> Dict[str, Any]:
    dataset_id = resolve_workspace_dataset_id(context, args.get("dataset_id"))
    metric_name = normalize_identifier(args.get("metric_name"), "metric_name")
    filters = normalize_filters(args.get("filters"))
    limit = normalize_limit(args.get("limit"))
    metric_entries = load_metric_entries_by_dataset(context=context, dataset_id=dataset_id)
    source_cache: Dict[str, Dict[str, Any]] = {}

    metric_entry = metric_entries.get(metric_name)
    if metric_entry is None:
        raise ValueError(f"metric '{metric_name}' not found for requested dataset")

    metric_cfg = metric_entry["config"]
    metric_id = metric_entry["id"]
    source_id = normalize_identifier(metric_cfg.get("base_source"), "base_source")
    source_cfg = load_source_config(
        context=context,
        source_id=source_id,
        source_cache=source_cache,
        dataset_id=dataset_id,
    )
    dimension_meta = _build_source_dimension_meta(source_cfg)
    source_dim_map = _build_source_dimension_map(source_cfg)
    allowed_dimensions = _collect_allowed_dimensions(metric_cfg)

    available_date_dimensions = _collect_date_dimensions(source_cfg, dimension_meta)
    requested_date_dimension = args.get("date_dimension")
    selected_date_dimension = (
        normalize_identifier(requested_date_dimension, "date_dimension")
        if requested_date_dimension
        else (available_date_dimensions[0] if available_date_dimensions else None)
    )
    if selected_date_dimension and selected_date_dimension not in available_date_dimensions:
        raise ValueError(
            f"date_dimension '{selected_date_dimension}' must be one of: {available_date_dimensions}"
        )

    requested_group_by = args.get("group_by")
    selected_group_by = (
        normalize_identifier(requested_group_by, "group_by") if requested_group_by else None
    )
    if selected_group_by and selected_group_by not in allowed_dimensions:
        raise ValueError(
            f"group_by '{selected_group_by}' is not allowed by metric '{metric_id}'"
        )
    if selected_group_by and selected_group_by == selected_date_dimension:
        raise ValueError("group_by must be different from date_dimension")

    if not selected_group_by and not selected_date_dimension and allowed_dimensions:
        selected_group_by = allowed_dimensions[0]

    grain = _normalize_grain(args.get("grain"), selected_date_dimension)
    date_range = normalize_date_range(
        {
            **(args.get("date_range") or {}),
            "dimension": selected_date_dimension,
        }
        if selected_date_dimension and args.get("date_range")
        else args.get("date_range")
    )

    metric_expr, warnings = _compile_metric_sql_expr(
        metric_id=metric_id,
        metric_entries=metric_entries,
        source_cfg=source_cfg,
        expected_source_id=source_id,
        stack=[],
    )
    sql, chart_kind, x_key = _build_metric_visualization_sql(
        source_cfg=source_cfg,
        source_dim_map=source_dim_map,
        dimension_meta=dimension_meta,
        metric_expr=metric_expr,
        filters=filters,
        date_range=date_range,
        date_dimension=selected_date_dimension,
        grain=grain,
        group_by=selected_group_by,
        limit=limit,
    )

    rows = (runner or BigQueryQueryRunner()).execute(sql)
    summary_cards = _build_metric_summary_cards(
        rows=rows,
        chart_kind=chart_kind,
        value_key="metric_value",
        format_hint=_format_hint(metric_cfg.get("format")),
    )
    row_count = len(rows)

    return {
        "entity": {
            "surface": "metrics",
            "id": metric_id,
            "label": metric_cfg.get("label") or metric_id,
        },
        "query": {
            "metric_name": metric_id,
            "date_dimension": selected_date_dimension,
            "grain": grain,
            "group_by": selected_group_by,
            "filters": filters,
            "limit": limit,
            "date_range": date_range,
        },
        "summary": {
            "cards": summary_cards,
            "row_count": row_count,
            "warnings": warnings,
        },
        "chart": {
            "kind": chart_kind,
            "x_key": x_key,
            "y_key": "metric_value",
            "series_key": None,
            "value_format": _format_hint(metric_cfg.get("format")),
        },
        "table": {
            "columns": _build_metric_table_columns(
                x_key=x_key,
                chart_kind=chart_kind,
                dimension_meta=dimension_meta,
                value_format=_format_hint(metric_cfg.get("format")),
            ),
            "rows": rows,
        },
        "lineage": {
            "metric_ids": [metric_id],
            "source_ids": [source_id],
            "queries": [{"label": "Visualization SQL", "sql": sql}],
        },
        "controls": {
            "group_by_options": [
                item for item in allowed_dimensions if item != selected_date_dimension
            ],
            "date_dimension_options": available_date_dimensions,
            "grain_options": ["day", "week", "month"] if selected_date_dimension else [],
            "selected": {
                "group_by": selected_group_by,
                "date_dimension": selected_date_dimension,
                "grain": grain,
                "date_range": date_range,
                "limit": limit,
            },
        },
        "meta": {
            "format": metric_cfg.get("format"),
            "source_id": source_id,
        },
    }


def build_experiment_analysis(
    args: Dict[str, Any],
    context: MetricsToolContext,
    *,
    runner: BigQueryQueryRunner | None = None,
) -> Dict[str, Any]:
    dataset_id = resolve_workspace_dataset_id(context, args.get("dataset_id"))
    experiment_name = normalize_identifier(args.get("name"), "name")
    experiment_cfg = load_experiment_config(
        context=context,
        name=experiment_name,
        dataset_id=dataset_id,
    )
    semantics = validate_experiment_semantics(
        context=context,
        dataset_id=dataset_id,
        experiment_cfg=experiment_cfg,
    )
    plan = compile_experiment_plan(
        dataset_id=dataset_id,
        experiment_name=experiment_name,
        experiment_cfg=experiment_cfg,
        semantics=semantics,
    )

    selected_metric_id = (
        normalize_identifier(args.get("metric_id"), "metric_id")
        if args.get("metric_id")
        else str(plan["plans"]["metric_summaries"][0]["metric_id"])
    )
    metric_summary = next(
        (
            item
            for item in plan["plans"]["metric_summaries"]
            if str(item["metric_id"]) == selected_metric_id
        ),
        None,
    )
    if metric_summary is None:
        raise ValueError(
            f"metric_id '{selected_metric_id}' is not configured for experiment '{experiment_name}'"
        )
    selected_metric_cfg = semantics["metric_entries"][selected_metric_id]["config"]
    selected_metric_format = _format_hint(selected_metric_cfg.get("format"))

    query_runner = runner or BigQueryQueryRunner()
    exposure_rows = query_runner.execute(str(plan["plans"]["exposure_summary"]["sql"]))
    metric_rows = query_runner.execute(str(metric_summary["sql"]))
    results = compute_experiment_results(
        control_variant=str(plan["control_variant"]),
        allocation_weights=dict(plan["allocation_weights"]),
        exposure_counts=exposure_rows,
        metric_summaries=[{"metric_id": selected_metric_id, "rows": metric_rows}],
    )

    rows = _build_experiment_rows(
        control_variant=str(plan["control_variant"]),
        exposure_rows=exposure_rows,
        metric_rows=metric_rows,
        comparison_rows=results["metrics"][0]["comparisons"],
    )
    headline_comparison = (
        results["metrics"][0]["comparisons"][0]
        if results["metrics"] and results["metrics"][0]["comparisons"]
        else None
    )
    summary_cards = _build_experiment_summary_cards(
        comparison=headline_comparison,
        exposure_rows=exposure_rows,
        srm=results["srm"],
    )

    return {
        "entity": {
            "surface": "experiments",
            "id": str(plan["experiment_id"]),
            "label": str(plan.get("label") or experiment_name),
        },
        "query": {
            "experiment_name": experiment_name,
            "metric_id": selected_metric_id,
            "filters": [],
            "limit": len(rows),
        },
        "summary": {
            "cards": summary_cards,
            "row_count": len(rows),
            "warnings": list(metric_summary.get("warnings") or []),
        },
        "chart": {
            "kind": "bar",
            "x_key": "variant_id",
            "y_key": "metric_value",
            "series_key": None,
            "value_format": selected_metric_format,
        },
        "table": {
            "columns": [
                {"key": "variant_id", "label": "Variant", "type": "string"},
                {
                    "key": "metric_value",
                    "label": "Mean",
                    "type": "number",
                    "format": selected_metric_format,
                },
                {"key": "lift", "label": "Lift", "type": "number", "format": "percent"},
                {"key": "p_value", "label": "P-Value", "type": "number", "format": "number"},
                {
                    "key": "adjusted_p_value",
                    "label": "Adj. P-Value",
                    "type": "number",
                    "format": "number",
                },
                {"key": "ci_low", "label": "CI Low", "type": "number", "format": "number"},
                {"key": "ci_high", "label": "CI High", "type": "number", "format": "number"},
                {
                    "key": "exposed_subjects",
                    "label": "Exposed",
                    "type": "number",
                    "format": "number",
                },
                {
                    "key": "observed_subjects",
                    "label": "Observed",
                    "type": "number",
                    "format": "number",
                },
                {
                    "key": "contaminated_subjects",
                    "label": "Contaminated",
                    "type": "number",
                    "format": "number",
                },
            ],
            "rows": rows,
        },
        "lineage": {
            "metric_ids": [selected_metric_id],
            "source_ids": [str(metric_summary["source_id"])],
            "experiment_id": str(plan["experiment_id"]),
            "queries": [
                {"label": "Exposure Summary SQL", "sql": str(plan["plans"]["exposure_summary"]["sql"])},
                {
                    "label": f"{selected_metric_id} Summary SQL",
                    "sql": str(metric_summary["sql"]),
                },
            ],
        },
        "controls": {
            "metric_options": [str(item["metric_id"]) for item in plan["plans"]["metric_summaries"]],
            "selected": {"metric_id": selected_metric_id},
        },
        "meta": {
            "control_variant": str(plan["control_variant"]),
            "srm": results["srm"],
            "format": selected_metric_cfg.get("format"),
        },
    }


def _generate_access_token() -> str:
    try:
        credentials, _project = google.auth.default(
            scopes=["https://www.googleapis.com/auth/bigquery"]
        )
        credentials.refresh(Request())
    except Exception as exc:
        raise BigQueryExecutionError(
            f"Failed to generate BigQuery access token via ADC/google-auth: {exc}"
        ) from exc
    token = credentials.token
    if not token:
        raise BigQueryExecutionError("google-auth returned an empty access token")
    return token


def _collect_bigquery_rows(
    client: httpx.Client,
    headers: dict[str, str],
    project_id: str,
    payload: dict[str, Any],
) -> list[dict[str, Any]]:
    fields = list((payload.get("schema") or {}).get("fields") or [])
    rows = _decode_bigquery_rows(fields, list(payload.get("rows") or []))
    page_token = payload.get("pageToken")
    job_reference = payload.get("jobReference") or {}
    job_id = job_reference.get("jobId")
    location = job_reference.get("location")

    while page_token and job_id:
        params: dict[str, Any] = {"pageToken": page_token}
        if location:
            params["location"] = location
        response = client.get(
            f"https://bigquery.googleapis.com/bigquery/v2/projects/{project_id}/queries/{job_id}",
            headers=headers,
            params=params,
        )
        response.raise_for_status()
        page = response.json()
        rows.extend(_decode_bigquery_rows(fields, list(page.get("rows") or [])))
        page_token = page.get("pageToken")

    return rows


def _decode_bigquery_rows(
    fields: list[dict[str, Any]],
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    decoded: list[dict[str, Any]] = []
    for row in rows:
        values = list(row.get("f") or [])
        record: dict[str, Any] = {}
        for field, value in zip(fields, values):
            name = str(field.get("name") or "")
            field_type = str(field.get("type") or "STRING")
            record[name] = _decode_bigquery_value(value.get("v"), field_type)
        decoded.append(record)
    return decoded


def _decode_bigquery_value(value: Any, field_type: str) -> Any:
    if value is None:
        return None
    normalized_type = field_type.upper()
    if normalized_type in {"INT64", "INTEGER"}:
        return int(value)
    if normalized_type in {"FLOAT64", "FLOAT", "NUMERIC", "BIGNUMERIC"}:
        return float(value)
    if normalized_type == "BOOL":
        if isinstance(value, bool):
            return value
        return str(value).lower() == "true"
    return value


def _describe_bigquery_http_error(exc: httpx.HTTPStatusError) -> str:
    response = exc.response
    status_code = response.status_code
    body_text = (response.text or "").strip()
    payload: dict[str, Any] | None = None

    try:
        parsed = response.json()
        if isinstance(parsed, dict):
            payload = parsed
    except (ValueError, json.JSONDecodeError):
        payload = None

    if payload:
        error_payload = payload.get("error")
        if isinstance(error_payload, dict):
            message = str(error_payload.get("message") or "").strip()
            errors = error_payload.get("errors")
            if isinstance(errors, list) and errors:
                parts: list[str] = []
                for item in errors:
                    if not isinstance(item, dict):
                        continue
                    reason = str(item.get("reason") or "").strip()
                    entry_message = str(item.get("message") or "").strip()
                    location = str(item.get("location") or "").strip()
                    part = entry_message or message
                    if reason:
                        part = f"{reason}: {part}" if part else reason
                    if location:
                        part = f"{part} (location: {location})" if part else f"location: {location}"
                    if part:
                        parts.append(part)
                if parts:
                    return f"HTTP {status_code} - " + " | ".join(parts)
            if message:
                return f"HTTP {status_code} - {message}"

    if body_text:
        return f"HTTP {status_code} - {body_text}"
    return f"HTTP {status_code} for {response.request.method} {response.request.url}"


def _build_source_dimension_meta(source_cfg: Dict[str, Any]) -> Dict[str, Dict[str, str]]:
    dimensions_raw = source_cfg.get("dimensions")
    if not isinstance(dimensions_raw, list):
        raise ValueError("source.dimensions must be an array")
    mapping: Dict[str, Dict[str, str]] = {}
    for idx, dimension_raw in enumerate(dimensions_raw):
        if not isinstance(dimension_raw, dict):
            raise ValueError(f"source.dimensions[{idx}] must be an object")
        name = normalize_identifier(dimension_raw.get("name"), "source.dimensions[].name")
        expr = dimension_raw.get("expr")
        data_type = dimension_raw.get("data_type")
        if not isinstance(expr, str) or not expr.strip():
            raise ValueError(f"source.dimensions[{idx}].expr must be a non-empty string")
        if not isinstance(data_type, str) or not data_type.strip():
            raise ValueError(
                f"source.dimensions[{idx}].data_type must be a non-empty string"
            )
        mapping[name] = {"expr": expr.strip(), "data_type": data_type.strip().upper()}
    return mapping


def _collect_allowed_dimensions(metric_cfg: Dict[str, Any]) -> List[str]:
    dimensions_raw = metric_cfg.get("dimensions")
    if not isinstance(dimensions_raw, list):
        return []
    return [
        normalize_identifier(raw, "metric.dimensions[]")
        for raw in dimensions_raw
        if isinstance(raw, str) and raw.strip()
    ]


def _collect_date_dimensions(
    source_cfg: Dict[str, Any],
    dimension_meta: Dict[str, Dict[str, str]],
) -> List[str]:
    candidates: List[str] = []
    ts_raw = source_cfg.get("ts")
    if isinstance(ts_raw, str) and ts_raw.strip():
        candidates.append(normalize_identifier(ts_raw, "source.ts"))
    for name, meta in dimension_meta.items():
        if meta["data_type"] in {"DATE", "DATETIME", "TIMESTAMP"} and name not in candidates:
            candidates.append(name)
    return candidates


def _normalize_grain(raw_value: Any, date_dimension: str | None) -> DateGrain | None:
    if date_dimension is None:
        return None
    if raw_value is None:
        return "day"
    if not isinstance(raw_value, str) or not raw_value.strip():
        raise ValueError("grain must be one of: day, week, month")
    normalized = raw_value.strip().lower()
    if normalized not in {"day", "week", "month"}:
        raise ValueError("grain must be one of: day, week, month")
    return normalized  # type: ignore[return-value]


def _build_metric_visualization_sql(
    *,
    source_cfg: Dict[str, Any],
    source_dim_map: Dict[str, str],
    dimension_meta: Dict[str, Dict[str, str]],
    metric_expr: str,
    filters: List[str],
    date_range: Dict[str, str] | None,
    date_dimension: str | None,
    grain: DateGrain | None,
    group_by: str | None,
    limit: int,
) -> tuple[str, Literal["line", "bar"], str]:
    source_dataset = normalize_identifier(source_cfg.get("dataset"), "source.dataset")
    source_table = normalize_identifier(source_cfg.get("table"), "source.table")
    table_ref = _build_table_ref(source_dataset=source_dataset, source_table=source_table)

    select_items: list[str] = []
    group_items: list[str] = []
    order_by = "ORDER BY metric_value DESC"
    chart_kind: Literal["line", "bar"] = "bar"
    x_key = "label"

    if group_by:
        select_items.append(f"{source_dim_map[group_by]} AS {group_by}")
        group_items.append(group_by)
        x_key = group_by
    elif date_dimension and grain:
        bucket_expr = _date_bucket_expr(
            source_dim_map[date_dimension],
            dimension_meta[date_dimension]["data_type"],
            grain,
        )
        select_items.append(f"{bucket_expr} AS bucket")
        group_items.append("bucket")
        order_by = "ORDER BY bucket ASC"
        chart_kind = "line"
        x_key = "bucket"
    else:
        select_items.append("'total' AS label")
        group_items.append("label")
        x_key = "label"

    select_items.append(f"{metric_expr} AS metric_value")
    where_clauses = list(filters)
    where_clauses.extend(_build_date_filters(date_range, source_dim_map, dimension_meta))

    lines = ["SELECT"]
    for idx, item in enumerate(select_items):
        suffix = "," if idx < len(select_items) - 1 else ""
        lines.append(f"  {item}{suffix}")
    lines.append(f"FROM {table_ref}")
    if where_clauses:
        lines.append("WHERE")
        for idx, clause in enumerate(where_clauses):
            prefix = "  " if idx == 0 else "  AND "
            lines.append(f"{prefix}{clause}")
    if group_items:
        lines.append("GROUP BY " + ", ".join(group_items))
    lines.append(order_by)
    lines.append(f"LIMIT {limit}")
    return "\n".join(lines), chart_kind, x_key


def _build_table_ref(*, source_dataset: str, source_table: str) -> str:
    if BIGQUERY_PROJECT_ID:
        return f"`{BIGQUERY_PROJECT_ID}.{source_dataset}.{source_table}`"
    return f"`{source_dataset}.{source_table}`"


def _date_bucket_expr(expr: str, data_type: str, grain: DateGrain) -> str:
    if data_type == "DATE":
        if grain == "day":
            return f"DATE({expr})"
        return f"DATE_TRUNC(DATE({expr}), {grain.upper()})"
    if grain == "day":
        return f"DATE({expr})"
    return f"DATE(TIMESTAMP_TRUNC(TIMESTAMP({expr}), {grain.upper()}))"


def _build_date_filters(
    date_range: Dict[str, str] | None,
    source_dim_map: Dict[str, str],
    dimension_meta: Dict[str, Dict[str, str]],
) -> List[str]:
    if date_range is None:
        return []
    dimension = str(date_range["dimension"])
    expr = source_dim_map[dimension]
    data_type = dimension_meta[dimension]["data_type"]
    date_expr = f"DATE({expr})" if data_type == "DATE" else f"DATE(TIMESTAMP({expr}))"
    clauses: List[str] = []
    if "start" in date_range:
        clauses.append(f"{date_expr} >= DATE '{date_range['start']}'")
    if "end" in date_range:
        clauses.append(f"{date_expr} <= DATE '{date_range['end']}'")
    return clauses


def _build_metric_summary_cards(
    *,
    rows: List[Dict[str, Any]],
    chart_kind: Literal["line", "bar"],
    value_key: str,
    format_hint: str,
) -> List[Dict[str, Any]]:
    if not rows:
        return [
            {"label": "Rows", "value": 0, "format": "number", "tone": "muted"},
        ]

    numeric_values = [float(row.get(value_key) or 0.0) for row in rows]
    cards: List[Dict[str, Any]] = [
        {
            "label": "Total",
            "value": sum(numeric_values),
            "format": format_hint,
        },
        {"label": "Rows", "value": len(rows), "format": "number", "tone": "muted"},
    ]
    if chart_kind == "line" and len(numeric_values) >= 2:
        previous = numeric_values[-2]
        latest = numeric_values[-1]
        delta = None if previous == 0 else (latest / previous) - 1.0
        cards.insert(
            0,
            {
                "label": "Latest",
                "value": latest,
                "format": format_hint,
            },
        )
        cards.insert(
            1,
            {
                "label": "Vs Prior",
                "value": delta,
                "format": "percent",
                "tone": _tone_for_number(delta),
            },
        )
    return cards


def _build_metric_table_columns(
    *,
    x_key: str,
    chart_kind: Literal["line", "bar"],
    dimension_meta: Dict[str, Dict[str, str]],
    value_format: str,
) -> List[Dict[str, Any]]:
    x_type = "string"
    if chart_kind == "line":
        x_type = "date"
    elif x_key in dimension_meta and dimension_meta[x_key]["data_type"] in {"DATE", "DATETIME", "TIMESTAMP"}:
        x_type = "date"
    return [
        {"key": x_key, "label": x_key.replace("_", " ").title(), "type": x_type},
        {"key": "metric_value", "label": "Metric Value", "type": "number", "format": value_format},
    ]


def _build_experiment_rows(
    *,
    control_variant: str,
    exposure_rows: List[Dict[str, Any]],
    metric_rows: List[Dict[str, Any]],
    comparison_rows: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    exposure_by_variant = {str(item["variant_id"]): item for item in exposure_rows}
    metric_by_variant = {str(item["variant_id"]): item for item in metric_rows}
    comparison_by_variant = {str(item["variant_id"]): item for item in comparison_rows}

    rows: List[Dict[str, Any]] = []
    for variant_id in _ordered_variants(control_variant, metric_by_variant.keys()):
        metric_row = metric_by_variant[variant_id]
        exposed_subjects = int(metric_row.get("exposed_subjects") or 0)
        observed_subjects = int(metric_row.get("observed_subjects") or 0)
        mean_value = (
            float(metric_row.get("metric_sum") or 0.0) / exposed_subjects
            if exposed_subjects
            else 0.0
        )
        comparison = comparison_by_variant.get(variant_id)
        exposure = exposure_by_variant.get(variant_id, {})
        rows.append(
            {
                "variant_id": variant_id,
                "metric_value": mean_value,
                "lift": 0.0 if variant_id == control_variant else _safe_float(comparison, "lift"),
                "p_value": None if variant_id == control_variant else _safe_float(comparison, "p_value"),
                "adjusted_p_value": None
                if variant_id == control_variant
                else _safe_float(comparison, "adjusted_p_value"),
                "ci_low": None if variant_id == control_variant else _safe_float(comparison, "ci_low"),
                "ci_high": None if variant_id == control_variant else _safe_float(comparison, "ci_high"),
                "exposed_subjects": exposed_subjects,
                "observed_subjects": observed_subjects,
                "contaminated_subjects": int(exposure.get("contaminated_subjects") or 0),
            }
        )
    return rows


def _ordered_variants(control_variant: str, variants: Iterable[str]) -> List[str]:
    unique = list(dict.fromkeys(str(item) for item in variants))
    return [control_variant] + [item for item in unique if item != control_variant]


def _build_experiment_summary_cards(
    *,
    comparison: Dict[str, Any] | None,
    exposure_rows: List[Dict[str, Any]],
    srm: Dict[str, Any],
) -> List[Dict[str, Any]]:
    total_subjects = sum(int(item.get("canonical_subjects") or 0) for item in exposure_rows)
    cards: List[Dict[str, Any]] = [
        {
            "label": "Subjects",
            "value": total_subjects,
            "format": "number",
        },
        {
            "label": "SRM P-Value",
            "value": _safe_float(srm, "p_value"),
            "format": "number",
            "tone": "muted",
        },
    ]
    if comparison is not None:
        lift = _safe_float(comparison, "lift")
        cards.insert(
            0,
            {
                "label": f"{comparison['variant_id']} Lift",
                "value": lift,
                "format": "percent",
                "tone": _tone_for_number(lift),
            },
        )
    return cards


def _safe_float(payload: Dict[str, Any] | None, key: str) -> float | None:
    if payload is None:
        return None
    value = payload.get(key)
    if value is None:
        return None
    return float(value)


def _format_hint(raw_value: Any) -> str:
    value = str(raw_value or "").strip()
    if not value:
        return "number"
    if "$" in value:
        return "currency"
    if "%" in value:
        return "percent"
    return "number"


def _tone_for_number(value: float | None) -> str:
    if value is None:
        return "muted"
    if value > 0:
        return "positive"
    if value < 0:
        return "negative"
    return "muted"
