from __future__ import annotations

from pathlib import Path
from typing import Iterable

from mash.skills.registry import SkillRegistry

from .runtime_paths import package_root

CREW_SKILLS_DIR = package_root() / "skills"


def register_custom_skills(registry: SkillRegistry, *skill_dirs: Path) -> SkillRegistry:
    seen_locations: set[str] = set()
    for skills_dir in skill_dirs:
        if not skills_dir.exists() or not skills_dir.is_dir():
            continue
        for skill in registry.get_custom_skills(skills_dir):
            location = str(skill.location or "")
            if location in seen_locations:
                continue
            seen_locations.add(location)
            registry.register(skill)
    return registry


def list_skill_names(registry: SkillRegistry) -> Iterable[str]:
    return [skill.name for skill in registry.list_skills()]
