from __future__ import annotations

import os

from mash.runtime import AgentPool, Host, HostBuilder

from .agents.data.spec import DataAgentSpec
from .agents.pm.spec import PMAgentSpec
from .shared.config import load_agent_env, load_project_env
from .shared.runtime_paths import crew_root_dir

# The crew deployment is a flat pool of agents; hosts are compositions over
# it (`crew compose` adds more). `datasquad` is the default composition:
# `data` primary delegating to the `pm` subagent. crew-host defines it at
# startup so product chat always has its routing target; crew-api references
# it only by id when submitting requests over HTTP.
DEFAULT_HOST_ID = "datasquad"


def build_pool() -> AgentPool:
    load_project_env()
    load_agent_env("pm")
    load_agent_env("data")

    os.environ.setdefault("MASH_DATA_DIR", str(crew_root_dir()))
    pm = PMAgentSpec()
    data = DataAgentSpec()
    return (
        HostBuilder()
        .agent(data, metadata=data.build_subagent_metadata())
        .agent(pm, metadata=pm.build_subagent_metadata())
        .build()
    )


def define_default_host(pool: AgentPool) -> Host:
    """Ensure the `datasquad` composition exists on a running pool.

    The pool ships flat; crew-host calls this at startup so the deployment
    is ready without any client-side publish step. Agent ids match those
    registered in `build_pool`.
    """
    pool.define_host(
        Host(host_id=DEFAULT_HOST_ID, primary="data", subagents=("pm",))
    )
    return pool.get_host(DEFAULT_HOST_ID)
