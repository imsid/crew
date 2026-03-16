from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import patch

from fastapi.testclient import TestClient
from mash.api import MashHostConfig, create_app
from mash.core.context import Context, Response, ToolCall
from mash.core.llm import LLMProvider

from crew.agents.data.spec import DataAgentSpec
from crew.agents.engineer.spec import EngineerAgentSpec
from crew.agents.pm.spec import PMAgentSpec
from crew.app import build_host


class _FakeUsage:
    input_tokens = 1
    output_tokens = 1


class _FakeResponse:
    def __init__(self, payload: str) -> None:
        self.payload = payload
        self.stop_reason = "end_turn"
        self.usage = _FakeUsage()


class _EchoLLM(LLMProvider):
    def create_message(
        self,
        *,
        model: str,
        system: Any,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        max_tokens: int,
        temperature: float = 1.0,
        betas: Optional[List[str]] = None,
        use_prompt_caching: bool = True,
    ) -> Any:
        del model, system, tools, max_tokens, temperature, betas, use_prompt_caching
        user_text = ""
        for message in reversed(messages):
            if message.get("role") != "user":
                continue
            content = message.get("content")
            if isinstance(content, str):
                user_text = content
                break
        return _FakeResponse(payload=user_text)

    def parse_response(
        self, response: Any
    ) -> Tuple[str, List[ToolCall], List[Dict[str, Any]]]:
        text = f"echo:{response.payload}"
        return text, [], [{"type": "text", "text": text}]

    def set_event_logger(self, logger, session_id: str, app_id: str) -> None:
        del logger, session_id, app_id

    def set_trace_id(self, trace_id: Optional[str]) -> None:
        del trace_id


class _DelegatingLLM(LLMProvider):
    def __init__(self) -> None:
        self._step = 0

    def create_message(
        self,
        *,
        model: str,
        system: Any,
        messages: List[Dict[str, Any]],
        tools: List[Dict[str, Any]],
        max_tokens: int,
        temperature: float = 1.0,
        betas: Optional[List[str]] = None,
        use_prompt_caching: bool = True,
    ) -> Any:
        del model, system, messages, tools, max_tokens, temperature, betas, use_prompt_caching
        self._step += 1
        return _FakeResponse(payload=str(self._step))

    def parse_response(
        self, response: Any
    ) -> Tuple[str, List[ToolCall], List[Dict[str, Any]]]:
        if response.payload == "1":
            arguments = {"agent_id": "data", "prompt": "Summarize the metrics issue."}
            return "", [
                ToolCall(id="delegate-1", name="InvokeSubagent", arguments=arguments)
            ], [
                {
                    "type": "tool_use",
                    "id": "delegate-1",
                    "name": "InvokeSubagent",
                    "input": arguments,
                }
            ]
        return "delegated:data-ok", [], [{"type": "text", "text": "delegated:data-ok"}]

    def set_event_logger(self, logger, session_id: str, app_id: str) -> None:
        del logger, session_id, app_id

    def set_trace_id(self, trace_id: Optional[str]) -> None:
        del trace_id


def _response(text: str) -> Response:
    return Response(
        text=text,
        context=Context(),
        metadata={"token_usage": {"input": 1, "output": 1}},
    )


def _build_test_client(tmp_path: Path) -> TestClient:
    os.environ["GITHUB_REPOS"] = str(tmp_path)
    os.environ["GITHUB_URL"] = "https://github.com/org/repo"
    os.environ["MASH_DATA_DIR"] = str(tmp_path / ".mash")
    host = build_host()
    app = create_app(
        host,
        config=MashHostConfig(observability_memory_db_path=tmp_path / "memory.db"),
    )
    return TestClient(app)


def test_health_lists_pm_primary_and_support_agents(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        EngineerAgentSpec, "build_llm", return_value=_EchoLLM()
    ):
        with _build_test_client(tmp_path) as client:
            health = client.get("/api/v1/health")
            assert health.status_code == 200
            payload = health.json()["data"]
            assert payload["deployment"]["primary_agent_id"] == "pm"
            assert {agent["agent_id"] for agent in payload["deployment"]["agents"]} == {
                "pm",
                "data",
                "engineer",
            }


def test_agents_can_be_invoked_directly(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        EngineerAgentSpec, "build_llm", return_value=_EchoLLM()
    ):
        with _build_test_client(tmp_path) as client:
            pm_invoke = client.post(
                "/api/v1/agents/pm/invoke",
                json={"message": "hello pm", "session_id": "pm-session"},
            )
            assert pm_invoke.status_code == 200
            assert pm_invoke.json()["data"]["response"]["text"] == "echo:hello pm"

            data_invoke = client.post(
                "/api/v1/agents/data/invoke",
                json={"message": "hello data", "session_id": "data-session"},
            )
            assert data_invoke.status_code == 200
            assert data_invoke.json()["data"]["response"]["text"] == "echo:hello data"

            engineer_invoke = client.post(
                "/api/v1/agents/engineer/invoke",
                json={"message": "hello engineer", "session_id": "engineer-session"},
            )
            assert engineer_invoke.status_code == 200
            assert (
                engineer_invoke.json()["data"]["response"]["text"]
                == "echo:hello engineer"
            )


def test_pm_can_delegate_to_data_subagent(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        EngineerAgentSpec, "build_llm", return_value=_EchoLLM()
    ):
        with _build_test_client(tmp_path) as client:
            data_runtime = client.app.state.runtime_state.host.get_agent("data")
            with patch.object(data_runtime.agent, "run", return_value=_response("data-ok")):
                response = client.post(
                    "/api/v1/agents/pm/invoke",
                    json={"message": "please delegate", "session_id": "pm-delegate"},
                )
                assert response.status_code == 200
                assert response.json()["data"]["response"]["text"] == "delegated:data-ok"
