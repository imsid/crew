"""The workflow and skill ids the steps and builder share.

Nothing else lives here: gate thresholds sit next to the code that applies them and
snapshot schemas next to the code that builds the snapshots, so neither pair can drift.

``WORKFLOW_ID`` is data-visible: it is written to the ``workflow_id`` column of both
``plays`` and ``play_candidates``, and it is embedded in every run id
(``mw:r_...:consumption-dip:...``).
"""

from __future__ import annotations

WORKFLOW_ID = "consumption-dip"
SKILL_NAME = "consumption-dip"

__all__ = ["SKILL_NAME", "WORKFLOW_ID"]
