from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
CREW_ROOT = PROJECT_ROOT / ".mash"


def _ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def crew_root_dir() -> Path:
    return _ensure_dir(CREW_ROOT)


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
