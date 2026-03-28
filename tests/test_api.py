from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import patch

from fastapi.testclient import TestClient
from mash.agents import MasherAgentSpec
from mash.api import MashHostConfig, create_app
from mash.core.context import Context, Response, ToolCall
from mash.core.llm import LLMProvider
from mash.core.llm.types import LLMContentBlock, LLMRequest, LLMResponse, LLMTokenUsage

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
    @property
    def model(self) -> str:
        return "test-model"

    def send(self, request: LLMRequest) -> LLMResponse:
        user_text = ""
        for message in reversed(request.messages):
            if message.role != "user":
                continue
            for block in message.content:
                if block.type == "text":
                    user_text = str(block.data.get("text", ""))
                    break
            if user_text:
                break
        text = f"echo:{user_text}"
        return LLMResponse(
            text=text,
            tool_calls=[],
            content_blocks=[LLMContentBlock.text(text)],
            stop_reason="end_turn",
            usage=LLMTokenUsage(input_tokens=1, output_tokens=1, total_tokens=2),
        )

    def set_event_logger(self, logger, session_id: str, app_id: str) -> None:
        del logger, session_id, app_id

    def set_trace_id(self, trace_id: Optional[str]) -> None:
        del trace_id


class _DelegatingLLM(LLMProvider):
    def __init__(self) -> None:
        self._step = 0

    @property
    def model(self) -> str:
        return "test-model"

    def send(self, request: LLMRequest) -> LLMResponse:
        del request
        self._step += 1
        if self._step == 1:
            arguments = {"agent_id": "data", "prompt": "Summarize the metrics issue."}
            return LLMResponse(
                text="",
                tool_calls=[
                    ToolCall(id="delegate-1", name="InvokeSubagent", arguments=arguments)
                ],
                content_blocks=[
                    LLMContentBlock.tool_call(
                        tool_call_id="delegate-1",
                        name="InvokeSubagent",
                        arguments=arguments,
                    )
                ],
                stop_reason="tool_use",
                usage=LLMTokenUsage(input_tokens=1, output_tokens=1, total_tokens=2),
            )
        text = "delegated:data-ok"
        return LLMResponse(
            text=text,
            tool_calls=[],
            content_blocks=[LLMContentBlock.text(text)],
            stop_reason="end_turn",
            usage=LLMTokenUsage(input_tokens=1, output_tokens=1, total_tokens=2),
        )

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
    ), patch.object(
        MasherAgentSpec, "build_llm", return_value=_EchoLLM()
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
                "masher",
            }


def test_agents_can_be_invoked_directly(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        EngineerAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        MasherAgentSpec, "build_llm", return_value=_EchoLLM()
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

            masher_invoke = client.post(
                "/api/v1/agents/masher/invoke",
                json={"message": "hello masher", "session_id": "masher-session"},
            )
            assert masher_invoke.status_code == 200
            assert masher_invoke.json()["data"]["response"]["text"] == "echo:hello masher"


def test_pm_can_delegate_to_data_subagent(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        EngineerAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        MasherAgentSpec, "build_llm", return_value=_EchoLLM()
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


def test_telemetry_events_are_read_from_agent_store(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        EngineerAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        MasherAgentSpec, "build_llm", return_value=_EchoLLM()
    ):
        with _build_test_client(tmp_path) as client:
            runtime = client.app.state.runtime_state.host.get_agent("pm")
            runtime.store.save_logs(
                [
                    {
                        "app_id": "pm",
                        "session_id": "pm-session",
                        "trace_id": "trace-1",
                        "event_class": "AgentTraceEvent",
                        "event_type": "agent.run.start",
                        "created_at": 1.0,
                        "payload": {"payload": {"step": 1}},
                    }
                ]
            )

            response = client.get("/api/v1/telemetry/events", params={"agent_id": "pm"})
            assert response.status_code == 200
            payload = response.json()["data"]
            assert payload["path"].endswith("/pm/state.db")
            assert payload["events"][0]["event_type"] == "agent.run.start"
            assert payload["events"][0]["payload"]["step"] == 1
            assert "log_id" not in payload["events"][0]


def test_pm_invoke_persists_unused_tool_signals(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        EngineerAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(
        MasherAgentSpec, "build_llm", return_value=_EchoLLM()
    ):
        with _build_test_client(tmp_path) as client:
            runtime = client.app.state.runtime_state.host.get_agent("pm")
            response = client.post(
                "/api/v1/agents/pm/invoke",
                json={"message": "capture signals", "session_id": "pm-signals"},
            )
            assert response.status_code == 200

            payload = response.json()["data"]
            signals = payload["response"]["signals"]
            assert isinstance(signals["unused_tools"], list)
            assert signals["unused_tools"]
            assert int(signals["unused_tool_tokens"]) > 0

            turns = runtime.store.get_turns(session_id="pm-signals", limit=1)
            assert len(turns) == 1
            assert turns[0]["signals"]["unused_tools"] == signals["unused_tools"]
            assert int(turns[0]["signals"]["unused_tool_tokens"]) == int(
                signals["unused_tool_tokens"]
            )
