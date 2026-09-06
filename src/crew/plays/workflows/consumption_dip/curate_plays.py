"""Step 2 of ``consumption-dip`` — one reasoning pass over an immutable input.

The agent groups the selected candidates into plays and returns the template values each
play needs. The result is self-contained: the commit step can validate, render, and write
it without reading the candidate snapshots again.
"""

from __future__ import annotations

from typing import Literal, TypeAlias

from mash.workflows import AgentStep
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
)

from .constants import GROWTH_AGENT_ID, SKILL_NAME
from .select_play_candidates import CandidateSet


TemplateFormat: TypeAlias = Literal["percent", "usd", "integer", "number", "text"]
TemplateValue: TypeAlias = StrictStr | StrictInt | StrictFloat | StrictBool


class StructuredOutput(BaseModel):
    """Reject fields outside the workflow's declared agent contract."""

    model_config = ConfigDict(extra="forbid")


class TemplateVariable(StructuredOutput):
    """How one named value is rendered in every candidate on a play."""

    format: TemplateFormat


class CuratedCandidate(StructuredOutput):
    """One candidate assigned to a play, with only that template's values."""

    org_id: str
    org_name: str
    values: dict[str, TemplateValue]


class CuratedPlay(StructuredOutput):
    """One action, its copy, and the candidates assigned to it."""

    play_name: str
    criteria: str
    copy_template: str
    template_vars: dict[str, TemplateVariable]
    candidates: list[CuratedCandidate]


class CuratedRun(StructuredOutput):
    """The complete, typed judgment returned by the agent."""

    title: str = Field(description="Short title for the curation briefing.")
    summary: str = Field(description="Decision summary grounded in the candidate data.")
    plays: list[CuratedPlay]


def build_curate_plays_step() -> AgentStep:
    return AgentStep(
        step_id="curate-plays",
        agent_id=GROWTH_AGENT_ID,
        input=CandidateSet,
        output=CuratedRun,
        skill_name=SKILL_NAME,
    )


__all__ = [
    "CuratedCandidate",
    "CuratedPlay",
    "CuratedRun",
    "TemplateFormat",
    "TemplateValue",
    "TemplateVariable",
    "build_curate_plays_step",
]
