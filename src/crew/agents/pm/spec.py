from __future__ import annotations

from pathlib import Path
from typing import Any

from mash.core.config import AgentConfig
from mash.core.llm import AnthropicProvider, LLMProvider
from mash.runtime import AgentSpec
from mash.skills.registry import SkillRegistry
from mash.tools.registry import ToolRegistry

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
        return AnthropicProvider(api_key=ANTHROPIC_API_KEY, app_id=APP_ID)

    def build_tools(self) -> ToolRegistry:
        return ToolRegistry()

    def build_skills(self) -> SkillRegistry:
        if self._skills is None:
            skills = SkillRegistry()
            for skill in skills.get_custom_skills(SKILLS_DIR):
                skills.register(skill)
            self._skills = skills
        return self._skills

    def build_agent_config(self) -> AgentConfig:
        system_prompt = self.build_system_prompt()
        return AgentConfig(
            app_id=self.get_agent_id(),
            system_prompt=system_prompt,
            model=ANTHROPIC_MODEL,
            max_steps=30,
            max_tokens=4096,
            api_key=ANTHROPIC_API_KEY,
            conversation_history_turns=3,
            compaction_token_threshold=30000,
            skills_enabled=True,
            tool_search_enabled=False,
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
            }
        ]
        return blocks
