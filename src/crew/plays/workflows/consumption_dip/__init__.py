"""Consumption-specific selection and explicit three-step workflow assembly."""

from __future__ import annotations

from .constants import SKILL_NAME, WORKFLOW_ID
from .run import build_consumption_dip_workflow

__all__ = ["SKILL_NAME", "WORKFLOW_ID", "build_consumption_dip_workflow"]
