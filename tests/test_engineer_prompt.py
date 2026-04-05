from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import patch

import pytest

from crew.agents.engineer.spec import EngineerAgentSpec


def test_engineer_requires_repo_configuration(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("GITHUB_REPOS", raising=False)
    with pytest.raises(ValueError, match="GITHUB_REPO_PATH must be set"):
        EngineerAgentSpec()


def test_engineer_system_prompt_includes_repo_index_context(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    repomap_path = tmp_path / "repomap.json"
    repomap_path.write_text(json.dumps({"directory_overview": ["src/"]}), encoding="utf-8")
    tags_path = tmp_path / "tags"
    tags_path.write_text("tag\n", encoding="utf-8")
    monkeypatch.setattr(
        "crew.agents.engineer.spec.create_cached_files",
        lambda _repo: [str(repomap_path), str(tags_path)],
    )

    with patch.dict(
        "os.environ",
        {
            "GITHUB_REPOS": str(tmp_path),
            "GITHUB_URL": "https://github.com/org/repo",
        },
        clear=False,
    ):
        spec = EngineerAgentSpec()
        prompt_blocks = spec.build_system_prompt()
        joined = "\n".join(str(block["text"]) for block in prompt_blocks)

    assert "Repository index" in joined
    assert "directory_overview" in joined


def test_engineer_system_prompt_includes_bash_and_github_guidance(tmp_path: Path) -> None:
    with patch.dict(
        "os.environ",
        {
            "GITHUB_REPOS": str(tmp_path),
            "GITHUB_URL": "https://github.com/org/repo",
        },
        clear=False,
    ):
        spec = EngineerAgentSpec()
        prompt_blocks = spec.build_system_prompt()
        joined = "\n".join(str(block["text"]) for block in prompt_blocks)

    assert "USING THE BASH TOOL" in joined
    assert "USING GITHUB MCP TOOLS" in joined
    assert "create-artifact" in joined
