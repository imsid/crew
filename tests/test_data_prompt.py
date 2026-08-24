from __future__ import annotations

from crew.agents.data.spec import DataAgentSpec


def test_data_system_prompt_includes_pm_delegation_guidance() -> None:
    spec = DataAgentSpec()
    prompt_blocks = spec.build_agent_config().system_prompt
    joined = "\n".join(str(block["text"]) for block in prompt_blocks)

    assert "Delegate to the `pm` subagent" in joined
    assert "product framing" in joined
    assert "roadmap trade-offs" in joined
    assert "search artifacts before recreating the work" in joined


def test_data_system_prompt_is_one_plain_block() -> None:
    prompt_blocks = DataAgentSpec().build_agent_config().system_prompt

    assert isinstance(prompt_blocks, list)
    assert len(prompt_blocks) == 1
    # The data agent runs on Gemini: `cache_control` is Anthropic syntax and Gemini
    # caches context implicitly, so the blocks carry none.
    assert "cache_control" not in prompt_blocks[0]
