"""Tool registry builders for DB roles."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, List

from mash.tools.base import FunctionTool, Tool

from ...shared.workspace_context import current_workspace_dir
from ...metrics_layer.service.context import build_tool_context
from ...metrics_layer.service.tool_entrypoints import (
    compile_entity_read_to_sql,
    compile_metric_configs_to_sql,
    get_metrics_layer_schema,
    list_metrics_layer_configs,
    read_metrics_layer_config,
    validate_and_write_metrics_layer_config,
    validate_yaml,
)

# Reused across the compile tools: typed bind parameters and post-aggregation filters.
_PARAMETERS_SCHEMA = {
    "type": "array",
    "description": (
        "Typed query parameters bound at execute time (e.g. the @as_of anchor for "
        "windowed metrics, or an @org_ids ARRAY<STRING> for IN filters)."
    ),
    "items": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "type": {
                "type": "string",
                "description": "BigQuery type, e.g. DATE, STRING, INT64, ARRAY<STRING>.",
            },
            "value": {},
        },
        "required": ["name", "type"],
    },
}
_ORDER_BY_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "field": {"type": "string"},
            "direction": {"type": "string", "enum": ["ASC", "DESC"]},
        },
        "required": ["field", "direction"],
    },
}


def _async_tool_executor(
    func: Callable[[dict[str, Any], Any], Any],
    workspace_root: Path | None,
) -> Callable[[dict[str, Any]], Any]:
    async def _executor(args: dict[str, Any]) -> Any:
        root = workspace_root if workspace_root is not None else current_workspace_dir()
        return func(args, build_tool_context(root))

    return _executor


def build_steward_tools(workspace_root: Path | None = None) -> List[Tool]:
    """Build tools used by the data steward role."""

    return [
        FunctionTool(
            name="list_metrics_layer_configs",
            description=(
                "List source/metric config files under metrics_layer."
            ),
            parameters={"type": "object", "properties": {}},
            _executor=_async_tool_executor(list_metrics_layer_configs, workspace_root),
        ),
        FunctionTool(
            name="read_metrics_layer_config",
            description=(
                "Read one deterministic source/metric config by kind and name."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "kind": {
                        "type": "string",
                        "enum": ["source", "metric"],
                    },
                    "name": {
                        "type": "string",
                        "description": "Config name without path; .yml optional.",
                    },
                },
                "required": ["kind", "name"],
            },
            _executor=_async_tool_executor(read_metrics_layer_config, workspace_root),
        ),
        FunctionTool(
            name="validate_and_write_metrics_layer_config",
            description=(
                "Validate a source/metric config against schema and write only if valid."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "kind": {
                        "type": "string",
                        "enum": ["source", "metric"],
                    },
                    "name": {
                        "type": "string",
                        "description": "Config name without path; .yml optional.",
                    },
                    "content": {
                        "type": "string",
                        "description": "Full file content to write.",
                    },
                    "create_dirs": {
                        "type": "boolean",
                        "description": "Create parent directories when missing.",
                    },
                },
                "required": ["kind", "name", "content"],
            },
            _executor=_async_tool_executor(
                validate_and_write_metrics_layer_config, workspace_root
            ),
        ),
        FunctionTool(
            name="get_metrics_layer_schema",
            description=(
                "Read a metrics_layer YAML schema for source or metric config kinds."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "schema_kind": {
                        "type": "string",
                        "enum": ["source", "metric"],
                    }
                },
                "required": ["schema_kind"],
            },
            _executor=_async_tool_executor(get_metrics_layer_schema, workspace_root),
        ),
        FunctionTool(
            name="validate_yaml",
            description=("Validate a YAML document against a lightweight YAML schema."),
            parameters={
                "type": "object",
                "properties": {
                    "document_text": {
                        "type": "string",
                        "description": "YAML document to validate.",
                    },
                    "schema_text": {
                        "type": "string",
                        "description": "YAML schema definition.",
                    },
                },
                "required": ["document_text", "schema_text"],
            },
            _executor=_async_tool_executor(validate_yaml, workspace_root),
        ),
    ]


def build_analyst_tools(workspace_root: Path | None = None) -> List[Tool]:
    """Build tools used by the data analyst role."""

    return [
        FunctionTool(
            name="compile_metric_configs_to_sql",
            description=(
                "Compile metrics_layer metric configs into executable BigQuery SQL "
                "plans. Handles simple, windowed (pass the anchor via parameters), and "
                "ratio metrics, joins (request a joined dimension), filters and HAVING. "
                "Execute returned SQL with MCP execute_sql_readonly."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "metric_names": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "dimensions": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "filters": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "having": {
                        "type": "array",
                        "description": "Post-aggregation filters on metric_value.",
                        "items": {"type": "string"},
                    },
                    "date_range": {
                        "type": "object",
                        "properties": {
                            "dimension": {"type": "string"},
                            "start": {"type": "string"},
                            "end": {"type": "string"},
                        },
                        "required": ["dimension"],
                    },
                    "order_by": _ORDER_BY_SCHEMA,
                    "parameters": _PARAMETERS_SCHEMA,
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 1000,
                    },
                },
                "required": ["metric_names"],
            },
            _executor=_async_tool_executor(compile_metric_configs_to_sql, workspace_root),
        ),
        FunctionTool(
            name="compile_entity_read_to_sql",
            description=(
                "Compile a non-aggregated entity attribute read (record lookup by key) "
                "into executable BigQuery SQL — a projection of declared dimensions with "
                "no GROUP BY. Execute returned SQL with MCP execute_sql_readonly."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "description": "Source id to read attributes from.",
                    },
                    "attributes": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "filters": {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "order_by": _ORDER_BY_SCHEMA,
                    "parameters": _PARAMETERS_SCHEMA,
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 1000,
                    },
                },
                "required": ["source", "attributes"],
            },
            _executor=_async_tool_executor(compile_entity_read_to_sql, workspace_root),
        ),
    ]
