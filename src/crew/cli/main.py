from __future__ import annotations

import argparse
import contextlib
import json
import os
from collections.abc import Iterator
from typing import Any, Sequence, cast
from urllib.parse import quote

from mash.cli.client import MashHostClient
from mash.cli.config import load_config
from mash.cli.render import RichRenderer
from mash.cli.shell import MashRemoteShell, ShellTarget

from . import auth_store, beta_client

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
    selected_workspace_name,
    workspace_dir,
    workspace_root_dir,
)
from ..shared.version import crew_version
from .hosts_store import DEFAULT_HOST_ID, hosts_file_path, load_hosts, record_host

DEFAULT_BFF_BASE_URL = "http://127.0.0.1:8000"


def _bff_base_url(args: argparse.Namespace) -> str:
    """Resolve the BFF base URL (the single crew host process)."""
    saved = load_config()
    auth = auth_store.load_auth()
    base_url = (
        getattr(args, "api_base_url", None)
        or os.environ.get("CREW_API_BASE_URL")
        or (auth.get("api_base_url") if auth else None)
        or (saved.api_base_url if saved else None)
        or DEFAULT_BFF_BASE_URL
    ).strip()
    return base_url.rstrip("/")


def _mash_client(args: argparse.Namespace) -> MashHostClient:
    """Client for the Mash host API the BFF exposes under /host."""
    api_key = getattr(args, "api_key", None) or os.environ.get("MASH_API_KEY")
    return MashHostClient(_bff_base_url(args) + "/host", api_key=api_key)


def _require_auth(args: argparse.Namespace) -> dict[str, Any]:
    """Return stored auth, or raise telling the user to log in."""
    auth = auth_store.load_auth()
    if not auth:
        raise ValueError("not logged in. Run `crew login <username>` first.")
    # An explicit --api-base-url overrides the stored base for this call.
    explicit = getattr(args, "api_base_url", None)
    if explicit:
        auth = {**auth, "api_base_url": explicit.rstrip("/")}
    return auth


def _split_ids(raw: str | None) -> list[str]:
    if not raw:
        return []
    return [part.strip() for part in raw.split(",") if part.strip()]


def _agent_listing_rows(agents: list[dict[str, Any]]) -> list[list[str]]:
    rows: list[list[str]] = []
    for agent in sorted(agents, key=lambda a: str(a.get("agent_id") or "")):
        metadata = agent.get("metadata") or {}
        if not isinstance(metadata, dict):
            metadata = {}
        rows.append(
            [
                str(agent.get("agent_id") or ""),
                str(metadata.get("display_name") or ""),
                str(metadata.get("description") or ""),
            ]
        )
    return rows


def _workflow_rows(workflows: list[dict[str, Any]]) -> list[list[str]]:
    rows: list[list[str]] = []
    for workflow in sorted(workflows, key=lambda w: str(w.get("workflow_id") or "")):
        rendered_tasks = []
        for task in workflow.get("tasks") or []:
            if isinstance(task, dict):
                rendered_tasks.append(
                    f"{task.get('task_id') or ''} -> {task.get('agent_id') or ''}"
                )
        rows.append([str(workflow.get("workflow_id") or ""), ", ".join(rendered_tasks)])
    return rows


def _render_configured_hosts(renderer: RichRenderer) -> None:
    rows = [
        [
            host_id,
            entry["primary"],
            ", ".join(entry["subagents"]),
            ", ".join(entry["workflows"]),
        ]
        for host_id, entry in sorted(load_hosts().items())
    ]
    if rows:
        renderer.table(["Host", "Primary", "Subagents", "Workflows"], rows)
    else:
        renderer.info("(no hosts configured)")


def _parse_order_by(values: list[str] | None) -> list[dict[str, str]]:
    order_by: list[dict[str, str]] = []
    for value in values or []:
        field, sep, direction = value.partition(":")
        if not sep or not field.strip() or not direction.strip():
            raise ValueError("--order-by must use FIELD:DIRECTION")
        normalized_direction = direction.strip().upper()
        if normalized_direction not in {"ASC", "DESC"}:
            raise ValueError("--order-by direction must be ASC or DESC")
        order_by.append({"field": field.strip(), "direction": normalized_direction})
    return order_by


def _extract_response_text(payload: object) -> str:
    if isinstance(payload, dict):
        response_payload = payload.get("response")
        if isinstance(response_payload, dict):
            return str(response_payload.get("text") or "")
        return str(payload.get("text") or "")
    return ""


def _stream_workflow_run_events(
    client: MashHostClient,
    workflow_id: str,
    run_id: str,
) -> Iterator[dict[str, Any]]:
    stream_method = getattr(client, "stream_workflow_run_events", None)
    if not callable(stream_method):
        stream_method = getattr(client, "stream_workflow_run", None)
    if callable(stream_method):
        yield from stream_method(workflow_id, run_id)  # type: ignore[misc]
        return

    request_method = getattr(client, "_request", None)
    if not callable(request_method):
        return
    ctx = cast(
        contextlib.AbstractContextManager[Any],
        request_method(
            "GET",
            "/api/v1/workflow/"
            f"{quote(workflow_id, safe='')}/runs/{quote(run_id, safe='')}/events",
            stream=True,
        ),
    )
    with ctx as response:
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

    if event_name in {
        "workflow.task.started",
        "workflow.task.completed",
        "workflow.task.error",
    }:
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
        event_type = str(
            data.get("event_type") or runtime_label or "agent.trace"
        ).strip()
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
    parser.add_argument(
        "--workspace",
        default=None,
        help="Workspace to use for this command (overrides the saved default)",
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
    common_remote.add_argument(
        "--api-base-url", default=None, help="Crew BFF base URL"
    )
    common_remote.add_argument("--api-key", default=None, help="Bearer API key")
    common_remote.add_argument("--agent", default=None, help="Target agent id")

    login = subparsers.add_parser(
        "login", help="Authenticate with the crew BFF as a user"
    )
    login.add_argument("username", help="Username (must be in CREW_BETA_ALLOWED_USERS)")
    login.add_argument("--api-base-url", default=None, help="Crew BFF base URL")

    subparsers.add_parser("logout", help="Clear the saved auth token")

    sessions = subparsers.add_parser(
        "sessions", help="List your sessions (shared with the web UI)"
    )
    sessions.add_argument("--api-base-url", default=None, help="Crew BFF base URL")

    subparsers.add_parser(
        "browse",
        parents=[common_remote],
        help="Browse the agent pool, workflows, and your configured hosts",
    )

    compose = subparsers.add_parser(
        "compose",
        parents=[common_remote],
        help="Compose agents into a host (define-or-replace)",
    )
    compose.add_argument("host_id", help="Id for the composition")
    compose.add_argument("--primary", required=True, help="Primary agent id")
    compose.add_argument(
        "--subagents", default=None, help="Comma-separated subagent ids"
    )
    compose.add_argument(
        "--workflows", default=None, help="Comma-separated workflow ids"
    )

    subparsers.add_parser("hosts", help="List the hosts in your config file")

    repl = subparsers.add_parser(
        "repl", help="Chat in an authenticated session (shared with the web UI)"
    )
    repl.add_argument("--api-base-url", default=None, help="Crew BFF base URL")
    repl.add_argument(
        "--session-id", default=None, help="Resume an existing session id"
    )
    repl.add_argument("--label", default=None, help="Label for a new session")

    workflow = subparsers.add_parser(
        "workflow", help="List, run, and inspect workflows"
    )
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
    artifact_list.add_argument(
        "--kind", default=None, help="Optional artifact kind filter"
    )
    artifact_list.add_argument(
        "--limit", type=int, default=None, help="Optional row limit"
    )

    artifact_show = artifact_subparsers.add_parser(
        "show", help="Render one artifact file"
    )
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

    metrics_compile = metrics_subparsers.add_parser(
        "compile", help="Compile metric configs to SQL"
    )
    metrics_compile.add_argument(
        "--metric", action="append", required=True, help="Metric name (repeatable)"
    )
    metrics_compile.add_argument(
        "--dimension", action="append", default=None, help="Dimension (repeatable)"
    )
    metrics_compile.add_argument(
        "--filter",
        action="append",
        default=None,
        help="SQL WHERE clause fragment (repeatable)",
    )
    metrics_compile.add_argument(
        "--order-by",
        action="append",
        default=None,
        help="Order expression as FIELD:DIRECTION (repeatable)",
    )
    metrics_compile.add_argument("--limit", type=int, default=None, help="Row limit")
    metrics_compile.add_argument(
        "--date-dimension", default=None, help="Date dimension name"
    )
    metrics_compile.add_argument(
        "--start", default=None, help="Date range start YYYY-MM-DD"
    )
    metrics_compile.add_argument(
        "--end", default=None, help="Date range end YYYY-MM-DD"
    )
    metrics_chart = metrics_subparsers.add_parser(
        "chart", help="Execute a metric visualization query"
    )
    metrics_chart.add_argument("--metric", required=True, help="Metric name")
    metrics_chart.add_argument(
        "--group-by", default=None, help="Optional grouping dimension"
    )
    metrics_chart.add_argument(
        "--date-dimension", default=None, help="Date dimension name"
    )
    metrics_chart.add_argument(
        "--grain",
        default=None,
        choices=["day", "week", "month"],
        help="Optional date grain",
    )
    metrics_chart.add_argument(
        "--filter",
        action="append",
        default=None,
        help="SQL WHERE clause fragment (repeatable)",
    )
    metrics_chart.add_argument("--limit", type=int, default=None, help="Row limit")
    metrics_chart.add_argument(
        "--start", default=None, help="Date range start YYYY-MM-DD"
    )
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
    experiment_analyze.add_argument(
        "--name", required=True, help="Experiment config name"
    )
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
        workspace_override = getattr(args, "workspace", None)
        if workspace_override:
            from ..shared.workspace_context import bound_workspace

            with bound_workspace(workspace_override):
                result = _dispatch(args, renderer)
        else:
            result = _dispatch(args, renderer)
    except Exception as exc:
        renderer.error(str(exc))
        return 1

    if result is None:
        parser.print_help()
        return 0
    return result


def _dispatch(args: argparse.Namespace, renderer: RichRenderer) -> int | None:
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

    if args.command == "login":
        return _run_login_command(args, renderer)
    if args.command == "logout":
        return _run_logout_command(renderer)
    if args.command == "sessions":
        return _run_sessions_command(args, renderer)
    if args.command == "browse":
        return _run_browse_command(args, renderer)
    if args.command == "compose":
        return _run_compose_command(args, renderer)
    if args.command == "hosts":
        _render_configured_hosts(renderer)
        renderer.info(
            "Compose or replace one with `crew compose`. "
            "(`crew repl` chats in your authenticated datasquad session.)"
        )
        return 0
    if args.command == "repl":
        return _run_repl_command(args, renderer)
    if args.command == "workflow":
        return _run_workflow_command(args, renderer)
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
    return None


def _run_login_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    base_url = _bff_base_url(args)
    username = str(args.username or "").strip()
    if not username:
        raise ValueError("a username is required: `crew login <username>`")
    data = beta_client.login(base_url, username)
    token = str(data.get("token") or "")
    user = data.get("user") or {}
    if not token or not isinstance(user, dict):
        raise ValueError("login did not return a token")
    auth_store.save_auth(
        api_base_url=base_url,
        token=token,
        username=str(user.get("username") or username),
        user_id=str(user.get("id") or ""),
    )
    renderer.info(f"Logged in as {user.get('username') or username} at {base_url}")
    renderer.info(f"Saved to {auth_store.auth_file_path()}")
    return 0


def _run_logout_command(renderer: RichRenderer) -> int:
    if auth_store.clear_auth():
        renderer.info("Logged out.")
    else:
        renderer.info("Not logged in.")
    return 0


def _current_workspace() -> str:
    from ..shared.workspace_context import current_workspace_id

    return current_workspace_id()


def _run_sessions_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    auth = _require_auth(args)
    client = beta_client.BetaClient(auth["api_base_url"], auth["token"])
    workspace = _current_workspace()
    sessions = client.list_sessions(workspace)
    if not sessions:
        renderer.info(f"(no sessions in workspace '{workspace}')")
        return 0
    rows = [
        [
            str(s.get("session_id") or ""),
            str(s.get("label") or ""),
            str(s.get("turn_count") if s.get("turn_count") is not None else ""),
            str(s.get("preview_text") or "")[:60],
        ]
        for s in sessions
    ]
    renderer.table(["Session", "Label", "Turns", "Preview"], rows)
    return 0


def _run_repl_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    auth = _require_auth(args)
    workspace = _current_workspace()

    # Create (or resume) the session through the BFF so it is owned by the
    # logged-in user and shared with the web UI.
    beta = beta_client.BetaClient(auth["api_base_url"], auth["token"])
    session_id = str(getattr(args, "session_id", None) or "").strip()
    if not session_id:
        created = beta.create_session(workspace, label=getattr(args, "label", None))
        session_id = str(created.get("session_id") or "")
        if not session_id:
            raise ValueError("failed to create a session")
        renderer.info(f"New session {session_id} (workspace {workspace})")
    else:
        renderer.info(f"Resuming session {session_id}")

    # Drive the full mash shell (slash commands, live rendering, interactions)
    # against the Mash host API the BFF mounts at /host, pinned to the same
    # session so turns stay unified with the UI.
    mash_base = auth["api_base_url"].rstrip("/") + "/host"
    client = MashHostClient(mash_base, api_key=getattr(args, "api_key", None) or None)
    try:
        described = client.get_host(DEFAULT_HOST_ID)
        primary = described.get("primary") if isinstance(described, dict) else None
        agent_id = (
            primary.get("agent_id") if isinstance(primary, dict) else None
        ) or "data"
        target = ShellTarget(
            api_base_url=mash_base,
            agent_id=agent_id,
            session_id=session_id,
            host_id=DEFAULT_HOST_ID,
        )
        MashRemoteShell(client, target).run()
        return 0
    finally:
        client.close()


def _run_browse_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    client = _mash_client(args)
    try:
        renderer.info("Agent pool")
        renderer.table(
            ["Agent", "Listing", "Description"],
            _agent_listing_rows(client.list_agents()),
        )
        renderer.info("Workflows (attach with `crew compose ... --workflows <id>`)")
        workflow_rows = _workflow_rows(client.list_workflows())
        if workflow_rows:
            renderer.table(["Workflow", "Tasks"], workflow_rows)
        else:
            renderer.info("(none registered)")
        renderer.info(f"Configured hosts ({hosts_file_path()})")
        _render_configured_hosts(renderer)
        renderer.info(
            "Compose a host with `crew compose <host-id> --primary <agent> "
            "--subagents a,b`, then enter it with `crew agent repl --host <host-id>`."
        )
        return 0
    finally:
        client.close()


def _run_compose_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    client = _mash_client(args)
    try:
        subagents = _split_ids(args.subagents)
        workflows = _split_ids(args.workflows)
        client.define_host(
            args.host_id,
            primary=args.primary,
            subagents=subagents,
            workflows=workflows,
        )
        record_host(
            args.host_id,
            primary=args.primary,
            subagents=subagents,
            workflows=workflows,
        )
        renderer.info(
            f"Composed host '{args.host_id}' (primary {args.primary}, "
            f"{len(subagents)} subagent(s)). Saved to {hosts_file_path()}."
        )
        renderer.info(f"Enter it with `crew agent repl --host {args.host_id}`.")
        return 0
    finally:
        client.close()


def _run_workflow_command(args: argparse.Namespace, renderer: RichRenderer) -> int:
    client = _mash_client(args)
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
                    raise ValueError(
                        f"workflow input must be valid JSON: {exc.msg}"
                    ) from exc
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
        payload = list_artifacts(
            context=context, kind_filter=args.kind, limit=args.limit
        )
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
        renderer.info(f"Dataset: {payload['dataset_id']} | Plans: {payload['count']}")
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


def _build_date_range_args(
    *, start: str | None, end: str | None
) -> dict[str, str] | None:
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

    columns = (payload.get("table") or {}).get("columns") or []
    rows = (payload.get("table") or {}).get("rows") or []
    if rows:
        renderer.table(
            [str(column.get("label") or column.get("key") or "") for column in columns],
            [
                [
                    _format_visualization_cell(row.get(str(column.get("key"))), column)
                    for column in columns
                ]
                for row in rows
            ],
        )
    else:
        renderer.warn("No rows returned for this view.")

    if show_sql:
        for query_plan in (payload.get("lineage") or {}).get("queries") or []:
            label = str(query_plan.get("label") or "SQL")
            renderer.info(label)
            renderer.markdown(f"```sql\n{query_plan.get('sql') or ''}\n```")


def _format_visualization_cell(value: Any, column: dict[str, Any]) -> str:
    if value is None:
        return "—"

    column_type = str(column.get("type") or "")
    column_format = str(column.get("format") or "")

    if (
        column_type == "number"
        and isinstance(value, (int, float))
        and not isinstance(value, bool)
    ):
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
