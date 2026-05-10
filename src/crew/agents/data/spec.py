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
from mash.runtime import AgentSpec, SubAgentMetadata
from mash.skills.registry import SkillRegistry
from mash.tools.registry import ToolRegistry

from ...artifacts.tools import build_artifact_tools
from ...experimentation.tools import build_experimentation_tools
from ...metrics_layer.service.constants import METRICS_LAYER_SCHEMA_ROOT
from ...shared.runtime_paths import workspace_dir
from ...shared.skills import CREW_SKILLS_DIR, register_custom_skills
from .config import (
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    BIGQUERY_ALLOWED_TOOLS,
    BIGQUERY_MCP_URL,
    BIGQUERY_PROJECT_ID,
)
from .prompt import build_base_prompt, build_roles_context, build_schema_context
from .tools import build_analyst_tools, build_steward_tools

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
        return AnthropicProvider(
            app_id=APP_ID,
            model=ANTHROPIC_MODEL,
            api_key=ANTHROPIC_API_KEY,
        )

    def build_tools(self) -> ToolRegistry:
        tools = ToolRegistry()
        workspace_root = workspace_dir(require_exists=True)
        for tool in build_artifact_tools(workspace_root=workspace_root):
            tools.register(tool)
        for tool in build_experimentation_tools(workspace_root=workspace_root):
            tools.register(tool)
        for tool in build_steward_tools(workspace_root=workspace_root):
            tools.register(tool)
        for tool in build_analyst_tools(workspace_root=workspace_root):
            tools.register(tool)
        return tools

    def build_skills(self) -> SkillRegistry:
        if self._skills is None:
            skills = SkillRegistry()
            register_custom_skills(skills, CREW_SKILLS_DIR, SKILLS_DIR)
            self._skills = skills
        return self._skills

    def build_agent_config(self) -> AgentConfig:
        skills = self.build_skills()
        sections = [
            build_base_prompt(BIGQUERY_PROJECT_ID),
            build_roles_context(skills),
        ]
        schema_context = build_schema_context(self.get_cached_files())
        if schema_context:
            sections.append(schema_context)

        blocks: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": "\n\n".join(section for section in sections if section),
                "cache_control": {"type": "ephemeral"},
            }
        ]

        return AgentConfig(
            app_id=self.get_agent_id(),
            system_prompt=blocks,
            max_steps=30,
            max_tokens=4096,
            conversation_history_turns=3,
            compaction_token_threshold=100000,
            skills_enabled=True,
        )

    def build_mcp_servers(self) -> list[MCPServerConfig]:
        if not BIGQUERY_MCP_URL or not BIGQUERY_PROJECT_ID:
            return []
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

    def build_subagent_metadata(self) -> SubAgentMetadata:
        return SubAgentMetadata(
            display_name="Data Analytics Specialist",
            description=(
                "Handles metrics-layer and BigQuery workflows, including metric definitions, "
                "SQL plan generation, experiment analysis, and dataset-level analysis."
            ),
            capabilities=[
                "metrics layer configuration",
                "BigQuery exploration",
                "metric SQL compilation",
                "experiment analysis planning",
            ],
            usage_guidance=(
                "Delegate tasks that require metric semantics, BigQuery table/query analysis, "
                "experiment analysis, or changes under the metrics_layer configuration tree."
            ),
        )

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
