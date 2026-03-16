from __future__ import annotations

import json
import os
import subprocess
from pathlib import Path

from ..shared.runtime_paths import crew_root_dir


def create_cached_files(repo_path: str) -> list[str]:
    """Ensure repo index artifacts exist and return their paths."""

    sha, cache_dir = get_cache_info(repo_path)
    if not sha or cache_dir is None:
        return []

    repomap_json = cache_dir / "repomap.json"
    tags_file = cache_dir / "tags"
    if repomap_json.exists() and tags_file.exists():
        return [str(repomap_json), str(tags_file)]

    if _run_repomap_script(repo_path):
        if repomap_json.exists() and tags_file.exists():
            return [str(repomap_json), str(tags_file)]
    return []


def get_cache_info(repo_path: str) -> tuple[str | None, Path | None]:
    """Return the current git SHA and cache directory for a repository."""

    try:
        repo_root = Path(repo_path).expanduser().resolve()
        inside_result = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "--is-inside-work-tree"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if inside_result.returncode != 0:
            return None, None

        sha_result = subprocess.run(
            ["git", "-C", str(repo_root), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        if sha_result.returncode != 0:
            return None, None

        sha = sha_result.stdout.strip()
        return sha, repomap_cache_base_dir() / repo_root.name / sha
    except Exception:
        return None, None


def read_repomap_json(repo_path: str) -> dict[str, object] | None:
    """Read the cached repomap JSON document if present."""

    _sha, cache_dir = get_cache_info(repo_path)
    if cache_dir is None:
        return None
    repomap_json = cache_dir / "repomap.json"
    if not repomap_json.exists():
        return None
    try:
        return json.loads(repomap_json.read_text(encoding="utf-8"))
    except Exception:
        return None


def repomap_cache_base_dir() -> Path:
    cache_root = crew_root_dir() / "cache" / "repomap"
    cache_root.mkdir(parents=True, exist_ok=True)
    return cache_root


def _run_repomap_script(repo_path: str, force: bool = False) -> bool:
    script_path = Path(__file__).with_name("repomap.sh")
    args = ["bash", str(script_path)]
    if force:
        args.append("--force")
    args.append(str(Path(repo_path).expanduser().resolve()))
    env = os.environ.copy()
    env["MASH_REPOMAP_CACHE_ROOT"] = str(repomap_cache_base_dir())
    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
            env=env,
        )
        return result.returncode == 0
    except Exception:
        return False
