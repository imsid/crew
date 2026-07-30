"""Growth Crew: the two 'Own NRR' workflows (Consumption Dip Rescue, Expansion/PQA).

Code steps read/write BigQuery through :class:`CrewGrowthRuntimeContext`; agent steps
run the ``growth`` agent's loop with structured output. See src/crew/context/** for the
company context the agent steps reason over and docs/nrr-workflows-implementation-plan.md.
"""

from __future__ import annotations

from .context import CrewGrowthRuntimeContext

__all__ = ["CrewGrowthRuntimeContext", "build_growth_workflows"]


def build_growth_workflows(ctx: CrewGrowthRuntimeContext):
    """Build both workflow specs bound to ``ctx``. Imported lazily to avoid a hard
    dependency on the workflow modules at package import time."""
    from .dip_rescue import build_dip_rescue_who_workflow, build_dip_rescue_workflow
    from .expansion import build_expansion_who_workflow, build_expansion_workflow

    return [
        build_dip_rescue_workflow(ctx),
        build_expansion_workflow(ctx),
        # Read-only WHO-only sub-workflows (candidate discovery, no agent/no writes).
        build_dip_rescue_who_workflow(ctx),
        build_expansion_who_workflow(ctx),
    ]
