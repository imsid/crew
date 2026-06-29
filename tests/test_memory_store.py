from __future__ import annotations

import pytest
from mash.memory.store import PostgresStore

from crew.agents.data.spec import DataAgentSpec
from crew.agents.engineer.spec import EngineerAgentSpec
from crew.agents.pm.spec import PMAgentSpec

# mash >= 0.7 removed the SQLite memory backend. The crew specs do not override
# ``build_memory_store``, so they inherit mash's base contract: a Postgres store
# built from ``MASH_DATABASE_URL``, raising when it is unset.


@pytest.mark.parametrize("spec_factory", [DataAgentSpec, PMAgentSpec])
def test_agent_specs_require_database_url(monkeypatch, spec_factory) -> None:
    monkeypatch.delenv("MASH_DATABASE_URL", raising=False)

    with pytest.raises(RuntimeError, match="MASH_DATABASE_URL"):
        spec_factory().build_memory_store()


@pytest.mark.parametrize("spec_factory", [DataAgentSpec, PMAgentSpec])
def test_agent_specs_use_postgres_store_when_database_url_is_set(
    monkeypatch,
    spec_factory,
) -> None:
    monkeypatch.setenv("MASH_DATABASE_URL", "postgresql://memory-store/test")

    store = spec_factory().build_memory_store()

    assert isinstance(store, PostgresStore)


def test_engineer_agent_spec_uses_postgres_store_when_database_url_is_set(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("MASH_DATABASE_URL", "postgresql://memory-store/test")
    monkeypatch.setenv("GITHUB_REPOS", str(tmp_path))

    store = EngineerAgentSpec().build_memory_store()

    assert isinstance(store, PostgresStore)
