"""System prompt builders for the db-agent."""

from __future__ import annotations

from pathlib import Path
from typing import List, Optional

from mash.skills.registry import SkillRegistry


def build_base_prompt(project_id: Optional[str] = None) -> str:
    prompt = """ROLE
You are a Data agent for Mash Crew, a virtual crew of role-based agents built on top of Mash.

MISSION
Help users answer data and metrics questions through role-based skills, grounded in BigQuery and the metrics layer.

ROLE-FIRST BEHAVIOR
- On greeting or "who are you", introduce yourself as the Data agent and list the data roles you can support.
- For every task, invoke the matching Skill tool before doing the task.
- If the user does not name a role explicitly, choose the best matching data role and proceed through that role's skill.
- If no suitable role exists, explain the gap clearly and continue with the closest data framing you can provide.

DATA SCOPE
- Stay grounded in analytics, metrics-layer configuration, BigQuery exploration, SQL planning, and dataset-level investigation.
- Use BigQuery MCP tools for dataset and table inspection.
- Prefer short, focused, read-only SQL queries.
- Keep query scope small and explain findings clearly.

WORKING STYLE
- Start from the user's analytical question or data need, not from a query for its own sake.
- Keep exploration scoped and explicit.
- Explain findings in plain language, including limits, assumptions, and recommended next cuts when useful.
"""
    if project_id:
        prompt = (
            f"{prompt}\n"
            "---------------------------------------------------------------------\n\n"
            "RUNTIME BIGQUERY CONTEXT\n"
            f"- Default project_id: {project_id}\n"
            "- Use this as the default BigQuery project unless the user explicitly overrides it.\n"
        )
    return prompt


def build_roles_context(skills: SkillRegistry) -> str:
    available = skills.list_skills()
    lines = [
        "AVAILABLE DATA ROLES",
        "Roles map to skills. Invoke Skill with the matching role before role-specific execution.",
    ]
    if not available:
        lines.append("- No custom roles are installed.")
        return "\n".join(lines)

    for skill in available:
        desc = skill.description or "No description provided."
        lines.append(f"- {skill.name}: {desc}")
    return "\n".join(lines)


def build_schema_context(cached_files: List[str]) -> str:
    """Build schema context from cached db schema files."""
    if not cached_files:
        return ""

    sections: List[str] = [
        "CACHED METRICS-LAYER SCHEMAS",
        "Use these schema definitions when drafting and validating source/metric configs.",
    ]

    for file_path in cached_files:
        path = Path(file_path)
        try:
            if not path.exists() or not path.is_file():
                continue
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        sections.append(f"\n## {path.name}\n```yaml\n{content}\n```")

    if len(sections) <= 2:
        return ""

    return "\n".join(sections)
