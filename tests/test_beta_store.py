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

    async def set_autocommit(self, value: bool) -> None:
        self.autocommit = value

    def cursor(self) -> _FakeAsyncCursor:
        return _FakeAsyncCursor(self)

    async def close(self) -> None:
        self.closed = True

    def execute(self, query: str, params: tuple[object, ...]) -> list[dict[str, object]]:
        if query.startswith("CREATE TABLE IF NOT EXISTS users"):
            return []
        if query.startswith("CREATE TABLE IF NOT EXISTS sessions"):
            return []
        if query.startswith("CREATE INDEX IF NOT EXISTS idx_sessions_user_id"):
            return []
        if query.startswith("CREATE INDEX IF NOT EXISTS idx_sessions_last_opened_at"):
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
            session_id, user_id, agent_id, label, created_at, last_opened_at = params
            payload = {
                "session_id": str(session_id),
                "user_id": str(user_id),
                "agent_id": str(agent_id),
                "label": label,
                "created_at": float(created_at),
                "last_opened_at": float(last_opened_at),
            }
            self.sessions[str(session_id)] = payload
            return []
        if query.startswith("SELECT session_id, user_id, agent_id, label, created_at, last_opened_at FROM sessions WHERE session_id ="):
            session = self.sessions.get(str(params[0]))
            return [dict(session)] if session is not None else []
        if query.startswith("UPDATE sessions SET last_opened_at ="):
            last_opened_at, session_id = params
            session = self.sessions.get(str(session_id))
            if session is not None:
                session["last_opened_at"] = float(last_opened_at)
            return []
        if query.startswith("SELECT session_id, user_id, agent_id, label, created_at, last_opened_at FROM sessions WHERE user_id ="):
            user_id = str(params[0])
            rows = [
                dict(session)
                for session in self.sessions.values()
                if str(session["user_id"]) == user_id
            ]
            rows.sort(
                key=lambda item: (-float(item["last_opened_at"]), -float(item["created_at"]))
            )
            return rows
        if query.startswith("SELECT session_id FROM sessions WHERE user_id ="):
            user_id = str(params[0])
            rows = [
                {"session_id": str(session["session_id"])}
                for session in self.sessions.values()
                if str(session["user_id"]) == user_id
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
async def test_beta_store_touch_session_updates_ordering(
    fake_connection: _FakeAsyncConnection,
) -> None:
    store = BetaStore("postgresql://beta:test@127.0.0.1:5432/crew_beta")
    await store.open()

    user = await store.ensure_user("alice")
    first = await store.create_session(
        session_id="session-1",
        user_id=str(user["id"]),
        agent_id="data",
        label=None,
    )
    second = await store.create_session(
        session_id="session-2",
        user_id=str(user["id"]),
        agent_id="data",
        label=None,
    )

    before = await store.list_sessions_for_user(str(user["id"]))
    assert [item["session_id"] for item in before] == [second["session_id"], first["session_id"]]

    await store.touch_session(first["session_id"])

    after = await store.list_sessions_for_user(str(user["id"]))
    assert [item["session_id"] for item in after] == [first["session_id"], second["session_id"]]


@pytest.mark.anyio
async def test_beta_store_close_closes_connection(fake_connection: _FakeAsyncConnection) -> None:
    store = BetaStore("postgresql://beta:test@127.0.0.1:5432/crew_beta")
    await store.open()

    await store.close()

    assert fake_connection.closed is True
