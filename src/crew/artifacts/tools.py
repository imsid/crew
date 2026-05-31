"""Tool registry builders for artifact access."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Callable, List

from mash.tools.base import FunctionTool, Tool

from ..shared.workspace_context import current_workspace_dir
from .service.context import build_tool_context
from .service.tool_entrypoints import (
    list_artifacts_tool,
    read_artifact_tool,
    search_artifacts_tool,
    write_new_artifact_file_tool,
)


def _workspace_tool_executor(
    func: Callable[[dict[str, Any], Any], Any],
    workspace_root: Path | None,
) -> Callable[[dict[str, Any]], Any]:
    async def _executor(args: dict[str, Any]) -> Any:
        root = workspace_root if workspace_root is not None else current_workspace_dir()
        return func(args, build_tool_context(root))

    return _executor


def build_artifact_tools(workspace_root: Path | None = None) -> List[Tool]:
    return [
        FunctionTool(
            name="list_artifacts",
            description="List artifact documents stored under the selected workspace artifacts directory.",
            parameters={
                "type": "object",
                "properties": {
                    "kind": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1},
                },
            },
            _executor=_workspace_tool_executor(list_artifacts_tool, workspace_root),
        ),
        FunctionTool(
            name="read_artifact",
            description="Read one artifact document by artifact_id.",
            parameters={
                "type": "object",
                "properties": {
                    "artifact_id": {"type": "string"},
                },
                "required": ["artifact_id"],
            },
            _executor=_workspace_tool_executor(read_artifact_tool, workspace_root),
        ),
        FunctionTool(
            name="search_artifacts",
            description="Search workspace artifact documents by keyword across metadata and content.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string"},
                    "limit": {"type": "integer", "minimum": 1},
                },
                "required": ["query"],
            },
            _executor=_workspace_tool_executor(search_artifacts_tool, workspace_root),
        ),
        FunctionTool(
            name="write_new_artifact_file",
            description=(
                "Validate and write one new artifact document. "
                "Use markdown for prose-first artifacts and html for richer layout, SVG, or self-contained interactivity. "
                "HTML artifacts must be self-contained with inline CSS/JS/SVG only."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "artifact_content": {"type": "string"},
                    "artifact_document": {"type": "string"},
                    "artifact_markdown": {"type": "string"},
                    "format": {"type": "string", "enum": ["markdown", "html"]},
                },
            },
            _executor=_workspace_tool_executor(write_new_artifact_file_tool, workspace_root),
        ),
    ]
