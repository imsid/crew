from __future__ import annotations

import re
from pathlib import Path

from crew.cli.main import (
    build_parser,
    main,
)


def _workspace_root(root: Path) -> Path:
    return root / "marketing_db"


def _normalize_output(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _write_metric_fixture(root: Path) -> None:
    metrics_root = _workspace_root(root) / "metrics_layer" / "configs"
    (metrics_root / "sources").mkdir(parents=True, exist_ok=True)
    (metrics_root / "metrics").mkdir(parents=True, exist_ok=True)
    (metrics_root / "sources" / "ad_performance.yml").write_text(
        """kind: source
version: 1
id: ad_performance
dataset: marketing_db
table: campaign_ads
subject:
  - campaign_ad_id
ts: start_date
dimensions:
  - name: campaign_ad_id
    expr: campaign_ad_id
    data_type: INT64
  - name: campaign_id
    expr: campaign_id
    data_type: INT64
  - name: start_date
    expr: start_date
    data_type: DATE
measures:
  - name: spend_total
    expr: spend
    agg: SUM
    data_type: NUMERIC
""",
        encoding="utf-8",
    )
    (metrics_root / "metrics" / "spend_total.yml").write_text(
        """kind: metric
version: 1
id: spend_total
label: Total Spend
type: simple
base_source: ad_performance
expr: spend
dimensions:
  - campaign_id
format: "$#,##0.00"
""",
        encoding="utf-8",
    )


def _write_experiment_fixture(root: Path, *, dataset: str = "marketing_db") -> None:
    _write_metric_fixture(root)
    metrics_root = _workspace_root(root) / "metrics_layer" / "configs"
    (metrics_root / "sources" / "conversion_events.yml").write_text(
        f"""kind: source
version: 1
id: conversion_events
dataset: {dataset}
table: conversion_events
subject:
  - customer_id
ts: created_at
dimensions:
  - name: conversion_id
    expr: conversion_id
    data_type: INT64
  - name: customer_id
    expr: customer_id
    data_type: INT64
  - name: created_at
    expr: created_at
    data_type: TIMESTAMP
measures:
  - name: conversion_count
    expr: conversion_id
    agg: COUNT_DISTINCT
    data_type: INT64
  - name: conversion_value_total
    expr: value
    agg: SUM
    data_type: NUMERIC
""",
        encoding="utf-8",
    )
    (metrics_root / "metrics" / "conversions_total.yml").write_text(
        """kind: metric
version: 1
id: conversions_total
label: Total Conversions
type: simple
base_source: conversion_events
expr: conversion_count
dimensions:
  - customer_id
format: "#,##0"
""",
        encoding="utf-8",
    )
    experimentation_root = (
        _workspace_root(root) / "experimentation" / "configs" / "experiments"
    )
    experimentation_root.mkdir(parents=True, exist_ok=True)
    (experimentation_root / "signup_checkout_test.yml").write_text(
        f"""kind: experiment
version: 1
id: signup_checkout_test
label: Signup Checkout Test
dataset: {dataset}
experiment_version: v1
control_variant: control
subject_type: customer
variants:
  - id: control
    allocation_weight: 0.5
  - id: treatment
    allocation_weight: 0.5
metrics:
  - metric_id: conversions_total
    attribution_window_days: 14
""",
        encoding="utf-8",
    )


def _write_artifact_fixture(root: Path) -> None:
    artifacts_root = _workspace_root(root) / "artifacts"
    artifacts_root.mkdir(parents=True, exist_ok=True)
    (artifacts_root / "launch_readout_q2.md").write_text(
        """---
artifact_id: launch_readout_q2
source_agent: pm
title: Q2 Launch Readout
description: Launch readiness and early performance summary.
kind: readout
session_id: pm-session-1
updated_at: 2026-04-05T12:00:00Z
---

## Summary

Launch readiness was green across paid and lifecycle channels.

## Next Steps

- Review week-two retention.
""",
        encoding="utf-8",
    )
    (artifacts_root / "launch_dashboard_q2.html").write_text(
        """---
artifact_id: launch_dashboard_q2
format: html
source_agent: pm
title: Q2 Launch Dashboard
description: Interactive launch dashboard.
kind: readout
session_id: pm-session-1
updated_at: 2026-04-05T12:00:00Z
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Q2 Launch Dashboard</title>
  </head>
  <body>
    <main>
      <h1>Q2 Launch Dashboard</h1>
      <p>Activation improved 12% week over week.</p>
    </main>
  </body>
</html>
""",
        encoding="utf-8",
    )


def test_artifact_cli_list_show_and_search(monkeypatch, tmp_path: Path, capsys) -> None:
    _write_artifact_fixture(tmp_path)
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))

    assert main(["artifact", "list"]) == 0
    list_output = capsys.readouterr().out
    assert "launch_readout_q2" in list_output

    assert main(["artifact", "show", "launch_readout_q2"]) == 0
    show_output = capsys.readouterr().out
    assert "Q2 Launch Readout" in show_output
    assert "Review week-two retention" in show_output

    assert main(["artifact", "show", "launch_dashboard_q2"]) == 0
    html_output = capsys.readouterr().out
    assert "Format: html" in _normalize_output(html_output)
    assert "<!doctype html>" in html_output
    assert "Q2 Launch Dashboard" in html_output

    assert main(["artifact", "search", "launch readiness"]) == 0
    search_output = capsys.readouterr().out
    assert "launch_readout_q2" in search_output

    assert main(["--workspace", "marketing_db", "artifact", "list"]) == 0
    explicit_output = capsys.readouterr().out
    assert "launch_readout_q2" in explicit_output


def test_metrics_cli_list_show_and_compile(monkeypatch, tmp_path: Path, capsys) -> None:
    _write_metric_fixture(tmp_path)
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))

    assert main(["metrics", "list"]) == 0
    list_output = capsys.readouterr().out
    assert "spend_total" in list_output

    assert (
        main(
            [
                "metrics",
                "show",
                "--kind",
                "metric",
                "--name",
                "spend_total",
            ]
        )
        == 0
    )
    show_output = capsys.readouterr().out
    assert "base_source: ad_performance" in show_output

    assert (
        main(
            [
                "metrics",
                "compile",
                "--metric",
                "spend_total",
                "--dimension",
                "campaign_id",
            ]
        )
        == 0
    )
    compile_output = capsys.readouterr().out
    assert "campaign_ads" in compile_output
    assert "GROUP BY campaign_id" in compile_output


def test_metrics_chart_parser_accepts_visualization_flags() -> None:
    args = build_parser().parse_args(
        [
            "metrics",
            "chart",
            "--metric",
            "spend_total",
            "--group-by",
            "campaign_id",
            "--date-dimension",
            "start_date",
            "--grain",
            "week",
            "--start",
            "2026-01-01",
            "--end",
            "2026-01-31",
            "--filter",
            "campaign_id = 1",
            "--limit",
            "25",
            "--show-sql",
        ]
    )

    assert args.command == "metrics"
    assert args.metrics_command == "chart"
    assert args.metric == "spend_total"
    assert args.group_by == "campaign_id"
    assert args.date_dimension == "start_date"
    assert args.grain == "week"
    assert args.start == "2026-01-01"
    assert args.end == "2026-01-31"
    assert args.filter == ["campaign_id = 1"]
    assert args.limit == 25
    assert args.show_sql is True


def test_metrics_cli_chart_uses_shared_visualization_backend(
    monkeypatch, tmp_path: Path, capsys
) -> None:
    _write_metric_fixture(tmp_path)
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))

    captured: dict[str, object] = {}

    def _fake_build_metric_visualization(args, context, runner=None):
        del runner
        captured["args"] = args
        captured["context"] = context
        return {
            "entity": {"surface": "metrics", "id": "spend_total", "label": "Total Spend"},
            "query": {
                "metric_name": "spend_total",
                "group_by": "campaign_id",
                "date_dimension": "start_date",
                "grain": "week",
                "date_range": {"dimension": "start_date", "start": "2026-01-01", "end": "2026-01-31"},
            },
            "summary": {"warnings": ["sample warning"], "cards": [], "row_count": 2},
            "chart": {"kind": "line", "x_key": "bucket", "y_key": "metric_value", "series_key": None},
            "table": {
                "columns": [
                    {"key": "bucket", "label": "Bucket", "type": "date"},
                    {"key": "metric_value", "label": "Metric Value", "type": "number", "format": "currency"},
                ],
                "rows": [
                    {"bucket": "2026-01-01", "metric_value": 123.45},
                    {"bucket": "2026-01-08", "metric_value": 234.56},
                ],
            },
            "lineage": {
                "queries": [{"label": "Visualization SQL", "sql": "SELECT * FROM campaign_ads"}]
            },
            "controls": {"selected": {}},
            "meta": {"source_id": "ad_performance", "format": "$#,##0.00"},
        }

    monkeypatch.setattr("crew.cli.main.build_metric_visualization", _fake_build_metric_visualization)

    assert (
        main(
            [
                "metrics",
                "chart",
                "--metric",
                "spend_total",
                "--group-by",
                "campaign_id",
                "--date-dimension",
                "start_date",
                "--grain",
                "week",
                "--start",
                "2026-01-01",
                "--end",
                "2026-01-31",
                "--filter",
                "campaign_id = 1",
                "--show-sql",
            ]
        )
        == 0
    )
    output = capsys.readouterr().out

    assert captured["args"] == {
        "metric_name": "spend_total",
        "group_by": "campaign_id",
        "date_dimension": "start_date",
        "grain": "week",
        "filters": ["campaign_id = 1"],
        "date_range": {"start": "2026-01-01", "end": "2026-01-31"},
        "limit": None,
    }
    assert "Total Spend" in output
    assert "sample warning" in output
    assert "Visualization SQL" in output
    assert "SELECT * FROM campaign_ads" in output
    assert "$123.45" in output


def test_experiment_cli_list_show_and_plan(monkeypatch, tmp_path: Path, capsys) -> None:
    _write_experiment_fixture(tmp_path)
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))

    assert main(["experiment", "list"]) == 0
    list_output = capsys.readouterr().out
    assert "signup_checkout_test" in list_output

    assert (
        main(
            [
                "experiment",
                "show",
                "--name",
                "signup_checkout_test",
            ]
        )
        == 0
    )
    show_output = capsys.readouterr().out
    assert "control_variant: control" in show_output

    assert (
        main(
            [
                "experiment",
                "plan",
                "--name",
                "signup_checkout_test",
            ]
        )
        == 0
    )
    plan_output = capsys.readouterr().out
    assert "experiment_exposures" in plan_output
    assert "assignment_unit_id" in plan_output
    assert "created_at" in plan_output


def test_experiment_analyze_parser_accepts_metric_and_show_sql() -> None:
    args = build_parser().parse_args(
        [
            "experiment",
            "analyze",
            "--name",
            "signup_checkout_test",
            "--metric-id",
            "conversions_total",
            "--show-sql",
        ]
    )

    assert args.command == "experiment"
    assert args.experiment_command == "analyze"
    assert args.name == "signup_checkout_test"
    assert args.metric_id == "conversions_total"
    assert args.show_sql is True


def test_experiment_cli_analyze_uses_shared_visualization_backend(
    monkeypatch, tmp_path: Path, capsys
) -> None:
    _write_experiment_fixture(tmp_path)
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))

    captured: dict[str, object] = {}

    def _fake_build_experiment_analysis(args, context, runner=None):
        del runner
        captured["args"] = args
        captured["context"] = context
        return {
            "entity": {
                "surface": "experiments",
                "id": "signup_checkout_test",
                "label": "Signup Checkout Test",
            },
            "query": {
                "experiment_name": "signup_checkout_test",
                "metric_id": "conversions_total",
            },
            "summary": {"warnings": ["srm check"], "cards": [], "row_count": 2},
            "chart": {"kind": "bar", "x_key": "variant_id", "y_key": "metric_value", "series_key": None},
            "table": {
                "columns": [
                    {"key": "variant_id", "label": "Variant", "type": "string"},
                    {"key": "metric_value", "label": "Mean", "type": "number", "format": "number"},
                    {"key": "lift", "label": "Lift", "type": "number", "format": "percent"},
                ],
                "rows": [
                    {"variant_id": "control", "metric_value": 0.1, "lift": 0.0},
                    {"variant_id": "treatment", "metric_value": 0.12, "lift": 0.2},
                ],
            },
            "lineage": {
                "queries": [
                    {"label": "Exposure Summary SQL", "sql": "SELECT * FROM experiment_exposures"},
                    {"label": "conversions_total Summary SQL", "sql": "SELECT * FROM conversion_events"},
                ]
            },
            "controls": {"selected": {"metric_id": "conversions_total"}},
            "meta": {
                "control_variant": "control",
                "srm": {"p_value": 0.52, "chi_square_statistic": 0.41},
            },
        }

    monkeypatch.setattr("crew.cli.main.build_experiment_analysis", _fake_build_experiment_analysis)

    assert (
        main(
            [
                "experiment",
                "analyze",
                "--name",
                "signup_checkout_test",
                "--metric-id",
                "conversions_total",
                "--show-sql",
            ]
        )
        == 0
    )
    output = capsys.readouterr().out

    assert captured["args"] == {
        "name": "signup_checkout_test",
        "metric_id": "conversions_total",
    }
    assert "Signup Checkout Test" in output
    assert "SRM:" in output
    assert "Exposure Summary SQL" in output
    assert "SELECT * FROM experiment_exposures" in output
    assert "20.00%" in output


def test_experiment_cli_rejects_workspace_dataset_mismatch(
    monkeypatch, tmp_path: Path, capsys
) -> None:
    _write_experiment_fixture(tmp_path, dataset="marketing")
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))

    assert main(["experiment", "show", "--name", "signup_checkout_test"]) == 1
    output = _normalize_output(capsys.readouterr().out)
    assert "experiment.dataset 'marketing' must match selected workspace 'marketing_db'" in output


def test_version_reports_selected_workspace(monkeypatch, tmp_path: Path, capsys) -> None:
    _write_artifact_fixture(tmp_path)
    state_root = tmp_path / "state"
    state_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))
    monkeypatch.setattr("crew.cli.main.crew_root_dir", lambda: state_root)

    assert main(["version"]) == 0
    default_output = _normalize_output(capsys.readouterr().out)
    assert "Workspace Root:" in default_output
    assert str(tmp_path.parent) in default_output
    assert tmp_path.name in default_output
    assert "Workspace: marketing_db" in default_output
    assert "Workspace Path:" in default_output
    assert "marketing_db" in default_output
    assert "State:" in default_output
    assert state_root.name in default_output

    assert main(["--workspace", "marketing_db", "version"]) == 0
    explicit_output = _normalize_output(capsys.readouterr().out)
    assert "Workspace: marketing_db" in explicit_output


def test_missing_workspace_fails_clearly(monkeypatch, tmp_path: Path, capsys) -> None:
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(tmp_path))

    assert main(["--workspace", "missing", "artifact", "list"]) == 1
    error_output = _normalize_output(capsys.readouterr().out)
    assert "workspace 'missing' does not exist under" in error_output
    assert str(tmp_path.parent) in error_output
    assert tmp_path.name in error_output


def test_version_cli_reports_workspace_and_state(monkeypatch, tmp_path: Path, capsys) -> None:
    monkeypatch.setattr("crew.cli.main.workspace_root_dir", lambda: tmp_path / "workspace")
    monkeypatch.setattr("crew.cli.main.crew_root_dir", lambda: tmp_path / "state")
    monkeypatch.setattr(
        "crew.cli.main.selected_workspace_name", lambda *_args, **_kwargs: "marketing_db"
    )
    monkeypatch.setattr(
        "crew.cli.main.workspace_dir", lambda *_args, **_kwargs: tmp_path / "workspace" / "marketing_db"
    )

    assert main(["version"]) == 0
    output = capsys.readouterr().out
    assert "Version:" in output
    assert "workspace" in output
    assert "state" in output


def test_login_saves_token(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    from crew.cli import auth_store

    monkeypatch.setattr(
        "crew.cli.main.beta_client.login",
        lambda base, username: {
            "token": "tok-123",
            "user": {"id": "u1", "username": username},
        },
    )

    assert main(["login", "alice", "--api-base-url", "http://127.0.0.1:8000"]) == 0
    auth = auth_store.load_auth()
    assert auth["token"] == "tok-123"
    assert auth["username"] == "alice"
    assert auth["api_base_url"] == "http://127.0.0.1:8000"


def test_repl_requires_login(monkeypatch, tmp_path, capsys) -> None:
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    assert main(["repl"]) == 1
    output = _normalize_output(capsys.readouterr().out)
    assert "login" in output


class _FakeBetaClient:
    instances: list["_FakeBetaClient"] = []

    def __init__(self, api_base_url: str, token: str, **kwargs) -> None:
        self.api_base_url = api_base_url
        self.token = token
        self.created: list[str | None] = []
        self.messages: list[str] = []
        _FakeBetaClient.instances.append(self)

    def create_session(self, workspace_id, *, label=None):
        self.created.append(label)
        return {"session_id": "data_abc"}

    def list_sessions(self, workspace_id):
        return [
            {"session_id": "data_abc", "label": "demo", "turn_count": 2,
             "preview_text": "hello"}
        ]

    def send_message(self, workspace_id, session_id, message):
        self.messages.append(message)
        return "req-1"

    def stream_events(self, workspace_id, session_id, request_id):
        yield ("request.completed", {"response": {"text": "final answer"}})


def _login(tmp_path):
    from crew.cli import auth_store

    auth_store.save_auth(
        api_base_url="http://127.0.0.1:8000",
        token="tok",
        username="alice",
        user_id="u1",
    )


def test_repl_creates_session_and_enters_shell(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    _login(tmp_path)
    _FakeBetaClient.instances = []
    monkeypatch.setattr("crew.cli.main.beta_client.BetaClient", _FakeBetaClient)

    captured: dict[str, object] = {}

    class FakeShell:
        def __init__(self, client, workspace_id, session_id, renderer) -> None:
            del renderer
            captured["client"] = client
            captured["workspace_id"] = workspace_id
            captured["session_id"] = session_id

        def run(self) -> None:
            captured["ran"] = True

    monkeypatch.setattr("crew.cli.main.beta_client.CrewRemoteShell", FakeShell)

    assert main(["repl"]) == 0
    beta = _FakeBetaClient.instances[-1]
    assert beta.created == [None]  # a session was created through the BFF
    assert captured["ran"] is True
    assert captured["client"] is beta
    assert captured["workspace_id"] == "marketing_db"
    assert captured["session_id"] == "data_abc"


def test_sessions_lists_user_sessions(monkeypatch, tmp_path, capsys) -> None:
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    _login(tmp_path)
    monkeypatch.setattr("crew.cli.main.beta_client.BetaClient", _FakeBetaClient)

    assert main(["sessions"]) == 0
    output = _normalize_output(capsys.readouterr().out)
    assert "data_abc" in output


def test_workflow_list_uses_mash_client(monkeypatch, tmp_path, capsys) -> None:
    # The mash mounts require the crew token, so mash-client commands need
    # stored login state and send its token as the bearer key.
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    _login(tmp_path)
    captured_client: dict[str, object] = {}

    class FakeClient:
        def __init__(self, base_url: str, *, api_key: str | None = None) -> None:
            self.base_url = base_url
            self.api_key = api_key
            captured_client["api_key"] = api_key

        def list_workflows(self):
            return [
                {
                    "workflow_id": "masher-trace-digest",
                    "step_count": 3,
                    "step_preview": [
                        {"ordinal": 0, "step_id": "list-traces", "kind": "code"},
                        {"ordinal": 1, "step_id": "digest-traces", "kind": "code"},
                        {"ordinal": 2, "step_id": "append-digests", "kind": "code"},
                    ],
                }
            ]

        def close(self) -> None:
            pass

    monkeypatch.setattr("crew.cli.main.MashHostClient", FakeClient)

    assert (
        main(
            [
                "workflow",
                "list",
                "--api-base-url",
                "http://127.0.0.1:8000",
            ]
        )
        == 0
    )

    output = _normalize_output(capsys.readouterr().out)
    assert "masher-trace-digest" in output
    assert "list-traces (code) -> digest-traces (code) -> append-digests (code)" in output
    assert captured_client["api_key"] == "tok"


def test_workflow_run_uses_mash_client(monkeypatch, tmp_path, capsys) -> None:
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    _login(tmp_path)
    captured: dict[str, object] = {}

    class FakeClient:
        def __init__(self, base_url: str, *, api_key: str | None = None) -> None:
            self.base_url = base_url
            self.api_key = api_key

        def run_workflow(
            self,
            workflow_id: str,
            *,
            dedup_key: str | None = None,
            workflow_input: dict[str, object] | None = None,
        ):
            captured["run"] = {
                "workflow_id": workflow_id,
                "dedup_key": dedup_key,
                "workflow_input": workflow_input,
            }
            return {
                "workflow_id": workflow_id,
                "run_id": "mw:h_test:masher-trace-digest:abc",
                "status": "queued",
            }

        def stream_workflow_run(self, workflow_id: str, run_id: str):
            yield {
                "event": "workflow.completed",
                "data": {
                    "workflow_id": workflow_id,
                    "run_id": run_id,
                    "status": "completed",
                    "result": {},
                },
            }

        def close(self) -> None:
            pass

    monkeypatch.setattr("crew.cli.main.MashHostClient", FakeClient)

    assert (
        main(
            [
                "workflow",
                "run",
                "--api-base-url",
                "http://127.0.0.1:8000",
                "masher-trace-digest",
                "trace-123",
                "--input",
                '{"mode":"trace","session_id":"s1","trace_id":"t1"}',
            ]
        )
        == 0
    )

    assert captured["run"] == {
        "workflow_id": "masher-trace-digest",
        "dedup_key": "trace-123",
        "workflow_input": {
            "mode": "trace",
            "session_id": "s1",
            "trace_id": "t1",
        },
    }
    output = _normalize_output(capsys.readouterr().out)
    assert "Workflow: masher-trace-digest" in output
    assert "Run ID: mw:h_test:masher-trace-digest:abc" in output
    assert "Status: queued" in output


def test_workflow_run_streams_progress_and_terminal_response(
    monkeypatch, tmp_path, capsys
) -> None:
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    _login(tmp_path)
    class FakeClient:
        def __init__(self, base_url: str, *, api_key: str | None = None) -> None:
            self.base_url = base_url
            self.api_key = api_key

        def run_workflow(
            self,
            workflow_id: str,
            *,
            dedup_key: str | None = None,
            workflow_input: dict[str, object] | None = None,
        ):
            del dedup_key, workflow_input
            return {
                "workflow_id": workflow_id,
                "run_id": "mw:h_test:masher-trace-digest:abc",
                "status": "queued",
            }

        def stream_workflow_run(self, workflow_id: str, run_id: str):
            yield {
                "event": "step.started",
                "data": {"step_id": "list-traces", "attempt": 1},
            }
            yield {
                "event": "step.completed",
                "data": {"step_id": "list-traces", "attempt": 1},
            }
            yield {
                "event": "step.started",
                "data": {"step_id": "digest-traces", "attempt": 2},
            }
            yield {
                "event": "step.failed",
                "data": {
                    "step_id": "digest-traces",
                    "attempt": 2,
                    "payload": {"error": "trace store unavailable"},
                },
            }
            yield {
                "event": "workflow.completed",
                "data": {
                    "workflow_id": workflow_id,
                    "run_id": run_id,
                    "status": "completed",
                    "result": {"processed_trace_count": 4},
                },
            }

        def close(self) -> None:
            pass

    monkeypatch.setattr("crew.cli.main.MashHostClient", FakeClient)

    assert (
        main(
            [
                "workflow",
                "run",
                "--api-base-url",
                "http://127.0.0.1:8000",
                "masher-trace-digest",
            ]
        )
        == 0
    )

    output = _normalize_output(capsys.readouterr().out)
    assert "Step started: list-traces" in output
    assert "Step completed: list-traces" in output
    assert "Step failed: digest-traces (attempt 2) - trace store unavailable" in output
    assert '"processed_trace_count": 4' in output
    assert "Workflow completed" in output


def test_workflow_run_returns_error_for_streamed_failure(
    monkeypatch, tmp_path, capsys
) -> None:
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    _login(tmp_path)
    class FakeClient:
        def __init__(self, base_url: str, *, api_key: str | None = None) -> None:
            self.base_url = base_url
            self.api_key = api_key

        def run_workflow(
            self,
            workflow_id: str,
            *,
            dedup_key: str | None = None,
            workflow_input: dict[str, object] | None = None,
        ):
            del dedup_key, workflow_input
            return {
                "workflow_id": workflow_id,
                "run_id": "mw:h_test:masher-trace-digest:abc",
                "status": "queued",
            }

        def stream_workflow_run(self, workflow_id: str, run_id: str):
            del workflow_id, run_id
            yield {
                "event": "workflow.error",
                "data": {"error": "workflow failed"},
            }

        def close(self) -> None:
            pass

    monkeypatch.setattr("crew.cli.main.MashHostClient", FakeClient)

    assert (
        main(
            [
                "workflow",
                "run",
                "--api-base-url",
                "http://127.0.0.1:8000",
                "masher-trace-digest",
            ]
        )
        == 1
    )

    output = _normalize_output(capsys.readouterr().out)
    assert "workflow failed" in output


def test_workflow_status_uses_mash_client(monkeypatch, tmp_path, capsys) -> None:
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    _login(tmp_path)
    captured: dict[str, object] = {}

    class FakeClient:
        def __init__(self, base_url: str, *, api_key: str | None = None) -> None:
            self.base_url = base_url
            self.api_key = api_key

        def get_workflow_run(self, workflow_id: str, run_id: str):
            captured["status"] = {"workflow_id": workflow_id, "run_id": run_id}
            return {
                "workflow_id": workflow_id,
                "run_id": run_id,
                "dedup_key": "trace-123",
                "status": "completed",
                "created_at": 1.0,
                "started_at": 2.0,
                "finished_at": 3.0,
                "error": None,
                "workflow_input": {"mode": "batch"},
                "session_id": None,
                "result": {"processed_trace_count": 4},
                "steps": [
                    {
                        "step_id": "digest-traces",
                        "kind": "code",
                        "status": "completed",
                        "attempt": 1,
                        "error": None,
                    }
                ],
            }

        def close(self) -> None:
            pass

    monkeypatch.setattr("crew.cli.main.MashHostClient", FakeClient)

    assert (
        main(
            [
                "workflow",
                "status",
                "--api-base-url",
                "http://127.0.0.1:8000",
                "masher-trace-digest",
                "mw:h_test:masher-trace-digest:abc",
            ]
        )
        == 0
    )

    assert captured["status"] == {
        "workflow_id": "masher-trace-digest",
        "run_id": "mw:h_test:masher-trace-digest:abc",
    }
    output = _normalize_output(capsys.readouterr().out)
    assert "completed" in output
    assert "digest-traces" in output
    assert '"processed_trace_count": 4' in output
