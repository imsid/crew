from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from mash.runtime import AgentHost

    from ..beta.store import BetaStore
    from ..workflow.service import WorkflowService


@dataclass(frozen=True)
class RuntimeContext:
    store: BetaStore
    host: AgentHost
    primary_agent_id: str
    workflow: WorkflowService


_runtime_context: RuntimeContext | None = None


def set_runtime_context(
    *,
    store: BetaStore,
    host: AgentHost,
    primary_agent_id: str,
    workflow: WorkflowService,
) -> None:
    global _runtime_context
    resolved_primary_agent_id = str(primary_agent_id or "").strip()
    if not resolved_primary_agent_id:
        raise ValueError("primary_agent_id is required")
    _runtime_context = RuntimeContext(
        store=store,
        host=host,
        primary_agent_id=resolved_primary_agent_id,
        workflow=workflow,
    )


def get_runtime_context() -> RuntimeContext:
    if _runtime_context is None:
        raise RuntimeError("Crew runtime context is not available")
    return _runtime_context


def clear_runtime_context() -> None:
    global _runtime_context
    _runtime_context = None
