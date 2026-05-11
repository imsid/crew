from __future__ import annotations

import re
from pathlib import Path

from crew.cli.main import main


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


def test_agent_repl_delegates_to_mash_remote_shell(monkeypatch) -> None:
    class FakeClient:
        def __init__(self, base_url: str, *, api_key: str | None = None) -> None:
            self.base_url = base_url
            self.api_key = api_key
            self.closed = False

        def close(self) -> None:
            self.closed = True

    captured: dict[str, object] = {}

    class FakeShell:
        def __init__(self, client, target) -> None:
            captured["client"] = client
            captured["target"] = target

        def run(self) -> None:
            captured["ran"] = True

        @staticmethod
        def new_session_id() -> str:
            return "session-123"

    monkeypatch.setattr("crew.cli.main.MashHostClient", FakeClient)
    monkeypatch.setattr("crew.cli.main.MashRemoteShell", FakeShell)

    assert (
        main(
            [
                "agent",
                "repl",
                "--api-base-url",
                "http://127.0.0.1:8000",
                "--agent",
                "pm",
            ]
        )
        == 0
    )
    assert captured["ran"] is True
    assert captured["target"].agent_id == "pm"
    assert captured["target"].session_id == "session-123"


def test_agent_invoke_uses_request_stream(monkeypatch, capsys) -> None:
    captured: dict[str, object] = {}

    class FakeClient:
        def __init__(self, base_url: str, *, api_key: str | None = None) -> None:
            self.base_url = base_url
            self.api_key = api_key
            self.closed = False

        def submit_request(self, agent_id: str, *, message: str, session_id: str) -> str:
            captured["submit"] = {
                "agent_id": agent_id,
                "message": message,
                "session_id": session_id,
            }
            return "req-123"

        def stream_request(self, agent_id: str, request_id: str):
            captured["stream"] = {"agent_id": agent_id, "request_id": request_id}
            yield {
                "event": "request.accepted",
                "data": {
                    "request_id": request_id,
                    "agent_id": agent_id,
                    "session_id": "session-123",
                    "status": "accepted",
                },
            }
            yield {
                "event": "request.completed",
                "data": {
                    "request_id": request_id,
                    "session_id": "session-123",
                    "response": {"text": "final response"},
                },
            }

        def close(self) -> None:
            self.closed = True

    class FakeShell:
        @staticmethod
        def new_session_id() -> str:
            return "session-123"

    monkeypatch.setattr("crew.cli.main.MashHostClient", FakeClient)
    monkeypatch.setattr("crew.cli.main.MashRemoteShell", FakeShell)

    assert (
        main(
            [
                "agent",
                "invoke",
                "--api-base-url",
                "http://127.0.0.1:8000",
                "--agent",
                "data",
                "what changed?",
            ]
        )
        == 0
    )

    output = _normalize_output(capsys.readouterr().out)
    assert captured["submit"] == {
        "agent_id": "data",
        "message": "what changed?",
        "session_id": "session-123",
    }
    assert captured["stream"] == {"agent_id": "data", "request_id": "req-123"}
    assert "Agent: data" in output
    assert "Session: session-123" in output
    assert "final response" in output
