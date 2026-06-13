"""Local auth state for the crew CLI.

`crew login` authenticates against the BFF and stores the bearer token here so
later commands act as the same user the web UI uses. Stored at
`~/.crew/auth.json` (override the directory with `CREW_HOME`). Stdlib-only so
the standalone CLI binary can import it without the server stack.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional


def auth_file_path() -> Path:
    home = Path(os.environ.get("CREW_HOME", "~/.crew")).expanduser()
    return home / "auth.json"


def save_auth(
    *,
    api_base_url: str,
    token: str,
    username: str,
    user_id: str,
) -> None:
    path = auth_file_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(
            {
                "api_base_url": api_base_url.rstrip("/"),
                "token": token,
                "username": username,
                "user_id": user_id,
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


def load_auth() -> Optional[dict[str, Any]]:
    path = auth_file_path()
    if not path.exists():
        return None
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None
    if not isinstance(payload, dict) or not str(payload.get("token") or "").strip():
        return None
    return payload


def clear_auth() -> bool:
    path = auth_file_path()
    if path.exists():
        path.unlink()
        return True
    return False
