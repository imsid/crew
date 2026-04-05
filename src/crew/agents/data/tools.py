"""Tool registry builders for DB roles."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, List

from mash.tools.base import FunctionTool, Tool

from ...metrics_layer.service.context import build_tool_context
from ...metrics_layer.service.tool_entrypoints import (
    compile_metric_configs_to_sql,
    get_metrics_layer_schema,
    list_metrics_layer_configs,
    read_metrics_layer_config,
    validate_and_write_metrics_layer_config,
    validate_yaml,
)


def _async_tool_executor(
    func: Callable[[dict[str, Any], Any], Any], context: Any
) -> Callable[[dict[str, Any]], Any]:
    async def _executor(args: dict[str, Any]) -> Any:
        return func(args, context)

    return _executor


def build_steward_tools(workspace_root: Path) -> List[Tool]:
    """Build tools used by the data steward role."""

    context = build_tool_context(workspace_root)

    return [
        FunctionTool(
            name="list_metrics_layer_configs",
            description=(
                "List source/metric config files under metrics_layer."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "dataset_id": {
                        "type": "string",
                        "description": "Optional dataset id filter.",
                    }
                },
            },
            _executor=_async_tool_executor(list_metrics_layer_configs, context),
        ),
        FunctionTool(
            name="read_metrics_layer_config",
            description=(
                "Read one deterministic source/metric config by kind, dataset_id, and name."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "kind": {
                        "type": "string",
                        "enum": ["source", "metric"],
                    },
                    "dataset_id": {
                        "type": "string",
                    },
                    "name": {
                        "type": "string",
                        "description": "Config name without path; .yml optional.",
                    },
                },
                "required": ["kind", "dataset_id", "name"],
            },
            _executor=_async_tool_executor(read_metrics_layer_config, context),
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
                    "dataset_id": {
                        "type": "string",
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
                "required": ["kind", "dataset_id", "name", "content"],
            },
            _executor=_async_tool_executor(
                validate_and_write_metrics_layer_config, context
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
            _executor=_async_tool_executor(get_metrics_layer_schema, context),
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
            _executor=_async_tool_executor(validate_yaml, context),
        ),
    ]


def build_analyst_tools(workspace_root: Path) -> List[Tool]:
    """Build tools used by the data analyst role."""

    context = build_tool_context(workspace_root)

    return [
        FunctionTool(
            name="compile_metric_configs_to_sql",
            description=(
                "Compile one or more metrics_layer metric configs into executable "
                "BigQuery SQL plans. Execute returned SQL with MCP execute_sql."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "dataset_id": {"type": "string"},
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
                    "date_range": {
                        "type": "object",
                        "properties": {
                            "dimension": {"type": "string"},
                            "start": {"type": "string"},
                            "end": {"type": "string"},
                        },
                        "required": ["dimension"],
                    },
                    "order_by": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "field": {"type": "string"},
                                "direction": {
                                    "type": "string",
                                    "enum": ["ASC", "DESC"],
                                },
                            },
                            "required": ["field", "direction"],
                        },
                    },
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 1000,
                    },
                },
                "required": ["dataset_id", "metric_names"],
            },
            _executor=_async_tool_executor(compile_metric_configs_to_sql, context),
        )
    ]
