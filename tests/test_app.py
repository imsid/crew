from __future__ import annotations

from unittest.mock import patch

from crew.app import build_host


def test_build_host_registers_pm_primary_and_support_agents(tmp_path):
    with patch.dict(
        "os.environ",
        {
            "GITHUB_REPOS": str(tmp_path),
            "GITHUB_URL": "https://github.com/org/repo",
            "MASH_DATA_DIR": str(tmp_path / ".mash"),
        },
        clear=False,
    ):
        host = build_host()

        assert host.get_primary_agent_id() == "pm"
        described = {item["agent_id"]: item for item in host.describe_agents()}
        assert set(described.keys()) == {"pm", "data", "engineer", "masher"}
        assert described["pm"]["role"] == "primary"
        assert described["data"]["role"] == "subagent"
        assert described["engineer"]["role"] == "subagent"
        assert described["masher"]["role"] == "subagent"
        assert described["data"]["metadata"]["display_name"] == "Data Analytics Specialist"
        assert described["engineer"]["metadata"]["display_name"] == "Engineering Specialist"
        assert described["masher"]["metadata"]["display_name"] == "Masher"
