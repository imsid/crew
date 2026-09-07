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
TemplateScalar: TypeAlias = StrictStr | StrictInt | StrictFloat | StrictBool


class StructuredOutput(BaseModel):
    """Reject fields outside the workflow's declared agent contract."""

    model_config = ConfigDict(extra="forbid")


class TemplateVariable(StructuredOutput):
    """How one named value is rendered in every candidate on a play."""

    name: str = Field(
        description="Placeholder name from copy_template, without the surrounding braces."
    )
    format: TemplateFormat = Field(
        description="Rendering format for this placeholder's candidate value."
    )


class TemplateValue(StructuredOutput):
    """One named value used to render a candidate's copy."""

    name: str = Field(
        description=(
            "Placeholder name from the play's copy_template. Do not include org_name, "
            "which is supplied by the candidate field."
        )
    )
    value: TemplateScalar = Field(
        description="Raw value copied from this candidate's supplied evidence."
    )


class CuratedCandidate(StructuredOutput):
    """One candidate assigned to a play, with only that template's values."""

    org_id: str
    org_name: str
    values: list[TemplateValue] = Field(
        description=(
            "Exactly one raw substitution value for each copy_template placeholder "
            "other than org_name; do not include unused evidence or reasoning."
        )
    )


class CuratedPlay(StructuredOutput):
    """One action, its copy, and the candidates assigned to it."""

    play_name: str
    criteria: str
    copy_template: str = Field(
        description=(
            "Reusable copy with {name} placeholders for every account-specific name "
            "or fact; never hard-code a candidate's name or figures."
        )
    )
    template_vars: list[TemplateVariable] = Field(
        description=(
            "Exactly one declaration for every {placeholder} used by copy_template, "
            "including org_name, and no unused declarations."
        )
    )
    candidates: list[CuratedCandidate]


class CuratedRun(StructuredOutput):
    """The complete, typed judgment returned by the agent.

    Mash carries the original workflow fields forward alongside an agent step's output.
    Ignore that top-level envelope when this model is used by the following code step.
    The provider-facing schema is still closed, and nested curation models still reject
    undeclared fields.
    """

    model_config = ConfigDict(extra="ignore")

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
    "TemplateScalar",
    "TemplateValue",
    "TemplateVariable",
    "build_curate_plays_step",
]
