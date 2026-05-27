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


_RUNTIME_CONTEXT_HOLDER: dict[str, RuntimeContext | None] = {"value": None}


def set_runtime_context(
    *,
    store: BetaStore,
    host: AgentHost,
    primary_agent_id: str,
    workflow: WorkflowService,
) -> None:
    resolved_primary_agent_id = str(primary_agent_id or "").strip()
    if not resolved_primary_agent_id:
        raise ValueError("primary_agent_id is required")
    _RUNTIME_CONTEXT_HOLDER["value"] = RuntimeContext(
        store=store,
        host=host,
        primary_agent_id=resolved_primary_agent_id,
        workflow=workflow,
    )


def get_runtime_context() -> RuntimeContext:
    context = _RUNTIME_CONTEXT_HOLDER["value"]
    if context is None:
        raise RuntimeError("Crew runtime context is not available")
    return context


def clear_runtime_context() -> None:
    _RUNTIME_CONTEXT_HOLDER["value"] = None
