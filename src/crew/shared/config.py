from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

from .runtime_paths import source_root


def project_root() -> Path:
    root = source_root()
    if root is None:
        raise RuntimeError("Could not locate mash-crew project root")
    return root


def load_project_env() -> Path:
    root = source_root()
    env_path = (root / ".env") if root else Path(".env")
    if env_path.exists():
        load_dotenv(env_path, override=False)
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
