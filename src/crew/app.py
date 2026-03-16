from __future__ import annotations

import os

from mash.runtime import MashAgentHost, MashAgentHostBuilder

from .agents.data.spec import DataAgentSpec
from .agents.engineer.metadata import (
    ENGINEER_AGENT_ID,
    build_engineer_agent_metadata,
)
from .agents.engineer.spec import EngineerAgentSpec
from .agents.pm.spec import PMAgentSpec
from .agents.pm.subagents import DATA_SUBAGENT_ID, build_data_subagent_metadata
from .shared.config import load_agent_env, load_project_env
from .shared.runtime_paths import crew_root_dir


def build_host() -> MashAgentHost:
    load_project_env()
    load_agent_env("pm")
    load_agent_env("data")
    load_agent_env("engineer")
    os.environ.setdefault("MASH_DATA_DIR", str(crew_root_dir()))

    return (
        MashAgentHostBuilder()
        .primary(
            PMAgentSpec(),
            agent_id="pm",
        )
        .subagent(
            DataAgentSpec(),
            agent_id=DATA_SUBAGENT_ID,
            metadata=build_data_subagent_metadata(),
        )
        .subagent(
            EngineerAgentSpec(),
            agent_id=ENGINEER_AGENT_ID,
            metadata=build_engineer_agent_metadata(),
        )
        .build()
    )
