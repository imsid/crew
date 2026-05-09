"""Repository helpers for packaged SKILL.md files."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

from ..shared.runtime_paths import source_root


@dataclass(frozen=True)
class SkillScope:
    key: str
    label: str
    root: Path
    used_by: tuple[str, ...]


def list_skills(*, limit: int | None = None) -> dict[str, Any]:
    repo_root = _require_repo_root()
    scopes = _skill_scopes(repo_root)
    normalized_limit = None if limit is None else max(1, int(limit))

    skills: list[dict[str, Any]] = []
    for scope in scopes:
        for path in sorted(scope.root.rglob("SKILL.md")):
            payload = _read_skill_payload(path, scope=scope, repo_root=repo_root)
            skills.append(_skill_list_item(payload))
            if normalized_limit is not None and len(skills) >= normalized_limit:
                return {
                    "root": repo_root.as_posix(),
                    "count": len(skills),
                    "skills": skills,
                }

    skills.sort(key=lambda item: (item["name"].lower(), item["skill_id"]))
    return {
        "root": repo_root.as_posix(),
        "count": len(skills),
        "skills": skills,
    }


def search_skills(*, query: str, limit: int = 10) -> dict[str, Any]:
    if not isinstance(query, str) or not query.strip():
        raise ValueError("query is required")
    normalized_query = query.strip()
    query_tokens = [token for token in normalized_query.lower().split() if token]
    if not query_tokens:
        raise ValueError("query must contain searchable text")

    repo_root = _require_repo_root()
    matches: list[dict[str, Any]] = []
    for scope in _skill_scopes(repo_root):
        for path in sorted(scope.root.rglob("SKILL.md")):
            payload = _read_skill_payload(path, scope=scope, repo_root=repo_root)
            haystacks = {
                "name": str(payload["frontmatter"].get("name") or "").lower(),
                "description": str(payload["frontmatter"].get("description") or "").lower(),
                "used_by": " ".join(payload["used_by"]).lower(),
                "path": str(payload["path"]).lower(),
                "content": str(payload["content"]).lower(),
            }
            score = 0
            for token in query_tokens:
                if token in haystacks["name"]:
                    score += 5
                if token in haystacks["description"]:
                    score += 4
                if token in haystacks["used_by"]:
                    score += 2
                if token in haystacks["path"]:
                    score += 2
                if token in haystacks["content"]:
                    score += 1
            if score <= 0:
                continue
            item = _skill_list_item(payload)
            item["score"] = score
            item["preview"] = _skill_preview_text(payload)
            matches.append(item)

    matches.sort(
        key=lambda item: (
            -int(item["score"]),
            str(item["name"]).lower(),
            str(item["skill_id"]),
        )
    )
    return {
        "query": normalized_query,
        "count": min(len(matches), max(1, int(limit))),
        "results": matches[: max(1, int(limit))],
    }


def read_skill(*, skill_id: Any) -> dict[str, Any]:
    normalized_id = _normalize_skill_id(skill_id)
    repo_root = _require_repo_root()
    path, scope = _resolve_skill_path(repo_root, normalized_id)
    payload = _read_skill_payload(path, scope=scope, repo_root=repo_root)
    return {
        "skill_id": payload["skill_id"],
        "path": payload["path"],
        "size": len(payload["content"]),
        "frontmatter": payload["frontmatter"],
        "used_by": payload["used_by"],
        "scope": payload["scope"],
        "content": payload["content"],
    }


def _require_repo_root() -> Path:
    root = source_root()
    if root is None:
        raise RuntimeError("repository root could not be resolved")
    return root.resolve()


def _skill_scopes(repo_root: Path) -> tuple[SkillScope, ...]:
    src_root = repo_root / "src" / "crew"
    return (
        SkillScope(
            key="shared",
            label="Shared",
            root=src_root / "skills",
            used_by=("data", "engineer", "pm"),
        ),
        SkillScope(
            key="data",
            label="Data",
            root=src_root / "agents" / "data" / "skills",
            used_by=("data",),
        ),
        SkillScope(
            key="pm",
            label="PM",
            root=src_root / "agents" / "pm" / "skills",
            used_by=("pm",),
        ),
    )


def _read_skill_payload(path: Path, *, scope: SkillScope, repo_root: Path) -> dict[str, Any]:
    content = path.read_text(encoding="utf-8")
    frontmatter = _parse_frontmatter(content)
    skill_name = str(frontmatter.get("name") or path.parent.name).strip() or path.parent.name
    description = str(frontmatter.get("description") or "").strip()
    relative_path = path.relative_to(repo_root).as_posix()
    return {
        "skill_id": f"{scope.key}--{path.parent.name}",
        "name": skill_name,
        "description": description,
        "frontmatter": frontmatter,
        "used_by": list(scope.used_by),
        "scope": scope.label,
        "path": relative_path,
        "content": content,
    }


def _skill_list_item(payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "skill_id": payload["skill_id"],
        "name": payload["name"],
        "description": payload["description"],
        "frontmatter": payload["frontmatter"],
        "used_by": payload["used_by"],
        "scope": payload["scope"],
        "path": payload["path"],
    }


def _parse_frontmatter(content: str) -> dict[str, Any]:
    lines = content.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}
    end_idx = None
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            end_idx = idx
            break
    if end_idx is None:
        return {}
    try:
        parsed = yaml.safe_load("\n".join(lines[1:end_idx])) or {}
    except Exception:
        return {}
    return dict(parsed) if isinstance(parsed, dict) else {}


def _normalize_skill_id(value: Any) -> str:
    normalized = str(value or "").strip()
    if not normalized:
        raise ValueError("skill_id is required")
    if "/" in normalized or "\\" in normalized:
        raise ValueError("skill_id must not contain path separators")
    return normalized


def _resolve_skill_path(repo_root: Path, skill_id: str) -> tuple[Path, SkillScope]:
    scopes = {scope.key: scope for scope in _skill_scopes(repo_root)}
    scope_key, separator, slug = skill_id.partition("--")
    if not separator or not slug:
        raise ValueError("skill_id is invalid")
    scope = scopes.get(scope_key)
    if scope is None:
        raise ValueError(f"unknown skill scope: {scope_key}")
    path = (scope.root / slug / "SKILL.md").resolve()
    if not path.is_relative_to(scope.root.resolve()):
        raise ValueError("skill path resolved outside skill root")
    if not path.exists() or not path.is_file():
        raise ValueError(f"skill file not found: {path.relative_to(repo_root).as_posix()}")
    return path, scope


def _skill_preview_text(payload: dict[str, Any]) -> str:
    description = str(payload.get("description") or "").strip()
    if description:
        return description[:220]
    return f"Used by {', '.join(payload['used_by'])}"[:220]
