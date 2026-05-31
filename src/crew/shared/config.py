from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from .runtime_paths import source_root

_HOST_RUNTIME_ENV_VARS = (
    "MASH_DATABASE_URL",
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


# Workspace configuration


@dataclass
class CrewConfig:
    """Crew configuration."""

    workspace_id: str | None = None


def config_path() -> Path:
    """Get path to Crew config file."""
    return Path.home() / ".crew" / "config.json"


def load_config() -> CrewConfig | None:
    """Load config from disk. Returns None if missing or invalid."""
    path = config_path()
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        return CrewConfig(workspace_id=data.get("workspace_id"))
    except Exception:
        return None  # Graceful degradation


def save_config(config: CrewConfig) -> Path:
    """Save config to disk."""
    path = config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    data = {"workspace_id": config.workspace_id}
    path.write_text(json.dumps(data, indent=2))
    return path


def get_current_workspace() -> str | None:
    """Get currently configured workspace, or None if not set."""
    config = load_config()
    return config.workspace_id if config else None
