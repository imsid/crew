from __future__ import annotations

import os
import re
from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKSPACE_NAME = "marketing_db"
WORKSPACE_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def package_root() -> Path:
    return PACKAGE_ROOT


def source_root() -> Path | None:
    current = Path(__file__).resolve()
    for parent in [current.parent, *current.parents]:
        if (parent / "pyproject.toml").exists():
            return parent
    return None


def workspace_root_dir() -> Path:
    raw_root = os.environ.get("CREW_WORKSPACE_ROOT")
    if raw_root:
        return _ensure_dir(Path(raw_root).expanduser().resolve())

    default_workspace = Path("/workspace")
    if default_workspace.exists():
        return default_workspace.resolve()

    root = source_root()
    if root is not None:
        repo_workspace = root / "src" / "crew" / "workspace"
        if repo_workspace.exists():
            return repo_workspace.resolve()

    packaged_workspace = package_root() / "workspace"
    if packaged_workspace.exists():
        return packaged_workspace.resolve()

    return _ensure_dir((Path.cwd() / "workspace").resolve())


def default_workspace_name() -> str:
    return DEFAULT_WORKSPACE_NAME


def selected_workspace_name(explicit_workspace: str | None = None) -> str:
    candidate = explicit_workspace or os.environ.get("CREW_WORKSPACE") or DEFAULT_WORKSPACE_NAME
    normalized = candidate.strip() if isinstance(candidate, str) else ""
    if not normalized:
        normalized = DEFAULT_WORKSPACE_NAME
    if not WORKSPACE_NAME_RE.fullmatch(normalized):
        raise ValueError(
            f"workspace must match regex {WORKSPACE_NAME_RE.pattern}"
        )
    return normalized


def workspace_dir(
    explicit_workspace: str | None = None,
    *,
    require_exists: bool = False,
) -> Path:
    root = workspace_root_dir()
    workspace_name = selected_workspace_name(explicit_workspace)
    resolved = (root / workspace_name).resolve()
    if not resolved.is_relative_to(root):
        raise ValueError(f"workspace path resolved outside workspace root: {root}")
    if require_exists and not resolved.exists():
        raise ValueError(f"workspace '{workspace_name}' does not exist under {root}")
    return resolved


def crew_root_dir() -> Path:
    raw_root = os.environ.get("MASH_DATA_DIR")
    if raw_root:
        return _ensure_dir(Path(raw_root).expanduser().resolve())
    root = source_root()
    if root is not None:
        return _ensure_dir((root / ".mash").resolve())
    return _ensure_dir((Path.home() / ".mash").resolve())


def agent_root_dir(agent_id: str) -> Path:
    return _ensure_dir(crew_root_dir() / agent_id)


def logs_dir_path(agent_id: str) -> Path:
    return _ensure_dir(agent_root_dir(agent_id) / "logs")


def memory_dir_path(agent_id: str) -> Path:
    return _ensure_dir(agent_root_dir(agent_id) / "memory")


def log_file_path(agent_id: str, filename: str) -> Path:
    return logs_dir_path(agent_id) / filename


def memory_file_path(agent_id: str, filename: str) -> Path:
    return memory_dir_path(agent_id) / filename
