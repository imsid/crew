from __future__ import annotations

import asyncio
import contextlib
import inspect
import sys
import types
from typing import Any, Optional

import pytest

if "dbos" not in sys.modules:
    dbos_module = types.ModuleType("dbos")

    class _FakeDBOS:
        def __init__(self, config: dict[str, Any] | None = None) -> None:
            self.config = dict(config or {})

        @staticmethod
        def workflow(name: str | None = None):
            def decorator(fn):
                return fn

            return decorator

        @staticmethod
        def launch() -> None:
            return None

        @staticmethod
        async def start_workflow_async(workflow, *args, **kwargs):
            del kwargs
            result = workflow(*args)
            if inspect.isawaitable(result):
                return await result
            return result

        @staticmethod
        async def run_step_async(step, *args, **kwargs):
            del kwargs
            result = step(*args)
            if inspect.isawaitable(result):
                return await result
            return result

    def _set_workflow_id(_workflow_id: str):
        return contextlib.nullcontext()

    dbos_module.DBOS = _FakeDBOS
    dbos_module.SetWorkflowID = _set_workflow_id
    sys.modules["dbos"] = dbos_module

from mash.core.llm import LLMProvider
from mash.core.llm.types import LLMContentBlock, LLMRequest, LLMResponse, LLMTokenUsage
from mash.logging import bound_request_id
from mash.runtime import context as context_helpers
from mash.runtime.engine.steps import (
    commit_request_step,
    complete_request,
    fail_request,
    load_request_context,
    persist_completed_turn,
    plan_request_step,
    run_step_tool_call,
    start_request_trace,
)
from mash.runtime.events.types import RuntimeEvent, RuntimeEventType


class _TestRuntimeStore:
    def __init__(self, _database_url: str) -> None:
        self._events: list[RuntimeEvent] = []
        self._events_by_request: dict[str, list[RuntimeEvent]] = {}
        self._lock = asyncio.Lock()

    async def open(self) -> None:
        return None

    async def close(self) -> None:
        self._events.clear()
        self._events_by_request.clear()

    async def append_event(self, event: RuntimeEvent) -> RuntimeEvent:
        async with self._lock:
            request_events = (
                self._events_by_request.setdefault(event.request_id, [])
                if event.request_id
                else None
            )
            if event.request_id and event.dedupe_key and request_events is not None:
                for existing in request_events:
                    if existing.dedupe_key == event.dedupe_key:
                        return existing
            stored = RuntimeEvent(
                event_id=len(self._events) + 1,
                request_id=event.request_id,
                request_seq=(
                    len(request_events) + 1 if request_events is not None else None
                ),
                trace_id=event.trace_id,
                app_id=event.app_id,
                agent_id=event.agent_id,
                session_id=event.session_id,
                event_type=event.event_type,
                loop_index=event.loop_index,
                step_key=event.step_key,
                dedupe_key=event.dedupe_key,
                payload=dict(event.payload or {}),
                created_at=float(event.created_at),
            )
            self._events.append(stored)
            if request_events is not None:
                request_events.append(stored)
            return stored

    async def list_request_events(
        self,
        request_id: str,
        *,
        after_seq: int = 0,
    ) -> list[RuntimeEvent]:
        async with self._lock:
            events = list(self._events_by_request.get(request_id, ()))
        return [
            event
            for event in events
            if int(event.request_seq or 0) > int(after_seq)
        ]

    async def list_events(
        self,
        app_id: str,
        *,
        session_id: str | None = None,
        trace_id: str | None = None,
        after_event_id: int = 0,
        limit: int | None = None,
    ) -> list[RuntimeEvent]:
        async with self._lock:
            events = list(self._events)
        filtered = [
            event
            for event in events
            if event.app_id == app_id
            and event.event_id > int(after_event_id)
            and (session_id is None or event.session_id == session_id)
            and (trace_id is None or event.trace_id == trace_id)
        ]
        if limit is not None:
            return filtered[-max(1, int(limit)) :]
        return filtered

    async def has_request(self, request_id: str) -> bool:
        async with self._lock:
            return request_id in self._events_by_request

    async def is_request_terminal(self, request_id: str) -> bool:
        async with self._lock:
            events = self._events_by_request.get(request_id, ())
            if not events:
                return False
            event_type = events[-1].event_type
        return event_type in {
            RuntimeEventType.REQUEST_COMPLETED.value,
            RuntimeEventType.REQUEST_FAILED.value,
        }

    async def get_latest_trace(
        self,
        app_id: str,
        session_id: str,
    ) -> dict[str, Any] | None:
        traces = await self.list_recent_traces(app_id, session_id=session_id, limit=1)
        return traces[0] if traces else None

    async def list_recent_traces(
        self,
        app_id: str,
        *,
        session_id: str | None = None,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        async with self._lock:
            events = list(self._events)
        grouped: dict[tuple[str, str | None], list[RuntimeEvent]] = {}
        for event in events:
            if event.app_id != app_id or event.trace_id is None:
                continue
            if session_id is not None and event.session_id != session_id:
                continue
            grouped.setdefault((event.trace_id, event.session_id), []).append(event)
        summaries: list[dict[str, Any]] = []
        for (trace_id_value, session_id_value), trace_events in grouped.items():
            trace_events.sort(key=lambda item: item.event_id)
            summaries.append(
                {
                    "trace_id": trace_id_value,
                    "session_id": session_id_value,
                    "event_count": len(trace_events),
                    "started_at": float(trace_events[0].created_at),
                    "latest_event_at": float(trace_events[-1].created_at),
                    "latest_event_id": int(trace_events[-1].event_id),
                }
            )
        summaries.sort(
            key=lambda item: (item["latest_event_at"], item["latest_event_id"]),
            reverse=True,
        )
        return summaries[: max(1, int(limit))]


async def _execute_request_inline(
    runtime: Any,
    *,
    request_id: str,
    message: str,
    session_id: str,
    request_metadata: dict[str, Any],
) -> None:
    session_id = session_id.strip()
    trace_id: str | None = None
    with bound_request_id(request_id):
        try:
            trace_id = await start_request_trace(
                runtime.app_id,
                request_id,
                session_id=session_id,
                message=message,
            )
            workflow_state = await load_request_context(
                runtime.app_id,
                request_id,
                session_id,
                trace_id,
                message,
            )
            while True:
                workflow_state = await plan_request_step(
                    runtime.app_id,
                    request_id,
                    session_id,
                    trace_id,
                    workflow_state,
                )
                action_payload = dict(workflow_state.get("action") or {})
                tool_calls = context_helpers.tool_calls_from_action_payload(action_payload)
                for tool_call in tool_calls:
                    workflow_state = await run_step_tool_call(
                        runtime.app_id,
                        request_id,
                        session_id,
                        trace_id,
                        workflow_state,
                        {
                            "id": tool_call.id,
                            "name": tool_call.name,
                            "arguments": dict(tool_call.arguments or {}),
                        },
                    )
                workflow_state = await commit_request_step(
                    runtime.app_id,
                    session_id=session_id,
                    trace_id=trace_id,
                    workflow_state=workflow_state,
                )
                if not bool(workflow_state.get("done")):
                    continue
                turn_payload = await persist_completed_turn(
                    runtime.app_id,
                    request_id,
                    session_id,
                    trace_id,
                    message=message,
                    workflow_state=workflow_state,
                    request_metadata=request_metadata,
                )
                await complete_request(
                    runtime.app_id,
                    request_id,
                    session_id,
                    trace_id,
                    turn_payload,
                )
                return
        except Exception as exc:
            await fail_request(
                runtime.app_id,
                request_id,
                session_id,
                trace_id,
                exc,
            )


class _TestDBOSRequestEngine:
    def __init__(self, runtime: Any, *, database_url: str) -> None:
        self._runtime = runtime
        self._database_url = database_url
        self._tasks: set[asyncio.Task[None]] = set()

    async def open(self) -> None:
        from mash.runtime.engine.dbos import register_runtime

        register_runtime(self._runtime)

    async def close(self) -> None:
        from mash.runtime.engine.dbos import unregister_runtime

        tasks = list(self._tasks)
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self._tasks.clear()
        unregister_runtime(self._runtime)

    async def start_request(
        self,
        *,
        request_id: str,
        message: str,
        session_id: str,
        request_metadata: dict[str, Any],
    ) -> None:
        task = asyncio.create_task(
            _execute_request_inline(
                self._runtime,
                request_id=request_id,
                message=message,
                session_id=session_id,
                request_metadata=dict(request_metadata or {}),
            ),
            name=f"TestRequest-{self._runtime.app_id}-{request_id}",
        )
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)


class _MasherTestLLM(LLMProvider):
    @property
    def model(self) -> str:
        return "test-model"

    async def send(self, request: LLMRequest) -> LLMResponse:
        del request
        return LLMResponse(
            text="masher:test",
            tool_calls=[],
            content_blocks=[LLMContentBlock.text("masher:test")],
            stop_reason="end_turn",
            usage=LLMTokenUsage(input_tokens=1, output_tokens=1, total_tokens=2),
        )

    def set_event_logger(self, logger, session_id: str, app_id: str) -> None:
        del logger, session_id, app_id

    def set_trace_id(self, trace_id: Optional[str]) -> None:
        del trace_id


@pytest.fixture(autouse=True, scope="session")
def _patch_hosted_runtime_for_tests():
    from _pytest.monkeypatch import MonkeyPatch

    patcher = MonkeyPatch()
    patcher.setenv("MASH_RUNTIME_DATABASE_URL", "postgresql://test/runtime")
    patcher.setenv("DBOS_CONDUCTOR_KEY", "test-conductor-key")
    patcher.setattr("mash.runtime.service.PostgresRuntimeStore", _TestRuntimeStore)
    patcher.setattr("mash.runtime.service.DBOSRequestEngine", _TestDBOSRequestEngine)
    patcher.setattr(
        "mash.agents.masher.spec.MasherAgentSpec.build_llm",
        lambda self: _MasherTestLLM(),
    )
    yield
    patcher.undo()
