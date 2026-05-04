from __future__ import annotations

from mash.core.llm import AnthropicProvider
from mash.core.llm.types import LLMToolDefinition
from mash.runtime.host.subagents import build_subagent_prompt_block

from crew.agents.data.spec import DataAgentSpec
from crew.agents.pm.spec import PMAgentSpec


def test_data_system_prompt_includes_pm_delegation_guidance() -> None:
    spec = DataAgentSpec()
    prompt_blocks = spec.build_agent_config().system_prompt
    joined = "\n".join(str(block["text"]) for block in prompt_blocks)

    assert "Delegate to the `pm` subagent" in joined
    assert "product framing" in joined
    assert "roadmap trade-offs" in joined
    assert "search artifacts before recreating the work" in joined


def test_data_system_prompt_uses_one_cached_block_before_runtime_injection() -> None:
    prompt_blocks = DataAgentSpec().build_agent_config().system_prompt

    assert isinstance(prompt_blocks, list)
    assert len(prompt_blocks) == 1
    assert prompt_blocks[0]["cache_control"] == {"type": "ephemeral"}


def test_data_prompt_stays_under_anthropic_cache_block_limit_with_subagents() -> None:
    provider = object.__new__(AnthropicProvider)
    base_prompt = DataAgentSpec().build_agent_config().system_prompt
    runtime_prompt = build_subagent_prompt_block(
        base_prompt,
        {"pm": PMAgentSpec().build_subagent_metadata()},
    )

    translated_system = provider._anthropic_system(runtime_prompt, use_prompt_caching=True)
    translated_tools = provider._anthropic_tools(
        [
            LLMToolDefinition(
                name="example_tool",
                description="Example tool",
                parameters_json_schema={"type": "object", "properties": {}},
            )
        ],
        use_prompt_caching=True,
    )

    system_cache_blocks = sum(
        1 for block in translated_system if block.get("cache_control")
    )
    tool_cache_blocks = sum(1 for tool in translated_tools if tool.get("cache_control"))

    assert system_cache_blocks == 2
    assert tool_cache_blocks == 1
    assert system_cache_blocks + tool_cache_blocks <= 4
