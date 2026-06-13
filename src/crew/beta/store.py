from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

try:  # pragma: no cover - environment dependent
    import psycopg
    from psycopg.rows import dict_row
    from psycopg.types.json import Jsonb
except ImportError:  # pragma: no cover - exercised only without optional deps
    psycopg = None
    dict_row = None
    Jsonb = None


class BetaStore:
    """Small Postgres-backed store for beta auth and session ownership."""

    def __init__(self, database_url: str) -> None:
        resolved = str(database_url or "").strip()
        if not resolved:
            raise ValueError("database_url is required")
        self._database_url = resolved
        self._conn: Any = None
        self._open_lock = asyncio.Lock()
        self._lock = asyncio.Lock()

    async def open(self) -> None:
        if self._conn is not None:
            return
        if psycopg is None or dict_row is None:  # pragma: no cover - env dependent
            raise RuntimeError(
                "psycopg is required for BetaStore. Install mash-crew with PostgreSQL dependencies."
            )
        async with self._open_lock:
            if self._conn is not None:
                return
            conn = await psycopg.AsyncConnection.connect(self._database_url)
            conn.row_factory = dict_row
            await conn.set_autocommit(True)
            self._conn = conn
            await self._ensure_schema()

    async def close(self) -> None:
        if self._conn is None:
            return
        await self._conn.close()
        self._conn = None

    async def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        return await self._fetch_one(
            "SELECT id, username, display_name, status, created_at FROM users WHERE id = %s",
            (user_id,),
        )

    async def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        return await self._fetch_one(
            "SELECT id, username, display_name, status, created_at FROM users WHERE username = %s",
            (username,),
        )

    async def ensure_user(self, username: str) -> dict[str, Any]:
        normalized = username.strip().lower()
        payload = {
            "id": uuid.uuid4().hex,
            "username": normalized,
            "display_name": None,
            "status": "active",
            "created_at": float(time.time()),
        }
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    INSERT INTO users (id, username, display_name, status, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    ON CONFLICT (username) DO UPDATE
                    SET username = EXCLUDED.username
                    RETURNING id, username, display_name, status, created_at
                    """,
                    (
                        payload["id"],
                        payload["username"],
                        payload["display_name"],
                        payload["status"],
                        payload["created_at"],
                    ),
                )
                row = await cursor.fetchone()
        if row is None:  # pragma: no cover - defensive guard
            raise RuntimeError("failed to ensure beta user")
        return self._row_to_dict(row)

    async def create_session(
        self,
        *,
        workspace_id: str,
        session_id: str,
        user_id: str,
        agent_id: str,
        label: str | None = None,
    ) -> dict[str, Any]:
        now = float(time.time())
        payload = {
            "workspace_id": str(workspace_id),
            "session_id": session_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "label": label,
            "created_at": now,
            "last_opened_at": now,
        }
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    INSERT INTO sessions (
                        workspace_id,
                        session_id,
                        user_id,
                        agent_id,
                        label,
                        created_at,
                        last_opened_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        payload["workspace_id"],
                        payload["session_id"],
                        payload["user_id"],
                        payload["agent_id"],
                        payload["label"],
                        payload["created_at"],
                        payload["last_opened_at"],
                    ),
                )
        return payload

    async def get_session(
        self, *, workspace_id: str, session_id: str
    ) -> dict[str, Any] | None:
        return await self._fetch_one(
            """
            SELECT workspace_id, session_id, user_id, agent_id, label,
                   created_at, last_opened_at
            FROM sessions
            WHERE workspace_id = %s AND session_id = %s
            """,
            (workspace_id, session_id),
        )

    async def get_workspace_for_session(self, session_id: str) -> str | None:
        """Resolve a session's workspace by id alone (session ids are unique)."""
        row = await self._fetch_one(
            "SELECT workspace_id FROM sessions WHERE session_id = %s",
            (session_id,),
        )
        return str(row["workspace_id"]) if row else None

    async def touch_session(self, *, workspace_id: str, session_id: str) -> None:
        now = float(time.time())
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    UPDATE sessions
                    SET last_opened_at = %s
                    WHERE workspace_id = %s AND session_id = %s
                    """,
                    (now, workspace_id, session_id),
                )

    async def list_sessions_for_user(
        self, *, workspace_id: str, user_id: str
    ) -> list[dict[str, Any]]:
        return await self._fetch_all(
            """
            SELECT workspace_id, session_id, user_id, agent_id, label,
                   created_at, last_opened_at
            FROM sessions
            WHERE workspace_id = %s AND user_id = %s
            ORDER BY last_opened_at DESC, created_at DESC
            """,
            (workspace_id, user_id),
        )

    async def list_session_ids_for_user(
        self, *, workspace_id: str, user_id: str
    ) -> set[str]:
        rows = await self._fetch_all(
            """
            SELECT session_id
            FROM sessions
            WHERE workspace_id = %s AND user_id = %s
            """,
            (workspace_id, user_id),
        )
        return {str(item["session_id"]) for item in rows}

    async def upsert_authored_skill(self, payload: dict[str, Any]) -> dict[str, Any]:
        now = float(payload.get("updated_at") or time.time())
        created_at = float(payload.get("created_at") or now)
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    INSERT INTO skills (
                        skill_id,
                        name,
                        description,
                        content,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (skill_id) DO UPDATE
                    SET name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        content = EXCLUDED.content,
                        status = EXCLUDED.status,
                        updated_at = EXCLUDED.updated_at
                    RETURNING skill_id, name, description, content, status, created_at, updated_at
                    """,
                    (
                        str(payload["skill_id"]),
                        str(payload["name"]),
                        str(payload["description"]),
                        str(payload["content"]),
                        str(payload.get("status") or "published"),
                        created_at,
                        now,
                    ),
                )
                row = await cursor.fetchone()
        if row is None:  # pragma: no cover - defensive guard
            raise RuntimeError("failed to upsert authored skill")
        return self._row_to_dict(row)

    async def upsert_authored_workflow(
        self,
        payload: dict[str, Any],
        *,
        tasks: list[dict[str, Any]],
    ) -> dict[str, Any]:
        now = float(payload.get("updated_at") or time.time())
        created_at = float(payload.get("created_at") or now)
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    INSERT INTO workflows (
                        workflow_id,
                        skill_id,
                        name,
                        description,
                        status,
                        input_schema,
                        owner_agent_id,
                        source_session_id,
                        created_at,
                        updated_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (workflow_id) DO UPDATE
                    SET skill_id = EXCLUDED.skill_id,
                        name = EXCLUDED.name,
                        description = EXCLUDED.description,
                        status = EXCLUDED.status,
                        input_schema = EXCLUDED.input_schema,
                        owner_agent_id = EXCLUDED.owner_agent_id,
                        source_session_id = EXCLUDED.source_session_id,
                        updated_at = EXCLUDED.updated_at
                    RETURNING workflow_id, skill_id, name, description, status,
                              input_schema, owner_agent_id, source_session_id,
                              created_at, updated_at
                    """,
                    (
                        str(payload["workflow_id"]),
                        str(payload["skill_id"]),
                        str(payload["name"]),
                        str(payload["description"]),
                        str(payload.get("status") or "published"),
                        self._json_param(payload["input_schema"]),
                        str(payload["owner_agent_id"]),
                        payload.get("source_session_id"),
                        created_at,
                        now,
                    ),
                )
                row = await cursor.fetchone()
                await cursor.execute(
                    "DELETE FROM workflow_tasks WHERE workflow_id = %s",
                    (str(payload["workflow_id"]),),
                )
                for task in sorted(tasks, key=lambda item: int(item["position"])):
                    await cursor.execute(
                        """
                        INSERT INTO workflow_tasks (
                            workflow_id,
                            task_id,
                            position,
                            title,
                            agent_id,
                            structured_output
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (
                            str(task["workflow_id"]),
                            str(task["task_id"]),
                            int(task["position"]),
                            str(task["title"]),
                            str(task["agent_id"]),
                            self._json_param(task["structured_output"]),
                        ),
                    )
        if row is None:  # pragma: no cover - defensive guard
            raise RuntimeError("failed to upsert authored workflow")
        return self._row_to_dict(row)

    async def get_authored_workflow_bundle(
        self, workflow_id: str
    ) -> dict[str, Any] | None:
        workflow = await self._fetch_one(
            """
            SELECT workflow_id, skill_id, name, description, status, input_schema,
                   owner_agent_id, source_session_id, created_at, updated_at
            FROM workflows
            WHERE workflow_id = %s
            """,
            (workflow_id,),
        )
        if workflow is None:
            return None
        skill = await self._fetch_one(
            """
            SELECT skill_id, name, description, content, status, created_at, updated_at
            FROM skills
            WHERE skill_id = %s
            """,
            (str(workflow["skill_id"]),),
        )
        tasks = await self._fetch_all(
            """
            SELECT workflow_id, task_id, position, title, agent_id,
                   structured_output
            FROM workflow_tasks
            WHERE workflow_id = %s
            ORDER BY position ASC
            """,
            (workflow_id,),
        )
        return {"workflow": workflow, "skill": skill, "tasks": tasks}

    async def list_authored_workflow_bundles(
        self, *, status: str | None = None
    ) -> list[dict[str, Any]]:
        if status is None:
            rows = await self._fetch_all(
                """
                SELECT workflow_id
                FROM workflows
                ORDER BY updated_at DESC, workflow_id ASC
                """,
                (),
            )
        else:
            rows = await self._fetch_all(
                """
                SELECT workflow_id
                FROM workflows
                WHERE status = %s
                ORDER BY updated_at DESC, workflow_id ASC
                """,
                (status,),
            )
        bundles: list[dict[str, Any]] = []
        for row in rows:
            bundle = await self.get_authored_workflow_bundle(str(row["workflow_id"]))
            if bundle is not None and bundle.get("skill") is not None:
                bundles.append(bundle)
        return bundles

    async def set_authored_workflow_status(
        self, workflow_id: str, status: str
    ) -> dict[str, Any] | None:
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    UPDATE workflows
                    SET status = %s, updated_at = %s
                    WHERE workflow_id = %s
                    RETURNING workflow_id, skill_id, name, description, status,
                              input_schema, owner_agent_id, source_session_id,
                              created_at, updated_at
                    """,
                    (status, float(time.time()), workflow_id),
                )
                row = await cursor.fetchone()
        return self._row_to_dict(row) if row is not None else None

    async def _ensure_schema(self) -> None:
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        id TEXT PRIMARY KEY,
                        username TEXT NOT NULL UNIQUE,
                        display_name TEXT,
                        status TEXT NOT NULL,
                        created_at DOUBLE PRECISION NOT NULL
                    )
                    """
                )
                await cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS sessions (
                        session_id TEXT PRIMARY KEY,
                        workspace_id TEXT NOT NULL,
                        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        agent_id TEXT NOT NULL,
                        label TEXT,
                        created_at DOUBLE PRECISION NOT NULL,
                        last_opened_at DOUBLE PRECISION NOT NULL
                    )
                    """
                )
                await cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_sessions_workspace_user_id
                    ON sessions(workspace_id, user_id)
                    """
                )
                await cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_sessions_last_opened_at
                    ON sessions(last_opened_at DESC)
                    """
                )
                await cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS skills (
                        skill_id TEXT PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE,
                        description TEXT NOT NULL,
                        content TEXT NOT NULL,
                        status TEXT NOT NULL,
                        created_at DOUBLE PRECISION NOT NULL,
                        updated_at DOUBLE PRECISION NOT NULL
                    )
                    """
                )
                await cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS workflows (
                        workflow_id TEXT PRIMARY KEY,
                        skill_id TEXT NOT NULL REFERENCES skills(skill_id),
                        name TEXT NOT NULL,
                        description TEXT NOT NULL,
                        status TEXT NOT NULL,
                        input_schema JSONB NOT NULL,
                        owner_agent_id TEXT NOT NULL,
                        source_session_id TEXT,
                        created_at DOUBLE PRECISION NOT NULL,
                        updated_at DOUBLE PRECISION NOT NULL
                    )
                    """
                )
                await cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS workflow_tasks (
                        workflow_id TEXT NOT NULL REFERENCES workflows(workflow_id) ON DELETE CASCADE,
                        task_id TEXT NOT NULL,
                        position INTEGER NOT NULL,
                        title TEXT NOT NULL,
                        agent_id TEXT NOT NULL,
                        structured_output JSONB NOT NULL,
                        PRIMARY KEY (workflow_id, task_id),
                        UNIQUE (workflow_id, position)
                    )
                    """
                )
                await cursor.execute(
                    """
                    ALTER TABLE workflow_tasks
                    DROP COLUMN IF EXISTS instruction
                    """
                )
                await cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_workflows_status
                    ON workflows(status)
                    """
                )

    async def _fetch_one(
        self,
        query: str,
        params: tuple[Any, ...],
    ) -> dict[str, Any] | None:
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(query, params)
                row = await cursor.fetchone()
        return self._row_to_dict(row) if row is not None else None

    async def _fetch_all(
        self,
        query: str,
        params: tuple[Any, ...],
    ) -> list[dict[str, Any]]:
        async with self._lock:
            conn = self._get_conn()
            async with conn.cursor() as cursor:
                await cursor.execute(query, params)
                rows = await cursor.fetchall()
        return [self._row_to_dict(row) for row in rows]

    def _get_conn(self) -> Any:
        if self._conn is None:
            raise RuntimeError("BetaStore is not open")
        return self._conn

    @staticmethod
    def _row_to_dict(row: Any) -> dict[str, Any]:
        return dict(row)

    @staticmethod
    def _json_param(value: Any) -> Any:
        if Jsonb is None:
            return value
        return Jsonb(value)
