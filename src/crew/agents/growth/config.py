"""Configuration helpers for the Growth agent."""

from __future__ import annotations

import os

from ...shared.config import load_agent_env

load_agent_env("growth")

# The growth agent runs on Gemini, like `data` and `pm`.
GEMINI_MODEL = os.getenv("GROWTH_GEMINI_MODEL") or "gemini-3.7-flash"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

# No BigQuery connection by design. Workflow code passes the selected candidate rows
# directly to the agent and owns every write.
