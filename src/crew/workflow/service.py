from __future__ import annotations

import re
import time
from typing import TYPE_CHECKING, Any

from mash.runtime import AgentHost
from mash.skills.base import Skill
from mash.workflows import TaskSpec, WorkflowSpec, WorkflowTaskMessageSpec

if TYPE_CHECKING:
    from ..beta.store import BetaStore

_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$")
_SKILL_PATTERN = re.compile(r"^[a-z0-9][a-z0-9_-]*[a-z0-9]$|^[a-z0-9]$")


class WorkflowError(ValueError):
    """Validation or publishing error for authored workflows."""


class WorkflowService:
    def __init__(
        self,
        *,
        store: "BetaStore",
        host: AgentHost,
        primary_agent_id: str,
    ) -> None:
        self._store = store
        self._host = host
        self._primary_agent_id = _normalize_text(primary_agent_id, "primary_agent_id")

    @property
    def primary_agent_id(self) -> str:
        return self._primary_agent_id

    async def validate_definition(self, definition: dict[str, Any]) -> dict[str, Any]:
        return self._normalize_definition(definition)

    async def publish_workflow(self, definition: dict[str, Any]) -> dict[str, Any]:
        normalized = self._normalize_definition(definition)
        now = time.time()
        skill = normalized["skill"]
        workflow = normalized["workflow"]
        tasks = normalized["tasks"]

        saved_skill = await self._store.upsert_authored_skill(
            {
                "skill_id": _skill_id_from_name(skill["name"]),
                "name": skill["name"],
                "description": skill["description"],
                "content": skill["content"],
                "status": "published",
                "created_at": now,
                "updated_at": now,
            }
        )
        await self._store.upsert_authored_workflow(
            {
                "workflow_id": workflow["workflow_id"],
                "skill_id": saved_skill["skill_id"],
                "name": workflow["name"],
                "description": workflow["description"],
                "status": "published",
                "input_schema": workflow["input_schema"],
                "owner_agent_id": self._primary_agent_id,
                "source_session_id": workflow.get("source_session_id"),
                "created_at": now,
                "updated_at": now,
            },
            tasks=[
                {
                    "workflow_id": workflow["workflow_id"],
                    "task_id": task["task_id"],
                    "position": index,
                    "title": task["title"],
                    "agent_id": self._primary_agent_id,
                    "structured_output": task["structured_output"],
                }
                for index, task in enumerate(tasks, start=1)
            ],
        )

        registration = await self._register_runtime_workflow(
            skill=saved_skill,
            workflow={
                **workflow,
                "owner_agent_id": self._primary_agent_id,
                "skill_id": saved_skill["skill_id"],
            },
            tasks=tasks,
        )
        return {
            "workflow_id": workflow["workflow_id"],
            "skill_id": saved_skill["skill_id"],
            "skill_name": saved_skill["name"],
            "owner_agent_id": self._primary_agent_id,
            "status": "published",
            "tasks": [
                {
                    "task_id": task["task_id"],
                    "agent_id": self._primary_agent_id,
                    "title": task["title"],
                }
                for task in tasks
            ],
            "registration": registration,
        }

    async def disable_workflow(self, workflow_id: str) -> dict[str, Any]:
        normalized_id = _normalize_workflow_id(workflow_id, "workflow_id")
        workflow = await self._store.set_authored_workflow_status(
            normalized_id, "disabled"
        )
        if workflow is None:
            raise WorkflowError(f"workflow '{normalized_id}' was not found")
        return workflow

    async def get_workflow(self, workflow_id: str) -> dict[str, Any]:
        normalized_id = _normalize_workflow_id(workflow_id, "workflow_id")
        payload = await self._store.get_authored_workflow_bundle(normalized_id)
        if payload is None:
            raise WorkflowError(f"workflow '{normalized_id}' was not found")
        return payload

    async def list_published_workflows(self) -> list[dict[str, Any]]:
        return await self._store.list_authored_workflow_bundles(status="published")

    async def republish_published_workflows(self) -> list[dict[str, Any]]:
        results: list[dict[str, Any]] = []
        for bundle in await self.list_published_workflows():
            results.append(
                await self._register_runtime_workflow(
                    skill=bundle["skill"],
                    workflow=bundle["workflow"],
                    tasks=bundle["tasks"],
                )
            )
        return results

    async def _register_runtime_workflow(
        self,
        *,
        skill: dict[str, Any],
        workflow: dict[str, Any],
        tasks: list[dict[str, Any]],
    ) -> dict[str, Any]:
        agent_id = self._primary_agent_id
        try:
            self._host.unregister_agent_skill(agent_id, skill["name"])
            self._host.register_agent_skill(
                agent_id,
                Skill(
                    type="dynamic",
                    name=skill["name"],
                    description=skill["description"],
                    content=skill["content"],
                ),
            )
            self._host.register_agent_workflow(
                agent_id,
                WorkflowSpec(
                    workflow_id=workflow["workflow_id"],
                    tasks=[
                        TaskSpec(
                            task_id=task["task_id"],
                            agent_id=self._primary_agent_id,
                            structured_output=task["structured_output"],
                        )
                        for task in sorted(
                            tasks, key=lambda item: int(item.get("position") or 0)
                        )
                    ],
                    metadata={
                        "source": "crew-authored",
                        "skill_id": workflow["skill_id"],
                        "source_session_id": workflow.get("source_session_id"),
                    },
                    task_message=WorkflowTaskMessageSpec(
                        skill_name=skill["name"],
                    ),
                ),
            )
        except ValueError as exc:
            raise WorkflowError(f"failed to register workflow: {exc}") from exc
        return {
            "agent_id": agent_id,
            "skill_name": skill["name"],
            "workflow_id": workflow["workflow_id"],
        }

    def _normalize_definition(self, definition: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(definition, dict):
            raise WorkflowError("definition must be a JSON object")
        skill = _normalize_skill(definition.get("skill") or {})
        workflow = _normalize_workflow(definition.get("workflow") or {})
        tasks = _normalize_tasks(definition.get("tasks"), self._primary_agent_id)
        return {"skill": skill, "workflow": workflow, "tasks": tasks}


def _normalize_skill(payload: Any) -> dict[str, str]:
    if not isinstance(payload, dict):
        raise WorkflowError("skill must be a JSON object")
    name = _normalize_text(payload.get("name"), "skill.name")
    if not _SKILL_PATTERN.fullmatch(name):
        raise WorkflowError(
            "skill.name must use lowercase letters, numbers, hyphens, or underscores"
        )
    return {
        "name": name,
        "description": _normalize_text(payload.get("description"), "skill.description"),
        "content": _normalize_text(payload.get("content"), "skill.content"),
    }


def _normalize_workflow(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise WorkflowError("workflow must be a JSON object")
    input_schema = _require_object_schema(payload.get("input_schema"), "workflow.input_schema")
    return {
        "workflow_id": _normalize_workflow_id(payload.get("workflow_id"), "workflow.workflow_id"),
        "name": _normalize_text(payload.get("name"), "workflow.name"),
        "description": _normalize_text(payload.get("description"), "workflow.description"),
        "input_schema": input_schema,
        "source_session_id": _normalize_optional_text(payload.get("source_session_id")),
    }


def _normalize_tasks(payload: Any, primary_agent_id: str) -> list[dict[str, Any]]:
    if not isinstance(payload, list) or not payload:
        raise WorkflowError("tasks must be a non-empty array")
    seen_ids: set[str] = set()
    normalized: list[dict[str, Any]] = []
    for item in payload:
        if not isinstance(item, dict):
            raise WorkflowError("each task must be a JSON object")
        task_id = _normalize_workflow_id(item.get("task_id"), "task.task_id")
        if task_id in seen_ids:
            raise WorkflowError(f"duplicate task_id '{task_id}'")
        seen_ids.add(task_id)
        agent_id = _normalize_text(item.get("agent_id") or primary_agent_id, "task.agent_id")
        if agent_id != primary_agent_id:
            raise WorkflowError(
                f"task '{task_id}' agent_id must be primary agent '{primary_agent_id}'"
            )
        normalized.append(
            {
                "task_id": task_id,
                "title": _normalize_text(item.get("title"), "task.title"),
                "agent_id": agent_id,
                "structured_output": _require_object_schema(
                    item.get("structured_output"), f"task '{task_id}' structured_output"
                ),
            }
        )
    return normalized


def _require_object_schema(value: Any, field_name: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise WorkflowError(f"{field_name} must be a JSON Schema object")
    if value.get("type") != "object":
        raise WorkflowError(f"{field_name} must have type 'object'")
    return dict(value)


def _normalize_workflow_id(value: Any, field_name: str) -> str:
    text = _normalize_text(value, field_name)
    if not _ID_PATTERN.fullmatch(text):
        raise WorkflowError(
            f"{field_name} must use lowercase letters, numbers, and hyphens"
        )
    return text


def _normalize_text(value: Any, field_name: str) -> str:
    text = str(value or "").strip()
    if not text:
        raise WorkflowError(f"{field_name} is required")
    return text


def _normalize_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _skill_id_from_name(name: str) -> str:
    return name
