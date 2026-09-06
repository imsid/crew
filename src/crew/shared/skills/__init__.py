from __future__ import annotations

from pathlib import Path
from typing import Iterable

from mash.skills.registry import SkillRegistry

CREW_SKILLS_DIR = Path(__file__).resolve().parent


def register_custom_skills(registry: SkillRegistry, *skill_dirs: Path) -> SkillRegistry:
    """Register every skill directory under ``skill_dirs``, first location winning.

    ``get_custom_skills`` treats *any* subdirectory as a skill, which picks up
    ``__pycache__`` next to a package's real skills. That is worse than cosmetic: the
    registry feeds the agent's playbook list, which is part of the cached system-prompt
    prefix, and ``__pycache__`` appears the first time Python writes bytecode — so the
    prefix could change under a running process. A skill is a directory with a
    ``SKILL.md``; that is what ``SkillTool`` reads, so that is the test here.
    """

    seen_locations: set[str] = set()
    for skills_dir in skill_dirs:
        if not skills_dir.exists() or not skills_dir.is_dir():
            continue
        for skill in registry.get_custom_skills(skills_dir):
            location = str(skill.location or "")
            if not location or location in seen_locations:
                continue
            if not (Path(location) / "SKILL.md").is_file():
                continue
            seen_locations.add(location)
            registry.register(skill)
    return registry


def list_skill_names(registry: SkillRegistry) -> Iterable[str]:
    return [skill.name for skill in registry.list_skills()]
