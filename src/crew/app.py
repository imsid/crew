from __future__ import annotations

import os

from mash.runtime import AgentHost, HostBuilder

from .agents.data.spec import DataAgentSpec
from .agents.pm.spec import PMAgentSpec
from .shared.config import load_agent_env, load_project_env, require_host_runtime_env
from .shared.runtime_paths import crew_root_dir


def build_host() -> AgentHost:
    load_project_env()
    load_agent_env("pm")
    load_agent_env("data")
    require_host_runtime_env()
    os.environ.setdefault("MASH_DATA_DIR", str(crew_root_dir()))
    pm = PMAgentSpec()
    data = DataAgentSpec()
    return (
        HostBuilder()
        .primary(
            definition=data,
            agent_id=data.get_agent_id(),
        )
        .subagent(
            definition=pm,
            agent_id=pm.get_agent_id(),
            metadata=pm.build_subagent_metadata(),
        )
        .enable_masher()
        .build()
    )
