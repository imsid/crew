from __future__ import annotations

from typing import Any

import pytest
from mash.skills.base import Skill
from mash.workflows import WorkflowSpec

from crew.shared.runtime_context import clear_runtime_context, set_runtime_context
from crew.workflow.service import (
    WorkflowError,
    WorkflowService,
)
from crew.workflow.tools import build_publish_workflow_tool


class _MemoryStore:
    def __init__(self) -> None:
        self.skills: dict[str, dict[str, Any]] = {}
        self.workflows: dict[str, dict[str, Any]] = {}
        self.tasks: dict[str, list[dict[str, Any]]] = {}

    async def upsert_authored_skill(self, payload: dict[str, Any]) -> dict[str, Any]:
        self.skills[str(payload["skill_id"])] = dict(payload)
        return dict(payload)

    async def upsert_authored_workflow(
        self, payload: dict[str, Any], *, tasks: list[dict[str, Any]]
    ) -> dict[str, Any]:
        self.workflows[str(payload["workflow_id"])] = dict(payload)
        self.tasks[str(payload["workflow_id"])] = [dict(task) for task in tasks]
        return dict(payload)

    async def list_authored_workflow_bundles(self, *, status: str | None = None):
        bundles = []
        for workflow in self.workflows.values():
            if status is not None and workflow["status"] != status:
                continue
            bundles.append(
                {
                    "workflow": dict(workflow),
                    "skill": dict(self.skills[workflow["skill_id"]]),
                    "tasks": [dict(task) for task in self.tasks[workflow["workflow_id"]]],
                }
            )
        return bundles


class _Host:
    def __init__(self) -> None:
        self.skills: list[tuple[str, Skill]] = []
        self.unregistered_skills: list[tuple[str, str]] = []
        self.workflows: list[tuple[str, WorkflowSpec]] = []

    def unregister_agent_skill(self, agent_id: str, skill_name: str) -> None:
        self.unregistered_skills.append((agent_id, skill_name))

    def register_agent_skill(self, agent_id: str, skill: Skill) -> None:
        self.skills.append((agent_id, skill))

    def register_agent_workflow(self, agent_id: str, workflow: WorkflowSpec) -> None:
        self.workflows.append((agent_id, workflow))


def _definition() -> dict[str, Any]:
    return {
        "skill": {
            "name": "weekly-metrics-review",
            "description": "Review weekly metrics.",
            "content": "# Weekly Metrics Review\n\nUse metrics tools and summarize movement.",
        },
        "workflow": {
            "workflow_id": "weekly-business-review",
            "name": "Weekly Business Review",
            "description": "Summarize weekly business performance.",
            "input_schema": {
                "type": "object",
                "properties": {"week": {"type": "string"}},
                "required": ["week"],
                "additionalProperties": False,
            },
            "source_session_id": "data_session",
        },
        "tasks": [
            {
                "task_id": "review-metrics",
                "agent_id": "data",
                "title": "Review metrics",
                "structured_output": {
                    "type": "object",
                    "properties": {"markdown": {"type": "string"}},
                    "required": ["markdown"],
                    "additionalProperties": False,
                },
            }
        ],
    }


@pytest.mark.anyio
async def test_publish_workflow_registers_skill_and_workflow_through_api() -> None:
    store = _MemoryStore()
    host = _Host()
    service = WorkflowService(
        store=store,  # type: ignore[arg-type]
        host=host,  # type: ignore[arg-type]
        primary_agent_id="data",
    )

    result = await service.publish_workflow(_definition())

    assert result["workflow_id"] == "weekly-business-review"
    assert host.unregistered_skills == [("data", "weekly-metrics-review")]
    assert host.skills[0][0] == "data"
    assert host.skills[0][1].name == "weekly-metrics-review"
    assert host.workflows[0][0] == "data"
    workflow = host.workflows[0][1]
    assert workflow.tasks[0].task_id == "review-metrics"
    assert workflow.tasks[0].agent_id == "data"
    assert workflow.tasks[0].structured_output == {
        "type": "object",
        "properties": {"markdown": {"type": "string"}},
        "required": ["markdown"],
        "additionalProperties": False,
    }
    assert workflow.task_message is not None
    assert workflow.task_message.skill_name == "weekly-metrics-review"


@pytest.mark.anyio
async def test_publish_workflow_rejects_non_primary_task_agent() -> None:
    service = WorkflowService(
        store=_MemoryStore(),  # type: ignore[arg-type]
        host=_Host(),  # type: ignore[arg-type]
        primary_agent_id="data",
    )
    definition = _definition()
    definition["tasks"][0]["agent_id"] = "pm"

    with pytest.raises(WorkflowError, match="primary agent 'data'"):
        await service.publish_workflow(definition)


@pytest.mark.anyio
async def test_publish_workflow_rejects_non_object_structured_output() -> None:
    service = WorkflowService(
        store=_MemoryStore(),  # type: ignore[arg-type]
        host=_Host(),  # type: ignore[arg-type]
        primary_agent_id="data",
    )
    definition = _definition()
    definition["tasks"][0]["structured_output"] = {"type": "array"}

    with pytest.raises(WorkflowError, match="must have type 'object'"):
        await service.validate_definition(definition)


@pytest.mark.anyio
async def test_publish_tool_returns_error_without_runtime_context() -> None:
    clear_runtime_context()
    tool = build_publish_workflow_tool()

    result = await tool.execute({})

    assert result.is_error is True
    assert "runtime context is not available" in result.content


@pytest.mark.anyio
async def test_publish_tool_uses_runtime_context() -> None:
    store = _MemoryStore()
    host = _Host()
    service = WorkflowService(
        store=store,  # type: ignore[arg-type]
        host=host,  # type: ignore[arg-type]
        primary_agent_id="data",
    )
    set_runtime_context(
        store=store,  # type: ignore[arg-type]
        host=host,  # type: ignore[arg-type]
        primary_agent_id="data",
        workflow=service,
    )
    try:
        tool = build_publish_workflow_tool()

        result = await tool.execute(_definition())

        assert result.is_error is False
        assert '"workflow_id": "weekly-business-review"' in result.content
        assert host.skills[0][1].name == "weekly-metrics-review"
        assert host.workflows[0][1].workflow_id == "weekly-business-review"
    finally:
        clear_runtime_context()
