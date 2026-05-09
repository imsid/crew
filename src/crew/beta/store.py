from __future__ import annotations

import sqlite3
import threading
import time
import uuid
from pathlib import Path
from typing import Any


class BetaStore:
    """Small SQLite-backed store for beta auth and session ownership."""

    def __init__(self, path: Path) -> None:
        self._path = path.resolve()
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()
        self._connection = sqlite3.connect(
            self._path.as_posix(),
            check_same_thread=False,
        )
        self._connection.row_factory = sqlite3.Row
        self._ensure_schema()

    def close(self) -> None:
        with self._lock:
            self._connection.close()

    def get_user_by_id(self, user_id: str) -> dict[str, Any] | None:
        return self._fetch_one(
            "SELECT id, username, display_name, status, created_at FROM users WHERE id = ?",
            (user_id,),
        )

    def get_user_by_username(self, username: str) -> dict[str, Any] | None:
        return self._fetch_one(
            "SELECT id, username, display_name, status, created_at FROM users WHERE username = ?",
            (username,),
        )

    def ensure_user(self, username: str) -> dict[str, Any]:
        normalized = username.strip().lower()
        existing = self.get_user_by_username(normalized)
        if existing is not None:
            return existing

        payload = {
            "id": uuid.uuid4().hex,
            "username": normalized,
            "display_name": None,
            "status": "active",
            "created_at": float(time.time()),
        }
        with self._lock:
            self._connection.execute(
                """
                INSERT INTO users (id, username, display_name, status, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (
                    payload["id"],
                    payload["username"],
                    payload["display_name"],
                    payload["status"],
                    payload["created_at"],
                ),
            )
            self._connection.commit()
        return payload

    def create_session(
        self,
        *,
        session_id: str,
        user_id: str,
        agent_id: str,
        label: str | None = None,
    ) -> dict[str, Any]:
        now = float(time.time())
        payload = {
            "session_id": session_id,
            "user_id": user_id,
            "agent_id": agent_id,
            "label": label,
            "created_at": now,
            "last_opened_at": now,
        }
        with self._lock:
            self._connection.execute(
                """
                INSERT INTO sessions (
                    session_id,
                    user_id,
                    agent_id,
                    label,
                    created_at,
                    last_opened_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["session_id"],
                    payload["user_id"],
                    payload["agent_id"],
                    payload["label"],
                    payload["created_at"],
                    payload["last_opened_at"],
                ),
            )
            self._connection.commit()
        return payload

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        return self._fetch_one(
            """
            SELECT session_id, user_id, agent_id, label, created_at, last_opened_at
            FROM sessions
            WHERE session_id = ?
            """,
            (session_id,),
        )

    def touch_session(self, session_id: str) -> None:
        now = float(time.time())
        with self._lock:
            self._connection.execute(
                "UPDATE sessions SET last_opened_at = ? WHERE session_id = ?",
                (now, session_id),
            )
            self._connection.commit()

    def list_sessions_for_user(self, user_id: str) -> list[dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT session_id, user_id, agent_id, label, created_at, last_opened_at
            FROM sessions
            WHERE user_id = ?
            ORDER BY last_opened_at DESC, created_at DESC
            """,
            (user_id,),
        )

    def list_session_ids_for_user(self, user_id: str) -> set[str]:
        return {
            item["session_id"]
            for item in self._fetch_all(
                "SELECT session_id FROM sessions WHERE user_id = ?",
                (user_id,),
            )
        }

    def _ensure_schema(self) -> None:
        with self._lock:
            self._connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT NOT NULL UNIQUE,
                    display_name TEXT,
                    status TEXT NOT NULL,
                    created_at REAL NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    agent_id TEXT NOT NULL,
                    label TEXT,
                    created_at REAL NOT NULL,
                    last_opened_at REAL NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );
                """
            )
            self._connection.commit()

    def _fetch_one(
        self,
        query: str,
        params: tuple[Any, ...],
    ) -> dict[str, Any] | None:
        with self._lock:
            row = self._connection.execute(query, params).fetchone()
        return self._row_to_dict(row) if row is not None else None

    def _fetch_all(
        self,
        query: str,
        params: tuple[Any, ...],
    ) -> list[dict[str, Any]]:
        with self._lock:
            rows = self._connection.execute(query, params).fetchall()
        return [self._row_to_dict(row) for row in rows]

    @staticmethod
    def _row_to_dict(row: sqlite3.Row) -> dict[str, Any]:
        return {key: row[key] for key in row.keys()}
