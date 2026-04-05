"""Tool-facing public entrypoints for artifact services."""

from __future__ import annotations

import json
from typing import Any, Dict

from mash.tools.base import ToolResult

from .context import ToolContext
from .repo import list_artifacts, read_artifact, search_artifacts, write_new_artifact_file


def _to_json(payload: Dict[str, Any]) -> ToolResult:
    return ToolResult.success(json.dumps(payload, ensure_ascii=True, indent=2))


def list_artifacts_tool(args: Dict[str, Any], context: ToolContext) -> ToolResult:
    try:
        payload = list_artifacts(
            context=context,
            kind_filter=args.get("kind"),
            limit=args.get("limit"),
        )
        return _to_json(payload)
    except Exception as exc:
        return ToolResult.error(f"list_artifacts failed: {exc}")


def read_artifact_tool(args: Dict[str, Any], context: ToolContext) -> ToolResult:
    try:
        payload = read_artifact(context=context, artifact_id=args.get("artifact_id"))
        return _to_json(payload)
    except Exception as exc:
        return ToolResult.error(f"read_artifact failed: {exc}")


def search_artifacts_tool(args: Dict[str, Any], context: ToolContext) -> ToolResult:
    try:
        payload = search_artifacts(
            context=context,
            query=args.get("query"),
            limit=int(args.get("limit", 10)),
        )
        return _to_json(payload)
    except Exception as exc:
        return ToolResult.error(f"search_artifacts failed: {exc}")


def write_new_artifact_file_tool(args: Dict[str, Any], context: ToolContext) -> ToolResult:
    try:
        payload = write_new_artifact_file(
            context=context,
            artifact_markdown=args.get("artifact_markdown"),
        )
        return _to_json(payload)
    except Exception as exc:
        return ToolResult.error(f"write_new_artifact_file failed: {exc}")
