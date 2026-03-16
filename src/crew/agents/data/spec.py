"""Data agent spec for the unified Mash host."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import google.auth
from google.auth.transport.requests import Request
from mash.core.config import AgentConfig
from mash.core.llm import AnthropicProvider, LLMProvider
from mash.mcp import MCPServerConfig
from mash.runtime import AgentSpec
from mash.skills.registry import SkillRegistry
from mash.tools.registry import ToolRegistry

from ...shared.runtime_paths import PROJECT_ROOT
from ...metrics_layer.service.constants import METRICS_LAYER_SCHEMA_ROOT
from .config import (
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    BIGQUERY_ALLOWED_TOOLS,
    BIGQUERY_MCP_URL,
    BIGQUERY_PROJECT_ID,
)
from .tools import build_analyst_tools, build_steward_tools
from .prompt import build_base_prompt, build_roles_context, build_schema_context

APP_ID = "data"
BIGQUERY_CONNECTION_NAME = "bigquery"
SKILLS_DIR = Path(__file__).resolve().parent / "skills"


class DataAgentSpec(AgentSpec):
    """Role-based BigQuery and metrics-layer specialist."""

    def __init__(self) -> None:
        self._skills: SkillRegistry | None = None

    def get_agent_id(self) -> str:
        return APP_ID

    def build_llm(self) -> LLMProvider:
        return AnthropicProvider(api_key=ANTHROPIC_API_KEY, app_id=APP_ID)

    def build_tools(self) -> ToolRegistry:
        tools = ToolRegistry()
        workspace_root = PROJECT_ROOT
        for tool in build_steward_tools(workspace_root=workspace_root):
            tools.register(tool)
        for tool in build_analyst_tools(workspace_root=workspace_root):
            tools.register(tool)
        return tools

    def build_skills(self) -> SkillRegistry:
        if self._skills is None:
            skills = SkillRegistry()
            for skill in skills.get_custom_skills(SKILLS_DIR):
                skills.register(skill)
            self._skills = skills
        return self._skills

    def build_agent_config(self) -> AgentConfig:
        skills = self.build_skills()
        blocks: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": build_base_prompt(BIGQUERY_PROJECT_ID),
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": build_roles_context(skills),
                "cache_control": {"type": "ephemeral"},
            },
        ]
        schema_context = build_schema_context(self.get_cached_files())
        if schema_context:
            blocks.append(
                {
                    "type": "text",
                    "text": schema_context,
                    "cache_control": {"type": "ephemeral"},
                }
            )

        return AgentConfig(
            app_id=self.get_agent_id(),
            system_prompt=blocks,
            model=ANTHROPIC_MODEL,
            max_steps=30,
            max_tokens=4096,
            api_key=ANTHROPIC_API_KEY,
            conversation_history_turns=3,
            compaction_token_threshold=100000,
            skills_enabled=True,
            tool_search_enabled=False,
        )

    def build_mcp_servers(self) -> list[MCPServerConfig]:
        try:
            access_token = self._generate_access_token()
        except RuntimeError as exc:
            print(
                f"Warning: BigQuery MCP auth token could not be generated: {exc}",
                file=sys.stderr,
            )
            return []

        headers = {"Authorization": f"Bearer {access_token}"}
        if BIGQUERY_PROJECT_ID:
            headers["x-goog-user-project"] = BIGQUERY_PROJECT_ID

        return [
            MCPServerConfig(
                name=BIGQUERY_CONNECTION_NAME,
                url=BIGQUERY_MCP_URL,
                description="BigQuery MCP server for data exploration",
                headers=headers,
                allowed_tools=BIGQUERY_ALLOWED_TOOLS,
            )
        ]

    @staticmethod
    def get_cached_files() -> list[str]:
        return [
            str(path)
            for path in (
                METRICS_LAYER_SCHEMA_ROOT / "source.schema.yml",
                METRICS_LAYER_SCHEMA_ROOT / "metric.schema.yml",
            )
            if path.exists()
        ]

    @staticmethod
    def _generate_access_token() -> str:
        try:
            credentials, _project = google.auth.default(
                scopes=["https://www.googleapis.com/auth/bigquery"]
            )
            credentials.refresh(Request())
        except Exception as exc:
            raise RuntimeError(
                "Failed to generate BigQuery access token via ADC/google-auth"
                f": {exc}"
            ) from exc

        token = credentials.token
        if not token:
            raise RuntimeError("google-auth returned an empty access token")
        return token
