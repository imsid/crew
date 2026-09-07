"""Configuration helpers for the Data Agent CLI."""

from __future__ import annotations

import os

from ...shared.config import load_agent_env

load_agent_env("data")

# The data agent runs on Gemini, like `growth`; only `engineer` stays on Anthropic.
GEMINI_MODEL = os.getenv("DATA_GEMINI_MODEL") or "gemini-3.7-flash"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

BIGQUERY_MCP_URL = (
    os.getenv("BIGQUERY_MCP_URL") or "https://bigquery.googleapis.com/mcp"
)
BIGQUERY_PROJECT_ID = os.getenv("BIGQUERY_PROJECT_ID")

BIGQUERY_ALLOWED_TOOLS = [
    "list_dataset_ids",
    "list_table_ids",
    "get_dataset_info",
    "get_table_info",
    "execute_sql_readonly",
]
