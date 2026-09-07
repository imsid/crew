"""The explicit three-step ``expansion-pqa`` workflow."""

from __future__ import annotations

from mash.workflows import WorkflowSpec

from ...context import PlayRuntimeContext
from ..commit_plays import build_commit_plays_step
from ..contracts import PlayWorkflowInput
from ..curate_plays import build_curate_plays_step
from .constants import SKILL_NAME, WORKFLOW_ID
from .select_play_candidates import build_select_play_candidates_step


def build_expansion_pqa_workflow(ctx: PlayRuntimeContext) -> WorkflowSpec:
    return WorkflowSpec(
        workflow_id=WORKFLOW_ID,
        input_model=PlayWorkflowInput,
        steps=[
            build_select_play_candidates_step(ctx),
            build_curate_plays_step(SKILL_NAME),
            build_commit_plays_step(ctx, WORKFLOW_ID),
        ],
    )


__all__ = ["build_expansion_pqa_workflow"]
