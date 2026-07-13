from __future__ import annotations

import os

from mash.api import MashHostConfig, run_host
from mash.runtime import AgentPool

from .app import build_pool, define_default_host


def build_host_pool() -> AgentPool:
    pool = build_pool()
    define_default_host(pool)
    return pool


def main() -> None:
    database_url = str(os.getenv("MASH_DATABASE_URL") or "").strip()
    api_key = str(os.getenv("MASH_API_KEY") or "").strip()
    if not database_url:
        raise RuntimeError("MASH_DATABASE_URL must be set for crew-host")
    if not api_key:
        raise RuntimeError("MASH_API_KEY must be set for crew-host")
    run_host(
        build_host_pool(),
        config=MashHostConfig(
            bind_host=os.getenv("MASH_API_HOST", "0.0.0.0"),
            bind_port=int(os.getenv("MASH_API_PORT", "8000")),
            runtime_database_url=database_url,
            api_key=api_key,
        ),
    )


if __name__ == "__main__":
    main()
