from __future__ import annotations

from pathlib import Path

from crew.shared.runtime_paths import (
    crew_root_dir,
    default_workspace_name,
    workspace_dir,
)


def test_crew_root_dir_defaults_to_repo_local_state(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.delenv("MASH_DATA_DIR", raising=False)
    monkeypatch.setattr("crew.shared.runtime_paths.source_root", lambda: tmp_path)

    assert crew_root_dir() == tmp_path / ".mash"
    assert (tmp_path / ".mash").is_dir()


def test_workspace_defaults_to_marketing_db(monkeypatch, tmp_path: Path) -> None:
    workspace_root = tmp_path / "workspace"
    (workspace_root / "marketing_db").mkdir(parents=True, exist_ok=True)
    monkeypatch.setenv("CREW_WORKSPACE_ROOT", str(workspace_root))

    assert default_workspace_name() == "marketing_db"
    assert workspace_dir() == workspace_root / "marketing_db"
