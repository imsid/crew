from __future__ import annotations

import json
from typing import Any

from mash.tools.base import FunctionTool, ToolResult

from ..shared.runtime_context import get_runtime_context
from .service import WorkflowError


def build_publish_workflow_tool() -> FunctionTool:
    async def _publish_workflow(args: dict[str, Any]) -> ToolResult:
        try:
            context = get_runtime_context()
            payload = await context.workflow.publish_workflow(args)
        except (RuntimeError, WorkflowError) as exc:
            return ToolResult(str(exc), is_error=True)
        return ToolResult(json.dumps(payload, ensure_ascii=True, indent=2))

    return FunctionTool(
        name="publish_workflow",
        description=(
            "Publish an approved non-code Crew workflow definition. "
            "Use only after the user has approved the workflow preview."
        ),
        parameters=_publish_workflow_parameters(),
        _executor=_publish_workflow,
    )


def _publish_workflow_parameters() -> dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "skill": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "content": {"type": "string"},
                },
                "required": ["name", "description", "content"],
            },
            "workflow": {
                "type": "object",
                "properties": {
                    "workflow_id": {"type": "string"},
                    "name": {"type": "string"},
                    "description": {"type": "string"},
                    "input_schema": {"type": "object"},
                    "source_session_id": {"type": "string"},
                },
                "required": [
                    "workflow_id",
                    "name",
                    "description",
                    "input_schema",
                ],
            },
            "tasks": {
                "type": "array",
                "items": {"type": "object"},
                "minItems": 1,
            },
        },
        "required": ["skill", "workflow", "tasks"],
    }
