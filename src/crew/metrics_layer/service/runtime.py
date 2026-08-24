"""Compile-and-execute runtime for the metrics layer.

One entrypoint the whole system shares: the data agent (via the MCP execute path) and
the Growth Crew code steps (in-process) both compile a ``QuerySpec`` to a
``CompiledPlan`` and execute it against BigQuery.

Phase 0 wires the spine with parity behavior. ``QuerySpec`` mirrors today's compile
arguments and ``execute_plan`` binds ``plan.parameters`` (empty for now, so this is a
plain ``client.query(sql)``). Later phases extend ``QuerySpec`` (typed parameters,
multiple measures, time windows) and populate ``parameters`` without changing callers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from google.cloud import bigquery

from .config_repo import load_metric_entries_by_dataset
from .context import ToolContext
from .plan import BindParam, CompiledPlan
from .sql_compiler import (
    compile_entity_plan,
    compile_metric_plan,
    compile_multi_metric_plan,
)


@dataclass
class QuerySpec:
    """A request to read one metric at a grain — the compiler's structured input."""

    metric_name: str
    dimensions: List[str] = field(default_factory=list)
    filters: List[str] = field(default_factory=list)
    date_range: Optional[Dict[str, str]] = None
    order_by: List[Dict[str, str]] = field(default_factory=list)
    limit: int = 100
    parameters: List[BindParam] = field(default_factory=list)
    having: List[str] = field(default_factory=list)


def compile_query(
    context: ToolContext,
    dataset_id: str,
    spec: QuerySpec,
    *,
    bigquery_project_id: Optional[str] = None,
) -> CompiledPlan:
    metric_entries = load_metric_entries_by_dataset(
        context=context, dataset_id=dataset_id
    )
    return compile_metric_plan(
        context=context,
        dataset_id=dataset_id,
        requested_metric_name=spec.metric_name,
        metric_entries=metric_entries,
        source_cache={},
        requested_dimensions=spec.dimensions,
        filters=spec.filters,
        date_range=spec.date_range,
        order_by=spec.order_by,
        limit=spec.limit,
        bigquery_project_id=bigquery_project_id,
        parameters=spec.parameters,
        having=spec.having,
    )


def compile_multi_query(
    context: ToolContext,
    dataset_id: str,
    metric_names: List[str],
    *,
    dimensions: Optional[List[str]] = None,
    filters: Optional[List[str]] = None,
    date_range: Optional[Dict[str, str]] = None,
    order_by: Optional[List[Dict[str, str]]] = None,
    limit: int = 100,
    parameters: Optional[List[BindParam]] = None,
    having: Optional[List[str]] = None,
    bigquery_project_id: Optional[str] = None,
) -> CompiledPlan:
    """Compile several metrics sharing a base source into one multi-column plan."""
    metric_entries = load_metric_entries_by_dataset(
        context=context, dataset_id=dataset_id
    )
    return compile_multi_metric_plan(
        context=context,
        dataset_id=dataset_id,
        requested_metric_names=list(metric_names),
        metric_entries=metric_entries,
        source_cache={},
        requested_dimensions=list(dimensions or []),
        filters=list(filters or []),
        date_range=date_range,
        order_by=list(order_by or []),
        limit=limit,
        bigquery_project_id=bigquery_project_id,
        parameters=list(parameters or []),
        having=list(having or []),
    )


def compile_entity_query(
    context: ToolContext,
    dataset_id: str,
    source_id: str,
    *,
    attributes: List[str],
    filters: Optional[List[str]] = None,
    order_by: Optional[List[Dict[str, str]]] = None,
    limit: int = 1000,
    parameters: Optional[List[BindParam]] = None,
    bigquery_project_id: Optional[str] = None,
) -> CompiledPlan:
    """Compile a non-aggregated attribute read (entity lookup by key)."""
    return compile_entity_plan(
        context=context,
        dataset_id=dataset_id,
        source_id=source_id,
        requested_attributes=list(attributes),
        filters=list(filters or []),
        order_by=list(order_by or []),
        limit=limit,
        bigquery_project_id=bigquery_project_id,
        parameters=list(parameters or []),
    )


def execute_plan(
    plan: CompiledPlan, *, client: Any, location: Optional[str] = None
) -> List[Dict[str, Any]]:

    job_config = bigquery.QueryJobConfig(
        query_parameters=[param.to_bigquery() for param in plan.parameters]
    )
    result = client.query(plan.sql, job_config=job_config, location=location).result()
    return [dict(row) for row in result]


def run_query(
    context: ToolContext,
    dataset_id: str,
    spec: QuerySpec,
    *,
    client: Any,
    bigquery_project_id: Optional[str] = None,
    location: Optional[str] = None,
) -> List[Dict[str, Any]]:
    plan = compile_query(
        context, dataset_id, spec, bigquery_project_id=bigquery_project_id
    )
    return execute_plan(plan, client=client, location=location)


def run_multi_query(
    context: ToolContext,
    dataset_id: str,
    metric_names: List[str],
    *,
    client: Any,
    dimensions: Optional[List[str]] = None,
    filters: Optional[List[str]] = None,
    date_range: Optional[Dict[str, str]] = None,
    order_by: Optional[List[Dict[str, str]]] = None,
    limit: int = 100,
    parameters: Optional[List[BindParam]] = None,
    having: Optional[List[str]] = None,
    bigquery_project_id: Optional[str] = None,
    location: Optional[str] = None,
) -> List[Dict[str, Any]]:
    plan = compile_multi_query(
        context,
        dataset_id,
        metric_names,
        dimensions=dimensions,
        filters=filters,
        date_range=date_range,
        order_by=order_by,
        limit=limit,
        parameters=parameters,
        having=having,
        bigquery_project_id=bigquery_project_id,
    )
    return execute_plan(plan, client=client, location=location)


def run_entity_query(
    context: ToolContext,
    dataset_id: str,
    source_id: str,
    *,
    client: Any,
    attributes: List[str],
    filters: Optional[List[str]] = None,
    order_by: Optional[List[Dict[str, str]]] = None,
    limit: int = 1000,
    parameters: Optional[List[BindParam]] = None,
    bigquery_project_id: Optional[str] = None,
    location: Optional[str] = None,
) -> List[Dict[str, Any]]:
    plan = compile_entity_query(
        context,
        dataset_id,
        source_id,
        attributes=attributes,
        filters=filters,
        order_by=order_by,
        limit=limit,
        parameters=parameters,
        bigquery_project_id=bigquery_project_id,
    )
    return execute_plan(plan, client=client, location=location)


__all__ = [
    "QuerySpec",
    "compile_query",
    "compile_multi_query",
    "compile_entity_query",
    "execute_plan",
    "run_query",
    "run_multi_query",
    "run_entity_query",
]
