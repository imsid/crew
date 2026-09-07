"""One package per play workflow.

A play workflow is three steps: a code precheck that selects candidates into
``crm_db.play_candidates`` for a run, an agent step that turns that run into a handful
of plays, and a code postcheck that validates the proposal and commits it. The contracts,
agent step, and postcheck are shared; each workflow package keeps its readable selection
logic, snapshot schemas, identifiers, and explicit assembly.
"""

from __future__ import annotations

from mash.workflows import WorkflowSpec

from ..context import PlayRuntimeContext
from .consumption_dip import build_consumption_dip_workflow
from .expansion_pqa import build_expansion_pqa_workflow


def build_play_workflows(ctx: PlayRuntimeContext) -> list[WorkflowSpec]:
    """Every play workflow, for registration on the pool."""

    return [build_consumption_dip_workflow(ctx), build_expansion_pqa_workflow(ctx)]


__all__ = [
    "build_consumption_dip_workflow",
    "build_expansion_pqa_workflow",
    "build_play_workflows",
]
