"""Growth agent spec for the unified Mash host.

The Growth Expert persona (CMO/CRO judgment) that runs the curate step of the play
workflows: it reads a run of candidates, defines a few plays, assigns every org to
one, and writes the artifact.

The agent has no warehouse connection. The selection step already put everything a
play needs on the candidate row — usage trajectory and who the org is — so the whole
loop runs over the candidate tools, and a gap in the snapshot fails in the code step
where it can be fixed rather than turning into improvised SQL at runtime.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from mash.core.config import AgentConfig
from mash.core.llm import GeminiProvider, LLMProvider
from mash.runtime import AgentMetadata, AgentSpec
from mash.skills.registry import SkillRegistry
from mash.tools.registry import ToolRegistry

from ...artifacts.tools import build_artifact_tools
from ...plays.context import PlayRuntimeContext
from ...shared.skills import CREW_SKILLS_DIR, register_custom_skills
from .config import GEMINI_API_KEY, GEMINI_MODEL
from .prompt import build_base_prompt, build_roles_context
from .tools import build_candidate_tools

APP_ID = "growth"
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
            {"type": "text", "text": build_base_prompt()},
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
