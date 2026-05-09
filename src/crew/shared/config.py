from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

from .runtime_paths import source_root

_HOST_RUNTIME_ENV_VARS = (
    "MASH_RUNTIME_DATABASE_URL",
    "DBOS_CONDUCTOR_KEY",
)
_LOADED_ENV_PATHS: set[Path] = set()


def project_root() -> Path:
    root = source_root()
    if root is None:
        raise RuntimeError("Could not locate mash-crew project root")
    return root


def load_project_env() -> Path:
    root = source_root()
    env_path = (root / ".env") if root else Path(".env")
    resolved_env_path = env_path.resolve()
    if resolved_env_path.exists() and resolved_env_path not in _LOADED_ENV_PATHS:
        load_dotenv(env_path, override=False)
        _LOADED_ENV_PATHS.add(resolved_env_path)
    return env_path


def agent_env_path(agent_id: str) -> Path:
    root = source_root()
    if root is None:
        return Path(f".missing-agent-env/{agent_id}.env")
    return root / "src" / "crew" / "agents" / agent_id / ".env"


def load_agent_env(agent_id: str) -> Path:
    env_path = agent_env_path(agent_id)
    # Precedence: shell env > agent .env > project .env
    if env_path.exists():
        load_dotenv(env_path, override=False)
    load_project_env()
    return env_path


def require_host_runtime_env() -> None:
    missing = [
        name
        for name in _HOST_RUNTIME_ENV_VARS
        if not str(os.environ.get(name, "")).strip()
    ]
    if missing:
        joined = ", ".join(missing)
        raise RuntimeError(
            f"Missing required host runtime environment: {joined}. "
            "Set these in the shell or the project .env before starting the hosted runtime."
        )
