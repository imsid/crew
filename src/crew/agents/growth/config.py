"""Configuration helpers for the Growth agent."""

from __future__ import annotations

import os

from ...shared.config import load_agent_env

load_agent_env("growth")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
# Growth judgment (dip diagnosis, expansion thesis) benefits from a stronger model.
ANTHROPIC_MODEL = (
    os.getenv("GROWTH_ANTHROPIC_MODEL")
    or os.getenv("ANTHROPIC_MODEL")
    or "claude-sonnet-4-6"
)

BIGQUERY_MCP_URL = os.getenv("BIGQUERY_MCP_URL") or "https://bigquery.googleapis.com/mcp"
BIGQUERY_PROJECT_ID = os.getenv("BIGQUERY_PROJECT_ID")

# Read-only: the growth agent queries the warehouse for evidence during diagnosis and
# thesis-building. Writes happen only in deterministic code steps.
BIGQUERY_ALLOWED_TOOLS = [
    "list_dataset_ids",
    "list_table_ids",
    "get_dataset_info",
    "get_table_info",
    "execute_sql_readonly",
]
