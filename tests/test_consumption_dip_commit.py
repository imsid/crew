"""The typed curation contract and its deterministic commit step."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from typing import Any

import pytest
from mash.runtime.structured_output import serialize_structured_output

from crew.plays.data_loaders import plays
from crew.plays.data_loaders.play_candidates import CandidateRecord
from crew.plays.workflows.consumption_dip import WORKFLOW_ID
from crew.plays.workflows.consumption_dip.commit_plays import (
    _commit_step,
    artifact_id_for,
    render_curated_document,
    validate_curated_run,
)
from crew.plays.workflows.consumption_dip.curate_plays import (
    CuratedCandidate,
    CuratedPlay,
    CuratedRun,
    TemplateValue,
    TemplateVariable,
)
from crew.plays.workflows.consumption_dip.select_play_candidates import (
    CandidateSet,
    ConsumptionDipInput,
)

RUN_ID = "mw:r_CBsgvU7QMtXz:consumption-dip:iCmMgCXUQPzzmANG"


class _FakeStepContext:
    def __init__(self, run_id: str, workflow_input: dict[str, Any]) -> None:
        self.run_id = run_id
        self.step_id = "commit-plays"
        self.workflow_input = workflow_input
        self.attempt = 1


class _FakeContext:
    """A run's two tables in memory, answering loader queries from them."""

    crm_dataset_id = "crm_db"

    def __init__(self, candidates: list[dict[str, Any]] | None = None) -> None:
        self.candidates = candidates or []
        self.plays: dict[str, dict[str, Any]] = {}
        self.transactions: list[list[tuple[str, list[Any]]]] = []
        self.writes: list[str] = []
        self.queries: list[str] = []
        self.fail_on_transaction = False

    def entity_table_ref(self, dataset_id: str, source_id: str) -> str:
        return f"`test.{dataset_id}.{source_id}`"

    def query(self, sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
        self.queries.append(sql)
        if "COUNTIF(play_id IS NULL)" in sql:
            unassigned = len([c for c in self.candidates if not c.get("play_id")])
            return [{"total": len(self.candidates), "unassigned": unassigned}]
        if "COUNT(*)" in sql:
            return [{"n": len(self.candidates)}]
        if "JSON_KEYS" in sql:
            keys: list[dict[str, Any]] = []
            for container in ("org_snapshot", "usage_snapshot"):
                for row in self.candidates:
                    for field, value in json.loads(row[container] or "{}").items():
                        keys.append(
                            {
                                "container": container,
                                "field": field,
                                "json_type": (
                                    "number"
                                    if isinstance(value, (int, float))
                                    else "string"
                                ),
                            }
                        )
            return keys
        return list(self.candidates)

    def execute_write(self, sql: str, params: list[Any] | None = None) -> None:
        self.writes.append(sql)

    def execute_transaction(self, statements: list[tuple[str, list[Any]]]) -> None:
        self.transactions.append(statements)
        if self.fail_on_transaction:
            raise RuntimeError("assignment update failed")

        staged_plays = dict(self.plays)
        for sql, params in statements:
            by_name = {p.name: p for p in params}
            if sql.strip().startswith("MERGE"):
                for struct in by_name["plays"].values:
                    fields = dict(struct.struct_values)
                    staged_plays[fields["play_id"]] = fields
            else:
                assignments = {
                    dict(struct.struct_values)["org_id"]: dict(struct.struct_values)[
                        "play_id"
                    ]
                    for struct in by_name["assignments"].values
                }
                for row in self.candidates:
                    if row.get("play_id") is None and row["org_id"] in assignments:
                        row["play_id"] = assignments[row["org_id"]]
        self.plays = staged_plays


@pytest.fixture()
def tmp_workspace(tmp_path, monkeypatch) -> str:
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))
    (tmp_path / "run_workspace").mkdir()
    return "run_workspace"


@pytest.fixture()
def tmp_workspace_pair(tmp_path, monkeypatch):
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))
    run_workspace = tmp_path / "run_workspace"
    other_workspace = tmp_path / "other_workspace"
    run_workspace.mkdir()
    other_workspace.mkdir()
    monkeypatch.setattr(
        "crew.shared.config.get_current_workspace", lambda: "other_workspace"
    )
    return run_workspace, other_workspace


def _candidate_row(org_id: str, org_name: str, dollars: float) -> dict[str, Any]:
    return {
        "org_id": org_id,
        "org_name": org_name,
        "play_id": None,
        "org_snapshot": json.dumps({"plan_tier": "business", "headcount": 60}),
        "usage_snapshot": json.dumps(
            {"decay_pct": 0.48, "dollars_at_risk": dollars}
        ),
    }


def _curated_candidate(
    org_id: str, org_name: str, *, decay_pct: float = 0.48
) -> CuratedCandidate:
    return CuratedCandidate(
        org_id=org_id,
        org_name=org_name,
        values=[TemplateValue(name="decay_pct", value=decay_pct)],
    )


def _play(
    name: str = "Startup re-engagement",
    candidates: list[CuratedCandidate] | None = None,
) -> CuratedPlay:
    return CuratedPlay(
        play_name=name,
        criteria="Accounts with a sustained consumption decline.",
        copy_template="{org_name} is down {decay_pct} from baseline.",
        template_vars=[
            TemplateVariable(name="org_name", format="text"),
            TemplateVariable(name="decay_pct", format="percent"),
        ],
        candidates=candidates
        if candidates is not None
        else [
            _curated_candidate("org-1", "Northwind Labs"),
            _curated_candidate("org-2", "Meridian Data"),
        ],
    )


def _curated_run(**overrides: Any) -> CuratedRun:
    payload: dict[str, Any] = {
        "title": "Consumption Dip Rescue",
        "summary": "Two accounts on one retention play.",
        "plays": [_play()],
    }
    payload.update(overrides)
    return CuratedRun(**payload)


# --------------------------------------------------------------------------------------
# Validation
# --------------------------------------------------------------------------------------


def test_validation_reports_every_problem_at_once() -> None:
    curated = _curated_run(
        plays=[
            CuratedPlay(
                play_name="Broken template",
                criteria="c",
                copy_template="{org_name} score {score}.",
                template_vars=[
                    TemplateVariable(name="org_name", format="text"),
                    TemplateVariable(name="score", format="number"),
                ],
                candidates=[
                    CuratedCandidate(
                        org_id="org-1", org_name="Northwind Labs", values=[]
                    ),
                    CuratedCandidate(
                        org_id="org-1", org_name="Northwind Labs", values=[]
                    ),
                ],
            )
        ]
    )

    with pytest.raises(ValueError) as excinfo:
        validate_curated_run(curated, run_org_ids={"org-1", "org-2"})

    message = str(excinfo.value)
    assert "score" in message
    assert "org-1" in message
    assert "org-2" in message
    assert "(3 problems)" in message


def test_a_candidate_missing_a_template_value_is_rejected() -> None:
    curated = _curated_run(
        plays=[
            CuratedPlay(
                play_name="Diagnostic",
                criteria="c",
                copy_template="{org_name} is down {decay_pct}.",
                template_vars=[
                    TemplateVariable(name="org_name", format="text"),
                    TemplateVariable(name="decay_pct", format="percent"),
                ],
                candidates=[
                    CuratedCandidate(
                        org_id="org-1", org_name="Northwind Labs", values=[]
                    )
                ],
            )
        ]
    )

    with pytest.raises(ValueError, match="missing values for: decay_pct"):
        validate_curated_run(curated, run_org_ids={"org-1"})


def test_an_org_on_no_play_is_rejected_and_nothing_is_written() -> None:
    ctx = _FakeContext(
        [
            _candidate_row("org-1", "Northwind Labs", 385.99),
            _candidate_row("org-2", "Meridian Data", 329.59),
        ]
    )
    curated = _curated_run(
        plays=[_play(candidates=[_curated_candidate("org-1", "Northwind Labs")])]
    )

    with pytest.raises(ValueError, match="in the run and on no play"):
        _run_commit(ctx, curated)

    assert ctx.transactions == []
    assert ctx.plays == {}
    assert all(row["play_id"] is None for row in ctx.candidates)


def test_an_org_on_two_plays_is_rejected() -> None:
    curated = _curated_run(
        plays=[
            _play("Play A"),
            _play(
                "Play B",
                candidates=[_curated_candidate("org-1", "Northwind Labs")],
            ),
        ]
    )

    with pytest.raises(ValueError, match="more than one play"):
        validate_curated_run(curated, run_org_ids={"org-1", "org-2"})


def test_an_empty_play_is_rejected() -> None:
    curated = _curated_run(plays=[_play(candidates=[])])

    with pytest.raises(ValueError, match="plays have no orgs"):
        validate_curated_run(curated, run_org_ids=set())


def test_null_template_values_are_rejected_by_the_output_model() -> None:
    with pytest.raises(Exception):
        TemplateValue(name="score", value=None)


def test_agent_output_rejects_fields_outside_the_contract() -> None:
    with pytest.raises(Exception):
        CuratedCandidate(
            org_id="org-1",
            org_name="Northwind",
            values=[],
            usage_snapshot={},
        )


def test_curated_run_discards_forwarded_workflow_envelope_fields() -> None:
    curated = _curated_run()
    payload = {
        **curated.model_dump(),
        "as_of_date": "2026-05-28",
        "workspace_id": "product_usage_db",
    }

    parsed = CuratedRun.model_validate(payload)

    assert parsed.model_dump() == curated.model_dump()
    assert serialize_structured_output(CuratedRun)["additionalProperties"] is False


def test_numeric_formats_reject_string_values() -> None:
    curated = _curated_run(
        plays=[
            _play(
                candidates=[
                    CuratedCandidate(
                        org_id="org-1",
                        org_name="Northwind Labs",
                        values=[TemplateValue(name="decay_pct", value="0.48")],
                    )
                ]
            )
        ]
    )

    with pytest.raises(ValueError, match="incompatible with format 'percent'"):
        validate_curated_run(curated, run_org_ids={"org-1"})


# --------------------------------------------------------------------------------------
# The artifact
# --------------------------------------------------------------------------------------


def test_the_document_is_deterministic_given_a_curated_run() -> None:
    at = datetime(2026, 8, 30, 9, 0, tzinfo=timezone.utc)
    kwargs = dict(run_id=RUN_ID, workflow_id=WORKFLOW_ID, curated=_curated_run())

    assert render_curated_document(updated_at=at, **kwargs) == render_curated_document(
        updated_at=at, **kwargs
    )


def test_the_document_renders_copy_from_the_agent_output() -> None:
    document = render_curated_document(
        run_id=RUN_ID,
        workflow_id=WORKFLOW_ID,
        curated=_curated_run(),
        updated_at=datetime(2026, 8, 30, 9, 0, tzinfo=timezone.utc),
    )

    assert document.startswith("---\n")
    assert f"artifact_id: {artifact_id_for(WORKFLOW_ID, RUN_ID)}" in document
    assert "## Summary" in document and "## Next Steps" in document
    assert "> Northwind Labs is down 48% from baseline." in document
    assert "| decay_pct |" in document


def test_the_document_names_no_consumption_specific_field() -> None:
    curated = CuratedRun(
        title="Expansion Openings",
        summary="One account with seat headroom.",
        plays=[
            CuratedPlay(
                play_name="Seat expansion",
                criteria="Saturated teams still hiring.",
                copy_template="{org_name} is at {seat_utilization} of its licences.",
                template_vars=[
                    TemplateVariable(name="org_name", format="text"),
                    TemplateVariable(name="seat_utilization", format="percent"),
                ],
                candidates=[
                    CuratedCandidate(
                        org_id="org-9",
                        org_name="Helio Robotics",
                        values=[TemplateValue(name="seat_utilization", value=0.94)],
                    )
                ],
            )
        ],
    )

    document = render_curated_document(
        run_id="mw:r_x:seat-expansion:y",
        workflow_id="seat-expansion",
        curated=curated,
        updated_at=datetime(2026, 8, 30, 9, 0, tzinfo=timezone.utc),
    )

    assert "> Helio Robotics is at 94% of its licences." in document
    assert "| seat_utilization |" in document
    assert "decay_pct" not in document and "consumption-dip" not in document


def test_artifact_id_survives_a_colon_delimited_run_id() -> None:
    artifact_id = artifact_id_for(WORKFLOW_ID, RUN_ID)

    assert ":" not in artifact_id
    assert re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", artifact_id)


# --------------------------------------------------------------------------------------
# Transactional write
# --------------------------------------------------------------------------------------


def _run_commit(ctx: _FakeContext, curated: CuratedRun, workspace: str = "marketing_db"):
    step = _commit_step(ctx, WORKFLOW_ID)
    return step(curated, _FakeStepContext(RUN_ID, {"workspace_id": workspace}))


def test_a_failed_assignment_leaves_no_plays_behind(tmp_workspace) -> None:
    ctx = _FakeContext(
        [
            _candidate_row("org-1", "Northwind Labs", 385.99),
            _candidate_row("org-2", "Meridian Data", 329.59),
        ]
    )
    ctx.fail_on_transaction = True

    with pytest.raises(RuntimeError, match="assignment update failed"):
        _run_commit(ctx, _curated_run(), workspace=tmp_workspace)

    assert ctx.plays == {}
    assert all(row["play_id"] is None for row in ctx.candidates)


def test_commit_does_not_reload_candidate_snapshots(tmp_workspace) -> None:
    ctx = _FakeContext(
        [
            _candidate_row("org-1", "Northwind Labs", 385.99),
            _candidate_row("org-2", "Meridian Data", 329.59),
        ]
    )

    _run_commit(ctx, _curated_run(), workspace=tmp_workspace)

    assert not any("org_snapshot" in query for query in ctx.queries)
    assert not any("usage_snapshot" in query for query in ctx.queries)


def test_re_running_the_commit_step_does_not_duplicate_plays(tmp_workspace) -> None:
    ctx = _FakeContext(
        [
            _candidate_row("org-1", "Northwind Labs", 385.99),
            _candidate_row("org-2", "Meridian Data", 329.59),
        ]
    )
    curated = _curated_run()

    first = _run_commit(ctx, curated, workspace=tmp_workspace)
    second = _run_commit(ctx, curated, workspace=tmp_workspace)

    assert len(ctx.plays) == 1
    assert first.plays_created == second.plays_created == 1
    assert first.artifact_id == second.artifact_id
    assert second.unassigned_remaining == 0
    assert second.orgs_assigned == 2


def test_the_commit_step_writes_into_the_run_s_workspace(tmp_workspace_pair) -> None:
    run_workspace, other_workspace = tmp_workspace_pair
    ctx = _FakeContext([_candidate_row("org-1", "Northwind Labs", 385.99)])
    curated = _curated_run(
        plays=[_play(candidates=[_curated_candidate("org-1", "Northwind Labs")])]
    )

    summary = _run_commit(ctx, curated, workspace=run_workspace.name)

    written = list((run_workspace / "artifacts").glob("*.md"))
    assert [path.stem for path in written] == [summary.artifact_id]
    assert list((other_workspace / "artifacts").glob("*.md")) == []


def test_an_empty_run_writes_nothing_and_reports_zeros(tmp_workspace) -> None:
    ctx = _FakeContext([])

    summary = _run_commit(
        ctx,
        CuratedRun(
            title="Nothing qualified", summary="No orgs passed the gate.", plays=[]
        ),
        workspace=tmp_workspace,
    )

    assert (summary.plays_created, summary.orgs_assigned) == (0, 0)
    assert summary.artifact_id is None
    assert RUN_ID in (summary.notes or "")
    assert ctx.transactions == []


# --------------------------------------------------------------------------------------
# Agent input and output contracts
# --------------------------------------------------------------------------------------


def test_agent_input_requires_both_snapshot_containers() -> None:
    with pytest.raises(Exception):
        CandidateRecord(org_id="org-1", org_name="Northwind", org_snapshot={})
    with pytest.raises(Exception):
        CandidateRecord(org_id="org-1", org_name="Northwind", usage_snapshot={})


def test_agent_input_contains_rows_but_not_database_lookup_mechanics() -> None:
    assert set(CandidateSet.model_fields) == {
        "as_of_date",
        "org_snapshot_schema",
        "usage_snapshot_schema",
        "candidates",
    }


def test_agent_output_groups_candidates_inside_plays() -> None:
    assert set(CuratedRun.model_fields) == {"title", "summary", "plays"}
    assert set(CuratedPlay.model_fields) == {
        "play_name",
        "criteria",
        "copy_template",
        "template_vars",
        "candidates",
    }
    assert set(CuratedCandidate.model_fields) == {"org_id", "org_name", "values"}


def test_agent_exposes_one_percent_and_one_usd_format() -> None:
    schema = TemplateVariable.model_json_schema()
    assert schema["properties"]["format"]["enum"] == [
        "percent",
        "usd",
        "integer",
        "number",
        "text",
    ]


def test_agent_output_uses_provider_safe_lists_for_named_values() -> None:
    schema = serialize_structured_output(CuratedRun)

    assert schema is not None
    play = schema["$defs"]["CuratedPlay"]
    candidate = schema["$defs"]["CuratedCandidate"]
    assert play["properties"]["template_vars"]["type"] == "array"
    assert candidate["properties"]["values"]["type"] == "array"


def test_duplicate_variable_and_value_names_are_rejected() -> None:
    curated = _curated_run(
        plays=[
            CuratedPlay(
                play_name="Duplicate names",
                criteria="c",
                copy_template="{org_name} is down {decay_pct}.",
                template_vars=[
                    TemplateVariable(name="org_name", format="text"),
                    TemplateVariable(name="decay_pct", format="percent"),
                    TemplateVariable(name="decay_pct", format="number"),
                ],
                candidates=[
                    CuratedCandidate(
                        org_id="org-1",
                        org_name="Northwind Labs",
                        values=[
                            TemplateValue(name="decay_pct", value=0.48),
                            TemplateValue(name="decay_pct", value=0.49),
                        ],
                    )
                ],
            )
        ]
    )

    with pytest.raises(ValueError) as excinfo:
        validate_curated_run(curated, run_org_ids={"org-1"})

    assert "declares template variables more than once: decay_pct" in str(excinfo.value)
    assert "duplicate candidate values: decay_pct" in str(excinfo.value)


def test_a_run_without_a_workspace_is_rejected_at_input_validation() -> None:
    with pytest.raises(Exception) as excinfo:
        ConsumptionDipInput.model_validate({"as_of_date": "2026-05-28"})

    assert "workspace_id" in str(excinfo.value)


def test_play_ids_are_derived_from_the_run_not_the_payload(tmp_workspace) -> None:
    ctx = _FakeContext(
        [
            _candidate_row("org-1", "Northwind Labs", 385.99),
            _candidate_row("org-2", "Meridian Data", 329.59),
        ]
    )

    _run_commit(ctx, _curated_run(), workspace=tmp_workspace)

    expected = plays.play_id_for(RUN_ID, "Startup re-engagement")
    assert list(ctx.plays) == [expected]
    assert {row["play_id"] for row in ctx.candidates} == {expected}
