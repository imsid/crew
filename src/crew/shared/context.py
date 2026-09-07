"""The company context docs, as a system-prompt block.

``src/crew/context`` holds the durable company docs — what the company is, how it makes
money, who its customers are, and what its revenue motions are. Humans write and review
them, and until now nothing read them: every agent that needed a fact from one restated
it in its own prompt, where the copy drifts away from the doc that owns it.

An agent declares the docs it needs and gets their text as one block.

## Why a block and not a Skill

The block is part of the system instruction, which is the prefix a provider caches. A
doc pulled in through ``Skill`` arrives as a tool result in the message stream instead:
it costs a turn, it lands behind the cache boundary rather than in front of it, and the
agent has to decide to ask for it. Context an agent always needs belongs in the prefix.

Two properties keep that prefix cacheable, and both are load-bearing:

- **The text is byte-identical across requests.** Docs render in the order the agent
  declared them, and nothing derived from the filesystem (absolute paths, mtimes) or the
  clock reaches the output. A prefix that differs by one byte is a cache miss.
- **It is read once per process.** ``build_agent_config`` runs per agent build, so the
  read is memoized: a request never pays the I/O, and an edit on disk cannot shift the
  prefix out from under a process that has already cached it.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

import yaml

# This module is ``src/crew/shared/context.py``; the docs live at ``src/crew/context``.
CONTEXT_ROOT = Path(__file__).resolve().parents[1] / "context"

_HEADER = """COMPANY CONTEXT
The company docs, written and reviewed by the executives who own them. This is the
source of truth for the business model, customers, priorities, and operating context —
where anything else you have been told disagrees with a doc here, the doc wins."""


def available_context_docs() -> tuple[str, ...]:
    """Every doc id under ``CONTEXT_ROOT``, as ``<section>/<name>``, sorted."""

    return tuple(
        sorted(
            path.relative_to(CONTEXT_ROOT).with_suffix("").as_posix()
            for path in CONTEXT_ROOT.rglob("*.md")
        )
    )


@lru_cache(maxsize=None)
def load_context_doc(doc_id: str) -> str:
    """One doc, rendered as its locator line plus its body. Memoized per process.

    The frontmatter becomes the locator — the doc id, who owns it, when it was last
    reviewed — because an agent reading a claim should be able to see whose claim it is
    and how fresh. Everything in the locator is content, so it is stable across reads;
    nothing about the file on disk is.
    """

    path = CONTEXT_ROOT / f"{doc_id}.md"
    if not path.is_file():
        raise ValueError(
            f"unknown context doc '{doc_id}'. Available: "
            f"{', '.join(available_context_docs())}"
        )

    frontmatter, body = _split_frontmatter(path.read_text(encoding="utf-8"))
    owner = str(frontmatter.get("author_role") or "").strip()
    reviewed = str(frontmatter.get("last_reviewed") or "").strip()
    attribution = ", ".join(part for part in (owner, f"last reviewed {reviewed}" if reviewed else "") if part)
    locator = f"=== {doc_id}" + (f" ({attribution})" if attribution else "")
    return f"{locator}\n\n{body}"


def build_company_context(doc_ids: tuple[str, ...]) -> str:
    """The context block for an agent, in the order it declared its docs.

    Declaration order is render order — not directory order — so an agent controls what
    its context reads like, and so adding a doc to ``CONTEXT_ROOT`` that some agent did
    not ask for cannot silently change that agent's prefix.
    """

    if not doc_ids:
        raise ValueError("an agent that wants company context must name at least one doc")
    return "\n\n".join([_HEADER, *(load_context_doc(doc_id) for doc_id in doc_ids)])


def _split_frontmatter(text: str) -> tuple[dict, str]:
    """``(frontmatter, body)``. A doc without frontmatter is all body."""

    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text.strip()
    for index in range(1, len(lines)):
        if lines[index].strip() == "---":
            parsed = yaml.safe_load("\n".join(lines[1:index])) or {}
            body = "\n".join(lines[index + 1 :]).strip()
            return (parsed if isinstance(parsed, dict) else {}), body
    return {}, text.strip()


__all__ = [
    "CONTEXT_ROOT",
    "available_context_docs",
    "build_company_context",
    "load_context_doc",
]
