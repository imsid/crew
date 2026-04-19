"""Tool registry builders for experimentation workflows."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, List

from mash.tools.base import FunctionTool, Tool

from .service.context import build_tool_context
from .service.tool_entrypoints import (
    compile_experiment_analysis_sql,
    compute_experiment_analysis,
    list_experiment_configs_tool,
    read_experiment_config_tool,
)


def _async_tool_executor(
    func: Callable[[dict[str, Any], Any], Any], context: Any
) -> Callable[[dict[str, Any]], Any]:
    async def _executor(args: dict[str, Any]) -> Any:
        return func(args, context)

    return _executor


def build_experimentation_tools(workspace_root: Path) -> List[Tool]:
    context = build_tool_context(workspace_root)
    return [
        FunctionTool(
            name="list_experiment_configs",
            description="List experimentation config files under .mash/experimentation.",
            parameters={
                "type": "object",
                "properties": {
                    "dataset_id": {
                        "type": "string",
                        "description": "Optional dataset id filter.",
                    }
                },
            },
            _executor=_async_tool_executor(list_experiment_configs_tool, context),
        ),
        FunctionTool(
            name="read_experiment_config",
            description="Read one deterministic experiment config by dataset_id and name.",
            parameters={
                "type": "object",
                "properties": {
                    "dataset_id": {"type": "string"},
                    "name": {
                        "type": "string",
                        "description": "Config name without path; .yml optional.",
                    },
                },
                "required": ["dataset_id", "name"],
            },
            _executor=_async_tool_executor(read_experiment_config_tool, context),
        ),
        FunctionTool(
            name="compile_experiment_analysis_sql",
            description=(
                "Compile deterministic BigQuery SQL plans for experiment exposure summaries "
                "and metrics-layer-backed metric summaries."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "dataset_id": {"type": "string"},
                    "name": {"type": "string"},
                },
                "required": ["dataset_id", "name"],
            },
            _executor=_async_tool_executor(compile_experiment_analysis_sql, context),
        ),
        FunctionTool(
            name="compute_experiment_analysis",
            description=(
                "Compute SRM and per-metric experiment comparisons from executed summary rows."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "control_variant": {"type": "string"},
                    "allocation_weights": {"type": "object"},
                    "exposure_counts": {
                        "type": "array",
                        "items": {"type": "object"},
                    },
                    "metric_summaries": {
                        "type": "array",
                        "items": {"type": "object"},
                    },
                },
                "required": ["control_variant", "exposure_counts", "metric_summaries"],
            },
            _executor=_async_tool_executor(compute_experiment_analysis, context),
        ),
    ]
