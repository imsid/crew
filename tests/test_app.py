from __future__ import annotations

from unittest.mock import patch

from crew.app import DEFAULT_HOST_ID, build_pool, define_default_host


def _crew_env(tmp_path):
    return {
        "GITHUB_REPOS": str(tmp_path),
        "GITHUB_URL": "https://github.com/org/repo",
        "MASH_DATA_DIR": str(tmp_path / ".mash"),
        "CREW_DATABASE_URL": "postgresql://test/runtime",
        "DBOS_CONDUCTOR_KEY": "test-conductor-key",
    }


def test_build_pool_registers_flat_pool_with_no_hosts(tmp_path):
    with patch.dict("os.environ", _crew_env(tmp_path), clear=False):
        pool = build_pool()

        # The pool ships flat: agents are registered, hosts are not. The
        # masher eval agents arrive with every pool build (mash >= 0.17).
        assert pool.list_hosts() == []
        described = {item["agent_id"]: item for item in pool.describe_agents()}
        assert set(described.keys()) == {"pm", "data", "eval-agent", "eval-judge-agent"}
        assert (
            described["pm"]["metadata"]["display_name"]
            == "Product Management Specialist"
        )

        workflows = {
            workflow.workflow_id: workflow
            for workflow in pool.get_workflow_registry().list()
        }
        assert set(workflows) >= {
            "masher-trace-digest",
            "masher-online-eval-curation",
            "gen-synthetic-evals",
            "run-experiment",
        }
        assert [step.step_id for step in workflows["masher-trace-digest"].steps] == [
            "list-traces",
            "digest-traces",
            "append-digests",
        ]
        assert [step.kind for step in workflows["gen-synthetic-evals"].steps] == [
            "code",
            "agent",
            "code",
        ]


def test_define_default_host_composes_datasquad(tmp_path):
    with patch.dict("os.environ", _crew_env(tmp_path), clear=False):
        pool = build_pool()
        host = define_default_host(pool)

        assert host.host_id == DEFAULT_HOST_ID
        assert host.primary == "data"
        assert host.subagents == ("pm",)
        assert [h.host_id for h in pool.list_hosts()] == [DEFAULT_HOST_ID]
