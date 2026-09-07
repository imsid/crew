"""The ``consumption-dip`` workflow: one module per step, named for its ``step_id``.

``run.py`` is the only module that imports all three steps; ``constants.py`` holds the
ids they share, so the step modules never have to import the builder.
"""

from __future__ import annotations

from .constants import SKILL_NAME, WORKFLOW_ID
from .run import build_consumption_dip_workflow

__all__ = ["SKILL_NAME", "WORKFLOW_ID", "build_consumption_dip_workflow"]
