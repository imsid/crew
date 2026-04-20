"""Tool-facing public entrypoints for experimentation services."""

from __future__ import annotations

import json
from typing import Any, Dict, Optional

from mash.tools.base import ToolResult

from ...metrics_layer.service.pathing import (
    normalize_identifier,
    resolve_workspace_dataset_id,
)
from .config_repo import (
    list_experiment_configs,
    load_experiment_config,
    read_experiment_config,
    validate_experiment_semantics,
)
from .context import ToolContext
from .sql_compiler import compile_experiment_plan
from .stats_engine import compute_experiment_results
from .yaml_schema import load_experimentation_schema_text, validate_yaml_text


def _to_json(payload: Dict[str, Any]) -> ToolResult:
    return ToolResult.success(json.dumps(payload, ensure_ascii=True, indent=2))


def list_experiment_configs_tool(
    args: Dict[str, Any], context: ToolContext
) -> ToolResult:
    try:
        return _to_json(
            list_experiment_configs(context=context, dataset_filter=args.get("dataset_id"))
        )
    except Exception as exc:
        return ToolResult.error(f"list_experiment_configs failed: {exc}")


def read_experiment_config_tool(
    args: Dict[str, Any], context: ToolContext
) -> ToolResult:
    try:
        return _to_json(
            read_experiment_config(
                context=context,
                name=args.get("name"),
                dataset_id=args.get("dataset_id"),
            )
        )
    except Exception as exc:
        return ToolResult.error(f"read_experiment_config failed: {exc}")


def compile_experiment_analysis_sql(
    args: Dict[str, Any], context: ToolContext
) -> ToolResult:
    dataset_id: Optional[str] = None
    try:
        dataset_id = resolve_workspace_dataset_id(context, args.get("dataset_id"))
        experiment_name = normalize_identifier(args.get("name"), "name")
        experiment_cfg = load_experiment_config(
            context=context,
            name=experiment_name,
            dataset_id=dataset_id,
        )
        schema_path, schema_text = load_experimentation_schema_text(
            context=context, schema_kind="experiment"
        )
        valid, errors, parse_error = validate_yaml_text(
            document_text=json.dumps(experiment_cfg),
            schema_text=schema_text,
        )
        if parse_error:
            raise ValueError(f"failed to validate experiment config: {parse_error}")
        if not valid:
            raise ValueError(
                f"experiment config failed schema validation in {schema_path.name}: {errors}"
            )
        semantics = validate_experiment_semantics(
            context=context,
            dataset_id=dataset_id,
            experiment_cfg=experiment_cfg,
        )
        return _to_json(
            compile_experiment_plan(
                dataset_id=dataset_id,
                experiment_name=experiment_name,
                experiment_cfg=experiment_cfg,
                semantics=semantics,
            )
        )
    except Exception as exc:
        return ToolResult.error(
            json.dumps(
                {
                    "status": "compile_failed",
                    "dataset_id": dataset_id,
                    "errors": [{"experiment_name": args.get("name"), "error": str(exc)}],
                },
                ensure_ascii=True,
                indent=2,
            )
        )


def compute_experiment_analysis(
    args: Dict[str, Any], context: ToolContext
) -> ToolResult:
    del context
    try:
        control_variant = normalize_identifier(
            args.get("control_variant"), "control_variant"
        )
        allocation_weights_raw = args.get("allocation_weights") or {}
        if not isinstance(allocation_weights_raw, dict):
            raise ValueError("allocation_weights must be an object when provided")
        allocation_weights = {
            normalize_identifier(key, "allocation_weights.key"): float(value)
            for key, value in allocation_weights_raw.items()
        }
        exposure_counts = args.get("exposure_counts")
        metric_summaries = args.get("metric_summaries")
        if not isinstance(exposure_counts, list):
            raise ValueError("exposure_counts must be an array")
        if not isinstance(metric_summaries, list):
            raise ValueError("metric_summaries must be an array")
        return _to_json(
            compute_experiment_results(
                control_variant=control_variant,
                allocation_weights=allocation_weights,
                exposure_counts=exposure_counts,
                metric_summaries=metric_summaries,
            )
        )
    except Exception as exc:
        return ToolResult.error(f"compute_experiment_analysis failed: {exc}")
