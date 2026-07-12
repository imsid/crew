from __future__ import annotations

from contextlib import ExitStack, contextmanager
import json
import os
import re
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Optional
from unittest.mock import patch

from fastapi.testclient import TestClient
from mash.agents.masher.spec import EvalAgentSpec, EvalJudgeAgentSpec
from mash.core.context import ToolCall
from mash.core.llm import LLMProvider
from mash.core.llm.types import LLMContentBlock, LLMRequest, LLMResponse, LLMTokenUsage
from mash.workflows.service import (
    DuplicateWorkflowRunError,
    WorkflowNotFoundError,
    WorkflowRun,
    WorkflowService,
)
import pytest

from crew.agents.data.spec import DataAgentSpec
from crew.agents.pm.spec import PMAgentSpec
from crew.beta.app import build_beta_app, create_beta_app
from crew.beta.routes.sessions import _normalize_stream_payload
from crew.shared.runtime_context import get_runtime_context
from tests.memory_fakes import InMemoryMemoryStore


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
        workspace_id: str,
        session_id: str,
        user_id: str,
        agent_id: str,
        label: str | None = None,
    ) -> dict[str, Any]:
        now = float(len(self._sessions) + 1)
        payload = {
            "workspace_id": workspace_id,
            "session_id": session_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "label": label,
            "created_at": now,
            "last_opened_at": now,
        }
        self._sessions[session_id] = payload
        return dict(payload)

    async def get_session(
        self, *, workspace_id: str, session_id: str
    ) -> dict[str, Any] | None:
        session = self._sessions.get(session_id)
        if session is None or str(session.get("workspace_id")) != str(workspace_id):
            return None
        return dict(session)

    async def get_workspace_for_session(self, session_id: str) -> str | None:
        session = self._sessions.get(session_id)
        return str(session["workspace_id"]) if session else None

    async def touch_session(self, *, workspace_id: str, session_id: str) -> None:
        session = self._sessions.get(session_id)
        if session is None or str(session.get("workspace_id")) != str(workspace_id):
            return
        session["last_opened_at"] = float(session["last_opened_at"]) + 1000.0

    async def list_sessions_for_user(
        self, *, workspace_id: str, user_id: str
    ) -> list[dict[str, Any]]:
        rows = [
            dict(session)
            for session in self._sessions.values()
            if str(session["workspace_id"]) == str(workspace_id)
            and str(session["user_id"]) == str(user_id)
        ]
        rows.sort(
            key=lambda item: (-float(item["last_opened_at"]), -float(item["created_at"]))
        )
        return rows

    async def list_session_ids_for_user(
        self, *, workspace_id: str, user_id: str
    ) -> set[str]:
        return {
            str(session["session_id"])
            for session in self._sessions.values()
            if str(session["workspace_id"]) == str(workspace_id)
            and str(session["user_id"]) == str(user_id)
        }

class _HostStub:
    def __init__(self) -> None:
        self.started = False
        self.closed = False
        self._runtime = SimpleNamespace(tools=_ToolRegistryStub())

    def get_primary_agent_id(self) -> str:
        return "data"

    def configure_runtime_database_url(self, _database_url) -> None:
        return None

    def define_host(self, host):
        assert host.host_id == "datasquad"
        return host

    async def submit_host_request(self, host_id, *, message, session_id, structured_output=None):
        return {"request_id": "req-1", "agent_id": "data", "session_id": session_id}

    def get_host(self, host_id: str):
        assert host_id == "datasquad"
        return SimpleNamespace(primary="data", subagents=("pm",), workflows=())

    def get_registered_agent_spec(self, agent_id: str):
        del agent_id
        return None

    def get_agent(self, agent_id: str):
        assert agent_id == "data"
        return self._runtime

    async def start(self) -> None:
        self.started = True

    async def close(self) -> None:
        self.closed = True


class _ToolRegistryStub:
    def __init__(self) -> None:
        self.tools: dict[str, Any] = {}

    def unregister(self, name: str) -> None:
        self.tools.pop(name, None)

    def register(self, tool: Any) -> None:
        self.tools[tool.name] = tool


@contextmanager
def _build_test_client(tmp_path: Path):
    os.environ["GITHUB_REPOS"] = str(tmp_path)
    os.environ["GITHUB_URL"] = "https://github.com/org/repo"
    os.environ["MASH_DATA_DIR"] = str(tmp_path / ".mash")
    os.environ["CREW_DATABASE_URL"] = "postgresql://beta:test@127.0.0.1:5432/crew_beta"
    os.environ["CREW_BETA_AUTH_SECRET"] = "beta-secret"
    os.environ["CREW_BETA_ALLOWED_USERS"] = "alice,bob"
    _FakeBetaStore.last_created = None

    def _memory_store(self):
        return InMemoryMemoryStore()

    with ExitStack() as stack:
        stack.enter_context(patch("crew.beta.app.BetaStore", _FakeBetaStore))
        stack.enter_context(
            patch.object(DataAgentSpec, "build_memory_store", _memory_store)
        )
        stack.enter_context(
            patch.object(PMAgentSpec, "build_memory_store", _memory_store)
        )
        stack.enter_context(
            patch.object(EvalAgentSpec, "build_memory_store", _memory_store)
        )
        stack.enter_context(
            patch.object(EvalJudgeAgentSpec, "build_memory_store", _memory_store)
        )
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


def _write_artifact_workspace(root: Path) -> None:
    artifacts_root = root / "marketing_db" / "artifacts"
    artifacts_root.mkdir(parents=True, exist_ok=True)
    (artifacts_root / "launch_readout_q2.md").write_text(
        """---
artifact_id: launch_readout_q2
source_agent: pm
title: Q2 Launch Readout
description: Launch readiness and early performance summary.
kind: readout
session_id: pm-session-1
updated_at: 2026-04-05T12:00:00Z
---

## Summary

Launch readiness was green across paid and lifecycle channels.

## Next Steps

- Review week-two retention.
""",
        encoding="utf-8",
    )
    _write_html_artifact(artifacts_root)


def _write_named_artifact_workspace(root: Path, workspace_id: str, artifact_id: str) -> None:
    artifacts_root = root / workspace_id / "artifacts"
    artifacts_root.mkdir(parents=True, exist_ok=True)
    (artifacts_root / f"{artifact_id}.md").write_text(
        f"""---
artifact_id: {artifact_id}
source_agent: data
title: {workspace_id} Readout
description: Workspace-specific artifact.
kind: readout
session_id: session-1
updated_at: 2026-04-05T12:00:00Z
---

## Summary

This artifact belongs to {workspace_id}.

## Next Steps

- Keep this workspace isolated.
""",
        encoding="utf-8",
    )


def _write_html_artifact(artifacts_root: Path) -> None:
    (artifacts_root / "launch_dashboard_q2.html").write_text(
        """---
artifact_id: launch_dashboard_q2
format: html
source_agent: pm
title: Q2 Launch Dashboard
description: Interactive launch dashboard with inline layout.
kind: readout
session_id: pm-session-2
updated_at: 2026-04-06T12:00:00Z
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Q2 Launch Dashboard</title>
  </head>
  <body>
    <main>
      <h1>Q2 Launch Dashboard</h1>
      <p>Activation improved 12% week over week.</p>
    </main>
  </body>
</html>
""",
        encoding="utf-8",
    )


def _login(client: TestClient, username: str) -> tuple[str, dict[str, Any]]:
    response = client.post("/login/handle", json={"username": username})
    assert response.status_code == 200
    payload = response.json()["data"]
    return payload["token"], payload["user"]


def _auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_workspace_endpoints_list_and_validate_workspaces(tmp_path: Path) -> None:
    workspace_root = tmp_path / "workspace"
    (workspace_root / "marketing_db").mkdir(parents=True)
    (workspace_root / "sales_db").mkdir()
    (workspace_root / ".hidden").mkdir()

    with patch.dict("os.environ", {"CREW_WORKSPACE_ROOT": str(workspace_root)}, clear=False):
        with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
            DataAgentSpec, "build_llm", return_value=_EchoLLM()
        ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
            with _build_test_client(tmp_path) as client:
                token, _ = _login(client, "alice")
                headers = _auth_headers(token)

                response = client.get("/workspace", headers=headers)
                assert response.status_code == 200
                assert [
                    item["workspace_id"]
                    for item in response.json()["data"]["workspaces"]
                ] == ["marketing_db", "sales_db"]

                detail = client.get("/workspace/sales_db", headers=headers)
                assert detail.status_code == 200
                assert detail.json()["data"]["dataset_id"] == "sales_db"

                missing = client.get("/workspace/missing", headers=headers)
                assert missing.status_code == 404
                assert missing.json()["error"]["code"] == "WORKSPACE_NOT_FOUND"


def test_workspace_scoped_sessions_and_artifacts_are_isolated(tmp_path: Path) -> None:
    workspace_root = tmp_path / "workspace"
    _write_named_artifact_workspace(workspace_root, "marketing_db", "marketing_readout")
    _write_named_artifact_workspace(workspace_root, "sales_db", "sales_readout")

    with patch.dict("os.environ", {"CREW_WORKSPACE_ROOT": str(workspace_root)}, clear=False):
        with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
            DataAgentSpec, "build_llm", return_value=_EchoLLM()
        ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
            with _build_test_client(tmp_path) as client:
                token, _ = _login(client, "alice")
                headers = _auth_headers(token)

                marketing_session = client.post(
                    "/workspace/marketing_db/sessions",
                    json={"label": "Marketing"},
                    headers=headers,
                )
                assert marketing_session.status_code == 200
                session_id = marketing_session.json()["data"]["session_id"]
                assert marketing_session.json()["data"]["workspace_id"] == "marketing_db"

                sales_sessions = client.get(
                    "/workspace/sales_db/sessions",
                    headers=headers,
                )
                assert sales_sessions.status_code == 200
                assert sales_sessions.json()["data"]["sessions"] == []

                wrong_workspace = client.get(
                    f"/workspace/sales_db/sessions/{session_id}",
                    headers=headers,
                )
                assert wrong_workspace.status_code == 404

                marketing_artifacts = client.post(
                    "/workspace/marketing_db/command",
                    json={"surface": "artifacts", "operation": "list", "args": {}},
                    headers=headers,
                )
                assert marketing_artifacts.status_code == 200
                assert [
                    item["artifact_id"]
                    for item in marketing_artifacts.json()["data"]["artifacts"]
                ] == ["marketing_readout"]

                sales_artifacts = client.post(
                    "/workspace/sales_db/command",
                    json={"surface": "artifacts", "operation": "list", "args": {}},
                    headers=headers,
                )
                assert sales_artifacts.status_code == 200
                assert [
                    item["artifact_id"]
                    for item in sales_artifacts.json()["data"]["artifacts"]
                ] == ["sales_readout"]


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
            context = get_runtime_context()
            assert context.store is created
            assert context.host is host
            assert context.primary_agent_id == "data"

        created = _FakeBetaStore.last_created
        assert created is not None
        assert created.close_called is True
        with pytest.raises(RuntimeError, match="runtime context"):
            get_runtime_context()
        assert host.closed is True


def test_admin_dashboard_is_served_at_root(monkeypatch) -> None:
    from mash.api.admin_ui import admin_assets_available

    if not admin_assets_available():
        pytest.skip("packaged mash admin UI assets are not available")

    monkeypatch.setenv("CREW_DATABASE_URL", "postgresql://beta:test@127.0.0.1:5432/crew_beta")
    monkeypatch.setenv("CREW_BETA_ALLOWED_USERS", "alice")
    monkeypatch.setenv("CREW_BETA_AUTH_SECRET", "beta-secret")

    _FakeBetaStore.last_created = None
    host = _HostStub()
    with patch("crew.beta.app.BetaStore", _FakeBetaStore):
        app = create_beta_app(host=host)
        with TestClient(app) as client:
            # The mash admin SPA bundle uses absolute paths (/admin/assets,
            # /api/v1, /telemetry), so it must be reachable at root rather than
            # nested under /host to load.
            index = client.get("/admin")
            assert index.status_code == 200
            assert "/admin/assets/" in index.text

            asset_match = re.search(r'/admin/assets/[^"]+\.js', index.text)
            assert asset_match is not None
            # The bundle's absolute asset path resolves at root, so the SPA's
            # other absolute calls (/api/v1, /telemetry) — served by the same
            # root mount — load too.
            assert client.get(asset_match.group(0)).status_code == 200

            # The CLI's /host mount of the same mash app is unaffected.
            assert client.get("/host/admin").status_code == 200


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
                "/workspace/marketing_db/sessions",
                json={"label": "Activation chat"},
                headers=_auth_headers(alice_token),
            )
            assert created.status_code == 200
            session_id = created.json()["data"]["session_id"]

            listed = client.get("/workspace/marketing_db/sessions", headers=_auth_headers(alice_token))
            assert listed.status_code == 200
            assert [item["session_id"] for item in listed.json()["data"]["sessions"]] == [
                session_id
            ]

            empty_history = client.get(
                f"/workspace/marketing_db/sessions/{session_id}/history",
                headers=_auth_headers(alice_token),
            )
            assert empty_history.status_code == 200
            assert empty_history.json()["data"]["turns"] == []

            denied = client.get(
                f"/workspace/marketing_db/sessions/{session_id}/history",
                headers=_auth_headers(bob_token),
            )
            assert denied.status_code == 403

            sent = client.post(
                f"/workspace/marketing_db/sessions/{session_id}/messages",
                json={"message": "hello crew"},
                headers=_auth_headers(alice_token),
            )
            assert sent.status_code == 200
            request_id = sent.json()["data"]["request_id"]

            events = _collect_sse_events(
                client,
                f"/workspace/marketing_db/sessions/{session_id}/requests/{request_id}/events",
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
                f"/workspace/marketing_db/sessions/{session_id}/history",
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

            relisted = client.get("/workspace/marketing_db/sessions", headers=_auth_headers(alice_token))
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
                "/workspace/marketing_db/sessions",
                json={},
                headers=_auth_headers(alice_token),
            ).json()["data"]["session_id"]
            bob_session = client.post(
                "/workspace/marketing_db/sessions",
                json={},
                headers=_auth_headers(bob_token),
            ).json()["data"]["session_id"]

            alice_request = client.post(
                f"/workspace/marketing_db/sessions/{alice_session}/messages",
                json={"message": "activation keyword alpha"},
                headers=_auth_headers(alice_token),
            ).json()["data"]["request_id"]
            _collect_sse_events(
                client,
                f"/workspace/marketing_db/sessions/{alice_session}/requests/{alice_request}/events",
                token=alice_token,
            )

            bob_request = client.post(
                f"/workspace/marketing_db/sessions/{bob_session}/messages",
                json={"message": "activation keyword beta"},
                headers=_auth_headers(bob_token),
            ).json()["data"]["request_id"]
            _collect_sse_events(
                client,
                f"/workspace/marketing_db/sessions/{bob_session}/requests/{bob_request}/events",
                token=bob_token,
            )

            own = client.get(
                "/workspace/marketing_db/sessions/search",
                params={"q": "alpha"},
                headers=_auth_headers(alice_token),
            )
            assert own.status_code == 200
            own_results = own.json()["data"]["results"]
            assert own_results
            assert all(result["session_id"] == alice_session for result in own_results)

            filtered = client.get(
                "/workspace/marketing_db/sessions/search",
                params={"q": "beta"},
                headers=_auth_headers(alice_token),
            )
            assert filtered.status_code == 200
            assert filtered.json()["data"]["results"] == []


def test_session_history_turn_trace_can_be_loaded_from_runtime_store(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")

            created = client.post(
                "/workspace/marketing_db/sessions",
                json={"label": "Trace hydration"},
                headers=_auth_headers(token),
            )
            assert created.status_code == 200
            session_id = created.json()["data"]["session_id"]

            sent = client.post(
                f"/workspace/marketing_db/sessions/{session_id}/messages",
                json={"message": "trace me"},
                headers=_auth_headers(token),
            )
            assert sent.status_code == 200
            request_id = sent.json()["data"]["request_id"]
            _collect_sse_events(
                client,
                f"/workspace/marketing_db/sessions/{session_id}/requests/{request_id}/events",
                token=token,
            )

            history = client.get(
                f"/workspace/marketing_db/sessions/{session_id}/history",
                headers=_auth_headers(token),
            )
            assert history.status_code == 200
            turn_id = history.json()["data"]["turns"][0]["turn_id"]

            trace = client.get(
                f"/workspace/marketing_db/sessions/{session_id}/turns/{turn_id}/trace",
                headers=_auth_headers(token),
            )
            assert trace.status_code == 200
            payload = trace.json()["data"]
            assert payload["source"] == "runtime_event_log"
            assert payload["session_id"] == session_id
            assert payload["turn_id"] == turn_id
            assert payload["trace"]["trace_id"] == turn_id
            assert payload["trace"]["status"] == "completed"
            assert payload["trace"]["steps"]
            assert payload["trace"]["steps"][0]["title"]


def test_workflow_endpoints_are_authenticated_and_use_host_service(
    tmp_path: Path,
) -> None:
    captured: dict[str, object] = {}

    async def fake_run_workflow(
        self,
        workflow_id: str,
        *,
        dedup_key: str | None = None,
        workflow_input: dict[str, Any] | None = None,
    ):
        del self
        captured["run"] = {
            "workflow_id": workflow_id,
            "dedup_key": dedup_key,
            "workflow_input": workflow_input,
        }
        return SimpleNamespace(
            run_id="mw:h_test:masher-trace-digest:abc",
            workflow_id=workflow_id,
            status="queued",
        )

    async def fake_get_run(self, workflow_id: str, run_id: str):
        del self
        captured["status"] = {"workflow_id": workflow_id, "run_id": run_id}
        return SimpleNamespace(
            run_id=run_id,
            workflow_id=workflow_id,
            dedup_key="trace-123",
            status="completed",
            created_at=1.0,
            started_at=2.0,
            finished_at=3.0,
            error=None,
            workflow_input={"mode": "trace", "session_id": "s1", "trace_id": "t1"},
            session_id=None,
            result={"processed_trace_count": 1},
            steps=[{"step_id": "append-digests", "status": "completed"}],
        )

    async def fake_list_runs(
        self,
        workflow_id: str,
        *,
        status: str | None = None,
        start_time: str | None = None,
        end_time: str | None = None,
        limit: int = 50,
        offset: int = 0,
        sort_desc: bool = True,
    ):
        del self, status, start_time, end_time, offset, sort_desc
        captured["runs"] = {"workflow_id": workflow_id, "limit": limit}
        return [
            SimpleNamespace(
                run_id="mw:h_test:masher-trace-digest:latest",
                workflow_id=workflow_id,
                dedup_key=None,
                status="completed",
                created_at=4.0,
                started_at=5.0,
                finished_at=6.0,
                error=None,
            )
        ]

    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]), patch.object(
        WorkflowService, "run_workflow", fake_run_workflow
    ), patch.object(
        WorkflowService, "get_run", fake_get_run
    ), patch.object(
        WorkflowService, "list_runs", fake_list_runs
    ):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")

            workflows = client.get("/workspace/marketing_db/workflow", headers=_auth_headers(token))
            assert workflows.status_code == 200
            listed = {
                workflow["workflow_id"]: workflow
                for workflow in workflows.json()["data"]["workflows"]
            }
            assert listed["masher-trace-digest"]["step_kinds"] == {
                "code": 3,
                "agent": 0,
            }

            unauthorized = client.get("/workspace/marketing_db/workflow")
            assert unauthorized.status_code == 401

            started = client.post(
                "/workspace/marketing_db/workflow/masher-trace-digest/run",
                json={
                    "dedup_key": "trace-123",
                    "input": {
                        "mode": "trace",
                        "session_id": "s1",
                        "trace_id": "t1",
                    },
                },
                headers=_auth_headers(token),
            )
            assert started.status_code == 200
            assert started.json()["data"] == {
                "run_id": "mw:h_test:masher-trace-digest:abc",
                "workflow_id": "masher-trace-digest",
                "status": "queued",
            }
            assert captured["run"] == {
                "workflow_id": "masher-trace-digest",
                "dedup_key": "trace-123",
                "workflow_input": {
                    "mode": "trace",
                    "session_id": "s1",
                    "trace_id": "t1",
                },
            }

            status = client.get(
                "/workspace/marketing_db/workflow/masher-trace-digest/runs/mw:h_test:masher-trace-digest:abc",
                headers=_auth_headers(token),
            )
            assert status.status_code == 200
            assert status.json()["data"]["result"] == {"processed_trace_count": 1}
            assert status.json()["data"]["steps"] == [
                {"step_id": "append-digests", "status": "completed"}
            ]
            assert captured["status"] == {
                "workflow_id": "masher-trace-digest",
                "run_id": "mw:h_test:masher-trace-digest:abc",
            }

            runs = client.get(
                "/workspace/marketing_db/workflow/masher-trace-digest/runs?limit=5",
                headers=_auth_headers(token),
            )
            assert runs.status_code == 200
            assert runs.json()["data"] == {
                "workflow_id": "masher-trace-digest",
                "runs": [
                    {
                        "run_id": "mw:h_test:masher-trace-digest:latest",
                        "workflow_id": "masher-trace-digest",
                        "dedup_key": None,
                        "status": "completed",
                        "created_at": 4.0,
                        "started_at": 5.0,
                        "finished_at": 6.0,
                        "error": None,
                    }
                ],
                "limit": 5,
                "offset": 0,
                "has_more": False,
            }
            # The route over-fetches by one to compute has_more.
            assert captured["runs"] == {
                "workflow_id": "masher-trace-digest",
                "limit": 6,
            }


def test_workflow_trace_uses_session_turn_trace_endpoint(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")
            headers = _auth_headers(token)
            created = client.post(
                "/workspace/marketing_db/sessions",
                json={"label": "Workflow trace source"},
                headers=headers,
            )
            session_id = created.json()["data"]["session_id"]
            sent = client.post(
                f"/workspace/marketing_db/sessions/{session_id}/messages",
                json={"message": "trace me"},
                headers=headers,
            )
            request_id = sent.json()["data"]["request_id"]
            _collect_sse_events(
                client,
                f"/workspace/marketing_db/sessions/{session_id}/requests/{request_id}/events",
                token=token,
            )
            history = client.get(f"/workspace/marketing_db/sessions/{session_id}/history", headers=headers)
            trace_id = history.json()["data"]["turns"][0]["turn_id"]

            response = client.get(
                f"/workspace/marketing_db/sessions/{session_id}/turns/{trace_id}/trace",
                headers=headers,
            )

            assert response.status_code == 200
            payload = response.json()["data"]
            assert payload["agent_id"] == "data"
            assert payload["session_id"] == session_id
            assert payload["turn_id"] == trace_id
            assert payload["trace"]["status"] == "completed"
            assert payload["trace"]["steps"]

def test_workflow_command_surface_dispatches_host_service(tmp_path: Path) -> None:
    captured: dict[str, object] = {}

    async def fake_run_workflow(
        self,
        workflow_id: str,
        *,
        dedup_key: str | None = None,
        workflow_input: dict[str, Any] | None = None,
    ):
        del self
        captured["run"] = {
            "workflow_id": workflow_id,
            "dedup_key": dedup_key,
            "workflow_input": workflow_input,
        }
        return SimpleNamespace(
            run_id="mw:h_test:masher-trace-digest:abc",
            workflow_id=workflow_id,
            status="queued",
        )

    async def fake_get_run(self, workflow_id: str, run_id: str):
        del self
        captured["status"] = {"workflow_id": workflow_id, "run_id": run_id}
        return SimpleNamespace(
            run_id=run_id,
            workflow_id=workflow_id,
            dedup_key="trace-123",
            status="completed",
            created_at=1.0,
            started_at=2.0,
            finished_at=3.0,
            error=None,
            workflow_input={"mode": "trace", "session_id": "s1", "trace_id": "t1"},
            session_id=None,
            result={"processed_trace_count": 1},
            steps=[{"step_id": "append-digests", "status": "completed"}],
        )

    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]), patch.object(
        WorkflowService, "run_workflow", fake_run_workflow
    ), patch.object(
        WorkflowService, "get_run", fake_get_run
    ):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")
            headers = _auth_headers(token)

            listed = client.post(
                "/workspace/marketing_db/command",
                json={"surface": "workflows", "operation": "list", "args": {}},
                headers=headers,
            )
            assert listed.status_code == 200
            assert listed.json()["surface"] == "workflows"
            assert listed.json()["operation"] == "list"
            workflows = {
                workflow["workflow_id"]: workflow
                for workflow in listed.json()["data"]["workflows"]
            }
            assert workflows["masher-trace-digest"]["step_kinds"] == {
                "code": 3,
                "agent": 0,
            }

            started = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "workflows",
                    "operation": "run",
                    "args": {
                        "workflow_id": "masher-trace-digest",
                        "dedup_key": "trace-123",
                        "input": {
                            "mode": "trace",
                            "session_id": "s1",
                            "trace_id": "t1",
                        },
                    },
                },
                headers=headers,
            )
            assert started.status_code == 200
            assert started.json()["data"] == {
                "run_id": "mw:h_test:masher-trace-digest:abc",
                "workflow_id": "masher-trace-digest",
                "status": "queued",
            }
            assert captured["run"] == {
                "workflow_id": "masher-trace-digest",
                "dedup_key": "trace-123",
                "workflow_input": {
                    "mode": "trace",
                    "session_id": "s1",
                    "trace_id": "t1",
                },
            }

            status = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "workflows",
                    "operation": "status",
                    "args": {
                        "workflow_id": "masher-trace-digest",
                        "run_id": "mw:h_test:masher-trace-digest:abc",
                    },
                },
                headers=headers,
            )
            assert status.status_code == 200
            assert status.json()["data"]["status"] == "completed"
            assert status.json()["data"]["result"] == {"processed_trace_count": 1}
            assert captured["status"] == {
                "workflow_id": "masher-trace-digest",
                "run_id": "mw:h_test:masher-trace-digest:abc",
            }


def test_workflow_event_stream_uses_beta_host_service(tmp_path: Path) -> None:
    captured: dict[str, object] = {}

    async def fake_stream_run_events(self, workflow_id: str, run_id: str, **kwargs):
        del self, kwargs
        captured["stream"] = {"workflow_id": workflow_id, "run_id": run_id}

        async def _events():
            yield SimpleNamespace(
                event="workflow.completed",
                data={
                    "workflow_id": workflow_id,
                    "run_id": run_id,
                    "status": "completed",
                    "result": {"ok": True},
                },
                comment=None,
            )

        return _events()

    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]), patch.object(
        WorkflowService, "stream_run_events", fake_stream_run_events
    ):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")

            events = _collect_sse_events(
                client,
                "/workspace/marketing_db/workflow/masher-trace-digest/runs/"
                "mw:h_test:masher-trace-digest:abc/events",
                token=token,
            )

            assert captured["stream"] == {
                "workflow_id": "masher-trace-digest",
                "run_id": "mw:h_test:masher-trace-digest:abc",
            }
            assert events[-1]["event"] == "workflow.completed"
            assert events[-1]["data"]["result"] == {"ok": True}
            assert events[-1]["data"]["runtime_event"]["sequence"] == 1


def test_workflow_command_surface_maps_errors(tmp_path: Path) -> None:
    async def fake_run_workflow(
        self,
        workflow_id: str,
        *,
        dedup_key: str | None = None,
        workflow_input: dict[str, Any] | None = None,
    ):
        del self, workflow_input
        if workflow_id == "duplicate":
            existing = WorkflowRun(
                run_id="mw:h_test:duplicate:existing",
                workflow_id=workflow_id,
                dedup_key=dedup_key,
                status="running",
                created_at=1.0,
            )
            raise DuplicateWorkflowRunError(workflow_id, dedup_key or "", existing)
        raise WorkflowNotFoundError(f"workflow '{workflow_id}' is not registered")

    async def fake_get_run(self, workflow_id: str, run_id: str):
        del self, run_id
        raise WorkflowNotFoundError(f"workflow '{workflow_id}' is not registered")

    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]), patch.object(
        WorkflowService, "run_workflow", fake_run_workflow
    ), patch.object(
        WorkflowService, "get_run", fake_get_run
    ):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")
            headers = _auth_headers(token)

            invalid_operation = client.post(
                "/workspace/marketing_db/command",
                json={"surface": "workflows", "operation": "delete", "args": {}},
                headers=headers,
            )
            assert invalid_operation.status_code == 400

            missing_id = client.post(
                "/workspace/marketing_db/command",
                json={"surface": "workflows", "operation": "run", "args": {}},
                headers=headers,
            )
            assert missing_id.status_code == 422

            invalid_input = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "workflows",
                    "operation": "run",
                    "args": {"workflow_id": "masher-trace-digest", "input": []},
                },
                headers=headers,
            )
            assert invalid_input.status_code == 422

            duplicate = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "workflows",
                    "operation": "run",
                    "args": {"workflow_id": "duplicate", "dedup_key": "active"},
                },
                headers=headers,
            )
            assert duplicate.status_code == 409
            assert duplicate.json()["error"]["details"]["existing_run_id"] == (
                "mw:h_test:duplicate:existing"
            )

            not_found = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "workflows",
                    "operation": "status",
                    "args": {"workflow_id": "missing", "run_id": "mw:h_test:missing:abc"},
                },
                headers=headers,
            )
            assert not_found.status_code == 404


def test_session_signals_proxy_returns_definitions_and_turn_values(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_EchoLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")

            created = client.post(
                "/workspace/marketing_db/sessions",
                json={"label": "Signals"},
                headers=_auth_headers(token),
            )
            assert created.status_code == 200
            session_id = created.json()["data"]["session_id"]

            sent = client.post(
                f"/workspace/marketing_db/sessions/{session_id}/messages",
                json={"message": "capture signals"},
                headers=_auth_headers(token),
            )
            assert sent.status_code == 200
            request_id = sent.json()["data"]["request_id"]
            _collect_sse_events(
                client,
                f"/workspace/marketing_db/sessions/{session_id}/requests/{request_id}/events",
                token=token,
            )

            response = client.get(
                f"/workspace/marketing_db/sessions/{session_id}/signals",
                headers=_auth_headers(token),
            )
            assert response.status_code == 200
            payload = response.json()["data"]
            assert payload["agent_id"] == "data"
            assert payload["session_id"] == session_id
            assert "unused_tools" in payload["definitions"]
            assert "unused_tool_tokens" in payload["definitions"]
            assert len(payload["turns"]) == 1
            assert isinstance(payload["turns"][0]["signals"]["unused_tools"], list)
            assert int(payload["turns"][0]["signals"]["unused_tool_tokens"]) > 0


def test_command_endpoint_dispatches_surfaces(tmp_path: Path) -> None:
    def _fake_execute(_: Any, sql: str) -> list[dict[str, Any]]:
        if "AS bucket" in sql:
            return [
                {"bucket": "2024-01-01", "metric_value": 120.0},
                {"bucket": "2024-01-02", "metric_value": 156.0},
            ]
        if "canonical_subjects" in sql:
            return [
                {"variant_id": "control", "canonical_subjects": 100, "contaminated_subjects": 1},
                {"variant_id": "treatment", "canonical_subjects": 110, "contaminated_subjects": 2},
            ]
        if "metric_sum_squares" in sql:
            return [
                {
                    "variant_id": "control",
                    "exposed_subjects": 100,
                    "observed_subjects": 100,
                    "metric_sum": 45.0,
                    "metric_sum_squares": 65.0,
                },
                {
                    "variant_id": "treatment",
                    "exposed_subjects": 110,
                    "observed_subjects": 110,
                    "metric_sum": 66.0,
                    "metric_sum_squares": 92.0,
                },
            ]
        raise AssertionError(f"unexpected SQL: {sql}")

    with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]), patch(
        "crew.beta.visualizations.BigQueryQueryRunner.execute",
        new=_fake_execute,
    ):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")
            headers = _auth_headers(token)

            metrics_list = client.post(
                "/workspace/marketing_db/command",
                json={"surface": "metrics", "operation": "list", "args": {}},
                headers=headers,
            )
            assert metrics_list.status_code == 200
            assert metrics_list.json()["surface"] == "metrics"
            assert metrics_list.json()["operation"] == "list"
            assert metrics_list.json()["ok"] is True
            assert metrics_list.json()["data"]["dataset_id"] == "marketing_db"

            metrics_compile = client.post(
                "/workspace/marketing_db/command",
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
                "/workspace/marketing_db/command",
                json={
                    "surface": "metrics",
                    "operation": "show",
                    "args": {"kind": "metric", "name": "spend_total"},
                },
                headers=headers,
            )
            assert metrics_show.status_code == 200
            assert metrics_show.json()["data"]["document"]["label"] == "Total Spend"

            metrics_visualize = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "metrics",
                    "operation": "visualize",
                    "args": {"metric_name": "spend_total"},
                },
                headers=headers,
            )
            assert metrics_visualize.status_code == 200
            metric_visual_payload = metrics_visualize.json()["data"]
            assert metric_visual_payload["entity"]["surface"] == "metrics"
            assert metric_visual_payload["chart"]["kind"] == "line"
            assert metric_visual_payload["table"]["rows"][0]["metric_value"] == 120.0

            experiments_plan = client.post(
                "/workspace/marketing_db/command",
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
                "/workspace/marketing_db/command",
                json={
                    "surface": "experiments",
                    "operation": "show",
                    "args": {"name": "signup_checkout"},
                },
                headers=headers,
            )
            assert experiment_show.status_code == 200
            assert experiment_show.json()["data"]["document"]["label"] == "Signup Checkout"

            experiment_analyze = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "experiments",
                    "operation": "analyze",
                    "args": {"name": "signup_checkout"},
                },
                headers=headers,
            )
            assert experiment_analyze.status_code == 200
            experiment_analysis_payload = experiment_analyze.json()["data"]
            assert experiment_analysis_payload["entity"]["surface"] == "experiments"
            assert experiment_analysis_payload["chart"]["kind"] == "bar"
            assert experiment_analysis_payload["meta"]["control_variant"] == "control"

            artifact_search = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "artifacts",
                    "operation": "search",
                    "args": {"query": "launch readiness", "limit": 5},
                },
                headers=headers,
            )
            assert artifact_search.status_code == 200
            assert artifact_search.json()["data"]["results"][0]["artifact_id"] == "launch_readout_q2"
            assert artifact_search.json()["data"]["results"][0]["format"] == "markdown"

            skills_list = client.post(
                "/workspace/marketing_db/command",
                json={"surface": "skills", "operation": "list", "args": {}},
                headers=headers,
            )
            assert skills_list.status_code == 200
            skills_payload = skills_list.json()["data"]
            assert skills_payload["count"] >= 1
            assert any(item["skill_id"] == "shared--create-artifact" for item in skills_payload["skills"])

            skills_search = client.post(
                "/workspace/marketing_db/command",
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
                "/workspace/marketing_db/command",
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
                "/workspace/marketing_db/command",
                json={"surface": "metrics", "operation": "delete", "args": {}},
                headers=headers,
            )
            assert invalid.status_code == 400


def test_visualization_command_validation_errors_are_mapped(tmp_path: Path) -> None:
    with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
        DataAgentSpec, "build_llm", return_value=_EchoLLM()
    ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
        with _build_test_client(tmp_path) as client:
            token, _ = _login(client, "alice")
            headers = _auth_headers(token)

            response = client.post(
                "/workspace/marketing_db/command",
                json={
                    "surface": "metrics",
                    "operation": "visualize",
                    "args": {
                        "metric_name": "spend_total",
                        "group_by": "created_at",
                    },
                },
                headers=headers,
            )

            assert response.status_code == 422
            payload = response.json()
            assert payload["error"]["code"] == "COMMAND_VALIDATION_FAILED"
            assert "group_by" in payload["error"]["message"]


def test_command_endpoint_returns_mixed_artifact_formats(tmp_path: Path) -> None:
    workspace_root = tmp_path / "workspace"
    _write_artifact_workspace(workspace_root)

    with patch.dict("os.environ", {"CREW_WORKSPACE_ROOT": str(workspace_root)}, clear=False):
        with patch.object(PMAgentSpec, "build_llm", return_value=_DelegatingLLM()), patch.object(
            DataAgentSpec, "build_llm", return_value=_EchoLLM()
        ), patch.object(DataAgentSpec, "build_mcp_servers", return_value=[]):
            with _build_test_client(tmp_path) as client:
                token, _ = _login(client, "alice")
                headers = _auth_headers(token)

                artifact_list = client.post(
                    "/workspace/marketing_db/command",
                    json={"surface": "artifacts", "operation": "list", "args": {}},
                    headers=headers,
                )
                assert artifact_list.status_code == 200
                list_payload = artifact_list.json()["data"]["artifacts"]
                assert {item["format"] for item in list_payload} == {"markdown", "html"}

                artifact_show = client.post(
                    "/workspace/marketing_db/command",
                    json={
                        "surface": "artifacts",
                        "operation": "show",
                        "args": {"artifact_id": "launch_dashboard_q2"},
                    },
                    headers=headers,
                )
                assert artifact_show.status_code == 200
                show_payload = artifact_show.json()["data"]
                assert show_payload["format"] == "html"
                assert show_payload["frontmatter"]["format"] == "html"
                assert show_payload["ordered_sections"] == []

                artifact_search = client.post(
                    "/workspace/marketing_db/command",
                    json={
                        "surface": "artifacts",
                        "operation": "search",
                        "args": {"query": "interactive dashboard", "limit": 5},
                    },
                    headers=headers,
                )
                assert artifact_search.status_code == 200
                search_payload = artifact_search.json()["data"]["results"]
                assert search_payload[0]["artifact_id"] == "launch_dashboard_q2"
                assert search_payload[0]["format"] == "html"


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


def test_normalize_stream_payload_surfaces_prompt_cache_tokens() -> None:
    # mash >= 0.7 reports prompt-cache hits on the per-step token_usage using
    # the cache_read/cache_write keys; the trace step should expose them.
    payload = _normalize_stream_payload(
        event_name="agent.trace",
        payload={
            "event_type": "runtime.llm.think.completed",
            "trace_id": "trace-123",
            "loop_index": 1,
            "step_key": "llm.think.1",
            "payload": {
                "action_type": "response",
                "assistant_text": "Done.",
                "token_usage": {
                    "input": 1200,
                    "output": 64,
                    "cache_read": 980,
                    "cache_write": 0,
                },
                "duration_ms": 510,
            },
        },
        sequence=3,
    )

    assert payload["trace"]["token_usage"] == {
        "input_tokens": 1200,
        "output_tokens": 64,
        "total_tokens": 1264,
        "cache_read_tokens": 980,
        "cache_write_tokens": 0,
    }


def test_normalize_stream_payload_omits_cache_tokens_when_absent() -> None:
    payload = _normalize_stream_payload(
        event_name="agent.trace",
        payload={
            "event_type": "runtime.llm.think.completed",
            "trace_id": "trace-123",
            "loop_index": 1,
            "step_key": "llm.think.1",
            "payload": {
                "action_type": "response",
                "assistant_text": "Done.",
                "token_usage": {"input": 10, "output": 5},
                "duration_ms": 7,
            },
        },
        sequence=3,
    )

    assert payload["trace"]["token_usage"] == {
        "input_tokens": 10,
        "output_tokens": 5,
        "total_tokens": 15,
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
