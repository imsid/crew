"""Metric config to SQL compiler helpers."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from .config_repo import load_source_config
from .constants import AGG_FUNCTION_RE, AGGREGATED_EXPR_RE, IDENTIFIER_RE
from .context import ToolContext
from .pathing import normalize_identifier
from .plan import BindParam, Column, CompiledPlan


def compile_metric_plan(
    context: ToolContext,
    dataset_id: str,
    requested_metric_name: str,
    metric_entries: Dict[str, Dict[str, Any]],
    source_cache: Dict[str, Dict[str, Any]],
    requested_dimensions: List[str],
    filters: List[str],
    date_range: Optional[Dict[str, str]],
    order_by: List[Dict[str, str]],
    limit: int,
    bigquery_project_id: Optional[str],
    parameters: Optional[List[BindParam]] = None,
    having: Optional[List[str]] = None,
) -> CompiledPlan:
    """Compile one metric to a plan whose value column is aliased ``metric_value``.

    The agent-tool contract: one query, one measure. ``compile_multi_metric_plan``
    serves callers that want several measures at a shared grain in one SELECT.
    """
    return _compile_plan(
        context=context,
        dataset_id=dataset_id,
        requested_metric_names=[requested_metric_name],
        metric_entries=metric_entries,
        source_cache=source_cache,
        requested_dimensions=requested_dimensions,
        filters=filters,
        date_range=date_range,
        order_by=order_by,
        limit=limit,
        bigquery_project_id=bigquery_project_id,
        parameters=parameters,
        having=having,
        single_value_alias="metric_value",
    )


def compile_multi_metric_plan(
    context: ToolContext,
    dataset_id: str,
    requested_metric_names: List[str],
    metric_entries: Dict[str, Dict[str, Any]],
    source_cache: Dict[str, Dict[str, Any]],
    requested_dimensions: List[str],
    filters: List[str],
    date_range: Optional[Dict[str, str]],
    order_by: List[Dict[str, str]],
    limit: int,
    bigquery_project_id: Optional[str],
    parameters: Optional[List[BindParam]] = None,
    having: Optional[List[str]] = None,
) -> CompiledPlan:
    """Compile several metrics that share a base source into one SELECT.

    Each metric becomes its own value column, aliased by its (normalized) name — so
    ``["org_daily_tokens", "org_daily_active_users"]`` yields two columns in one
    org-day-grain read. Metrics must share ``base_source`` (joins arrive in P3).
    """
    return _compile_plan(
        context=context,
        dataset_id=dataset_id,
        requested_metric_names=requested_metric_names,
        metric_entries=metric_entries,
        source_cache=source_cache,
        requested_dimensions=requested_dimensions,
        filters=filters,
        date_range=date_range,
        order_by=order_by,
        limit=limit,
        bigquery_project_id=bigquery_project_id,
        parameters=parameters,
        having=having,
        single_value_alias=None,
    )


def compile_entity_plan(
    context: ToolContext,
    dataset_id: str,
    source_id: str,
    requested_attributes: List[str],
    filters: List[str],
    order_by: List[Dict[str, str]],
    limit: int,
    bigquery_project_id: Optional[str],
    parameters: Optional[List[BindParam]] = None,
) -> CompiledPlan:
    """Compile a non-aggregated attribute read of an entity source (by key).

    The second query archetype: not everything is a metric. ``resolve_accounts`` /
    ``read_enrichment`` are row lookups — a projection of declared dimensions filtered
    by key, with no GROUP BY. Reuses the same source/join vocabulary as aggregate reads.
    """
    if not requested_attributes:
        raise ValueError("entity read requires at least one attribute")

    norm_source_id = normalize_identifier(source_id, "source_id")
    source_cfg = load_source_config(
        context=context,
        dataset_id=dataset_id,
        source_id=norm_source_id,
        source_cache={},
    )
    source_dim_map = _build_source_dimension_map(source_cfg=source_cfg)
    source_dim_types = _build_source_dimension_types(source_cfg=source_cfg)
    source_dim_join = _build_source_dimension_join_sources(source_cfg=source_cfg)

    for attribute in requested_attributes:
        if attribute not in source_dim_map:
            raise ValueError(
                f"attribute '{attribute}' not found in source '{norm_source_id}'"
            )

    needed_join_ids: List[str] = []
    for attribute in requested_attributes:
        join_source = source_dim_join.get(attribute)
        if join_source and join_source not in needed_join_ids:
            needed_join_ids.append(join_source)

    base_alias: Optional[str] = norm_source_id if needed_join_ids else None
    joined_specs = _resolve_joins(
        context=context,
        dataset_id=dataset_id,
        source_cache={},
        base_source_cfg=source_cfg,
        base_alias=base_alias,
        needed_join_ids=needed_join_ids,
        bigquery_project_id=bigquery_project_id,
    )

    _validate_order_by(
        order_by=order_by, dimensions=requested_attributes, value_fields=[]
    )

    select_items = []
    for attribute in requested_attributes:
        owner = source_dim_join.get(attribute) or base_alias
        expr = _qualify_identifier(source_dim_map[attribute], owner)
        select_items.append(f"{expr} AS {attribute}")

    base_ref = _build_table_ref(
        source_dataset=normalize_identifier(source_cfg.get("dataset"), "source.dataset"),
        source_table=normalize_identifier(source_cfg.get("table"), "source.table"),
        bigquery_project_id=bigquery_project_id,
    )
    table_ref = (
        _build_from_clause(base_ref, base_alias, joined_specs)
        if base_alias
        else base_ref
    )
    sql = _build_entity_sql(
        select_items=select_items,
        table_ref=table_ref,
        where_clauses=list(filters or []),
        order_by=order_by,
        limit=limit,
    )
    row_shape = [
        Column(name=attribute, data_type=source_dim_types.get(attribute))
        for attribute in requested_attributes
    ]
    return CompiledPlan(
        metric_name=norm_source_id,
        metric_names=[],
        source_id=norm_source_id,
        table_ref=table_ref,
        sql=sql,
        dimensions=requested_attributes,
        filters=list(filters or []),
        order_by=order_by,
        limit=limit,
        warnings=[],
        parameters=list(parameters or []),
        row_shape=row_shape,
    )


def _compile_plan(
    context: ToolContext,
    dataset_id: str,
    requested_metric_names: List[str],
    metric_entries: Dict[str, Dict[str, Any]],
    source_cache: Dict[str, Dict[str, Any]],
    requested_dimensions: List[str],
    filters: List[str],
    date_range: Optional[Dict[str, str]],
    order_by: List[Dict[str, str]],
    limit: int,
    bigquery_project_id: Optional[str],
    parameters: Optional[List[BindParam]],
    single_value_alias: Optional[str],
    having: Optional[List[str]] = None,
) -> CompiledPlan:
    if not requested_metric_names:
        raise ValueError("at least one metric is required")

    # Resolve each requested metric and pick its value-column alias.
    resolved: List[Dict[str, Any]] = []
    seen_aliases: set[str] = set()
    for raw_name in requested_metric_names:
        entry = _resolve_metric_entry(metric_entries, raw_name)
        alias = single_value_alias or normalize_identifier(raw_name, "metric_names[]")
        if alias in seen_aliases:
            raise ValueError(f"duplicate metric column '{alias}' in one query")
        seen_aliases.add(alias)
        resolved.append({"alias": alias, "entry": entry})

    # All metrics in one query must share a base source (joins land in P3).
    source_ids = {
        normalize_identifier(item["entry"]["config"].get("base_source"), "base_source")
        for item in resolved
    }
    if len(source_ids) > 1:
        raise ValueError(
            "all metrics in one query must share base_source; got: "
            + ", ".join(sorted(source_ids))
        )
    source_id = next(iter(source_ids))
    source_cfg = load_source_config(
        context=context,
        dataset_id=dataset_id,
        source_id=source_id,
        source_cache=source_cache,
    )
    source_dim_map = _build_source_dimension_map(source_cfg=source_cfg)
    source_dim_types = _build_source_dimension_types(source_cfg=source_cfg)
    source_dim_join = _build_source_dimension_join_sources(source_cfg=source_cfg)

    for dimension in requested_dimensions:
        if dimension not in source_dim_map:
            raise ValueError(f"dimension '{dimension}' not found in source '{source_id}'")

    for item in resolved:
        metric_allowed_dimensions = item["entry"]["config"].get("dimensions")
        if isinstance(metric_allowed_dimensions, list):
            allowed = {
                normalize_identifier(raw, "metric.dimensions[]")
                for raw in metric_allowed_dimensions
            }
            for dimension in requested_dimensions:
                if dimension not in allowed:
                    raise ValueError(
                        f"dimension '{dimension}' is not allowed by metric "
                        f"'{item['entry']['id']}'"
                    )

    # A join is compiled only when a requested dimension reads from a joined source.
    # Single-source queries keep their exact (unaliased) SQL — full parity.
    needed_join_ids: List[str] = []
    for dimension in requested_dimensions:
        join_source = source_dim_join.get(dimension)
        if join_source and join_source not in needed_join_ids:
            needed_join_ids.append(join_source)

    base_alias: Optional[str] = source_id if needed_join_ids else None
    joined_specs = _resolve_joins(
        context=context,
        dataset_id=dataset_id,
        source_cache=source_cache,
        base_source_cfg=source_cfg,
        base_alias=base_alias,
        needed_join_ids=needed_join_ids,
        bigquery_project_id=bigquery_project_id,
    )

    date_clauses, date_params = _build_date_clauses(
        date_range=date_range,
        source_id=source_id,
        source_dim_map=source_dim_map,
        base_alias=base_alias,
    )
    plan_params = list(parameters or []) + date_params

    value_fields = [item["alias"] for item in resolved]
    _validate_order_by(
        order_by=order_by, dimensions=requested_dimensions, value_fields=value_fields
    )

    select_items = []
    for dimension in requested_dimensions:
        owner = source_dim_join.get(dimension) or base_alias
        expr = _qualify_identifier(source_dim_map[dimension], owner)
        select_items.append(f"{expr} AS {dimension}")
    warnings: List[str] = []
    for item in resolved:
        metric_expr, metric_warnings = _compile_metric_sql_expr(
            metric_id=item["entry"]["id"],
            metric_entries=metric_entries,
            source_cfg=source_cfg,
            expected_source_id=source_id,
            stack=[],
            table_alias=base_alias,
        )
        select_items.append(f"{metric_expr} AS {item['alias']}")
        warnings.extend(metric_warnings)

    source_dataset = normalize_identifier(source_cfg.get("dataset"), "source.dataset")
    source_table = normalize_identifier(source_cfg.get("table"), "source.table")
    base_ref = _build_table_ref(
        source_dataset=source_dataset,
        source_table=source_table,
        bigquery_project_id=bigquery_project_id,
    )
    table_ref = (
        _build_from_clause(base_ref, base_alias, joined_specs)
        if base_alias
        else base_ref
    )
    sql = _build_metric_sql(
        select_items=select_items,
        table_ref=table_ref,
        dimensions=requested_dimensions,
        where_clauses=filters + date_clauses,
        having_clauses=list(having or []),
        order_by=order_by,
        limit=limit,
    )

    row_shape = [
        Column(name=dimension, data_type=source_dim_types.get(dimension))
        for dimension in requested_dimensions
    ]
    row_shape.extend(Column(name=alias, data_type=None) for alias in value_fields)

    metric_name = (
        requested_metric_names[0]
        if single_value_alias
        else ",".join(item["alias"] for item in resolved)
    )
    return CompiledPlan(
        metric_name=metric_name,
        metric_names=[item["alias"] for item in resolved],
        source_id=source_id,
        table_ref=table_ref,
        sql=sql,
        dimensions=requested_dimensions,
        filters=filters,
        order_by=order_by,
        limit=limit,
        warnings=warnings,
        parameters=plan_params,
        row_shape=row_shape,
    )


def _build_table_ref(
    source_dataset: str, source_table: str, bigquery_project_id: Optional[str]
) -> str:
    if bigquery_project_id:
        return f"`{bigquery_project_id}.{source_dataset}.{source_table}`"
    return f"`{source_dataset}.{source_table}`"


def _build_metric_sql(
    select_items: List[str],
    table_ref: str,
    dimensions: List[str],
    where_clauses: List[str],
    having_clauses: List[str],
    order_by: List[Dict[str, str]],
    limit: int,
) -> str:
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

    if dimensions:
        lines.append("GROUP BY " + ", ".join(dimensions))

    if having_clauses:
        lines.append("HAVING")
        for idx, clause in enumerate(having_clauses):
            prefix = "  " if idx == 0 else "  AND "
            lines.append(f"{prefix}{clause}")

    if order_by:
        order_clause = ", ".join(
            f"{item['field']} {item['direction']}" for item in order_by
        )
        lines.append(f"ORDER BY {order_clause}")

    lines.append(f"LIMIT {limit}")
    return "\n".join(lines)


def _build_entity_sql(
    select_items: List[str],
    table_ref: str,
    where_clauses: List[str],
    order_by: List[Dict[str, str]],
    limit: int,
) -> str:
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

    if order_by:
        order_clause = ", ".join(
            f"{item['field']} {item['direction']}" for item in order_by
        )
        lines.append(f"ORDER BY {order_clause}")

    lines.append(f"LIMIT {limit}")
    return "\n".join(lines)


def _compile_metric_sql_expr(
    metric_id: str,
    metric_entries: Dict[str, Dict[str, Any]],
    source_cfg: Dict[str, Any],
    expected_source_id: str,
    stack: List[str],
    table_alias: Optional[str] = None,
) -> Tuple[str, List[str]]:
    if metric_id in stack:
        chain = " -> ".join(stack + [metric_id])
        raise ValueError(f"cyclic metric reference detected: {chain}")

    metric_entry = metric_entries.get(metric_id)
    if metric_entry is None:
        raise ValueError(f"metric id '{metric_id}' was not found in metrics_layer configs")

    metric_cfg = metric_entry["config"]
    metric_source_id = normalize_identifier(metric_cfg.get("base_source"), "base_source")
    if metric_source_id != expected_source_id:
        raise ValueError(
            "cross-source metric references are not supported in the compiler; "
            f"metric '{metric_id}' uses source '{metric_source_id}' "
            f"but expected '{expected_source_id}'"
        )

    metric_type = metric_cfg.get("type")
    if metric_type == "simple":
        expr_raw = metric_cfg.get("expr")
        if not isinstance(expr_raw, str) or not expr_raw.strip():
            raise ValueError(f"metric '{metric_id}' must define a non-empty expr")
        return _compile_simple_metric_expr(
            expr_raw, source_cfg=source_cfg, table_alias=table_alias
        )

    if metric_type == "windowed":
        return _compile_windowed_metric_expr(
            metric_cfg=metric_cfg,
            metric_id=metric_id,
            source_cfg=source_cfg,
            table_alias=table_alias,
        )

    if metric_type == "ratio":
        numerator_raw = metric_cfg.get("numerator")
        denominator_raw = metric_cfg.get("denominator")
        if not isinstance(numerator_raw, str) or not numerator_raw.strip():
            raise ValueError(f"metric '{metric_id}' must define numerator")
        if not isinstance(denominator_raw, str) or not denominator_raw.strip():
            raise ValueError(f"metric '{metric_id}' must define denominator")

        next_stack = stack + [metric_id]
        numerator_expr, numerator_warnings = _compile_ratio_component_expr(
            component_expr=numerator_raw,
            metric_entries=metric_entries,
            source_cfg=source_cfg,
            expected_source_id=expected_source_id,
            stack=next_stack,
            table_alias=table_alias,
        )
        denominator_expr, denominator_warnings = _compile_ratio_component_expr(
            component_expr=denominator_raw,
            metric_entries=metric_entries,
            source_cfg=source_cfg,
            expected_source_id=expected_source_id,
            stack=next_stack,
            table_alias=table_alias,
        )
        ratio_expr = f"SAFE_DIVIDE(({numerator_expr}), ({denominator_expr}))"
        return ratio_expr, numerator_warnings + denominator_warnings

    raise ValueError(
        f"metric '{metric_id}' type must be one of: simple, windowed, ratio; "
        f"got '{metric_type}'"
    )


def _compile_windowed_metric_expr(
    metric_cfg: Dict[str, Any],
    metric_id: str,
    source_cfg: Dict[str, Any],
    table_alias: Optional[str],
) -> Tuple[str, List[str]]:
    """Compile ``AGG(IF(<window over anchor>, <expr>, <null|0>))`` for a windowed metric.

    The window bounds are expressed relative to a runtime anchor parameter (e.g.
    ``@as_of``), so period-over-period reads stay correct across dates without editing
    config. SUM/COUNT use a 0 else so absent days don't null the sum; other aggregations
    use NULL so absent days are ignored (matching hand-written ``AVG(IF(...))``).
    """
    expr_raw = metric_cfg.get("expr")
    if not isinstance(expr_raw, str) or not expr_raw.strip():
        raise ValueError(f"windowed metric '{metric_id}' must define a non-empty expr")
    agg_raw = metric_cfg.get("agg")
    if not isinstance(agg_raw, str) or not agg_raw.strip():
        raise ValueError(f"windowed metric '{metric_id}' must define agg")
    window = metric_cfg.get("window")
    if not isinstance(window, dict):
        raise ValueError(f"windowed metric '{metric_id}' must define a window object")
    anchor_param = window.get("anchor_param")
    if not isinstance(anchor_param, str) or not anchor_param.strip():
        raise ValueError(
            f"windowed metric '{metric_id}' window must define anchor_param"
        )

    agg = agg_raw.strip().upper()
    ts_expr = _qualify_identifier(_source_ts_expr(source_cfg), table_alias)
    anchor_ref = f"@{anchor_param.strip()}"
    condition = _build_window_condition(ts_expr=ts_expr, window=window, anchor_ref=anchor_ref)
    value_expr = _qualify_identifier(expr_raw.strip(), table_alias)
    else_value = "0" if agg in {"SUM", "COUNT"} else "NULL"
    inner = f"IF({condition}, {value_expr}, {else_value})"
    return _render_aggregate_expr(expr=inner, agg=agg), []


def _source_ts_expr(source_cfg: Dict[str, Any]) -> str:
    ts_name = source_cfg.get("ts")
    if not isinstance(ts_name, str) or not ts_name.strip():
        raise ValueError("source must declare 'ts' to use windowed metrics")
    ts_name = ts_name.strip()
    for dimension_raw in source_cfg.get("dimensions") or []:
        if isinstance(dimension_raw, dict) and str(dimension_raw.get("name")).strip() == ts_name:
            expr = dimension_raw.get("expr")
            if isinstance(expr, str) and expr.strip():
                return expr.strip()
    raise ValueError(f"source.ts '{ts_name}' does not match a declared dimension")


def _build_window_condition(
    ts_expr: str, window: Dict[str, Any], anchor_ref: str
) -> str:
    """Boolean SQL for a window's bounds relative to the anchor (as_of)."""
    parts: List[str] = []
    equals = window.get("equals")
    lower = window.get("lower")
    upper = window.get("upper")
    if equals is not None:
        parts.append(f"{ts_expr} = {_anchor_offset(anchor_ref, equals)}")
    if lower is not None:
        op = ">=" if lower.get("inclusive") else ">"
        parts.append(f"{ts_expr} {op} {_anchor_offset(anchor_ref, lower)}")
    if upper is not None:
        op = "<=" if upper.get("inclusive") else "<"
        parts.append(f"{ts_expr} {op} {_anchor_offset(anchor_ref, upper)}")
    if not parts:
        raise ValueError("window must define at least one of: equals, lower, upper")
    return " AND ".join(parts)


def _anchor_offset(anchor_ref: str, bound: Dict[str, Any]) -> str:
    days = int(bound.get("days_before") or 0)
    if days == 0:
        return anchor_ref
    return f"DATE_SUB({anchor_ref}, INTERVAL {days} DAY)"


def _compile_ratio_component_expr(
    component_expr: str,
    metric_entries: Dict[str, Dict[str, Any]],
    source_cfg: Dict[str, Any],
    expected_source_id: str,
    stack: List[str],
    table_alias: Optional[str] = None,
) -> Tuple[str, List[str]]:
    normalized_component = component_expr.strip()
    if normalized_component in metric_entries:
        return _compile_metric_sql_expr(
            metric_id=normalized_component,
            metric_entries=metric_entries,
            source_cfg=source_cfg,
            expected_source_id=expected_source_id,
            stack=stack,
            table_alias=table_alias,
        )

    metric_ids = sorted(metric_entries.keys(), key=len, reverse=True)
    if not metric_ids:
        return _compile_simple_metric_expr(
            normalized_component, source_cfg=source_cfg, table_alias=table_alias
        )

    token_pattern = re.compile(r"\b(" + "|".join(re.escape(mid) for mid in metric_ids) + r")\b")
    replacement_count = 0
    warnings: List[str] = []
    compiled_cache: Dict[str, str] = {}

    def _replace(match: re.Match[str]) -> str:
        nonlocal replacement_count
        metric_id = match.group(1)
        replacement_count += 1
        if metric_id not in compiled_cache:
            compiled_expr, nested_warnings = _compile_metric_sql_expr(
                metric_id=metric_id,
                metric_entries=metric_entries,
                source_cfg=source_cfg,
                expected_source_id=expected_source_id,
                stack=stack,
                table_alias=table_alias,
            )
            compiled_cache[metric_id] = compiled_expr
            warnings.extend(nested_warnings)
        return f"({compiled_cache[metric_id]})"

    substituted = token_pattern.sub(_replace, normalized_component)
    if replacement_count == 0:
        return _compile_simple_metric_expr(
            normalized_component, source_cfg=source_cfg, table_alias=table_alias
        )
    return substituted, warnings


def _compile_simple_metric_expr(
    expr: str, source_cfg: Dict[str, Any], table_alias: Optional[str] = None
) -> Tuple[str, List[str]]:
    normalized_expr = expr.strip()
    if _looks_aggregated_expression(normalized_expr):
        # A raw aggregated expression is passed through verbatim; auto-qualifying
        # columns inside arbitrary SQL is unsafe, so such metrics are only valid on a
        # single-source query (no join).
        return normalized_expr, []

    by_name, by_expr = _build_source_measure_indexes(source_cfg=source_cfg)
    measure = by_name.get(normalized_expr) or by_expr.get(normalized_expr)
    if measure is None:
        return (
            f"SUM({_qualify_identifier(normalized_expr, table_alias)})",
            [
                "simple metric expression did not match a source measure; "
                "used SUM(expr) fallback"
            ],
        )

    agg = measure["agg"]
    measure_expr = _qualify_identifier(measure["expr"], table_alias)
    return _render_aggregate_expr(expr=measure_expr, agg=agg), []


def _qualify_identifier(expr: str, table_alias: Optional[str]) -> str:
    """Prefix a bare-column expression with ``table_alias`` when a join is active.

    Only bare identifiers are qualified; arbitrary expressions are returned unchanged.
    """
    if not table_alias:
        return expr
    stripped = expr.strip()
    if IDENTIFIER_RE.fullmatch(stripped):
        return f"{table_alias}.{stripped}"
    return expr


def _build_source_measure_indexes(
    source_cfg: Dict[str, Any],
) -> Tuple[Dict[str, Dict[str, str]], Dict[str, Dict[str, str]]]:
    measures_raw = source_cfg.get("measures")
    if not isinstance(measures_raw, list):
        raise ValueError("source.measures must be an array")

    by_name: Dict[str, Dict[str, str]] = {}
    by_expr: Dict[str, Dict[str, str]] = {}
    for index, measure_raw in enumerate(measures_raw):
        if not isinstance(measure_raw, dict):
            raise ValueError(f"source.measures[{index}] must be an object")
        name = normalize_identifier(measure_raw.get("name"), "source.measures[].name")
        expr = measure_raw.get("expr")
        agg = measure_raw.get("agg")
        if not isinstance(expr, str) or not expr.strip():
            raise ValueError(f"source.measures[{index}].expr must be a non-empty string")
        if not isinstance(agg, str) or not agg.strip():
            raise ValueError(f"source.measures[{index}].agg must be a non-empty string")

        entry = {"name": name, "expr": expr.strip(), "agg": agg.strip().upper()}
        by_name[name] = entry
        by_expr[entry["expr"]] = entry
    return by_name, by_expr


def _render_aggregate_expr(expr: str, agg: str) -> str:
    normalized_agg = agg.strip().upper()
    if not AGG_FUNCTION_RE.fullmatch(normalized_agg):
        raise ValueError(f"unsupported measure aggregation '{agg}'")

    normalized_expr = expr.strip()
    if normalized_agg == "COUNT_DISTINCT":
        return f"COUNT(DISTINCT {normalized_expr})"
    if normalized_agg == "COUNT":
        return f"COUNT({normalized_expr})"
    return f"{normalized_agg}({normalized_expr})"


def _looks_aggregated_expression(expr: str) -> bool:
    if AGGREGATED_EXPR_RE.match(expr):
        return True
    if re.search(
        r"\b(SUM|AVG|COUNT|COUNTIF|MIN|MAX|ANY_VALUE|APPROX_COUNT_DISTINCT)\s*\(",
        expr,
        re.IGNORECASE,
    ):
        return True
    return bool(re.match(r"^\s*COUNT\s*\(\s*DISTINCT\b", expr, re.IGNORECASE))


def _build_source_dimension_map(source_cfg: Dict[str, Any]) -> Dict[str, str]:
    dimensions_raw = source_cfg.get("dimensions")
    if not isinstance(dimensions_raw, list):
        raise ValueError("source.dimensions must be an array")

    mapping: Dict[str, str] = {}
    for idx, dimension_raw in enumerate(dimensions_raw):
        if not isinstance(dimension_raw, dict):
            raise ValueError(f"source.dimensions[{idx}] must be an object")
        name = normalize_identifier(
            dimension_raw.get("name"), "source.dimensions[].name"
        )
        expr = dimension_raw.get("expr")
        if not isinstance(expr, str) or not expr.strip():
            raise ValueError(f"source.dimensions[{idx}].expr must be a non-empty string")
        mapping[name] = expr.strip()
    return mapping


def _build_source_dimension_join_sources(
    source_cfg: Dict[str, Any],
) -> Dict[str, Optional[str]]:
    """Map each dimension name to the joined source it reads from (or ``None`` = base)."""
    sources: Dict[str, Optional[str]] = {}
    for dimension_raw in source_cfg.get("dimensions") or []:
        if not isinstance(dimension_raw, dict):
            continue
        name_raw = dimension_raw.get("name")
        if not isinstance(name_raw, str) or not name_raw.strip():
            continue
        join_source = dimension_raw.get("source")
        sources[name_raw.strip()] = (
            join_source.strip()
            if isinstance(join_source, str) and join_source.strip()
            else None
        )
    return sources


def _build_source_joins(source_cfg: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Index a source's declared ``joins`` by target source id."""
    joins: Dict[str, Dict[str, Any]] = {}
    raw = source_cfg.get("joins")
    if not isinstance(raw, list):
        return joins
    for join_raw in raw:
        if not isinstance(join_raw, dict):
            continue
        to_source = join_raw.get("to_source")
        if isinstance(to_source, str) and to_source.strip():
            joins[to_source.strip()] = join_raw
    return joins


def _build_from_clause(
    base_ref: str, base_alias: str, joined_specs: List[Dict[str, str]]
) -> str:
    """FROM body with ``base AS alias`` plus one JOIN line per joined source."""
    lines = [f"{base_ref} AS {base_alias}"]
    for spec in joined_specs:
        lines.append(f"{spec['join_type']} JOIN {spec['ref']} AS {spec['alias']}")
        lines.append(f"  ON {spec['on']}")
    return "\n".join(lines)


def _resolve_joins(
    context: ToolContext,
    dataset_id: str,
    source_cache: Dict[str, Dict[str, Any]],
    base_source_cfg: Dict[str, Any],
    base_alias: Optional[str],
    needed_join_ids: List[str],
    bigquery_project_id: Optional[str],
) -> List[Dict[str, str]]:
    """Validate and build a JOIN spec per joined source a query actually references."""
    if not needed_join_ids:
        return []

    joins_index = _build_source_joins(base_source_cfg)
    specs: List[Dict[str, str]] = []
    for join_id in needed_join_ids:
        join_cfg = joins_index.get(join_id)
        if join_cfg is None:
            raise ValueError(
                f"a dimension reads from joined source '{join_id}' but the base source "
                "declares no join to it"
            )
        relationship = str(join_cfg.get("relationship") or "").strip()
        if relationship != "many_to_one":
            raise ValueError(
                f"join to '{join_id}' has relationship '{relationship}'; only "
                "many_to_one joins are supported"
            )
        join_type = str(join_cfg.get("join_type") or "LEFT").strip().upper()
        if join_type not in {"LEFT", "INNER"}:
            raise ValueError(
                f"join to '{join_id}' has unsupported join_type '{join_type}'"
            )
        left_key = normalize_identifier(join_cfg.get("left_key"), "join.left_key")
        right_key = normalize_identifier(join_cfg.get("right_key"), "join.right_key")

        joined_cfg = load_source_config(
            context=context,
            dataset_id=dataset_id,
            source_id=join_id,
            source_cache=source_cache,
        )
        joined_ref = _build_table_ref(
            source_dataset=normalize_identifier(joined_cfg.get("dataset"), "source.dataset"),
            source_table=normalize_identifier(joined_cfg.get("table"), "source.table"),
            bigquery_project_id=bigquery_project_id,
        )
        specs.append(
            {
                "ref": joined_ref,
                "alias": join_id,
                "join_type": join_type,
                "on": f"{base_alias}.{left_key} = {join_id}.{right_key}",
            }
        )
    return specs


def _build_source_dimension_types(source_cfg: Dict[str, Any]) -> Dict[str, Optional[str]]:
    dimensions_raw = source_cfg.get("dimensions")
    if not isinstance(dimensions_raw, list):
        return {}

    types: Dict[str, Optional[str]] = {}
    for dimension_raw in dimensions_raw:
        if not isinstance(dimension_raw, dict):
            continue
        name_raw = dimension_raw.get("name")
        if isinstance(name_raw, str) and name_raw.strip():
            data_type = dimension_raw.get("data_type")
            types[name_raw.strip()] = data_type if isinstance(data_type, str) else None
    return types


def _build_date_clauses(
    date_range: Optional[Dict[str, str]],
    source_id: str,
    source_dim_map: Dict[str, str],
    base_alias: Optional[str] = None,
) -> Tuple[List[str], List[BindParam]]:
    """Compile a date range to WHERE clauses over bound ``DATE`` parameters.

    The bounds bind as ``@p_<dimension>_start`` / ``_end`` (in-process path). The agent
    path inlines them back to ``DATE '…'`` via ``CompiledPlan.render_inline``, which
    reproduces the pre-parameter SQL byte-for-byte.
    """
    if date_range is None:
        return [], []

    dimension = date_range["dimension"]
    if dimension not in source_dim_map:
        raise ValueError(f"date_range.dimension '{dimension}' not found in '{source_id}'")

    expr = _qualify_identifier(source_dim_map[dimension], base_alias)
    clauses: List[str] = []
    params: List[BindParam] = []
    if "start" in date_range:
        name = f"p_{dimension}_start"
        clauses.append(f"DATE({expr}) >= @{name}")
        params.append(BindParam(name=name, type="DATE", value=date_range["start"]))
    if "end" in date_range:
        name = f"p_{dimension}_end"
        clauses.append(f"DATE({expr}) <= @{name}")
        params.append(BindParam(name=name, type="DATE", value=date_range["end"]))
    return clauses, params


def _validate_order_by(
    order_by: List[Dict[str, str]], dimensions: List[str], value_fields: List[str]
) -> None:
    allowed_fields = set(dimensions) | set(value_fields)
    for idx, item in enumerate(order_by):
        field = item["field"]
        if field not in allowed_fields:
            raise ValueError(
                f"order_by[{idx}].field '{field}' must be one of: "
                f"{sorted(allowed_fields)}"
            )


def _resolve_metric_entry(
    metric_entries: Dict[str, Dict[str, Any]], requested_metric_name: str
) -> Dict[str, Any]:
    requested = normalize_identifier(requested_metric_name, "metric_names[]")
    entry = metric_entries.get(requested)
    if entry is None:
        raise ValueError(f"metric '{requested}' not found for requested dataset")
    return entry
