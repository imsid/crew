"""Growth agent spec for the unified Mash host.

The Growth Agent persona (CMO/CRO judgment) that runs the curate step of the play
workflows: it reads a run of candidates, groups them into a few plays with per-play
copy, and returns the curation. It writes nothing — the workflow's commit step does.

The agent has no warehouse connection. The selection step passes everything a play
needs on the candidate row, and a gap in the snapshot fails in code rather than turning
into improvised SQL at runtime.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from mash.core.config import AgentConfig
from mash.core.llm import GeminiProvider, LLMProvider
from mash.runtime import AgentMetadata, AgentSpec
from mash.skills.registry import SkillRegistry
from mash.tools.registry import ToolRegistry

from ...shared.skills import CREW_SKILLS_DIR, register_custom_skills
from .config import GEMINI_API_KEY, GEMINI_MODEL
from .prompt import build_base_prompt, build_growth_context, build_roles_context

APP_ID = "growth"
SKILLS_DIR = Path(__file__).resolve().parent / "skills"


class GrowthAgentSpec(AgentSpec):
    """Growth Agent specialist: turns a run of candidates into a handful of plays."""

    def __init__(self) -> None:
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
        # Workflow code supplies the source rows and owns every side effect. The Skill
        # tool is provided by the runtime when skills are enabled.
        return ToolRegistry()

    def enable_runtime_tools(self) -> bool:
        # Memory search is useful in an open-ended chat but harmful in this bounded
        # workflow step: the complete run is already in the input, and retrieving an
        # older curation can substitute stale org ids while consuming the whole loop.
        return False

    def build_skills(self) -> SkillRegistry:
        if self._skills is None:
            skills = SkillRegistry()
            register_custom_skills(skills, CREW_SKILLS_DIR, SKILLS_DIR)
            self._skills = skills
        return self._skills

    def build_agent_config(self) -> AgentConfig:
        skills = self.build_skills()
        # Three plain text blocks: `cache_control` is Anthropic syntax and Gemini does
        # its own implicit context caching, so there is nothing to annotate — the
        # provider joins these into one system instruction and caches on the prefix
        # being byte-identical. Ordered most stable first for that reason: the role and
        # the company docs never vary, while the playbook list moves whenever a skill is
        # registered, so it goes last where a change costs the least prefix.
        blocks: list[dict[str, Any]] = [
            {"type": "text", "text": build_base_prompt()},
            {"type": "text", "text": build_growth_context()},
            {"type": "text", "text": build_roles_context(skills)},
        ]
        return AgentConfig(
            app_id=self.get_agent_id(),
            system_prompt=blocks,
            # One Skill call and one structured answer, with one spare step for recovery.
            max_steps=3,
            max_tokens=8192,
            conversation_history_turns=3,
            compaction_token_threshold=100000,
            skills_enabled=True,
        )

    def build_subagent_metadata(self) -> AgentMetadata:
        return AgentMetadata(
            display_name="Growth Agent",
            description=(
                "Interprets selected account signals, consolidates them into actionable "
                "plays, and drafts evidence-based copy."
            ),
            capabilities=[
                "retention and expansion judgment",
                "play design and consolidation",
                "evidence-based outreach copywriting",
                "usage and account-context interpretation",
            ],
            usage_guidance=(
                "Delegate growth judgment over supplied account evidence: decide what "
                "action fits, consolidate similar accounts, and draft the copy."
            ),
        )
