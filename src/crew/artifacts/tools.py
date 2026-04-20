"""Tool registry builders for artifact access."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, List

from mash.tools.base import FunctionTool, Tool

from .service.context import build_tool_context
from .service.tool_entrypoints import (
    list_artifacts_tool,
    read_artifact_tool,
    search_artifacts_tool,
    write_new_artifact_file_tool,
)


def _async_tool_executor(
    func: Callable[[dict[str, Any], Any], Any], context: Any
) -> Callable[[dict[str, Any]], Any]:
    async def _executor(args: dict[str, Any]) -> Any:
        return func(args, context)

    return _executor


def build_artifact_tools(workspace_root: Path) -> List[Tool]:
    context = build_tool_context(workspace_root)
    return [
        FunctionTool(
            name="list_artifacts",
            description="List artifact markdown files stored under the selected workspace artifacts directory.",
            parameters={
                "type": "object",
                "properties": {
                    "kind": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1},
                },
            },
            _executor=_async_tool_executor(list_artifacts_tool, context),
        ),
        FunctionTool(
            name="read_artifact",
            description="Read one artifact markdown file by artifact_id.",
            parameters={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                },
                "required": ["artifact_id"],
            },
            _executor=_async_tool_executor(read_artifact_tool, context),
        ),
        FunctionTool(
            name="search_artifacts",
            description="Search workspace artifact markdown files by keyword across metadata and content.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1},
                },
                "required": ["query"],
            },
            _executor=_async_tool_executor(search_artifacts_tool, context),
        ),
        FunctionTool(
            name="write_new_artifact_file",
            description=(
                "Validate and write one new artifact markdown file. "
                "Use only when explicitly creating an artifact."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "artifact_markdown": {"type": "string"},
                },
                "required": ["artifact_markdown"],
            },
            _executor=_async_tool_executor(write_new_artifact_file_tool, context),
        ),
    ]
