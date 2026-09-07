"""Configuration helpers for the PM Agent."""

from __future__ import annotations

import os

from ...shared.config import load_agent_env

load_agent_env("pm")

# The PM agent runs on Gemini, like `growth`; only `engineer` stays on Anthropic.
GEMINI_MODEL = os.getenv("PM_GEMINI_MODEL") or "gemini-3.7-flash"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
