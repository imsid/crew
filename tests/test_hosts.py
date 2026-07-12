from __future__ import annotations

import pytest

from crew.cli import hosts_store
from crew.cli import main as cli_main


@pytest.fixture
def crew_home(tmp_path, monkeypatch):
    monkeypatch.setenv("CREW_HOME", str(tmp_path))
    return tmp_path


@pytest.fixture
def logged_in(crew_home):
    # The mash mounts require the crew token, so mash-client commands need
    # stored login state.
    from crew.cli import auth_store

    auth_store.save_auth(
        api_base_url="http://127.0.0.1:8000",
        token="tok",
        username="alice",
        user_id="u1",
    )


class _FakeClient:
    """Minimal stand-in for MashHostClient covering the host control API."""

    def __init__(self, *args, **kwargs) -> None:
        self.defined: list[tuple[str, str, list[str], list[str]]] = []

    def define_host(self, host_id, *, primary, subagents=None, workflows=None):
        self.defined.append(
            (host_id, primary, list(subagents or []), list(workflows or []))
        )
        return {"host_id": host_id}

    def list_agents(self):
        return [
            {"agent_id": "data", "metadata": {"display_name": "Data", "description": "d"}},
            {"agent_id": "pm", "metadata": {"display_name": "PM", "description": "p"}},
        ]

    def list_workflows(self):
        return []

    def get_host(self, host_id):
        return {"host_id": host_id, "primary": {"agent_id": "data"}}

    def close(self):
        pass


def test_hosts_store_seeds_datasquad(crew_home):
    hosts = hosts_store.load_hosts()
    assert hosts["datasquad"] == {
        "primary": "data",
        "subagents": ["pm"],
        "workflows": [],
    }
    assert hosts_store.hosts_file_path().exists()


def test_record_host_adds_and_replaces(crew_home):
    hosts_store.record_host("money", primary="data", subagents=["pm"])
    assert hosts_store.load_hosts()["money"]["subagents"] == ["pm"]
    hosts_store.record_host("money", primary="pm")
    assert hosts_store.load_hosts()["money"] == {
        "primary": "pm",
        "subagents": [],
        "workflows": [],
    }


def test_publish_hosts_puts_each_configured_host(crew_home):
    hosts_store.load_hosts()  # seed datasquad
    client = _FakeClient()
    published = hosts_store.publish_hosts(client)
    assert "datasquad" in published
    assert ("datasquad", "data", ["pm"], []) in client.defined


def test_compose_command_defines_and_records(crew_home, logged_in, monkeypatch):
    client = _FakeClient()
    monkeypatch.setattr(cli_main, "MashHostClient", lambda *a, **k: client)
    rc = cli_main.main(
        [
            "compose",
            "money",
            "--primary",
            "data",
            "--subagents",
            "pm",
            "--api-base-url",
            "http://x",
        ]
    )
    assert rc == 0
    assert client.defined == [("money", "data", ["pm"], [])]
    assert hosts_store.load_hosts()["money"]["primary"] == "data"


def test_browse_command_runs(crew_home, logged_in, monkeypatch):
    client = _FakeClient()
    monkeypatch.setattr(cli_main, "MashHostClient", lambda *a, **k: client)
    rc = cli_main.main(["browse", "--api-base-url", "http://x"])
    assert rc == 0
