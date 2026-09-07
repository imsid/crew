"""One package per play workflow.

A play workflow is three steps: a code precheck that selects candidates into
``crm_db.play_candidates`` for a run, an agent step that turns that run into a handful
of plays, and a code postcheck that validates the proposal and commits it. Everything
specific to a workflow — its gate, its snapshots, the schemas that describe them, and
the strategy skill the agent loads — lives in its own package, so a new workflow is a
new package here plus a new skill.
"""

from __future__ import annotations

from mash.workflows import WorkflowSpec

from ..context import PlayRuntimeContext
from .consumption_dip import build_consumption_dip_workflow


def build_play_workflows(ctx: PlayRuntimeContext) -> list[WorkflowSpec]:
    """Every play workflow, for registration on the pool."""

    return [build_consumption_dip_workflow(ctx)]


__all__ = ["build_consumption_dip_workflow", "build_play_workflows"]
