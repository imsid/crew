"""Tool registry builders for experimentation workflows."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, List

from mash.tools.base import FunctionTool, Tool

from ..shared.workspace_context import current_workspace_dir
from .service.context import build_tool_context
from .service.tool_entrypoints import (
    compile_experiment_analysis_sql,
    compute_experiment_analysis,
    list_experiment_configs_tool,
    read_experiment_config_tool,
)


def _workspace_tool_executor(
    func: Callable[[dict[str, Any], Any], Any],
    workspace_root: Path | None,
) -> Callable[[dict[str, Any]], Any]:
    async def _executor(args: dict[str, Any]) -> Any:
        root = workspace_root if workspace_root is not None else current_workspace_dir()
        return func(args, build_tool_context(root))

    return _executor


def build_experimentation_tools(workspace_root: Path | None = None) -> List[Tool]:
    return [
        FunctionTool(
            name="list_experiment_configs",
            description="List experimentation config files under the selected workspace.",
            parameters={"type": "object", "properties": {}},
            _executor=_workspace_tool_executor(list_experiment_configs_tool, workspace_root),
        ),
        FunctionTool(
            name="read_experiment_config",
            description="Read one deterministic experiment config by name from the selected workspace.",
            parameters={
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Config name without path; .yml optional.",
                    },
                },
                "required": ["name"],
            },
            _executor=_workspace_tool_executor(read_experiment_config_tool, workspace_root),
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
                    "name": {"type": "string"},
                },
                "required": ["name"],
            },
            _executor=_workspace_tool_executor(compile_experiment_analysis_sql, workspace_root),
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
            _executor=_workspace_tool_executor(compute_experiment_analysis, workspace_root),
        ),
    ]
