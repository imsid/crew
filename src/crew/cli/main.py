from __future__ import annotations

import argparse
import json
import os
from typing import Any, Sequence

from mash.cli.client import MashHostClient
from mash.cli.config import load_config
from mash.cli.render import RichRenderer
from mash.cli.shell import MashRemoteShell, ShellTarget

from ..artifacts.service.context import build_tool_context as build_artifact_context
from ..artifacts.service.repo import list_artifacts, read_artifact, search_artifacts
from ..beta.visualizations import (
    build_experiment_analysis,
    build_metric_visualization,
)
from ..experimentation.service.context import (
    build_tool_context as build_experiment_context,
)
from ..experimentation.service.tool_entrypoints import (
    compile_experiment_analysis_sql,
    list_experiment_configs_tool,
    read_experiment_config_tool,
)
from ..metrics_layer.service.context import build_tool_context as build_metrics_context
from ..metrics_layer.service.tool_entrypoints import (
    compile_metric_configs_to_sql,
    list_metrics_layer_configs,
    read_metrics_layer_config,
)
from ..shared.runtime_paths import (
    crew_root_dir,
    default_workspace_name,
    selected_workspace_name,
    workspace_dir,
    workspace_root_dir,
)
from ..shared.version import crew_version


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


def _extract_response_text(payload: object) -> str:
    if isinstance(payload, dict):
        response_payload = payload.get("response")
        if isinstance(response_payload, dict):
            return str(response_payload.get("text") or "")
        return str(payload.get("text") or "")
    return ""


def _await_request_completion(
    client: MashHostClient,
    *,
    agent_id: str,
    message: str,
    session_id: str,
) -> dict[str, object]:
    request_id = client.submit_request(
        agent_id,
        message=message,
        session_id=session_id,
    )
    for event in client.stream_request(agent_id, request_id):
        event_name = str(event.get("event") or "")
        payload = event.get("data")
        if event_name == "request.completed":
            if not isinstance(payload, dict):
                raise RuntimeError("request completed without a response payload")
            return payload
        if event_name == "request.error":
            if isinstance(payload, dict):
                raise RuntimeError(str(payload.get("error") or "remote request failed"))
            raise RuntimeError("remote request failed")
    raise RuntimeError("request stream ended without a terminal event")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="crew",
        description="Crew CLI for agents, artifacts, and metrics.",
    )
    parser.add_argument(
        "--workspace",
        default=None,
        help=f"Workspace name. Defaults to {default_workspace_name()}.",
    )
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("version", help="Show crew runtime information")

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

    metrics_subparsers.add_parser("list", help="List metric configs")

    metrics_show = metrics_subparsers.add_parser("show", help="Show one config")
    metrics_show.add_argument("--kind", required=True, choices=["source", "metric"])
    metrics_show.add_argument("--name", required=True, help="Config name")

    metrics_compile = metrics_subparsers.add_parser("compile", help="Compile metric configs to SQL")
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
    metrics_chart = metrics_subparsers.add_parser(
        "chart", help="Execute a metric visualization query"
    )
    metrics_chart.add_argument("--metric", required=True, help="Metric name")
    metrics_chart.add_argument("--group-by", default=None, help="Optional grouping dimension")
    metrics_chart.add_argument("--date-dimension", default=None, help="Date dimension name")
    metrics_chart.add_argument(
        "--grain",
        default=None,
        choices=["day", "week", "month"],
        help="Optional date grain",
    )
    metrics_chart.add_argument(
        "--filter", action="append", default=None, help="SQL WHERE clause fragment (repeatable)"
    )
    metrics_chart.add_argument("--limit", type=int, default=None, help="Row limit")
    metrics_chart.add_argument("--start", default=None, help="Date range start YYYY-MM-DD")
    metrics_chart.add_argument("--end", default=None, help="Date range end YYYY-MM-DD")
    metrics_chart.add_argument(
        "--show-sql",
        action="store_true",
        help="Render compiled visualization SQL",
    )

    experiment = subparsers.add_parser(
        "experiment", help="Inspect local experimentation configs"
    )
    experiment_subparsers = experiment.add_subparsers(dest="experiment_command")

    experiment_subparsers.add_parser("list", help="List experiment configs")

    experiment_show = experiment_subparsers.add_parser(
        "show", help="Show one experiment config"
    )
    experiment_show.add_argument("--name", required=True, help="Experiment config name")

    experiment_plan = experiment_subparsers.add_parser(
        "plan", help="Compile experiment SQL plans"
    )
    experiment_plan.add_argument("--name", required=True, help="Experiment config name")
    experiment_analyze = experiment_subparsers.add_parser(
        "analyze", help="Execute an experiment analysis query"
    )
    experiment_analyze.add_argument("--name", required=True, help="Experiment config name")
    experiment_analyze.add_argument(
        "--metric-id",
        default=None,
        help="Optional metric id when the experiment has multiple metrics",
    )
    experiment_analyze.add_argument(
        "--show-sql",
        action="store_true",
        help="Render compiled analysis SQL",
    )

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
        if args.command == "experiment":
            return _run_experiment_command(args, renderer)
        if args.command == "version":
            workspace_name = selected_workspace_name(getattr(args, "workspace", None))
            renderer.info(f"Version: {crew_version()}")
            renderer.info(f"Workspace Root: {workspace_root_dir()}")
            renderer.info(f"Workspace: {workspace_name}")
            renderer.info(f"Workspace Path: {workspace_dir(workspace_name)}")
            renderer.info(f"State: {crew_root_dir()}")
            return 0
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
                result = _await_request_completion(
                    client,
                    agent_id=agent_id,
                    message=args.message,
                    session_id=session_id,
                )
            text = _extract_response_text(result)
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
    context = build_artifact_context(
        workspace_dir(getattr(args, "workspace", None), require_exists=True)
    )
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
        renderer.info(f"Format: {payload['format']}")
        if payload["format"] == "markdown":
            renderer.markdown(payload["content"])
        else:
            renderer.print(payload["content"])
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
    context = build_metrics_context(
        workspace_dir(getattr(args, "workspace", None), require_exists=True)
    )

    if args.metrics_command == "list":
        result = list_metrics_layer_configs({}, context)
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

    if args.metrics_command == "chart":
        data = build_metric_visualization(
            {
                "metric_name": args.metric,
                "group_by": args.group_by,
                "date_dimension": args.date_dimension,
                "grain": args.grain,
                "filters": list(args.filter or []),
                "date_range": _build_date_range_args(start=args.start, end=args.end),
                "limit": args.limit,
            },
            context,
        )
        _render_visualization_payload(
            renderer,
            data,
            show_sql=bool(args.show_sql),
        )
        return 0

    raise ValueError("metrics command is required")


def _run_experiment_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    context = build_experiment_context(
        workspace_dir(getattr(args, "workspace", None), require_exists=True)
    )

    if args.experiment_command == "list":
        result = list_experiment_configs_tool({}, context)
        if result.is_error:
            raise ValueError(result.content)
        payload = json.loads(result.content)
        rows = [[item["name"], item["path"]] for item in payload["configs"]]
        renderer.table(["Experiment", "Path"], rows)
        return 0

    if args.experiment_command == "show":
        result = read_experiment_config_tool(
            {"name": args.name},
            context,
        )
        if result.is_error:
            raise ValueError(result.content)
        payload = json.loads(result.content)
        renderer.info(f"Path: {payload['path']}")
        renderer.markdown(f"```yaml\n{payload['content']}\n```")
        return 0

    if args.experiment_command == "plan":
        result = compile_experiment_analysis_sql(
            {"name": args.name},
            context,
        )
        if result.is_error:
            raise ValueError(result.content)
        payload = json.loads(result.content)
        renderer.info(
            f"Experiment: {payload['experiment_id']} | Variants: {len(payload['variants'])}"
        )
        renderer.info("Exposure summary")
        renderer.markdown(f"```sql\n{payload['plans']['exposure_summary']['sql']}\n```")
        for metric_plan in payload["plans"]["metric_summaries"]:
            renderer.info(f"Metric: {metric_plan['metric_id']}")
            renderer.markdown(f"```sql\n{metric_plan['sql']}\n```")
        return 0

    if args.experiment_command == "analyze":
        data = build_experiment_analysis(
            {
                "name": args.name,
                "metric_id": args.metric_id,
            },
            context,
        )
        _render_visualization_payload(
            renderer,
            data,
            show_sql=bool(args.show_sql),
        )
        return 0

    raise ValueError("experiment command is required")


def _build_date_range_args(*, start: str | None, end: str | None) -> dict[str, str] | None:
    if not start and not end:
        return None
    payload: dict[str, str] = {}
    if start:
        payload["start"] = start
    if end:
        payload["end"] = end
    return payload


def _render_visualization_payload(
    renderer: RichRenderer,
    payload: dict[str, Any],
    *,
    show_sql: bool,
) -> None:
    entity = payload.get("entity") or {}
    entity_label = str(entity.get("label") or entity.get("id") or "Visualization")
    renderer.info(entity_label)

    query = payload.get("query") or {}
    if entity.get("surface") == "metrics":
        renderer.info(
            "Metric: "
            f"{query.get('metric_name')} | "
            f"Group By: {query.get('group_by') or 'none'} | "
            f"Date: {query.get('date_dimension') or 'none'} | "
            f"Grain: {query.get('grain') or 'none'}"
        )
    else:
        meta = payload.get("meta") or {}
        renderer.info(
            "Experiment: "
            f"{query.get('experiment_name')} | "
            f"Metric: {query.get('metric_id')} | "
            f"Control: {meta.get('control_variant') or 'unknown'}"
        )
        srm = meta.get("srm") or {}
        if srm:
            renderer.info(
                "SRM: "
                f"p={_stringify_scalar((srm or {}).get('p_value'))} | "
                f"chi_square={_stringify_scalar((srm or {}).get('chi_square_statistic'))}"
            )

    date_range = query.get("date_range") or {}
    if date_range.get("start") or date_range.get("end"):
        renderer.info(
            "Date Range: "
            f"{date_range.get('start') or 'start'} -> {date_range.get('end') or 'end'}"
        )

    summary = payload.get("summary") or {}
    for warning in summary.get("warnings") or []:
        renderer.warn(f"Warning: {warning}")

    columns = ((payload.get("table") or {}).get("columns") or [])
    rows = ((payload.get("table") or {}).get("rows") or [])
    if rows:
        renderer.table(
            [str(column.get("label") or column.get("key") or "") for column in columns],
            [
                [_format_visualization_cell(row.get(str(column.get("key"))), column) for column in columns]
                for row in rows
            ],
        )
    else:
        renderer.warn("No rows returned for this view.")

    if show_sql:
        for query_plan in ((payload.get("lineage") or {}).get("queries") or []):
            label = str(query_plan.get("label") or "SQL")
            renderer.info(label)
            renderer.markdown(f"```sql\n{query_plan.get('sql') or ''}\n```")


def _format_visualization_cell(value: Any, column: dict[str, Any]) -> str:
    if value is None:
        return "—"

    column_type = str(column.get("type") or "")
    column_format = str(column.get("format") or "")

    if column_type == "number" and isinstance(value, (int, float)) and not isinstance(value, bool):
        if column_format == "percent":
            return f"{float(value):.2%}"
        if column_format == "currency":
            return f"${float(value):,.2f}"
        if isinstance(value, int) or float(value).is_integer():
            return f"{int(value):,}"
        return f"{float(value):,.4f}".rstrip("0").rstrip(".")

    return _stringify_scalar(value)


def _stringify_scalar(value: Any) -> str:
    if value is None:
        return "—"
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)


if __name__ == "__main__":
    raise SystemExit(main())
