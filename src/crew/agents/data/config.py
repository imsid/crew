"""Configuration helpers for the Data Agent CLI."""

from __future__ import annotations

import os

from ...shared.config import load_agent_env

load_agent_env("data")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL") or "claude-haiku-4-5-20251001"

BIGQUERY_MCP_URL = (
    os.getenv("BIGQUERY_MCP_URL") or "https://bigquery.googleapis.com/mcp"
)
BIGQUERY_PROJECT_ID = os.getenv("BIGQUERY_PROJECT_ID")

BIGQUERY_ALLOWED_TOOLS = [
    "list_dataset_ids",
    "list_table_ids",
    "get_dataset_info",
    "get_table_info",
    "execute_sql",
]
