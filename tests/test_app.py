from __future__ import annotations

import pytest
from unittest.mock import patch

from crew.app import build_host


def test_build_host_registers_data_primary_and_support_agents(tmp_path):
    with patch.dict(
        "os.environ",
        {
            "GITHUB_REPOS": str(tmp_path),
            "GITHUB_URL": "https://github.com/org/repo",
            "MASH_DATA_DIR": str(tmp_path / ".mash"),
            "MASH_RUNTIME_DATABASE_URL": "postgresql://test/runtime",
            "DBOS_CONDUCTOR_KEY": "test-conductor-key",
        },
        clear=False,
    ):
        host = build_host()

        assert host.get_primary_agent_id() == "data"
        described = {item["agent_id"]: item for item in host.describe_agents()}
        assert set(described.keys()) == {"pm", "data", "masher"}
        assert described["data"]["role"] == "primary"
        assert described["pm"]["role"] == "subagent"
        assert described["masher"]["role"] == "subagent"
        assert described["pm"]["metadata"]["display_name"] == "Product Management Specialist"
        assert described["masher"]["metadata"]["display_name"] == "Masher"


def test_build_host_requires_runtime_env(monkeypatch, tmp_path):
    monkeypatch.setenv("GITHUB_REPOS", str(tmp_path))
    monkeypatch.setenv("GITHUB_URL", "https://github.com/org/repo")
    monkeypatch.setenv("MASH_DATA_DIR", str(tmp_path / ".mash"))
    monkeypatch.delenv("MASH_RUNTIME_DATABASE_URL", raising=False)
    monkeypatch.delenv("DBOS_CONDUCTOR_KEY", raising=False)

    with pytest.raises(RuntimeError) as excinfo:
        build_host()

    message = str(excinfo.value)
    assert "MASH_RUNTIME_DATABASE_URL" in message
    assert "DBOS_CONDUCTOR_KEY" in message
