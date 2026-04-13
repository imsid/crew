from __future__ import annotations

from mash.runtime import SubAgentMetadata

from crew.agents.pm.spec import PMAgentSpec


def test_pm_system_prompt_is_role_first_and_lists_skills() -> None:
    spec = PMAgentSpec()
    prompt_blocks = spec.build_system_prompt()
    joined = "\n".join(str(block["text"]) for block in prompt_blocks)

    assert "Product Manager agent" in joined
    assert "AVAILABLE PM ROLES" in joined
    assert "problem-definition" in joined
    assert "prioritizing-roadmap" in joined
    assert "create-artifact" in joined
    assert "Invoke Skill with the matching role before role-specific execution." in joined


def test_pm_system_prompt_excludes_repo_and_github_guidance() -> None:
    spec = PMAgentSpec()
    prompt_blocks = spec.build_system_prompt()
    joined = "\n".join(str(block["text"]) for block in prompt_blocks)

    assert "Repository index" not in joined
    assert "USING THE BASH TOOL" not in joined
    assert "USING GITHUB MCP TOOLS" not in joined


def test_pm_system_prompt_supports_delegated_specialist_mode() -> None:
    spec = PMAgentSpec()
    prompt_blocks = spec.build_system_prompt()
    joined = "\n".join(str(block["text"]) for block in prompt_blocks)

    assert "delegated product specialist" in joined
    assert "product framing, prioritization, trade-offs, and recommendations" in joined
    assert "Delegate to the `data` subagent" not in joined


def test_pm_builds_subagent_metadata() -> None:
    metadata = PMAgentSpec().build_subagent_metadata()

    assert isinstance(metadata, SubAgentMetadata)
    assert metadata.display_name == "Product Management Specialist"
    assert "prioritization" in metadata.description
    assert "trade-off evaluation" in metadata.capabilities
    assert "roadmap decisions" in metadata.usage_guidance
