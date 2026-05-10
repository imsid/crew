from __future__ import annotations

from contextlib import contextmanager
import json
import os
from pathlib import Path
from typing import Any, Optional
from unittest.mock import patch

from fastapi.testclient import TestClient
from mash.core.context import ToolCall
from mash.core.llm import LLMProvider
from mash.core.llm.types import LLMContentBlock, LLMRequest, LLMResponse, LLMTokenUsage
import pytest

from crew.agents.data.spec import DataAgentSpec
from crew.agents.pm.spec import PMAgentSpec
from crew.beta.app import _normalize_stream_payload, build_beta_app, create_beta_app


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


class _FakeBetaStore:
    last_created: "_FakeBetaStore | None" = None

    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._users: dict[str, dict[str, Any]] = {}
        self._users_by_username: dict[str, str] = {}
        self._sessions: dict[str, dict[str, Any]] = {}
        self.open_called = False
        self.close_called = False
        _FakeBetaStore.last_created = self

    async def open(self) -> None:
        self.open_called = True

    async def close(self) -> None:
        self.close_called = True

    async def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        user = self._users.get(user_id)
        return dict(user) if user is not None else None

    async def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        user_id = self._users_by_username.get(username)
        if user_id is None:
            return None
        return await self.get_user_by_id(user_id)

    async def ensure_user(self, username: str) -> dict[str, Any]:
        normalized = username.strip().lower()
        existing = await self.get_user_by_username(normalized)
        if existing is not None:
            return existing
        payload = {
            "id": f"user-{len(self._users) + 1}",
            "username": normalized,
            "display_name": None,
            "status": "active",
            "created_at": float(len(self._users) + 1),
        }
        self._users[payload["id"]] = payload
        self._users_by_username[normalized] = payload["id"]
        return dict(payload)

    async def create_session(
        self,
        *,
        session_id: str,
        user_id: str,
        agent_id: str,
        label: str | None = None,
    ) -> dict[str, Any]:
        now = float(len(self._sessions) + 1)
        payload = {
            "session_id": session_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "label": label,
            "created_at": now,
            "last_opened_at": now,
        }
        self._sessions[session_id] = payload
        return dict(payload)

    async def get_session(self, session_id: str) -> dict[str, Any] | None:
        session = self._sessions.get(session_id)
        return dict(session) if session is not None else None

    async def touch_session(self, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if session is None:
            return
        session["last_opened_at"] = float(session["last_opened_at"]) + 1000.0

    async def list_sessions_for_user(self, user_id: str) -> list[dict[str, Any]]:
        rows = [
            dict(session)
            for session in self._sessions.values()
            if str(session["user_id"]) == str(user_id)
        ]
        rows.sort(
            key=lambda item: (-float(item["last_opened_at"]), -float(item["created_at"]))
        )
        return rows

    async def list_session_ids_for_user(self, user_id: str) -> set[str]:
        return {
            str(session["session_id"])
            for session in self._sessions.values()
            if str(session["user_id"]) == str(user_id)
        }


class _HostStub:
    def __init__(self) -> None:
        self.started = False
        self.closed = False

    async def start(self) -> None:
        self.started = True

    async def close(self) -> None:
        self.closed = True


@contextmanager
def _build_test_client(tmp_path: Path):
    os.environ["GITHUB_REPOS"] = str(tmp_path)
    os.environ["GITHUB_URL"] = "https://github.com/org/repo"
    os.environ["MASH_DATA_DIR"] = str(tmp_path / ".mash")
    os.environ["CREW_DATABASE_URL"] = "postgresql://beta:test@127.0.0.1:5432/crew_beta"
    os.environ["CREW_BETA_AUTH_SECRET"] = "beta-secret"
    os.environ["CREW_BETA_ALLOWED_USERS"] = "alice,bob"
    _FakeBetaStore.last_created = None
    with patch("crew.beta.app.BetaStore", _FakeBetaStore):
        app = build_beta_app()
        with TestClient(app) as client:
            yield client


def _collect_sse_events(client: TestClient, path: str, *, token: str) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    with client.stream("GET", path, headers={"Authorization": f"Bearer {token}"}) as response:
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


def _login(client: TestClient, username: str) -> tuple[str, dict[str, Any]]:
    response = client.post("/login/handle", json={"username": username})
    assert response.status_code == 200
    payload = response.json()["data"]
    return payload["token"], payload["user"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_build_beta_app_requires_database_url(monkeypatch) -> None:
    monkeypatch.delenv("CREW_DATABASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="CREW_DATABASE_URL"):
        create_beta_app(host=_HostStub())


def test_beta_app_opens_and_closes_store(monkeypatch) -> None:
    monkeypatch.setenv("CREW_DATABASE_URL", "postgresql://beta:test@127.0.0.1:5432/crew_beta")
    monkeypatch.setenv("CREW_BETA_ALLOWED_USERS", "alice")
    monkeypatch.setenv("CREW_BETA_AUTH_SECRET", "beta-secret")

    _FakeBetaStore.last_created = None
    host = _HostStub()
    with patch("crew.beta.app.BetaStore", _FakeBetaStore):
        app = create_beta_app(host=host)
        with TestClient(app) as client:
            assert client.get("/health").status_code == 200
            created = _FakeBetaStore.last_created
            assert created is not None
            assert created.open_called is True
            assert created.close_called is False
            assert host.started is True

        created = _FakeBetaStore.last_created
        assert created is not None
        assert created.close_called is True
        assert host.closed is True


def test_login_and_me_enforce_allowed_handles(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            denied = client.post("/login/handle", json={"username": "mallory"})
            assert denied.status_code == 403

            token, user = _login(client, "@alice")
            me = client.get("/me", headers=_auth_headers(token))
            assert me.status_code == 200
            assert me.json()["data"]["user"]["username"] == "alice"
            assert me.json()["data"]["user"]["id"] == user["id"]


def test_user_sessions_are_private_and_history_proxies(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            alice_token, _ = _login(client, "alice")
            bob_token, _ = _login(client, "bob")

            created = client.post(
                "/sessions",
                json={"label": "Activation chat"},
                headers=_auth_headers(alice_token),
            )
            assert created.status_code == 200
            session_id = created.json()["data"]["session_id"]

            listed = client.get("/sessions", headers=_auth_headers(alice_token))
            assert listed.status_code == 200
            assert [item["session_id"] for item in listed.json()["data"]["sessions"]] == [
                session_id
            ]

            empty_history = client.get(
                f"/sessions/{session_id}/history",
                headers=_auth_headers(alice_token),
            )
            assert empty_history.status_code == 200
            assert empty_history.json()["data"]["turns"] == []

            denied = client.get(
                f"/sessions/{session_id}/history",
                headers=_auth_headers(bob_token),
            )
            assert denied.status_code == 403

            sent = client.post(
                f"/sessions/{session_id}/messages",
                json={"message": "hello crew"},
                headers=_auth_headers(alice_token),
            )
            assert sent.status_code == 200
            request_id = sent.json()["data"]["request_id"]

            events = _collect_sse_events(
                client,
                f"/sessions/{session_id}/requests/{request_id}/events",
                token=alice_token,
            )
            assert events[-1]["event"] == "request.completed"
            assert events[-1]["data"]["response"]["text"] == "echo:hello crew"
            assert events[-1]["data"]["usage"] == {
                "input_tokens": 1,
                "output_tokens": 1,
                "total_tokens": 2,
            }
            assert events[-1]["data"]["runtime_event"]["status"] == "completed"
            assert events[-1]["data"]["runtime_event"]["sequence"] >= 1

            history = client.get(
                f"/sessions/{session_id}/history",
                headers=_auth_headers(alice_token),
            )
            assert history.status_code == 200
            turns = history.json()["data"]["turns"]
            assert len(turns) == 1
            assert turns[0]["user_message"] == "hello crew"
            assert turns[0]["agent_response"] == "echo:hello crew"
            assert turns[0]["usage"] == {
                "input_tokens": 1,
                "output_tokens": 1,
                "total_tokens": 2,
            }

            relisted = client.get("/sessions", headers=_auth_headers(alice_token))
            assert relisted.status_code == 200
            enriched_session = relisted.json()["data"]["sessions"][0]
            assert enriched_session["preview_text"] == "echo:hello crew"
            assert enriched_session["turn_count"] == 1
            assert enriched_session["last_message_at"] is not None


def test_session_search_filters_results_to_owned_sessions(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            alice_token, _ = _login(client, "alice")
            bob_token, _ = _login(client, "bob")

            alice_session = client.post(
                "/sessions",
                json={},
                headers=_auth_headers(alice_token),
            ).json()["data"]["session_id"]
            bob_session = client.post(
                "/sessions",
                json={},
                headers=_auth_headers(bob_token),
            ).json()["data"]["session_id"]

            alice_request = client.post(
                f"/sessions/{alice_session}/messages",
                json={"message": "activation keyword alpha"},
                headers=_auth_headers(alice_token),
            ).json()["data"]["request_id"]
            _collect_sse_events(
                client,
                f"/sessions/{alice_session}/requests/{alice_request}/events",
                token=alice_token,
            )

            bob_request = client.post(
                f"/sessions/{bob_session}/messages",
                json={"message": "activation keyword beta"},
                headers=_auth_headers(bob_token),
            ).json()["data"]["request_id"]
            _collect_sse_events(
                client,
                f"/sessions/{bob_session}/requests/{bob_request}/events",
                token=bob_token,
            )

            own = client.get(
                "/sessions/search",
                params={"q": "alpha"},
                headers=_auth_headers(alice_token),
            )
            assert own.status_code == 200
            own_results = own.json()["data"]["results"]
            assert own_results
            assert all(result["session_id"] == alice_session for result in own_results)

            filtered = client.get(
                "/sessions/search",
                params={"q": "beta"},
                headers=_auth_headers(alice_token),
            )
            assert filtered.status_code == 200
            assert filtered.json()["data"]["results"] == []


def test_command_endpoint_dispatches_surfaces(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")
            headers = _auth_headers(token)

            metrics_list = client.post(
                "/command",
                json={"surface": "metrics", "operation": "list", "args": {}},
                headers=headers,
            )
            assert metrics_list.status_code == 200
            assert metrics_list.json()["surface"] == "metrics"
            assert metrics_list.json()["operation"] == "list"
            assert metrics_list.json()["ok"] is True
            assert metrics_list.json()["data"]["dataset_id"] == "marketing_db"

            metrics_compile = client.post(
                "/command",
                json={
                    "surface": "metrics",
                    "operation": "compile",
                    "args": {"metric_names": ["spend_total"], "dimensions": ["campaign_id"]},
                },
                headers=headers,
            )
            assert metrics_compile.status_code == 200
            assert metrics_compile.json()["data"]["plans"]

            metrics_show = client.post(
                "/command",
                json={
                    "surface": "metrics",
                    "operation": "show",
                    "args": {"kind": "metric", "name": "spend_total"},
                },
                headers=headers,
            )
            assert metrics_show.status_code == 200
            assert metrics_show.json()["data"]["document"]["label"] == "Total Spend"

            experiments_plan = client.post(
                "/command",
                json={
                    "surface": "experiments",
                    "operation": "plan",
                    "args": {"name": "signup_checkout"},
                },
                headers=headers,
            )
            assert experiments_plan.status_code == 200
            assert "experiment_exposures" in json.dumps(experiments_plan.json()["data"])

            experiment_show = client.post(
                "/command",
                json={
                    "surface": "experiments",
                    "operation": "show",
                    "args": {"name": "signup_checkout"},
                },
                headers=headers,
            )
            assert experiment_show.status_code == 200
            assert experiment_show.json()["data"]["document"]["label"] == "Signup Checkout"

            artifact_search = client.post(
                "/command",
                json={
                    "surface": "artifacts",
                    "operation": "search",
                    "args": {"query": "launch readiness", "limit": 5},
                },
                headers=headers,
            )
            assert artifact_search.status_code == 200
            assert artifact_search.json()["data"]["results"][0]["artifact_id"] == "launch_readout_q2"

            skills_list = client.post(
                "/command",
                json={"surface": "skills", "operation": "list", "args": {}},
                headers=headers,
            )
            assert skills_list.status_code == 200
            skills_payload = skills_list.json()["data"]
            assert skills_payload["count"] >= 1
            assert any(item["skill_id"] == "shared--create-artifact" for item in skills_payload["skills"])

            skills_search = client.post(
                "/command",
                json={
                    "surface": "skills",
                    "operation": "search",
                    "args": {"query": "analyst", "limit": 5},
                },
                headers=headers,
            )
            assert skills_search.status_code == 200
            assert skills_search.json()["data"]["results"]

            skills_show = client.post(
                "/command",
                json={
                    "surface": "skills",
                    "operation": "show",
                    "args": {"skill_id": "shared--create-artifact"},
                },
                headers=headers,
            )
            assert skills_show.status_code == 200
            assert skills_show.json()["data"]["frontmatter"]["name"] == "create-artifact"
            assert "data" in skills_show.json()["data"]["used_by"]

            invalid = client.post(
                "/command",
                json={"surface": "metrics", "operation": "delete", "args": {}},
                headers=headers,
            )
            assert invalid.status_code == 400


def test_normalize_stream_payload_adds_structured_trace_step() -> None:
    payload = _normalize_stream_payload(
        event_name="agent.trace",
        payload={
            "event_type": "runtime.llm.think.completed",
            "trace_id": "trace-123",
            "loop_index": 1,
            "step_key": "llm.think.1",
            "payload": {
                "action_type": "tool_call",
                "assistant_text": "Looking up metric definitions.",
                "tool_calls": [
                    {
                        "id": "call-1",
                        "name": "list_metrics_layer_configs",
                        "arguments": {"kind": "metric"},
                    }
                ],
                "token_usage": {"input": 330, "output": 92},
                "duration_ms": 1378,
            },
        },
        sequence=3,
    )

    assert payload["trace"] == {
        "kind": "step",
        "trace_id": "trace-123",
        "step_key": "llm.think.1",
        "step_index": 2,
        "action_type": "tool_call",
        "title": "Calling tools",
        "assistant_text": "Looking up metric definitions.",
        "tool_calls": [
            {
                "id": "call-1",
                "name": "list_metrics_layer_configs",
                "arguments": {"kind": "metric"},
            }
        ],
        "token_usage": {
            "input_tokens": 330,
            "output_tokens": 92,
            "total_tokens": 422,
        },
        "duration_ms": 1378,
    }


def test_normalize_stream_payload_adds_structured_tool_result_trace() -> None:
    payload = _normalize_stream_payload(
        event_name="agent.trace",
        payload={
            "event_type": "runtime.tool.call.completed",
            "trace_id": "trace-123",
            "loop_index": 1,
            "step_key": "tool.call.1.call-1",
            "payload": {
                "tool_call_id": "call-1",
                "tool_name": "list_metrics_layer_configs",
                "duration_ms": 8,
                "result": {
                    "content": [{"type": "text", "text": "ok"}],
                    "is_error": False,
                    "metadata": {"rows": 2},
                },
            },
        },
        sequence=4,
    )

    assert payload["trace"] == {
        "kind": "tool-result",
        "trace_id": "trace-123",
        "step_key": "tool.call.1.call-1",
        "step_index": 2,
        "tool_call_id": "call-1",
        "tool_name": "list_metrics_layer_configs",
        "duration_ms": 8,
        "is_error": False,
        "metadata": {"rows": 2},
    }
