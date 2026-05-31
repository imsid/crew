from __future__ import annotations

import argparse
import json
import os
from typing import Any, Sequence
from urllib.parse import quote

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


def _stream_workflow_run_events(
    client: MashHostClient,
    workflow_id: str,
    run_id: str,
):
    stream_method = getattr(client, "stream_workflow_run_events", None)
    if not callable(stream_method):
        stream_method = getattr(client, "stream_workflow_run", None)
    if callable(stream_method):
        yield from stream_method(workflow_id, run_id)
        return

    request_method = getattr(client, "_request", None)
    if not callable(request_method):
        return
    with request_method(
        "GET",
        "/api/v1/workflow/"
        f"{quote(workflow_id, safe='')}/runs/{quote(run_id, safe='')}/events",
        stream=True,
    ) as response:
        event_name: str | None = None
        data_lines: list[str] = []
        for line in response.iter_lines(chunk_size=1, decode_unicode=True):
            if line is None:
                continue
            stripped = line.strip()
            if not stripped:
                if event_name and data_lines:
                    raw = "\n".join(data_lines)
                    try:
                        payload = json.loads(raw)
                    except json.JSONDecodeError:
                        payload = {"raw": raw}
                    yield {"event": event_name, "data": payload}
                event_name = None
                data_lines = []
                continue
            if stripped.startswith(":"):
                continue
            if stripped.startswith("event:"):
                event_name = stripped[6:].strip()
                continue
            if stripped.startswith("data:"):
                data_lines.append(stripped[5:].strip())


def _render_workflow_stream_event(
    renderer: RichRenderer,
    event: dict[str, Any],
    *,
    rendered_responses: set[str],
) -> bool:
    event_name = str(event.get("event") or "")
    payload = event.get("data")
    data = payload if isinstance(payload, dict) else {}

    if event_name in {"workflow.task.started", "workflow.task.completed", "workflow.task.error"}:
        task_id = str(data.get("task_id") or data.get("task") or "").strip()
        status = str(data.get("status") or "").strip() or event_name.rsplit(".", 1)[-1]
        message = f"Task {status}"
        if task_id:
            message = f"{message}: {task_id}"
        if event_name == "workflow.task.error":
            error = str(data.get("error") or "").strip()
            renderer.error(f"{message}{f' - {error}' if error else ''}")
            return True
        renderer.info(message)
        return False

    if event_name == "agent.trace":
        runtime_label = ""
        runtime_event = data.get("runtime_event")
        if isinstance(runtime_event, dict):
            runtime_label = str(runtime_event.get("label") or "").strip()
        event_type = str(data.get("event_type") or runtime_label or "agent.trace").strip()
        renderer.print(f"Trace: {event_type}")
        return False

    if event_name == "request.accepted":
        return False

    if event_name == "request.completed":
        text = _extract_response_text(data)
        if text and text not in rendered_responses:
            rendered_responses.add(text)
            renderer.markdown(text)
        return False

    if event_name in {"request.error", "workflow.error"}:
        renderer.error(str(data.get("error") or "workflow run failed"))
        return True

    return False


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="crew",
        description="Crew CLI for agents, artifacts, and metrics.",
    )
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("version", help="Show crew runtime information")

    # Workspace management
    workspace = subparsers.add_parser("workspace", help="Manage workspaces")
    workspace_subparsers = workspace.add_subparsers(
        dest="workspace_command",
        required=True,
    )

    workspace_subparsers.add_parser("list", help="List available workspaces")
    workspace_subparsers.add_parser("show", help="Show current workspace")

    set_parser = workspace_subparsers.add_parser(
        "set",
        help="Set default workspace",
    )
    set_parser.add_argument("workspace_id", help="Workspace name to set as default")

    workspace_subparsers.add_parser(
        "unset",
        help="Clear workspace configuration",
    )

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

    workflow = subparsers.add_parser("workflow", help="List, run, and inspect workflows")
    workflow_subparsers = workflow.add_subparsers(dest="workflow_command")

    workflow_subparsers.add_parser(
        "list", parents=[common_remote], help="List remote workflows"
    )

    workflow_run = workflow_subparsers.add_parser(
        "run", parents=[common_remote], help="Start a remote workflow run"
    )
    workflow_run.add_argument("workflow_id", help="Workflow id to run")
    workflow_run.add_argument(
        "dedup_key",
        nargs="?",
        default=None,
        help="Optional active-run deduplication key",
    )
    workflow_run.add_argument(
        "--input",
        default=None,
        help="Workflow input as a JSON object",
    )

    workflow_status = workflow_subparsers.add_parser(
        "status", parents=[common_remote], help="Show remote workflow run status"
    )
    workflow_status.add_argument("workflow_id", help="Workflow id")
    workflow_status.add_argument("run_id", help="Workflow run id")

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
        if args.command == "workspace":
            from .workspace_commands import (
                workspace_list,
                workspace_set,
                workspace_show,
                workspace_unset,
            )

            if args.workspace_command == "list":
                return workspace_list(args, renderer)
            elif args.workspace_command == "show":
                return workspace_show(args, renderer)
            elif args.workspace_command == "set":
                return workspace_set(args, renderer)
            elif args.workspace_command == "unset":
                return workspace_unset(args, renderer)

        if args.command == "agent":
            return _run_agent_command(args, renderer)
        if args.command == "workflow":
            return _run_workflow_command(args, renderer)
        if args.command == "artifact":
            return _run_artifact_command(args, renderer)
        if args.command == "metrics":
            return _run_metrics_command(args, renderer)
        if args.command == "experiment":
            return _run_experiment_command(args, renderer)
        if args.command == "version":
            from ..shared.workspace_context import current_workspace_id

            workspace_name = current_workspace_id()
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


def _run_workflow_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    base_url, api_key, _configured_agent = _resolve_connection(args)
    client = MashHostClient(base_url, api_key=api_key)
    try:
        if args.workflow_command == "list":
            workflows = client.list_workflows()
            if not workflows:
                renderer.warn("No workflows registered.")
                return 0
            rows = []
            for workflow in workflows:
                rendered_tasks = []
                tasks = workflow.get("tasks")
                if isinstance(tasks, list):
                    for task in tasks:
                        if not isinstance(task, dict):
                            continue
                        rendered_tasks.append(
                            f"{task.get('task_id') or ''} -> {task.get('agent_id') or ''}"
                        )
                rows.append(
                    [
                        str(workflow.get("workflow_id") or ""),
                        ", ".join(rendered_tasks),
                    ]
                )
            renderer.table(["Workflow ID", "Tasks"], rows)
            return 0

        if args.workflow_command == "run":
            workflow_input = None
            if args.input is not None:
                try:
                    decoded_input = json.loads(args.input)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"workflow input must be valid JSON: {exc.msg}") from exc
                if not isinstance(decoded_input, dict):
                    raise ValueError("workflow input must be a JSON object")
                workflow_input = decoded_input
            run = client.run_workflow(
                args.workflow_id,
                dedup_key=args.dedup_key,
                workflow_input=workflow_input,
            )
            renderer.info(f"Workflow: {run.get('workflow_id') or args.workflow_id}")
            renderer.info(f"Run ID: {run.get('run_id') or ''}")
            renderer.info(f"Status: {run.get('status') or ''}")
            run_id = str(run.get("run_id") or "").strip()
            if not run_id:
                return 0
            failed = False
            rendered_responses: set[str] = set()
            for event in _stream_workflow_run_events(client, args.workflow_id, run_id):
                failed = (
                    _render_workflow_stream_event(
                        renderer,
                        event,
                        rendered_responses=rendered_responses,
                    )
                    or failed
                )
            return 1 if failed else 0

        if args.workflow_command == "status":
            run = client.get_workflow_run(args.workflow_id, args.run_id)
            rows = [
                ["run_id", str(run.get("run_id") or "")],
                ["workflow_id", str(run.get("workflow_id") or args.workflow_id)],
                ["dedup_key", str(run.get("dedup_key") or "")],
                ["status", str(run.get("status") or "")],
                ["created_at", str(run.get("created_at") or "")],
                ["started_at", str(run.get("started_at") or "")],
                ["finished_at", str(run.get("finished_at") or "")],
                ["error", str(run.get("error") or "")],
            ]
            renderer.table(["Field", "Value"], rows)
            output = run.get("output")
            if isinstance(output, dict) and output:
                renderer.info("Output")
                renderer.print(json.dumps(output, indent=2, sort_keys=True))
            return 0
    finally:
        client.close()

    raise ValueError("workflow command is required")


def _run_artifact_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    from ..shared.workspace_context import current_workspace_dir

    context = build_artifact_context(current_workspace_dir())
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
    from ..shared.workspace_context import current_workspace_dir

    context = build_metrics_context(current_workspace_dir())

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
    from ..shared.workspace_context import current_workspace_dir

    context = build_experiment_context(current_workspace_dir())

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
