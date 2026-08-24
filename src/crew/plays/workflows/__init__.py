"""One module per play workflow.

A play workflow is two steps: a code step that selects candidates into
``crm_db.play_candidates`` for a run, and an agent step that turns that run into a
handful of plays. Everything specific to a workflow — its gate, its snapshots, the
schemas that describe them, and the strategy skill the agent loads — lives in its own
module, so a new workflow is a new file here plus a new skill.
"""

from __future__ import annotations

from mash.workflows import WorkflowSpec

from ..context import PlayRuntimeContext
from .churn_detection import build_churn_detection_workflow


def build_play_workflows(ctx: PlayRuntimeContext) -> list[WorkflowSpec]:
    """Every play workflow, for registration on the pool."""

    return [build_churn_detection_workflow(ctx)]


__all__ = ["build_churn_detection_workflow", "build_play_workflows"]
