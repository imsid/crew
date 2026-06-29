from __future__ import annotations

import os

from mash.runtime import AgentPool, Host, HostBuilder

from .agents.data.spec import DataAgentSpec
from .agents.pm.spec import PMAgentSpec
from .shared.config import load_agent_env, load_project_env
from .shared.runtime_paths import crew_root_dir

# The crew deployment is a flat pool of agents; hosts are compositions over
# it, defined dynamically (the CLI seeds and publishes `datasquad`; `crew
# compose` adds more). `datasquad` is the default composition: `data` primary
# delegating to the `pm` subagent. It is configuration, not code — the pool
# ships no hosts. The constant and helper below exist only so the beta BFF,
# which auto-routes chat to a host, can ensure its routing target exists.
DEFAULT_HOST_ID = "datasquad"


def build_pool() -> AgentPool:
    load_project_env()
    load_agent_env("pm")
    load_agent_env("data")

    # CREW_DATABASE_URL is crew's canonical knob; the beta store reads it
    # directly while the Mash runtime/memory store reads MASH_DATABASE_URL, and
    # the two must point at the same Postgres. Seed MASH_DATABASE_URL from it
    # when unset (mirroring docker-entrypoint.sh). An explicit MASH_DATABASE_URL
    # wins, so unset a stale one in your shell if it diverges from CREW_DATABASE_URL.
    crew_db = os.environ.get("CREW_DATABASE_URL", "").strip()
    if crew_db:
        os.environ.setdefault("MASH_DATABASE_URL", crew_db)

    os.environ.setdefault("MASH_DATA_DIR", str(crew_root_dir()))
    pm = PMAgentSpec()
    data = DataAgentSpec()
    return (
        HostBuilder()
        .agent(data, metadata=data.build_subagent_metadata())
        .agent(pm, metadata=pm.build_subagent_metadata())
        .enable_masher()
        .build()
    )


def define_default_host(pool: AgentPool) -> Host:
    """Ensure the `datasquad` composition exists on a running pool.

    The pool ships flat; the beta BFF calls this at startup so it has a host
    to route chat through. Agent ids match those registered in `build_pool`.
    """
    pool.define_host(
        Host(host_id=DEFAULT_HOST_ID, primary="data", subagents=("pm",))
    )
    return pool.get_host(DEFAULT_HOST_ID)
