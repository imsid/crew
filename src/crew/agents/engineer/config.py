"""Configuration helpers for the Engineer agent."""

from __future__ import annotations

import os

from ...shared.config import load_agent_env

load_agent_env("engineer")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_MODEL") or "claude-haiku-4-5-20251001"
GITHUB_MCP_URL = os.getenv("GITHUB_MCP_URL") or "https://api.githubcopilot.com/mcp/"
GITHUB_MCP_PAT = os.getenv("GITHUB_MCP_PAT")
GITHUB_REPO_PATH = os.getenv("GITHUB_REPOS")
GITHUB_REPO_URL = os.getenv("GITHUB_URL")
