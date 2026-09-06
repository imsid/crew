"""Step 3 of ``consumption-dip`` — the postcheck.

The only step that writes plays, assignments and the artifact. It takes the agent's
:class:`CuratedRun`, fills in the columns the agent has no business producing, checks the
whole proposal before touching anything, commits both tables together, and writes the
briefing.

The order matters. Validating before any write means a bad proposal leaves no partial
state; committing both tables in one transaction means a failure between them cannot
leave ``plays`` rows whose orgs still carry ``play_id IS NULL`` — a run that reads as an
incomplete curation rather than a failed one.

Nothing here names a snapshot field or branches on a ``workflow_id``. Each curated play
carries its candidates and template values, so the postcheck needs no snapshot read.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Optional

from mash.workflows import CodeStep, StepContext
from pydantic import BaseModel

from ....artifacts.service.context import build_tool_context
from ....artifacts.service.pathing import list_existing_artifact_paths
from ....artifacts.service.repo import write_new_artifact_file
from ....shared.runtime_paths import workspace_dir
from ....shared.workspace_context import bound_workspace
from ... import render
from ...context import PlayRuntimeContext
from ...data_loaders import play_candidates, plays
from ...data_loaders.plays import PlayRecord
from .curate_plays import CuratedCandidate, CuratedRun

# artifact_id has a narrower charset than a run id, which is colon-delimited.
_ARTIFACT_ID_UNSAFE_RE = re.compile(r"[^A-Za-z0-9_-]+")


class CurationSummary(BaseModel):
    """The run's bookkeeping. The content is the artifact."""

    run_id: str
    workflow_id: str
    plays_created: int
    orgs_assigned: int
    unassigned_remaining: int
    artifact_id: Optional[str] = None
    notes: Optional[str] = None


# --------------------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------------------


def validate_curated_run(
    curated: CuratedRun,
    *,
    run_org_ids: set[str],
) -> None:
    """Raise unless the whole proposal is committable, reporting every problem at once.

    The agent has no tool that could have told it any of this — removing ``create_play``
    removed the mid-run correction loop — so one failure per attempt would make a run
    fail four times over the same proposal. Everything checkable is collected first.
    """

    problems: list[str] = []

    play_names = [play.play_name for play in curated.plays]
    duplicate_plays = sorted({name for name in play_names if play_names.count(name) > 1})
    if duplicate_plays:
        problems.append(
            "two plays share a name, so their orgs cannot be told apart: "
            + ", ".join(duplicate_plays)
        )

    for play in curated.plays:
        template_vars = {
            name: spec.model_dump() for name, spec in play.template_vars.items()
        }
        try:
            render.validate_template(
                play.copy_template,
                template_vars,
                [_flatten(candidate) for candidate in play.candidates],
            )
        except ValueError as exc:
            problems.append(f"play '{play.play_name}': {exc}")

    candidates = [candidate for play in curated.plays for candidate in play.candidates]
    assigned = [candidate.org_id for candidate in candidates]
    twice = sorted({org_id for org_id in assigned if assigned.count(org_id) > 1})
    if twice:
        problems.append(
            "these orgs appear on more than one play; an org gets exactly one: "
            + ", ".join(twice)
        )

    missing = sorted(run_org_ids - set(assigned))
    if missing:
        problems.append(
            "these orgs are in the run and on no play: " + ", ".join(missing)
        )
    strangers = sorted(set(assigned) - run_org_ids)
    if strangers:
        problems.append(
            "these orgs are not in the run: " + ", ".join(strangers)
        )

    empty_plays = sorted(play.play_name for play in curated.plays if not play.candidates)
    if empty_plays:
        problems.append(
            "these plays have no orgs on them: " + ", ".join(empty_plays)
        )

    reserved_values = sorted(
        {
            key
            for candidate in candidates
            for key in candidate.values
            if key in {"org_id", "org_name"}
        }
    )
    if reserved_values:
        problems.append(
            "candidate values repeat reserved fields: " + ", ".join(reserved_values)
        )

    if problems:
        raise ValueError(
            f"the curated run cannot be committed ({len(problems)} problems): "
            + "; ".join(problems)
        )


# --------------------------------------------------------------------------------------
# The artifact
# --------------------------------------------------------------------------------------


def artifact_id_for(workflow_id: str, run_id: str) -> str:
    """``{workflow_id}-{run_id}``, in the charset artifact ids are allowed."""

    return _ARTIFACT_ID_UNSAFE_RE.sub("_", f"{workflow_id}-{run_id}").strip("_-") or "run"


def _flatten(candidate: CuratedCandidate) -> dict[str, Any]:
    """One candidate as the flat row ``render`` and the table both read."""

    return {
        "org_id": candidate.org_id,
        "org_name": candidate.org_name,
        **candidate.values,
    }


def _value_columns(curated: CuratedRun) -> list[str]:
    """Every template value in first-seen order."""

    columns: list[str] = []
    for play in curated.plays:
        for candidate in play.candidates:
            for key in candidate.values:
                if key not in columns:
                    columns.append(key)
    return columns


def _cell(value: Any) -> str:
    """One markdown table cell: pipes escaped, newlines flattened, blanks visible."""

    if value is None:
        return "—"
    return str(value).replace("|", "\\|").replace("\n", " ").strip() or "—"


def render_curated_document(
    *,
    run_id: str,
    workflow_id: str,
    curated: CuratedRun,
    updated_at: datetime,
) -> str:
    """Render a ``CuratedRun`` to an artifact document. Names no snapshot field.

    A pure walk over the self-contained judgment: the title and summary, a section per
    play, then a candidate table of the values used by its templates. Given the same
    inputs it produces the same bytes.
    """

    candidate_entries = [
        (play.play_name, candidate)
        for play in curated.plays
        for candidate in play.candidates
    ]
    candidates = [candidate for _, candidate in candidate_entries]

    lines = [
        "---",
        f"artifact_id: {artifact_id_for(workflow_id, run_id)}",
        "format: markdown",
        "source_agent: growth",
        f"title: {curated.title}",
        f"description: Curated plays and account assignments for {workflow_id} run {run_id}",
        "kind: curation_briefing",
        f"session_id: {run_id}",
        f"updated_at: {updated_at.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')}",
        "---",
        "",
        "## Summary",
        "",
        curated.summary.strip(),
        "",
        f"- Run: `{run_id}` (`{workflow_id}`)",
        f"- Accounts: {len(candidates)} across {len(curated.plays)} plays",
        "",
        "## Plays",
        "",
    ]

    for play in curated.plays:
        orgs = play.candidates
        lines += [
            f"### {play.play_name}",
            "",
            f"- **Accounts** ({len(orgs)}): "
            + (", ".join(f"{c.org_name} (`{c.org_id}`)" for c in orgs) or "—"),
            f"- **Criteria**: {play.criteria}",
            "- **Copy template**:",
            "",
            "  ```text",
            *(f"  {line}" for line in play.copy_template.splitlines() or [""]),
            "  ```",
            "",
        ]
        if orgs:
            example = orgs[0]
            template_vars = {
                name: spec.model_dump() for name, spec in play.template_vars.items()
            }
            rendered = render.render(
                play.copy_template, template_vars, _flatten(example)
            )
            lines += [
                f"- **Rendered for {example.org_name}**:",
                "",
                *(f"  > {line}" for line in rendered.splitlines() or [""]),
                "",
            ]

    columns = _value_columns(curated)
    lines += [
        "## Candidates",
        "",
        "| " + " | ".join(["Org ID", "Org Name", "Play", *columns]) + " |",
        "| " + " | ".join(["---"] * (3 + len(columns))) + " |",
    ]
    for play_name, candidate in candidate_entries:
        flat = _flatten(candidate)
        lines.append(
            "| "
            + " | ".join(
                [
                    f"`{candidate.org_id}`",
                    _cell(candidate.org_name),
                    _cell(play_name),
                    *(_cell(flat.get(column)) for column in columns),
                ]
            )
            + " |"
        )

    lines += [
        "",
        "## Next Steps",
        "",
    ]
    for play in curated.plays:
        orgs = play.candidates
        noun = "account" if len(orgs) == 1 else "accounts"
        lines.append(
            f"- **{play.play_name}** — send the copy above to {len(orgs)} {noun}: "
            + (", ".join(c.org_name for c in orgs) or "—")
        )
    lines.append(
        f"- The run's rows are in `crm_db.play_candidates` and `crm_db.plays` "
        f"filtered by `run_id = '{run_id}'`."
    )

    return "\n".join(lines).rstrip() + "\n"


def _write_artifact(
    *,
    run_id: str,
    workflow_id: str,
    workspace: str,
    curated: CuratedRun,
) -> str:
    """Write the briefing into the run's own workspace — never a resolved default."""

    artifact_id = artifact_id_for(workflow_id, run_id)
    with bound_workspace(workspace):
        context = build_tool_context(workspace_dir(workspace, require_exists=True))
        if list_existing_artifact_paths(context, artifact_id):
            # A retry of this step after the artifact landed. The document is a pure
            # function of the run, so the one on disk is the one we would write.
            return artifact_id
        result = write_new_artifact_file(
            context,
            render_curated_document(
                run_id=run_id,
                workflow_id=workflow_id,
                curated=curated,
                updated_at=datetime.now(timezone.utc),
            ),
        )
    return str(result["artifact_id"])


# --------------------------------------------------------------------------------------
# The step
# --------------------------------------------------------------------------------------


def _commit_step(ctx: PlayRuntimeContext, workflow_id: str):
    def run(inp: CuratedRun, step_ctx: StepContext) -> CurationSummary:
        # Neither of these comes off the payload: the run id is the framework's and the
        # workspace is the one the run was submitted with, so the model can neither echo
        # them wrong nor redirect the write. ``workflow_id`` is the caller's, bound when
        # the step was built — a parameter, not a branch.
        run_id = step_ctx.run_id
        workspace = str(step_ctx.workflow_input["workspace_id"])

        org_ids = play_candidates.run_org_ids(ctx, run_id)

        if not inp.plays and not org_ids:
            coverage = play_candidates.coverage(ctx, run_id)
            return CurationSummary(
                run_id=run_id,
                workflow_id=workflow_id,
                plays_created=0,
                orgs_assigned=0,
                unassigned_remaining=coverage["unassigned_remaining"],
                notes=f"no orgs qualified for run {run_id}; nothing to curate",
            )

        validate_curated_run(
            inp,
            run_org_ids=org_ids,
        )

        # The plays and their assignments are one fact: they commit together or the run
        # is untouched, never half-curated.
        now = datetime.now(timezone.utc)
        assignments = {
            candidate.org_id: plays.play_id_for(run_id, play.play_name)
            for play in inp.plays
            for candidate in play.candidates
        }
        play_records = [
            PlayRecord(
                play_name=play.play_name,
                criteria=play.criteria,
                copy_template=play.copy_template,
                template_vars={
                    name: spec.model_dump()
                    for name, spec in play.template_vars.items()
                },
            )
            for play in inp.plays
        ]
        ctx.execute_transaction(
            [
                plays.upsert_plays_statement(
                    ctx,
                    run_id=run_id,
                    workflow_id=workflow_id,
                    records=play_records,
                    now=now,
                ),
                play_candidates.set_play_id_statement(
                    ctx, run_id=run_id, assignments=assignments, now=now
                ),
            ]
        )

        artifact_id = _write_artifact(
            run_id=run_id,
            workflow_id=workflow_id,
            workspace=workspace,
            curated=inp,
        )

        # Counted off the table rather than off the model: what was written is the fact.
        coverage = play_candidates.coverage(ctx, run_id)
        return CurationSummary(
            run_id=run_id,
            workflow_id=workflow_id,
            plays_created=len(inp.plays),
            orgs_assigned=coverage["candidate_count"] - coverage["unassigned_remaining"],
            unassigned_remaining=coverage["unassigned_remaining"],
            artifact_id=artifact_id,
        )

    return run


def build_commit_plays_step(ctx: PlayRuntimeContext, workflow_id: str) -> CodeStep:
    """The commit step for one play workflow.

    ``workflow_id`` is a parameter because it is the one thing the step writes that
    neither the payload nor ``StepContext`` carries. Passing it keeps the step reusable:
    a second play workflow builds the same step with its own id.
    """

    return CodeStep(
        step_id="commit-plays",
        run=_commit_step(ctx, workflow_id),
        input=CuratedRun,
        output=CurationSummary,
    )


__all__ = [
    "CurationSummary",
    "artifact_id_for",
    "build_commit_plays_step",
    "render_curated_document",
    "validate_curated_run",
]
