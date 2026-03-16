from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv


@lru_cache(maxsize=1)
def project_root() -> Path:
    current = Path(__file__).resolve()
    for parent in [current.parent, *current.parents]:
        if (parent / "pyproject.toml").exists():
            return parent
    raise RuntimeError("Could not locate mash-crew project root")


@lru_cache(maxsize=1)
def load_project_env() -> Path:
    env_path = project_root() / ".env"
    load_dotenv(env_path)
    return env_path


def agent_env_path(agent_id: str) -> Path:
    return project_root() / "src" / "crew" / "agents" / agent_id / ".env"


@lru_cache(maxsize=8)
def load_agent_env(agent_id: str) -> Path:
    env_path = agent_env_path(agent_id)
    # Precedence: shell env > agent .env > project .env
    load_dotenv(env_path)
    load_project_env()
    return env_path
