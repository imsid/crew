from __future__ import annotations

from mash.runtime import SubAgentMetadata

ENGINEER_AGENT_ID = "engineer"


def build_engineer_agent_metadata() -> SubAgentMetadata:
    return SubAgentMetadata(
        display_name="Engineering Specialist",
        description=(
            "Handles repository and implementation questions using local code inspection, "
            "bash search, and GitHub MCP tools."
        ),
        capabilities=[
            "repository exploration",
            "implementation tracing",
            "GitHub history and issue inspection",
        ],
        usage_guidance=(
            "Use for codebase structure, feature implementation details, debugging paths, "
            "and repository or GitHub questions."
        ),
    )
