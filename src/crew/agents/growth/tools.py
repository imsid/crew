"""The candidate tools — the Growth agent's whole loop over one run.

Four tools, all scoped to a ``run_id`` the step input hands the agent: read the run's
candidates, define a play, check its copy renders, stamp the play onto its orgs. Each
one is a short composition over ``crew.plays.data_loaders`` — the argument handling
and the agent-facing checks live here, the SQL lives there.

Nothing here is churn- or expansion-specific, so a second play workflow reuses them
unchanged.

There is no "describe the run" tool: the run, its selection rule, its SQL and both
snapshot schemas arrive as the step's input, before the agent's first action.
"""

from __future__ import annotations

import json
from typing import Any, Callable, List

from mash.tools.base import FunctionTool, Tool, ToolResult

from ...plays import render
from ...plays.context import PlayRuntimeContext
from ...plays.data_loaders import play_candidates, plays


def _to_json(payload: dict[str, Any]) -> ToolResult:
    return ToolResult.success(json.dumps(payload, ensure_ascii=True, indent=2))


def _guarded(
    name: str, func: Callable[[dict[str, Any]], dict[str, Any]]
) -> Callable[[dict[str, Any]], Any]:
    """Surface validation failures to the agent as tool errors, not crashes.

    ``create_play`` and ``assign_play`` reject bad field names, undeclared template
    variables and double assignments; the message is the agent's correction signal,
    so it has to come back as tool output.
    """

    async def _executor(args: dict[str, Any]) -> Any:
        try:
            return _to_json(func(args or {}))
        except Exception as exc:  # noqa: BLE001 — the message is the useful part
            return ToolResult.error(f"{name} failed: {exc}")

    return _executor


def _require(args: dict[str, Any], key: str) -> str:
    value = str(args.get(key) or "").strip()
    if not value:
        raise ValueError(f"{key} is required")
    return value


def build_candidate_tools(ctx: PlayRuntimeContext) -> List[Tool]:
    """Build the four candidate tools over a runtime context.

    The context holds the BigQuery client lazily, so building the registry at pool
    startup never touches the network.
    """

    def _read_candidates(args: dict[str, Any]) -> dict[str, Any]:
        run_id = _require(args, "run_id")
        where = args.get("where")
        limit = max(1, min(int(args.get("limit") or 50), play_candidates.MAX_ROWS))
        rows = play_candidates.select_candidates(
            ctx,
            run_id=run_id,
            limit=limit,
            offset=int(args.get("offset") or 0),
            order_by=args.get("order_by"),
            where=where,
        )
        return {
            "run_id": run_id,
            "matched_count": play_candidates.count_candidates(
                ctx, run_id=run_id, where=where
            ),
            "returned_count": len(rows),
            "limit": limit,
            "offset": int(args.get("offset") or 0),
            "candidates": rows,
        }

    def _create_play(args: dict[str, Any]) -> dict[str, Any]:
        run_id = _require(args, "run_id")
        play_name = _require(args, "play_name")
        copy_template = _require(args, "copy_template")
        template_vars = args.get("template_vars") or {}

        # Validated against the keys the run actually has, so a play whose copy could
        # not render for some org is rejected rather than created.
        render.validate_template(
            copy_template, template_vars, play_candidates.snapshot_keys(ctx, run_id)
        )

        play_id = plays.play_id_for(run_id, play_name)
        plays.insert_play(
            ctx,
            play_id=play_id,
            run_id=run_id,
            workflow_id=_require(args, "workflow_id"),
            play_name=play_name,
            criteria=_require(args, "criteria"),
            copy_template=copy_template,
            template_vars=template_vars,
        )
        return {
            "play_id": play_id,
            "run_id": run_id,
            "play_name": play_name,
            "template_vars": sorted(template_vars),
        }

    def _preview_play_copy(args: dict[str, Any]) -> dict[str, Any]:
        run_id = _require(args, "run_id")
        play_id = _require(args, "play_id")
        wanted = max(1, int(args.get("limit") or 3))

        play = plays.select_play(ctx, run_id=run_id, play_id=play_id)
        if play is None:
            raise ValueError(f"play '{play_id}' does not exist on run '{run_id}'")

        rows = play_candidates.select_candidates(
            ctx, run_id=run_id, limit=max(wanted * 4, 20)
        )
        # Prefer rows already on this play; otherwise any unassigned row, so the copy
        # can be checked before the assignment is committed.
        sample = [row for row in rows if row.get("play_id") == play_id]
        if not sample:
            sample = [row for row in rows if not row.get("play_id")]

        return {
            "play_id": play_id,
            "copy_template": play["copy_template"],
            "previews": [
                {
                    "org_id": row["org_id"],
                    "org_name": row["org_name"],
                    "rendered": render.render(
                        play["copy_template"], play["template_vars"], row
                    ),
                }
                for row in sample[:wanted]
            ],
        }

    def _assign_play(args: dict[str, Any]) -> dict[str, Any]:
        run_id = _require(args, "run_id")
        play_id = _require(args, "play_id")
        org_ids = args.get("org_ids")
        if not isinstance(org_ids, list) or not org_ids:
            raise ValueError("org_ids must be a non-empty array of org ids")
        org_ids = [str(org_id) for org_id in org_ids]

        if plays.select_play(ctx, run_id=run_id, play_id=play_id) is None:
            raise ValueError(f"play '{play_id}' does not exist on run '{run_id}'")

        current = play_candidates.select_org_ids(ctx, run_id=run_id, org_ids=org_ids)
        unknown = sorted(set(org_ids) - set(current))
        if unknown:
            raise ValueError(f"orgs not in run '{run_id}': {', '.join(unknown)}")
        conflicts = sorted(
            org_id
            for org_id, existing in current.items()
            if existing is not None and existing != play_id
        )
        if conflicts:
            raise ValueError(
                "these orgs are already assigned to another play: "
                f"{', '.join(conflicts)}. An org gets exactly one play."
            )

        assigned = play_candidates.set_play_id(
            ctx, run_id=run_id, play_id=play_id, org_ids=org_ids
        )
        return {
            "play_id": play_id,
            "assigned": assigned,
            "already_on_this_play": len(
                [org for org, existing in current.items() if existing == play_id]
            ),
            **play_candidates.coverage(ctx, run_id),
        }

    run_id_param = {
        "type": "string",
        "description": "The run id from your step input.",
    }

    return [
        FunctionTool(
            name="read_candidates",
            description=(
                "Read candidate orgs from one run, with both snapshots decoded and "
                "flattened onto each row. order_by and where name snapshot fields "
                f"directly. Returns at most {play_candidates.MAX_ROWS} rows."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "run_id": run_id_param,
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": play_candidates.MAX_ROWS,
                        "description": "Rows to return (default 50).",
                    },
                    "offset": {"type": "integer", "minimum": 0},
                    "order_by": {
                        "type": "string",
                        "description": (
                            "'<field> [ASC|DESC]', comma-separated. Fields are "
                            "org_id, org_name, or any snapshot field, e.g. "
                            "'dollars_at_risk DESC'."
                        ),
                    },
                    "where": {
                        "type": "string",
                        "description": (
                            "AND-joined '<field> <op> <value>' predicates, ops "
                            "= != > >= < <=, e.g. "
                            "\"decay_pct >= 0.4 AND plan_tier = 'enterprise'\"."
                        ),
                    },
                },
                "required": ["run_id"],
            },
            _executor=_guarded("read_candidates", _read_candidates),
        ),
        FunctionTool(
            name="create_play",
            description=(
                "Define one play for a run: a strategy with a single copy template "
                "that renders per org. Every template variable is validated against "
                "the snapshot fields this run actually has, so a play that cannot "
                "render is rejected rather than created. Returns the play_id."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "run_id": run_id_param,
                    "workflow_id": {
                        "type": "string",
                        "description": "The workflow id from your step input.",
                    },
                    "play_name": {
                        "type": "string",
                        "description": "Short human name, e.g. 'Enterprise CSM escalation'.",
                    },
                    "criteria": {
                        "type": "string",
                        "description": "Why these orgs belong in this play.",
                    },
                    "copy_template": {
                        "type": "string",
                        "description": (
                            "The message, with {variable} placeholders. Every "
                            "placeholder must be declared in template_vars."
                        ),
                    },
                    "template_vars": {
                        "type": "object",
                        "description": (
                            "placeholder -> {source, format}. source is 'org_name', "
                            "'org_snapshot.<field>' or 'usage_snapshot.<field>'; "
                            "format is one of percent0, percent1, usd0, usd2, "
                            "integer, number, text."
                        ),
                        "additionalProperties": {
                            "type": "object",
                            "properties": {
                                "source": {"type": "string"},
                                "format": {"type": "string"},
                            },
                            "required": ["source"],
                        },
                    },
                },
                "required": [
                    "run_id",
                    "workflow_id",
                    "play_name",
                    "criteria",
                    "copy_template",
                    "template_vars",
                ],
            },
            _executor=_guarded("create_play", _create_play),
        ),
        FunctionTool(
            name="preview_play_copy",
            description=(
                "Render a play's copy template against real candidate rows from its "
                "run, so you can check the copy before assigning orgs to it."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "run_id": run_id_param,
                    "play_id": {"type": "string"},
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "description": "Examples to render (default 3).",
                    },
                },
                "required": ["run_id", "play_id"],
            },
            _executor=_guarded("preview_play_copy", _preview_play_copy),
        ),
        FunctionTool(
            name="assign_play",
            description=(
                "Assign candidate orgs to a play. Rejects orgs not in the run and "
                "orgs already on another play — each org gets exactly one play. "
                "Returns unassigned_remaining; you are done when it reaches 0."
            ),
            parameters={
                "type": "object",
                "properties": {
                    "run_id": run_id_param,
                    "play_id": {"type": "string"},
                    "org_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Org ids from read_candidates.",
                    },
                },
                "required": ["run_id", "play_id", "org_ids"],
            },
            _executor=_guarded("assign_play", _assign_play),
        ),
    ]


__all__ = ["build_candidate_tools"]
