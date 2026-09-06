"""``consumption-dip`` — precheck, judgment, postcheck.

A consumption tool has no cancel event: revenue leaks silently as usage decays, so the
churn-equivalent signal has to be manufactured from the usage trajectory itself.

  select-play-candidates  (code)  — gate the usage panel, write the run's rows
  curate-plays            (agent) — group the accounts, write the copy templates
  commit-plays            (code)  — validate, write both tables, write the artifact

The split is what keeps the agent's turn count down: everything deterministic is code,
so the model does judgment and nothing else. It never mutates state — it returns a
``CuratedRun`` and the postcheck commits it.
"""

from __future__ import annotations

from mash.workflows import WorkflowSpec

from ...context import PlayRuntimeContext
from .commit_plays import build_commit_plays_step
from .constants import WORKFLOW_ID
from .curate_plays import build_curate_plays_step
from .select_play_candidates import ConsumptionDipInput, build_select_play_candidates_step


def build_consumption_dip_workflow(ctx: PlayRuntimeContext) -> WorkflowSpec:
    return WorkflowSpec(
        workflow_id=WORKFLOW_ID,
        input_model=ConsumptionDipInput,
        steps=[
            build_select_play_candidates_step(ctx),
            build_curate_plays_step(),
            build_commit_plays_step(ctx, WORKFLOW_ID),
        ],
    )


__all__ = ["build_consumption_dip_workflow"]
