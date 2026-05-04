from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional
from unittest.mock import patch

from fastapi.testclient import TestClient
from mash.api import MashHostConfig, create_app
from mash.core.context import ToolCall
from mash.core.llm import LLMProvider
from mash.core.llm.types import LLMContentBlock, LLMRequest, LLMResponse, LLMTokenUsage

from crew.agents.data.spec import DataAgentSpec
from crew.agents.pm.spec import PMAgentSpec
from crew.app import build_host


class _EchoLLM(LLMProvider):
    @property
    def model(self) -> str:
        return "test-model"

    async def send(self, request: LLMRequest) -> LLMResponse:
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

    async def send(self, request: LLMRequest) -> LLMResponse:
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
                stop_reason="tool_call",
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


def _build_test_client(tmp_path: Path) -> TestClient:
    os.environ["GITHUB_REPOS"] = str(tmp_path)
    os.environ["GITHUB_URL"] = "https://github.com/org/repo"
    os.environ["MASH_DATA_DIR"] = str(tmp_path / ".mash")
    os.environ["MASH_RUNTIME_DATABASE_URL"] = "postgresql://test/runtime"
    os.environ["DBOS_CONDUCTOR_KEY"] = "test-conductor-key"
    host = build_host()
    app = create_app(host, config=MashHostConfig())
    return TestClient(app)


def _collect_sse_events(client: TestClient, path: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    with client.stream("GET", path) as response:
        assert response.status_code == 200
        event_name: str | None = None
        data_lines: list[str] = []
        for raw_line in response.iter_lines():
            line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else raw_line
            if line is None:
                continue
            stripped = line.strip()
            if not stripped:
                if event_name and data_lines:
                    import json

                    events.append(
                        {
                            "event": event_name,
                            "data": json.loads("\n".join(data_lines)),
                        }
                    )
                    if event_name in {"request.completed", "request.error"}:
                        break
                event_name = None
                data_lines = []
                continue
            if stripped.startswith(":"):
                continue
            if stripped.startswith("event:"):
                event_name = stripped[6:].strip()
                continue
            if stripped.startswith("data:"):
                data_lines.append(stripped[5:].strip())
    return events


def _invoke_via_request(
    client: TestClient,
    *,
    agent_id: str,
    message: str,
    session_id: str,
) -> tuple[str, list[dict[str, Any]], dict[str, Any]]:
    accepted = client.post(
        f"/api/v1/agent/{agent_id}/request",
        json={"message": message, "session_id": session_id},
    )
    assert accepted.status_code == 200
    request_id = accepted.json()["data"]["request_id"]
    events = _collect_sse_events(
        client,
        f"/api/v1/agent/{agent_id}/request/{request_id}/events",
    )
    assert events
    terminal = events[-1]
    assert terminal["event"] == "request.completed"
    return request_id, events, terminal["data"]


def test_health_lists_data_primary_and_support_agents(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            health = client.get("/api/v1/health")
            assert health.status_code == 200
            payload = health.json()["data"]
            assert payload["deployment"]["primary_agent_id"] == "data"
            assert {agent["agent_id"] for agent in payload["deployment"]["agents"]} == {
                "pm",
                "data",
                "masher",
            }


def test_agents_can_be_invoked_via_request_stream(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            _, pm_events, pm_result = _invoke_via_request(
                client,
                agent_id="pm",
                message="hello pm",
                session_id="pm-session",
            )
            assert any(event["event"] == "request.accepted" for event in pm_events)
            assert pm_result["response"]["text"] == "echo:hello pm"

            _, _, data_result = _invoke_via_request(
                client,
                agent_id="data",
                message="hello data",
                session_id="data-session",
            )
            assert data_result["response"]["text"] == "echo:hello data"


def test_pm_can_delegate_to_data_subagent(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            _, events, result = _invoke_via_request(
                client,
                agent_id="pm",
                message="please delegate",
                session_id="pm-delegate",
            )
            assert result["response"]["text"] == "delegated:data-ok"
            trace_event_types = [
                event["data"].get("event_type")
                for event in events
                if event["event"] == "agent.trace"
            ]
            assert "runtime.subagent.call.completed" in trace_event_types


def test_telemetry_events_are_read_from_runtime_store(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            _invoke_via_request(
                client,
                agent_id="pm",
                message="record telemetry",
                session_id="pm-session",
            )

            response = client.get("/api/v1/telemetry/events", params={"agent_id": "pm"})
            assert response.status_code == 200
            payload = response.json()["data"]
            assert payload["source"] == "runtime_event_log"
            assert payload["agent_id"] == "pm"
            assert any(
                event["event_type"] == "runtime.request.accepted"
                for event in payload["events"]
            )
            assert all("event_id" in event for event in payload["events"])
            assert all("log_id" not in event for event in payload["events"])


def test_pm_request_persists_unused_tool_signals(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            _, _, payload = _invoke_via_request(
                client,
                agent_id="pm",
                message="capture signals",
                session_id="pm-signals",
            )
            signals = payload["response"]["signals"]
            assert isinstance(signals["unused_tools"], list)
            assert signals["unused_tools"]
            assert int(signals["unused_tool_tokens"]) > 0

            history = client.get("/api/v1/agent/pm/sessions/pm-signals/history")
            assert history.status_code == 200
            turns = history.json()["data"]["turns"]
            assert len(turns) == 1
            assert turns[0]["signals"]["unused_tools"] == signals["unused_tools"]
            assert int(turns[0]["signals"]["unused_tool_tokens"]) == int(
                signals["unused_tool_tokens"]
            )
