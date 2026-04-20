from __future__ import annotations

from unittest.mock import patch

from crew.app import build_host


def test_build_host_registers_data_primary_and_support_agents(tmp_path):
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

        assert host.get_primary_agent_id() == "data"
        described = {item["agent_id"]: item for item in host.describe_agents()}
        assert set(described.keys()) == {"pm", "data"}
        assert described["data"]["role"] == "primary"
        assert described["pm"]["role"] == "subagent"
        assert described["pm"]["metadata"]["display_name"] == "Product Management Specialist"
