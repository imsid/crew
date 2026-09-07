"""The three ids the steps and the builder share.

Their own module because the dependency runs one way: ``run.py`` imports the step
builders, and every step builder needs the ids. Nothing else lives here — the gate
thresholds sit next to the code that applies them and the snapshot schemas next to the
code that builds the snapshots, so neither pair can drift.

``WORKFLOW_ID`` is data-visible: it is written to the ``workflow_id`` column of both
``plays`` and ``play_candidates``, and it is embedded in every run id
(``mw:r_...:consumption-dip:...``).
"""

from __future__ import annotations

WORKFLOW_ID = "consumption-dip"
SKILL_NAME = "consumption-dip"
GROWTH_AGENT_ID = "growth"

__all__ = ["GROWTH_AGENT_ID", "SKILL_NAME", "WORKFLOW_ID"]
