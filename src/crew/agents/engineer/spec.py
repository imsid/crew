from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from mash.core.config import AgentConfig
from mash.core.llm import AnthropicProvider, LLMProvider
from mash.mcp import MCPServerConfig
from mash.runtime import AgentSpec
from mash.skills.registry import SkillRegistry
from mash.tools.bash import BashTool
from mash.tools.registry import ToolRegistry

from ...code_index import create_cached_files
from .config import (
    ANTHROPIC_API_KEY,
    ANTHROPIC_MODEL,
    GITHUB_MCP_PAT,
    GITHUB_MCP_URL,
    GITHUB_REPO_PATH,
    GITHUB_REPO_URL,
)
from .prompt import build_base_prompt, build_repo_context

APP_ID = "engineer"
GITHUB_CONNECTION_NAME = "github"


class EngineerAgentSpec(AgentSpec):
    def __init__(self) -> None:
        repo_path = os.getenv("GITHUB_REPOS") or GITHUB_REPO_PATH
        if not repo_path:
            raise ValueError(
                "GITHUB_REPO_PATH must be set in src/crew/agents/engineer/.env"
            )
        raw_repo_path = repo_path.strip()
        self.repo_path = Path(raw_repo_path).resolve()
        github_url = os.getenv("GITHUB_URL") or GITHUB_REPO_URL
        self.github_url = (github_url or "").strip() or None

    def get_agent_id(self) -> str:
        return APP_ID

    def build_llm(self) -> LLMProvider:
        api_key = os.getenv("ANTHROPIC_API_KEY") or ANTHROPIC_API_KEY
        return AnthropicProvider(api_key=api_key, app_id=APP_ID)

    def build_tools(self) -> ToolRegistry:
        tools = ToolRegistry()
        tools.register(BashTool(working_dir=str(self.repo_path)))
        return tools

    def build_skills(self) -> SkillRegistry:
        return SkillRegistry()

    def build_agent_config(self) -> AgentConfig:
        api_key = os.getenv("ANTHROPIC_API_KEY") or ANTHROPIC_API_KEY
        model = os.getenv("ANTHROPIC_MODEL") or ANTHROPIC_MODEL
        return AgentConfig(
            app_id=self.get_agent_id(),
            system_prompt=self.build_system_prompt(),
            model=model,
            max_steps=30,
            max_tokens=4096,
            api_key=api_key,
            conversation_history_turns=3,
            compaction_token_threshold=30000,
            skills_enabled=False,
            tool_search_enabled=False,
        )

    def build_mcp_servers(self) -> list[MCPServerConfig]:
        github_mcp_url = os.getenv("GITHUB_MCP_URL") or GITHUB_MCP_URL
        github_mcp_pat = os.getenv("GITHUB_MCP_PAT") or GITHUB_MCP_PAT
        return [
            MCPServerConfig(
                name=GITHUB_CONNECTION_NAME,
                url=github_mcp_url,
                description="GitHub MCP server for repository inspection",
                headers={"Authorization": f"Bearer {github_mcp_pat}"},
                allowed_tools=[
                    "search_pull_requests",
                    "list_pull_requests",
                    "pull_request_read",
                    "get_commit",
                    "list_commits",
                    "list_issues",
                    "issue_read",
                ],
            )
        ]

    def build_system_prompt(self) -> list[dict[str, Any]]:
        blocks: list[dict[str, Any]] = [
            {
                "type": "text",
                "text": build_base_prompt(
                    repo=str(self.repo_path),
                    github_url=self.github_url,
                ),
                "cache_control": {"type": "ephemeral"},
            }
        ]
        repo_context = build_repo_context(
            repo=str(self.repo_path),
            cached_files=create_cached_files(str(self.repo_path)),
        )
        if repo_context:
            blocks.append(
                {
                    "type": "text",
                    "text": repo_context,
                    "cache_control": {"type": "ephemeral"},
                }
            )
        return blocks
