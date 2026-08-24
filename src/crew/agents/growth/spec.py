"""Growth agent spec for the unified Mash host.

The Growth Expert persona (CMO/CRO judgment) that runs the curate step of the play
workflows: it reads a run of candidates, defines a few plays, assigns every org to
one, and writes the artifact. Those writes go through the candidate tools built over
:class:`PlayRuntimeContext`; the MCP connection stays read-only, for evidence beyond
the snapshots.

Runs on Gemini. `data` and `pm` stay on Anthropic.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import google.auth
from google.auth.transport.requests import Request
from mash.core.config import AgentConfig
from mash.core.llm import GeminiProvider, LLMProvider
from mash.mcp import MCPServerConfig
from mash.runtime import AgentMetadata, AgentSpec
from mash.skills.registry import SkillRegistry
from mash.tools.registry import ToolRegistry

from ...artifacts.tools import build_artifact_tools
from ...plays.context import PlayRuntimeContext
from ...shared.skills import CREW_SKILLS_DIR, register_custom_skills
from .config import (
    BIGQUERY_ALLOWED_TOOLS,
    BIGQUERY_MCP_URL,
    BIGQUERY_PROJECT_ID,
    GEMINI_API_KEY,
    GEMINI_MODEL,
)
from .prompt import build_base_prompt, build_roles_context
from .tools import build_candidate_tools

APP_ID = "growth"
BIGQUERY_CONNECTION_NAME = "bigquery"
SKILLS_DIR = Path(__file__).resolve().parent / "skills"


class GrowthAgentSpec(AgentSpec):
    """Growth Expert specialist: turns a run of candidates into a handful of plays."""

    def __init__(self, ctx: PlayRuntimeContext | None = None) -> None:
        # The context carries the BigQuery client the candidate tools write through.
        # It builds lazily, so constructing the spec never touches the network.
        self._ctx = ctx if ctx is not None else PlayRuntimeContext.from_env()
        self._skills: SkillRegistry | None = None

    def get_agent_id(self) -> str:
        return APP_ID

    def build_llm(self) -> LLMProvider:
        return GeminiProvider(
            app_id=APP_ID,
            model=GEMINI_MODEL,
            api_key=GEMINI_API_KEY,
        )

    def build_tools(self) -> ToolRegistry:
        tools = ToolRegistry()
        for tool in build_artifact_tools():
            tools.register(tool)
        for tool in build_candidate_tools(self._ctx):
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
        # Two plain text blocks: `cache_control` is Anthropic syntax and Gemini does
        # its own implicit context caching, so there is nothing to annotate.
        blocks: list[dict[str, Any]] = [
            {"type": "text", "text": build_base_prompt(BIGQUERY_PROJECT_ID)},
            {"type": "text", "text": build_roles_context(skills)},
        ]
        return AgentConfig(
            app_id=self.get_agent_id(),
            system_prompt=blocks,
            # A run is one to four `read_candidates`, three or four
            # `create_play` + `assign_play` pairs, a `preview_play_copy` or two, and
            # one artifact write.
            max_steps=20,
            max_tokens=8192,
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
        headers["x-goog-user-project"] = BIGQUERY_PROJECT_ID
        return [
            MCPServerConfig(
                name=BIGQUERY_CONNECTION_NAME,
                url=BIGQUERY_MCP_URL,
                description="BigQuery MCP server for read-only usage evidence",
                headers=headers,
                allowed_tools=BIGQUERY_ALLOWED_TOOLS,
            )
        ]

    def build_subagent_metadata(self) -> AgentMetadata:
        return AgentMetadata(
            display_name="Growth Expert",
            description=(
                "Owns Net Revenue Retention for a consumption business: reads a run "
                "of candidate accounts, consolidates them into a handful of plays "
                "with per-play copy, assigns every account to one, and writes the "
                "briefing a human acts on."
            ),
            capabilities=[
                "consumption dip and expansion judgment",
                "play design and consolidation",
                "NRR outreach copywriting",
                "usage x firmographic fusion",
            ],
            usage_guidance=(
                "Delegate growth/NRR judgment: interpreting usage trajectories against "
                "company headroom and timing, deciding what to do about it, "
                "and drafting the outreach that goes with them."
            ),
        )

    @staticmethod
    def _generate_access_token() -> str:
        try:
            credentials, _project = google.auth.default(
                scopes=["https://www.googleapis.com/auth/bigquery"]
            )
            credentials.refresh(Request())
        except Exception as exc:
            raise RuntimeError(
                f"Failed to generate BigQuery access token via ADC/google-auth: {exc}"
            ) from exc
        token = credentials.token
        if not token:
            raise RuntimeError("google-auth returned an empty access token")
        return token
