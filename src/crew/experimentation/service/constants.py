"""Constants for experimentation services."""

from __future__ import annotations

from pathlib import Path

EXPERIMENTATION_CONFIG_ROOT = Path(".mash") / "experimentation" / "configs"
EXPERIMENTATION_SCHEMA_ROOT = Path(__file__).resolve().parents[1] / "schema"
EXPOSURE_TABLE_NAME = "experiment_exposures"

EXPOSURE_TABLE_COLUMNS = [
    {
        "name": "exposure_event_id",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Globally unique immutable exposure event identifier.",
    },
    {
        "name": "occurred_at",
        "type": "TIMESTAMP",
        "mode": "REQUIRED",
        "description": "Canonical exposure timestamp used for attribution.",
    },
    {
        "name": "event_date",
        "type": "DATE",
        "mode": "REQUIRED",
        "description": "Partition key derived from occurred_at.",
    },
    {
        "name": "experiment_id",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Stable experiment identifier.",
    },
    {
        "name": "experiment_version",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Version discriminator for one experiment run.",
    },
    {
        "name": "variant_id",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Assigned variant identifier.",
    },
    {
        "name": "assignment_unit_type",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Type of randomized subject, such as user or workspace.",
    },
    {
        "name": "assignment_unit_id",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Stable randomized subject identifier.",
    },
    {
        "name": "source_system",
        "type": "STRING",
        "mode": "REQUIRED",
        "description": "Emitter or owning system for the exposure event.",
    },
    {
        "name": "ingested_at",
        "type": "TIMESTAMP",
        "mode": "REQUIRED",
        "description": "Warehouse ingestion timestamp.",
    },
]

