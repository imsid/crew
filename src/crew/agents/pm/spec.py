from __future__ import annotations

from pathlib import Path
from typing import Any

from mash.core.config import AgentConfig
from mash.core.llm import AnthropicProvider, LLMProvider
from mash.memory.store import SQLiteStore
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
        self._store: SQLiteStore | None = None

    def get_agent_id(self) -> str:
        return APP_ID

    def build_store(self) -> SQLiteStore:
        if self._store is None:
            self._store = SQLiteStore(self.get_agent_data_dir() / "state.db")
        return self._store

    def build_llm(self) -> LLMProvider:
        return AnthropicProvider(
            app_id=APP_ID,
            model=ANTHROPIC_MODEL,
            api_key=ANTHROPIC_API_KEY,
        )

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
            max_steps=30,
            max_tokens=4096,
            conversation_history_turns=3,
            compaction_token_threshold=30000,
            skills_enabled=True,
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
