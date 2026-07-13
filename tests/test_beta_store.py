from __future__ import annotations

from types import SimpleNamespace

import pytest

from crew.beta.store import BetaStore


class _FakeAsyncCursor:
    def __init__(self, connection: "_FakeAsyncConnection") -> None:
        self._connection = connection
        self._result: list[dict[str, object]] = []

    async def __aenter__(self) -> "_FakeAsyncCursor":
        return self

    async def __aexit__(self, exc_type, exc, tb) -> None:
        del exc_type, exc, tb

    async def execute(self, query: str, params=None) -> None:
        normalized = " ".join(query.split())
        self._result = self._connection.execute(normalized, tuple(params or ()))

    async def fetchone(self):
        if not self._result:
            return None
        return dict(self._result[0])

    async def fetchall(self):
        return [dict(item) for item in self._result]


class _FakeAsyncConnection:
    def __init__(self) -> None:
        self.row_factory = None
        self.autocommit = False
        self.closed = False
        self.users: dict[str, dict[str, object]] = {}
        self.users_by_username: dict[str, str] = {}
        self.sessions: dict[str, dict[str, object]] = {}
        self.session_requests: dict[str, dict[str, object]] = {}
        self.dropped_tables: list[str] = []
        self.migrations: dict[int, dict[str, object]] = {}

    async def set_autocommit(self, value: bool) -> None:
        self.autocommit = value

    def cursor(self) -> _FakeAsyncCursor:
        return _FakeAsyncCursor(self)

    async def close(self) -> None:
        self.closed = True

    def execute(self, query: str, params: tuple[object, ...]) -> list[dict[str, object]]:
        if query.startswith("CREATE TABLE IF NOT EXISTS crew_schema_migrations"):
            return []
        if query.startswith("SELECT version FROM crew_schema_migrations"):
            return [dict(item) for item in self.migrations.values()]
        if query.startswith("INSERT INTO crew_schema_migrations"):
            version, name, applied_at = params
            self.migrations[int(version)] = {
                "version": int(version),
                "name": str(name),
                "applied_at": float(applied_at),
            }
            return []
        if query.startswith("CREATE TABLE IF NOT EXISTS users"):
            return []
        if query.startswith("CREATE TABLE IF NOT EXISTS sessions"):
            return []
        if query.startswith("CREATE TABLE IF NOT EXISTS session_requests"):
            return []
        if query.startswith("CREATE INDEX IF NOT EXISTS idx_sessions_workspace_user_id"):
            return []
        if query.startswith("CREATE INDEX IF NOT EXISTS idx_sessions_last_opened_at"):
            return []
        if query.startswith("CREATE INDEX IF NOT EXISTS idx_session_requests_session_id"):
            return []
        if query.startswith("DROP TABLE IF EXISTS "):
            self.dropped_tables.append(query.removeprefix("DROP TABLE IF EXISTS "))
            return []
        if query.startswith("SELECT id, username, display_name, status, created_at FROM users WHERE id ="):
            user = self.users.get(str(params[0]))
            return [dict(user)] if user is not None else []
        if query.startswith("SELECT id, username, display_name, status, created_at FROM users WHERE username ="):
            user_id = self.users_by_username.get(str(params[0]))
            user = self.users.get(user_id) if user_id is not None else None
            return [dict(user)] if user is not None else []
        if query.startswith("INSERT INTO users"):
            user_id, username, display_name, status, created_at = params
            existing_id = self.users_by_username.get(str(username))
            if existing_id is not None:
                return [dict(self.users[existing_id])]
            payload = {
                "id": str(user_id),
                "username": str(username),
                "display_name": display_name,
                "status": str(status),
                "created_at": float(created_at),
            }
            self.users[str(user_id)] = payload
            self.users_by_username[str(username)] = str(user_id)
            return [dict(payload)]
        if query.startswith("INSERT INTO sessions"):
            workspace_id, session_id, user_id, agent_id, label, created_at, last_opened_at = params
            payload = {
                "workspace_id": str(workspace_id),
                "session_id": str(session_id),
                "user_id": str(user_id),
                "agent_id": str(agent_id),
                "label": label,
                "created_at": float(created_at),
                "last_opened_at": float(last_opened_at),
            }
            self.sessions[str(session_id)] = payload
            return []
        if query.startswith("INSERT INTO session_requests"):
            request_id, session_id, created_at = params
            self.session_requests[str(request_id)] = {
                "request_id": str(request_id),
                "session_id": str(session_id),
                "created_at": float(created_at),
            }
            return []
        if query.startswith("SELECT request_id FROM session_requests"):
            request_id, session_id = params
            item = self.session_requests.get(str(request_id))
            if item is None or item["session_id"] != str(session_id):
                return []
            return [{"request_id": str(request_id)}]
        if query.startswith("SELECT workspace_id, session_id, user_id, agent_id, label"):
            if "WHERE workspace_id = %s AND session_id = %s" in query:
                workspace_id, session_id = params
                session = self.sessions.get(str(session_id))
                if session is None or str(session["workspace_id"]) != str(workspace_id):
                    return []
                return [dict(session)]
            if "WHERE workspace_id = %s AND user_id = %s" in query:
                workspace_id, user_id = params
                rows = [
                    dict(session)
                    for session in self.sessions.values()
                    if str(session["workspace_id"]) == str(workspace_id)
                    and str(session["user_id"]) == str(user_id)
                ]
                rows.sort(
                    key=lambda item: (-float(item["last_opened_at"]), -float(item["created_at"]))
                )
                return rows
        if query.startswith("UPDATE sessions SET last_opened_at ="):
            last_opened_at, workspace_id, session_id = params
            session = self.sessions.get(str(session_id))
            if session is not None and str(session["workspace_id"]) == str(workspace_id):
                session["last_opened_at"] = float(last_opened_at)
            return []
        if query.startswith("SELECT session_id FROM sessions WHERE workspace_id ="):
            workspace_id = str(params[0])
            user_id = str(params[1])
            rows = [
                {"session_id": str(session["session_id"])}
                for session in self.sessions.values()
                if str(session["workspace_id"]) == workspace_id
                and str(session["user_id"]) == user_id
            ]
            return rows
        raise AssertionError(f"Unhandled query: {query}")


@pytest.fixture
def fake_connection(monkeypatch) -> _FakeAsyncConnection:
    connection = _FakeAsyncConnection()

    async def _connect(url: str) -> _FakeAsyncConnection:
        assert url == "postgresql://beta:test@127.0.0.1:5432/crew_beta"
        return connection

    fake_psycopg = SimpleNamespace(
        AsyncConnection=SimpleNamespace(connect=_connect),
    )
    monkeypatch.setattr("crew.beta.store.psycopg", fake_psycopg)
    monkeypatch.setattr("crew.beta.store.dict_row", object())
    monkeypatch.setattr("crew.beta.store.Jsonb", None)
    return connection


@pytest.mark.anyio
async def test_beta_store_ensure_user_is_stable(fake_connection: _FakeAsyncConnection) -> None:
    store = BetaStore("postgresql://beta:test@127.0.0.1:5432/crew_beta")
    await store.open()

    first = await store.ensure_user("alice")
    second = await store.ensure_user("alice")

    assert first == second
    assert len(fake_connection.users) == 1


@pytest.mark.anyio
async def test_beta_store_drops_authored_workflow_tables(
    fake_connection: _FakeAsyncConnection,
) -> None:
    store = BetaStore("postgresql://beta:test@127.0.0.1:5432/crew_beta")
    await store.open()

    # The UX-authored workflow tables were removed in the mashpy 0.17.0
    # cutover; opening the store drops any leftovers from older deployments.
    assert fake_connection.dropped_tables == ["workflow_tasks", "workflows", "skills"]


@pytest.mark.anyio
async def test_beta_store_touch_session_updates_ordering(
    fake_connection: _FakeAsyncConnection,
) -> None:
    store = BetaStore("postgresql://beta:test@127.0.0.1:5432/crew_beta")
    await store.open()

    user = await store.ensure_user("alice")
    first = await store.create_session(
        workspace_id="marketing_db",
        session_id="session-1",
        user_id=str(user["id"]),
        agent_id="data",
        label=None,
    )
    second = await store.create_session(
        workspace_id="sales_db",
        session_id="session-3",
        user_id=str(user["id"]),
        agent_id="data",
        label=None,
    )
    third = await store.create_session(
        workspace_id="marketing_db",
        session_id="session-2",
        user_id=str(user["id"]),
        agent_id="data",
        label=None,
    )

    before = await store.list_sessions_for_user(
        workspace_id="marketing_db",
        user_id=str(user["id"]),
    )
    assert [item["session_id"] for item in before] == [third["session_id"], first["session_id"]]

    await store.touch_session(workspace_id="marketing_db", session_id=first["session_id"])

    after = await store.list_sessions_for_user(
        workspace_id="marketing_db",
        user_id=str(user["id"]),
    )
    assert [item["session_id"] for item in after] == [first["session_id"], third["session_id"]]
    assert all(item["workspace_id"] == "marketing_db" for item in after)


@pytest.mark.anyio
async def test_beta_store_close_closes_connection(fake_connection: _FakeAsyncConnection) -> None:
    store = BetaStore("postgresql://beta:test@127.0.0.1:5432/crew_beta")
    await store.open()

    await store.close()

    assert fake_connection.closed is True
