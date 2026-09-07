"""Shared input and candidate contracts for three-step play workflows."""

from __future__ import annotations

from pydantic import BaseModel

from ..data_loaders.play_candidates import CandidateRecord


class PlayWorkflowInput(BaseModel):
    """The inputs every candidate-table play workflow requires."""

    as_of_date: str
    workspace_id: str


class CandidateSet(BaseModel):
    """The complete, read-only input passed from selection to Growth judgment."""

    as_of_date: str
    org_snapshot_schema: dict[str, dict[str, str]]
    usage_snapshot_schema: dict[str, dict[str, str]]
    candidates: list[CandidateRecord]


__all__ = ["CandidateSet", "PlayWorkflowInput"]
