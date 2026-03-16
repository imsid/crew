from __future__ import annotations

import json
import subprocess
from pathlib import Path

from crew.code_index.service import create_cached_files, get_cache_info, repomap_cache_base_dir


def _init_git_repo(repo_path: Path) -> None:
    subprocess.run(["git", "init"], cwd=repo_path, check=True, capture_output=True, text=True)
    subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=repo_path, check=True)
    subprocess.run(["git", "config", "user.name", "Test"], cwd=repo_path, check=True)
    (repo_path / "README.md").write_text("hello\n", encoding="utf-8")
    subprocess.run(["git", "add", "README.md"], cwd=repo_path, check=True)
    subprocess.run(["git", "commit", "-m", "init"], cwd=repo_path, check=True, capture_output=True, text=True)


def test_get_cache_info_resolves_sha_scoped_directory(tmp_path: Path) -> None:
    repo_path = tmp_path / "repo"
    repo_path.mkdir()
    _init_git_repo(repo_path)

    sha, cache_dir = get_cache_info(str(repo_path))

    assert sha is not None
    assert cache_dir is not None
    assert cache_dir == repomap_cache_base_dir() / repo_path.name / sha


def test_create_cached_files_reuses_existing_artifacts(tmp_path: Path) -> None:
    repo_path = tmp_path / "repo"
    repo_path.mkdir()
    _init_git_repo(repo_path)
    sha, cache_dir = get_cache_info(str(repo_path))
    assert sha is not None
    assert cache_dir is not None
    cache_dir.mkdir(parents=True, exist_ok=True)
    repomap_json = cache_dir / "repomap.json"
    tags_file = cache_dir / "tags"
    repomap_json.write_text(json.dumps({"directory_overview": []}), encoding="utf-8")
    tags_file.write_text("tag\n", encoding="utf-8")

    cached_files = create_cached_files(str(repo_path))

    assert cached_files == [str(repomap_json), str(tags_file)]


def test_create_cached_files_builds_missing_artifacts(tmp_path: Path, monkeypatch) -> None:
    repo_path = tmp_path / "repo"
    repo_path.mkdir()
    _init_git_repo(repo_path)

    def _fake_build(repo: str, force: bool = False) -> bool:
        del force
        _sha, cache_dir = get_cache_info(repo)
        assert cache_dir is not None
        cache_dir.mkdir(parents=True, exist_ok=True)
        (cache_dir / "repomap.json").write_text("{}", encoding="utf-8")
        (cache_dir / "tags").write_text("tag\n", encoding="utf-8")
        return True

    monkeypatch.setattr("crew.code_index.service._run_repomap_script", _fake_build)

    cached_files = create_cached_files(str(repo_path))

    assert [Path(path).name for path in cached_files] == ["repomap.json", "tags"]
