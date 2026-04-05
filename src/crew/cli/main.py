from __future__ import annotations

import argparse
import json
import os
from typing import Sequence

from mash.cli.client import MashHostClient
from mash.cli.config import load_config
from mash.cli.render import RichRenderer
from mash.cli.shell import MashRemoteShell, ShellTarget

from ..artifacts.service.context import build_tool_context as build_artifact_context
from ..artifacts.service.repo import list_artifacts, read_artifact, search_artifacts
from ..metrics_layer.service.context import build_tool_context as build_metrics_context
from ..metrics_layer.service.tool_entrypoints import (
    compile_metric_configs_to_sql,
    list_metrics_layer_configs,
    read_metrics_layer_config,
)
from ..shared.runtime_paths import PROJECT_ROOT


def _resolve_connection(args: argparse.Namespace) -> tuple[str, str | None, str | None]:
    saved = load_config()
    base_url = (
        getattr(args, "api_base_url", None)
        or os.environ.get("MASH_API_BASE_URL")
        or (saved.api_base_url if saved else "")
    ).strip()
    api_key = (
        getattr(args, "api_key", None)
        or os.environ.get("MASH_API_KEY")
        or (saved.api_key if saved else None)
    )
    agent_id = getattr(args, "agent", None) or (saved.agent_id if saved else None)
    if not base_url:
        raise ValueError(
            "API base URL is required. Use --api-base-url or `mash connect`."
        )
    return base_url, api_key, agent_id


def _resolve_agent(client: MashHostClient, explicit_agent: str | None) -> str:
    if explicit_agent:
        return explicit_agent
    health = client.health()
    deployment = health.get("deployment") or {}
    agent_id = deployment.get("primary_agent_id")
    if not isinstance(agent_id, str) or not agent_id.strip():
        raise ValueError("could not resolve default agent id from deployment")
    return agent_id.strip()


def _parse_order_by(values: list[str] | None) -> list[dict[str, str]]:
    order_by: list[dict[str, str]] = []
    for value in values or []:
        field, sep, direction = value.partition(":")
        if not sep or not field.strip() or not direction.strip():
            raise ValueError("--order-by must use FIELD:DIRECTION")
        normalized_direction = direction.strip().upper()
        if normalized_direction not in {"ASC", "DESC"}:
            raise ValueError("--order-by direction must be ASC or DESC")
        order_by.append(
            {"field": field.strip(), "direction": normalized_direction}
        )
    return order_by


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="crew",
        description="Crew CLI for agents, artifacts, and metrics.",
    )
    subparsers = parser.add_subparsers(dest="command")

    common_remote = argparse.ArgumentParser(add_help=False)
    common_remote.add_argument("--api-base-url", default=None, help="Mash host base URL")
    common_remote.add_argument("--api-key", default=None, help="Bearer API key")
    common_remote.add_argument("--agent", default=None, help="Target agent id")

    agent = subparsers.add_parser("agent", help="Interact with crew agents")
    agent_subparsers = agent.add_subparsers(dest="agent_command")

    agent_invoke = agent_subparsers.add_parser(
        "invoke", parents=[common_remote], help="Invoke a remote agent"
    )
    agent_invoke.add_argument("message", help="Prompt to send to the remote agent")
    agent_invoke.add_argument("--session-id", default=None, help="Remote session id")

    agent_history = agent_subparsers.add_parser(
        "history", parents=[common_remote], help="Show remote session history"
    )
    agent_history.add_argument("--session-id", required=True, help="Remote session id")
    agent_history.add_argument("--limit", type=int, default=None, help="Optional turn limit")

    agent_repl = agent_subparsers.add_parser(
        "repl", parents=[common_remote], help="Start an interactive remote REPL"
    )
    agent_repl.add_argument("--session-id", default=None, help="Remote session id")

    artifact = subparsers.add_parser("artifact", help="Browse local artifacts")
    artifact_subparsers = artifact.add_subparsers(dest="artifact_command")

    artifact_list = artifact_subparsers.add_parser("list", help="List artifact files")
    artifact_list.add_argument("--kind", default=None, help="Optional artifact kind filter")
    artifact_list.add_argument("--limit", type=int, default=None, help="Optional row limit")

    artifact_show = artifact_subparsers.add_parser("show", help="Render one artifact file")
    artifact_show.add_argument("artifact_id", help="Artifact identifier")

    artifact_search = artifact_subparsers.add_parser("search", help="Search artifacts")
    artifact_search.add_argument("query", help="Search query")
    artifact_search.add_argument("--limit", type=int, default=10, help="Result limit")

    metrics = subparsers.add_parser("metrics", help="Inspect local metrics layer state")
    metrics_subparsers = metrics.add_subparsers(dest="metrics_command")

    metrics_list = metrics_subparsers.add_parser("list", help="List metric configs")
    metrics_list.add_argument("--dataset", required=True, help="Dataset identifier")

    metrics_show = metrics_subparsers.add_parser("show", help="Show one config")
    metrics_show.add_argument("--dataset", required=True, help="Dataset identifier")
    metrics_show.add_argument("--kind", required=True, choices=["source", "metric"])
    metrics_show.add_argument("--name", required=True, help="Config name")

    metrics_compile = metrics_subparsers.add_parser("compile", help="Compile metric configs to SQL")
    metrics_compile.add_argument("--dataset", required=True, help="Dataset identifier")
    metrics_compile.add_argument(
        "--metric", action="append", required=True, help="Metric name (repeatable)"
    )
    metrics_compile.add_argument(
        "--dimension", action="append", default=None, help="Dimension (repeatable)"
    )
    metrics_compile.add_argument(
        "--filter", action="append", default=None, help="SQL WHERE clause fragment (repeatable)"
    )
    metrics_compile.add_argument(
        "--order-by",
        action="append",
        default=None,
        help="Order expression as FIELD:DIRECTION (repeatable)",
    )
    metrics_compile.add_argument("--limit", type=int, default=None, help="Row limit")
    metrics_compile.add_argument("--date-dimension", default=None, help="Date dimension name")
    metrics_compile.add_argument("--start", default=None, help="Date range start YYYY-MM-DD")
    metrics_compile.add_argument("--end", default=None, help="Date range end YYYY-MM-DD")

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    renderer = RichRenderer()

    try:
        if args.command == "agent":
            return _run_agent_command(args, renderer)
        if args.command == "artifact":
            return _run_artifact_command(args, renderer)
        if args.command == "metrics":
            return _run_metrics_command(args, renderer)
    except Exception as exc:
        renderer.error(str(exc))
        return 1

    parser.print_help()
    return 0


def _run_agent_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    base_url, api_key, configured_agent = _resolve_connection(args)
    client = MashHostClient(base_url, api_key=api_key)
    try:
        agent_id = _resolve_agent(client, getattr(args, "agent", None) or configured_agent)

        if args.agent_command == "invoke":
            session_id = args.session_id or MashRemoteShell.new_session_id()
            with renderer.status("Invoking remote agent..."):
                result = client.invoke(agent_id, message=args.message, session_id=session_id)
            response_payload = result.get("response")
            text = (
                str(response_payload.get("text") or "")
                if isinstance(response_payload, dict)
                else str(result.get("text") or "")
            )
            renderer.info(f"Agent: {agent_id}")
            renderer.info(f"Session: {result.get('session_id') or session_id}")
            if text:
                renderer.markdown(text)
            return 0

        if args.agent_command == "history":
            turns = client.get_history(agent_id, args.session_id, limit=args.limit)
            if not turns:
                renderer.warn("No conversation history.")
                return 0
            for index, turn in enumerate(turns, 1):
                renderer.info(f"Turn {index}")
                renderer.print(f"User: {turn['user_message']}")
                renderer.print(f"Agent: {turn['agent_response']}")
            return 0

        if args.agent_command == "repl":
            target = ShellTarget(
                api_base_url=base_url,
                agent_id=agent_id,
                session_id=args.session_id or MashRemoteShell.new_session_id(),
            )
            MashRemoteShell(client, target).run()
            return 0
    finally:
        client.close()

    raise ValueError("agent command is required")


def _run_artifact_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    context = build_artifact_context(PROJECT_ROOT)
    if args.artifact_command == "list":
        payload = list_artifacts(context=context, kind_filter=args.kind, limit=args.limit)
        rows = [
            [
                item["artifact_id"],
                item["kind"],
                item["source_agent"],
                item["updated_at"],
                item["title"],
            ]
            for item in payload["artifacts"]
        ]
        renderer.table(["Artifact", "Kind", "Agent", "Updated", "Title"], rows)
        return 0

    if args.artifact_command == "show":
        payload = read_artifact(context=context, artifact_id=args.artifact_id)
        renderer.info(f"Artifact: {payload['artifact_id']}")
        renderer.info(f"Path: {payload['path']}")
        renderer.markdown(payload["content"])
        return 0

    if args.artifact_command == "search":
        payload = search_artifacts(context=context, query=args.query, limit=args.limit)
        rows = [
            [
                item["artifact_id"],
                str(item["score"]),
                item["kind"],
                item["title"],
                item["preview"],
            ]
            for item in payload["results"]
        ]
        renderer.table(["Artifact", "Score", "Kind", "Title", "Preview"], rows)
        return 0

    raise ValueError("artifact command is required")


def _run_metrics_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    context = build_metrics_context(PROJECT_ROOT)

    if args.metrics_command == "list":
        result = list_metrics_layer_configs({"dataset_id": args.dataset}, context)
        if result.is_error:
            raise ValueError(result.content)
        payload = json.loads(result.content)
        rows = [
            [item["kind"], item["name"], item["path"]]
            for item in payload["configs"]
            if item["kind"] == "metric"
        ]
        renderer.table(["Kind", "Name", "Path"], rows)
        return 0

    if args.metrics_command == "show":
        result = read_metrics_layer_config(
            {
                "kind": args.kind,
                "dataset_id": args.dataset,
                "name": args.name,
            },
            context,
        )
        if result.is_error:
            raise ValueError(result.content)
        payload = json.loads(result.content)
        renderer.info(f"Path: {payload['path']}")
        renderer.markdown(f"```yaml\n{payload['content']}\n```")
        return 0

    if args.metrics_command == "compile":
        date_range = None
        if args.date_dimension:
            date_range = {"dimension": args.date_dimension}
            if args.start:
                date_range["start"] = args.start
            if args.end:
                date_range["end"] = args.end

        result = compile_metric_configs_to_sql(
            {
                "dataset_id": args.dataset,
                "metric_names": list(args.metric),
                "dimensions": list(args.dimension or []),
                "filters": list(args.filter or []),
                "date_range": date_range,
                "order_by": _parse_order_by(args.order_by),
                "limit": args.limit,
            },
            context,
        )
        if result.is_error:
            raise ValueError(result.content)
        payload = json.loads(result.content)
        renderer.info(
            f"Dataset: {payload['dataset_id']} | Plans: {payload['count']}"
        )
        for plan in payload["plans"]:
            renderer.info(
                f"Metric: {plan['metric_name']} | Source: {plan['source_id']}"
            )
            renderer.markdown(f"```sql\n{plan['sql']}\n```")
        return 0

    raise ValueError("metrics command is required")


if __name__ == "__main__":
    raise SystemExit(main())
