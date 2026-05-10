from __future__ import annotations

from pathlib import Path
from typing import Any

from mash.core.config import AgentConfig
from mash.core.llm import AnthropicProvider, LLMProvider
from mash.runtime import AgentSpec, SubAgentMetadata
from mash.skills.registry import SkillRegistry
from mash.tools.registry import ToolRegistry

from ...artifacts.tools import build_artifact_tools
from ...shared.runtime_paths import workspace_dir
from ...shared.skills import CREW_SKILLS_DIR, register_custom_skills
from .config import ANTHROPIC_API_KEY, ANTHROPIC_MODEL
from .prompt import build_base_prompt, build_roles_context

APP_ID = "pm"
SKILLS_DIR = Path(__file__).resolve().parent / "skills"


class PMAgentSpec(AgentSpec):
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
        for tool in build_artifact_tools(workspace_dir(require_exists=True)):
            tools.register(tool)
        return tools

    def build_skills(self) -> SkillRegistry:
        if self._skills is None:
            skills = SkillRegistry()
            register_custom_skills(skills, CREW_SKILLS_DIR, SKILLS_DIR)
            self._skills = skills
        return self._skills

    def build_agent_config(self) -> AgentConfig:
        system_prompt = self.build_system_prompt()
        return AgentConfig(
            app_id=self.get_agent_id(),
            system_prompt=system_prompt,
            max_steps=30,
            max_tokens=4096,
            conversation_history_turns=3,
            compaction_token_threshold=30000,
            skills_enabled=True,
        )

    def build_subagent_metadata(self) -> SubAgentMetadata:
        return SubAgentMetadata(
            display_name="Product Management Specialist",
            description=(
                "Handles product framing, prioritization, trade-off analysis, "
                "roadmap questions, and user-signal synthesis."
            ),
            capabilities=[
                "product strategy",
                "prioritization and roadmap analysis",
                "trade-off evaluation",
            ],
            usage_guidance=(
                "Delegate tasks that need product framing, roadmap decisions, "
                "prioritization, or interpretation of user and product signals."
            ),
        )

    def build_system_prompt(self) -> list[dict[str, Any]]:
        skills = self.build_skills()
        blocks: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": build_base_prompt(),
                "cache_control": {"type": "ephemeral"},
            },
            {
                "type": "text",
                "text": build_roles_context(skills),
                "cache_control": {"type": "ephemeral"},
            },
        ]
        return blocks
