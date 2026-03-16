"""Configuration helpers for the PM Agent."""

from __future__ import annotations

import os

from ...shared.config import load_agent_env

load_agent_env("pm")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL") or "claude-haiku-4-5-20251001"
