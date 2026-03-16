from __future__ import annotations

from mash.runtime import SubAgentMetadata

DATA_SUBAGENT_ID = "data"


def build_data_subagent_metadata() -> SubAgentMetadata:
    return SubAgentMetadata(
        display_name="Data Analytics Specialist",
        description=(
            "Handles metrics-layer and BigQuery workflows, including metric definitions, "
            "SQL plan generation, and dataset-level analysis."
        ),
        capabilities=[
            "metrics layer configuration",
            "BigQuery exploration",
            "metric SQL compilation",
        ],
        usage_guidance=(
            "Delegate tasks that require metric semantics, BigQuery table/query analysis, "
            "or changes under the metrics_layer configuration tree."
        ),
    )
