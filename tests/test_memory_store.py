from __future__ import annotations

import pytest
from mash.memory.store import PostgresStore, SQLiteStore

from crew.agents.data.spec import DataAgentSpec
from crew.agents.engineer.spec import EngineerAgentSpec
from crew.agents.pm.spec import PMAgentSpec


@pytest.mark.parametrize("spec_factory", [DataAgentSpec, PMAgentSpec])
def test_agent_specs_default_to_sqlite_store(monkeypatch, tmp_path, spec_factory) -> None:
    monkeypatch.delenv("MASH_MEMORY_DATABASE_URL", raising=False)
    monkeypatch.setenv("MASH_DATA_DIR", str(tmp_path / ".mash"))

    store = spec_factory().build_memory_store()

    assert isinstance(store, SQLiteStore)


@pytest.mark.parametrize("spec_factory", [DataAgentSpec, PMAgentSpec])
def test_agent_specs_use_postgres_store_when_memory_url_is_set(
    monkeypatch,
    tmp_path,
    spec_factory,
) -> None:
    monkeypatch.setenv("MASH_DATA_DIR", str(tmp_path / ".mash"))
    monkeypatch.setenv("MASH_MEMORY_DATABASE_URL", "postgresql://memory-store/test")

    store = spec_factory().build_memory_store()

    assert isinstance(store, PostgresStore)


def test_engineer_agent_spec_uses_postgres_store_when_memory_url_is_set(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("MASH_DATA_DIR", str(tmp_path / ".mash"))
    monkeypatch.setenv("MASH_MEMORY_DATABASE_URL", "postgresql://memory-store/test")
    monkeypatch.setenv("GITHUB_REPOS", str(tmp_path))

    store = EngineerAgentSpec().build_memory_store()

    assert isinstance(store, PostgresStore)
