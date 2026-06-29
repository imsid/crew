"""In-memory ``MemoryStore`` used by the API/beta test clients.

mash >= 0.7 removed the SQLite memory backend (the only built-in store is now
``PostgresStore``), so the test suite can no longer point ``build_memory_store``
at a real on-disk store. This module provides a dict-backed implementation of
the ``mash.memory.store.MemoryStore`` protocol that mirrors ``PostgresStore``'s
return shapes closely enough for the in-process request runner to persist and
replay turns without a database.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional


class InMemoryMemoryStore:
    """Backend-agnostic ``MemoryStore`` backed by in-process lists."""

    def __init__(self, _database_url: str | None = None) -> None:
        self._turns: list[dict[str, Any]] = []
        self._logs: list[dict[str, Any]] = []

    async def open(self) -> None:
        return None

    async def close(self) -> None:
        self._turns.clear()
        self._logs.clear()

    async def save_logs(self, logs: List[Dict[str, Any]]) -> None:
        for log in logs:
            record = dict(log)
            record.setdefault("log_id", len(self._logs) + 1)
            self._logs.append(record)

    async def get_logs(
        self,
        app_id: str,
        session_id: Optional[str] = None,
        trace_id: Optional[str] = None,
        limit: Optional[int] = None,
        after_log_id: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        rows = [
            log
            for log in self._logs
            if log.get("app_id") == app_id
            and (session_id is None or log.get("session_id") == session_id)
            and (trace_id is None or log.get("trace_id") == trace_id)
            and (after_log_id is None or int(log.get("log_id", 0)) > int(after_log_id))
        ]
        if limit is not None:
            rows = rows[-max(1, int(limit)) :]
        return [dict(row) for row in rows]

    async def get_latest_log_trace(
        self,
        app_id: str,
        session_id: str,
    ) -> Optional[Dict[str, Any]]:
        traces = await self.list_recent_log_traces(app_id, session_id, limit=1)
        return traces[0] if traces else None

    async def list_recent_log_traces(
        self,
        app_id: str,
        session_id: str,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        rows = [
            log
            for log in self._logs
            if log.get("app_id") == app_id and log.get("session_id") == session_id
        ]
        seen: dict[str, Dict[str, Any]] = {}
        for log in rows:
            trace_id = str(log.get("trace_id"))
            seen.setdefault(trace_id, {"trace_id": trace_id, "session_id": session_id})
        return list(seen.values())[: max(1, int(limit))]

    async def save_turn(
        self,
        trace_id: str,
        session_id: str,
        app_id: str,
        user_message: str,
        agent_response: str,
        signals: Dict[str, Any],
        session_total_tokens: int,
        metadata: Optional[Dict[str, Any]] = None,
        *,
        workflow_id: Optional[str] = None,
        workflow_run_id: Optional[str] = None,
        task_id: Optional[str] = None,
        replayable: bool = True,
    ) -> str:
        self._turns.append(
            {
                "trace_id": trace_id,
                "session_id": session_id,
                "app_id": app_id,
                "user_message": user_message or "",
                "agent_response": agent_response or "",
                "signals": dict(signals or {}),
                "session_total_tokens": int(session_total_tokens or 0),
                "metadata": dict(metadata or {}),
                "workflow_id": workflow_id,
                "workflow_run_id": workflow_run_id,
                "task_id": task_id,
                "replayable": bool(replayable),
                "created_at": time.time(),
            }
        )
        return trace_id

    def _select_turns(
        self, session_id: str, app_id: str, limit: Optional[int]
    ) -> List[Dict[str, Any]]:
        rows = [
            turn
            for turn in self._turns
            if turn["session_id"] == session_id and turn["app_id"] == app_id
        ]
        rows.sort(key=lambda turn: turn["created_at"])
        if limit is not None:
            rows = rows[-max(1, int(limit)) :]
        return [dict(turn) for turn in rows]

    async def get_turns(
        self,
        session_id: str,
        app_id: str,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        return self._select_turns(session_id, app_id, limit)

    async def list_workflow_turns(
        self,
        app_id: str,
        *,
        workflow_id: str,
        workflow_run_id: Optional[str] = None,
        start_time: Optional[float] = None,
        end_time: Optional[float] = None,
        limit: Optional[int] = None,
        offset: int = 0,
        sort_desc: bool = True,
    ) -> List[Dict[str, Any]]:
        rows = [
            dict(turn)
            for turn in self._turns
            if turn["app_id"] == app_id
            and turn.get("workflow_id") == workflow_id
            and (workflow_run_id is None or turn.get("workflow_run_id") == workflow_run_id)
        ]
        rows.sort(key=lambda turn: turn["created_at"], reverse=sort_desc)
        rows = rows[offset:]
        if limit is not None:
            rows = rows[: max(1, int(limit))]
        return rows

    async def get_session_signals(
        self,
        session_id: str,
        app_id: str,
        limit: Optional[int] = None,
    ) -> List[Dict[str, Any]]:
        rows = self._select_turns(session_id, app_id, limit)
        return [
            {
                "trace_id": turn["trace_id"],
                "signals": turn["signals"],
                "created_at": turn["created_at"],
            }
            for turn in rows
        ]

    async def list_sessions(self, app_id: str) -> List[Dict[str, Any]]:
        sessions: dict[str, Dict[str, Any]] = {}
        for turn in self._turns:
            if turn["app_id"] != app_id:
                continue
            entry = sessions.setdefault(
                turn["session_id"],
                {
                    "session_id": turn["session_id"],
                    "app_id": app_id,
                    "turn_count": 0,
                    "latest_turn_at": 0.0,
                },
            )
            entry["turn_count"] += 1
            entry["latest_turn_at"] = max(
                entry["latest_turn_at"], turn["created_at"]
            )
        return sorted(
            sessions.values(), key=lambda item: item["latest_turn_at"], reverse=True
        )

    async def get_latest_session(self, app_id: str) -> Optional[Dict[str, Any]]:
        sessions = await self.list_sessions(app_id)
        return sessions[0] if sessions else None

    async def get_latest_trace(
        self,
        app_id: str,
        session_id: str,
    ) -> Optional[Dict[str, Any]]:
        traces = await self.list_recent_traces(app_id, session_id, limit=1)
        return traces[0] if traces else None

    async def list_recent_traces(
        self,
        app_id: str,
        session_id: str,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        rows = self._select_turns(session_id, app_id, None)
        rows.reverse()
        traces = [
            {
                "trace_id": turn["trace_id"],
                "session_id": session_id,
                "created_at": turn["created_at"],
            }
            for turn in rows
        ]
        return traces[: max(1, int(limit))]

    async def get_turn_by_ids(
        self,
        pairs: List[Dict[str, str]],
        app_id: str,
    ) -> Optional[List[Dict[str, Any]]]:
        wanted = {(pair.get("session_id"), pair.get("trace_id")) for pair in pairs}
        return [
            dict(turn)
            for turn in self._turns
            if turn["app_id"] == app_id
            and (turn["session_id"], turn["trace_id"]) in wanted
        ]

    async def keyword_search(
        self,
        column: Any,
        query_term: str,
        limit: int,
        session_id: Optional[str] = None,
        app_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        # ``column`` is a SearchColumn literal ("user_message"/"agent_response").
        field = str(column)
        needle = str(query_term or "").strip().lower()
        if not needle:
            return []
        hits: list[Dict[str, Any]] = []
        for turn in self._turns:
            if app_id is not None and turn["app_id"] != app_id:
                continue
            if session_id is not None and turn["session_id"] != session_id:
                continue
            haystack = str(turn.get(field, "") or "")
            if needle in haystack.lower():
                hits.append(
                    {
                        "trace_id": turn["trace_id"],
                        "session_id": turn["session_id"],
                        "score": 1.0,
                        "preview": haystack,
                    }
                )
        return hits[: max(1, int(limit))]

    async def semantic_search(
        self,
        column: Any,
        query_term: str,
        query_embedding: Optional[List[float]],
        limit: int,
        session_id: Optional[str] = None,
        app_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        return []
