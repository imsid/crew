"""The company docs reach the agent through the system prompt, and stay cacheable.

Two things are being protected here. The first is the cache: the block is part of the
prefix a provider caches, so it has to be byte-identical across requests or every call
is a miss. The second is the drift the block exists to end — a fact restated in
``prompt.py`` is a second copy of something a doc already owns.
"""

from __future__ import annotations

import pytest

from crew.agents.growth.prompt import (
    GROWTH_CONTEXT_DOCS,
    build_base_prompt,
    build_growth_context,
)
from crew.shared.context import (
    CONTEXT_ROOT,
    available_context_docs,
    build_company_context,
    load_context_doc,
)


# --------------------------------------------------------------------------------------
# Cacheability
# --------------------------------------------------------------------------------------


def test_the_context_block_is_byte_identical_across_calls() -> None:
    """A prefix that differs by one byte between requests is a cache miss."""

    assert build_growth_context() == build_growth_context()


def test_nothing_about_the_file_on_disk_reaches_the_block() -> None:
    """Absolute paths and mtimes vary by host and by checkout; content does not."""

    block = build_growth_context()

    assert str(CONTEXT_ROOT) not in block
    assert ".md" not in block


def test_declaration_order_is_render_order() -> None:
    """An agent owns its own prefix: adding a doc to the tree cannot reorder it."""

    block = build_company_context(
        ("company/personas-and-tiers", "company/business-model")
    )
    reversed_block = build_company_context(
        ("company/business-model", "company/personas-and-tiers")
    )

    assert block.index("=== company/personas-and-tiers") < block.index(
        "=== company/business-model"
    )
    assert block != reversed_block


# --------------------------------------------------------------------------------------
# The docs themselves
# --------------------------------------------------------------------------------------


def test_every_doc_the_growth_agent_declares_exists() -> None:
    """A renamed doc fails here rather than at agent build time."""

    assert set(GROWTH_CONTEXT_DOCS) <= set(available_context_docs())


def test_an_unknown_doc_names_what_is_available() -> None:
    with pytest.raises(ValueError, match="unknown context doc 'company/nope'") as excinfo:
        load_context_doc("company/nope")

    assert "company/business-model" in str(excinfo.value)


def test_a_doc_renders_as_its_locator_and_its_body_without_frontmatter() -> None:
    doc = load_context_doc("company/business-model")

    assert doc.startswith("=== company/business-model (Chief Product Officer,")
    assert "doc_type: company-context" not in doc  # the frontmatter is not body
    assert "# Ampere — Business Model" in doc


def test_asking_for_no_docs_is_an_error_rather_than_an_empty_block() -> None:
    with pytest.raises(ValueError, match="at least one doc"):
        build_company_context(())


# --------------------------------------------------------------------------------------
# Anti-drift: the prompt stops restating what the docs own
# --------------------------------------------------------------------------------------


@pytest.mark.parametrize(
    "fact",
    [
        "Ampere",                              # company identity belongs to context
        "free, team, business, enterprise",  # the tier list — business-model owns it
        "bills tokens on top of",            # the billing model — business-model owns it
        "3,200",                             # the headroom example — personas owns it
    ],
)
def test_the_prompt_does_not_restate_a_fact_a_doc_owns(fact: str) -> None:
    assert fact not in build_base_prompt()


def test_the_facts_are_still_available_to_the_agent() -> None:
    """Deleting them from the prompt only helps if the block actually carries them."""

    block = build_growth_context()

    assert "enterprise" in block
    assert "Net Revenue Retention" in block
    assert "beachhead" in block


def test_only_real_skill_directories_reach_the_playbook_list() -> None:
    """``__pycache__`` is not a playbook, and it appears whenever Python writes bytecode.

    It sat in the prefix as an advertised skill with no description. The cache problem
    is the sharper one: bytecode can be written after a process has already cached its
    prefix, which would shift the prompt mid-run.
    """

    from crew.agents.growth.spec import GrowthAgentSpec

    names = [skill.name for skill in GrowthAgentSpec().build_skills().list_skills()]

    assert "__pycache__" not in names
    assert "consumption-dip" in names


def test_the_context_block_precedes_the_playbook_list_in_the_system_prompt() -> None:
    """Most stable first: the playbook list moves when a skill is registered."""

    from crew.agents.growth.spec import GrowthAgentSpec

    blocks = [block["text"] for block in GrowthAgentSpec().build_agent_config().system_prompt]

    assert len(blocks) == 3
    assert blocks[0].startswith("ROLE")
    assert blocks[1].startswith("COMPANY CONTEXT")
    assert blocks[2].startswith("AVAILABLE GROWTH PLAYBOOKS")
