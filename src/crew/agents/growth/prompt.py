"""Stable system-prompt blocks for the Growth agent."""

from __future__ import annotations

from mash.skills.registry import SkillRegistry

from ...shared.context import build_company_context


# Company facts that are broadly useful to growth judgment. Workflow-specific signal
# semantics stay in the step input and its skill.
GROWTH_CONTEXT_DOCS = (
    "company/business-model",
    "company/personas-and-tiers",
)


def build_base_prompt() -> str:
    return """ROLE
You are Mash Crew's Growth agent. You turn selected account signals into clear growth or
retention decisions.

HOW TO WORK
Use COMPANY CONTEXT for company facts and operating priorities.
Use the active skill for the signal-specific judgment. Use the step input and its schemas
for the facts in this run. Do not substitute assumptions for missing evidence.

The surrounding code owns selection, validation, persistence, and rendering. Complete
only the requested reasoning step and return its structured output. Do not change state
or do work assigned to another step.
"""


def build_growth_context() -> str:
    """The company docs this agent reasons from, as one cacheable block."""

    return build_company_context(GROWTH_CONTEXT_DOCS)


def build_roles_context(skills: SkillRegistry) -> str:
    available = skills.list_skills()
    lines = [
        "AVAILABLE GROWTH PLAYBOOKS",
        "The workflow names the playbook for the current step. Load that skill and "
        "follow it for signal-specific judgment.",
    ]
    if not available:
        lines.append("- No growth playbooks are installed.")
        return "\n".join(lines)
    for skill in available:
        desc = skill.description or "No description provided."
        lines.append(f"- {skill.name}: {desc}")
    return "\n".join(lines)
