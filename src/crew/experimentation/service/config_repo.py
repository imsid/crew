"""Repository helpers for experimentation configs."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict, List, Optional

import yaml

from ...metrics_layer.service.config_repo import (
    load_metric_entries_by_dataset,
    load_source_config,
)
from ...metrics_layer.service.pathing import normalize_identifier
from .context import ToolContext
from .pathing import resolve_experiment_config_path


def list_experiment_configs(
    context: ToolContext, dataset_filter: Optional[str]
) -> Dict[str, Any]:
    experimentation_root = context["experimentation_root"]
    root = context["root"]

    configs: List[Dict[str, Any]] = []
    for candidate in experimentation_root.rglob("*.yml"):
        relative = candidate.relative_to(experimentation_root).as_posix()
        parts = relative.split("/")
        if len(parts) != 3:
            continue
        dataset_id, subdir, filename = parts
        if dataset_filter and dataset_id != dataset_filter:
            continue
        if subdir != "experiments":
            continue
        configs.append(
            {
                "kind": "experiment",
                "dataset_id": dataset_id,
                "name": Path(filename).stem,
                "path": candidate.relative_to(root).as_posix(),
            }
        )

    return {
        "root": experimentation_root.relative_to(root).as_posix(),
        "dataset_id": dataset_filter,
        "count": len(configs),
        "configs": sorted(configs, key=lambda item: item["path"]),
    }


def read_experiment_config(
    context: ToolContext, dataset_id: Any, name: Any
) -> Dict[str, Any]:
    root = context["root"]
    path, normalized_dataset_id, normalized_name = resolve_experiment_config_path(
        context=context,
        dataset_id=dataset_id,
        name=name,
    )
    if not path.exists():
        raise ValueError(f"config file not found: {path.relative_to(root).as_posix()}")
    if not path.is_file():
        raise ValueError(f"config path is not a file: {path.relative_to(root).as_posix()}")
    content = path.read_text(encoding="utf-8")
    return {
        "kind": "experiment",
        "dataset_id": normalized_dataset_id,
        "name": normalized_name,
        "path": path.relative_to(root).as_posix(),
        "size": len(content),
        "content": content,
    }


def load_experiment_config(
    context: ToolContext, dataset_id: Any, name: Any
) -> Dict[str, Any]:
    path, _, _ = resolve_experiment_config_path(
        context=context,
        dataset_id=dataset_id,
        name=name,
    )
    if not path.exists() or not path.is_file():
        raise ValueError(f"experiment config file not found: {path.as_posix()}")
    try:
        parsed = yaml.safe_load(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise ValueError(f"failed to parse YAML file {path.as_posix()}: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError(f"config file must parse to object: {path.as_posix()}")
    kind = parsed.get("kind")
    if kind != "experiment":
        raise ValueError(
            f"expected kind 'experiment' but found '{kind}' in {path.as_posix()}"
        )
    return parsed


def validate_experiment_semantics(
    context: ToolContext, dataset_id: str, experiment_cfg: Dict[str, Any]
) -> Dict[str, Any]:
    experiment_id = normalize_identifier(experiment_cfg.get("id"), "experiment.id")
    control_variant = normalize_identifier(
        experiment_cfg.get("control_variant"), "experiment.control_variant"
    )
    subject_type = normalize_identifier(
        experiment_cfg.get("subject_type"), "experiment.subject_type"
    )
    experiment_version = normalize_identifier(
        experiment_cfg.get("experiment_version"), "experiment.experiment_version"
    )

    variants_raw = experiment_cfg.get("variants")
    if not isinstance(variants_raw, list) or not variants_raw:
        raise ValueError("experiment.variants must be a non-empty array")

    variants: List[Dict[str, Any]] = []
    variant_ids = set()
    allocation_weights: Dict[str, float] = {}
    for idx, variant_raw in enumerate(variants_raw):
        if not isinstance(variant_raw, dict):
            raise ValueError(f"experiment.variants[{idx}] must be an object")
        variant_id = normalize_identifier(variant_raw.get("id"), "experiment.variants[].id")
        if variant_id in variant_ids:
            raise ValueError(f"duplicate variant id '{variant_id}'")
        variant_ids.add(variant_id)
        weight_raw = variant_raw.get("allocation_weight")
        allocation_weight = None
        if weight_raw is not None:
            if not isinstance(weight_raw, (int, float)) or isinstance(weight_raw, bool):
                raise ValueError(
                    f"experiment.variants[{idx}].allocation_weight must be a number"
                )
            if float(weight_raw) <= 0:
                raise ValueError(
                    f"experiment.variants[{idx}].allocation_weight must be positive"
                )
            allocation_weight = float(weight_raw)
            allocation_weights[variant_id] = allocation_weight
        variants.append({"id": variant_id, "allocation_weight": allocation_weight})

    if control_variant not in variant_ids:
        raise ValueError(
            f"experiment.control_variant '{control_variant}' must be listed in variants"
        )

    metric_entries = load_metric_entries_by_dataset(context=context, dataset_id=dataset_id)
    source_cache: Dict[str, Dict[str, Any]] = {}
    metrics_raw = experiment_cfg.get("metrics")
    if not isinstance(metrics_raw, list) or not metrics_raw:
        raise ValueError("experiment.metrics must be a non-empty array")

    metrics: List[Dict[str, Any]] = []
    seen_metric_ids = set()
    for idx, metric_raw in enumerate(metrics_raw):
        if not isinstance(metric_raw, dict):
            raise ValueError(f"experiment.metrics[{idx}] must be an object")
        metric_id = normalize_identifier(metric_raw.get("metric_id"), "experiment.metrics[].metric_id")
        if metric_id in seen_metric_ids:
            raise ValueError(f"duplicate metric id '{metric_id}'")
        seen_metric_ids.add(metric_id)
        metric_entry = metric_entries.get(metric_id)
        if metric_entry is None:
            raise ValueError(
                f"experiment.metrics[{idx}].metric_id '{metric_id}' was not found in metrics_layer configs"
            )
        metric_cfg = metric_entry["config"]
        metric_type = metric_cfg.get("type")
        if metric_type != "simple":
            raise ValueError(
                f"metric '{metric_id}' type '{metric_type}' is not supported for experiment analysis"
            )
        source_id = normalize_identifier(metric_cfg.get("base_source"), "metric.base_source")
        source_cfg = load_source_config(
            context=context,
            dataset_id=dataset_id,
            source_id=source_id,
            source_cache=source_cache,
        )
        subject_raw = source_cfg.get("subject")
        if not isinstance(subject_raw, list) or not subject_raw:
            raise ValueError(f"metric '{metric_id}' source '{source_id}' must define subject")
        if len(subject_raw) != 1:
            raise ValueError(
                f"metric '{metric_id}' source '{source_id}' must define exactly one subject in v1"
            )
        subject_key = normalize_identifier(subject_raw[0], "source.subject[]")
        ts_name = source_cfg.get("ts")
        if ts_name is None:
            raise ValueError(f"metric '{metric_id}' source '{source_id}' must define ts")
        ts_key = normalize_identifier(ts_name, "source.ts")
        attribution_window_days = metric_raw.get("attribution_window_days")
        if not isinstance(attribution_window_days, int) or attribution_window_days < 1:
            raise ValueError(
                f"experiment.metrics[{idx}].attribution_window_days must be an integer >= 1"
            )
        metrics.append(
            {
                "metric_id": metric_id,
                "attribution_window_days": attribution_window_days,
                "source_id": source_id,
                "subject_key": subject_key,
                "timestamp_key": ts_key,
                "metric_type": metric_type,
            }
        )

    return {
        "experiment_id": experiment_id,
        "experiment_version": experiment_version,
        "subject_type": subject_type,
        "control_variant": control_variant,
        "variants": variants,
        "variant_ids": sorted(variant_ids),
        "allocation_weights": allocation_weights,
        "metrics": metrics,
        "metric_entries": metric_entries,
        "source_cache": source_cache,
    }

