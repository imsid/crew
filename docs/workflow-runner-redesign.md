# Workflow Runner Redesign — mashpy 0.17.0 Migration

> Superseded as an architecture guide by
> [`beta-architecture.md`](beta-architecture.md). This document records the
> 0.17 workflow migration; references below to mounting Mash inside the BFF
> describe the removed intermediate implementation.

Status: proposal
Scope: remove UX-authored (dynamic) workflows; rebuild the Workflow Runner on
the mash 0.17.0 step-pipeline runtime.

## Context

mashpy 0.17.0 removed the dynamic workflow model crew was built on. Every
workflow is now a code-shipped, typed step pipeline
(`WorkflowSpec(steps=[CodeStep | AgentStep])`) with pydantic-typed edges,
build-time adjacency validation, DBOS durability, and runtime-owned run
persistence. The APIs crew's authoring path depends on — `TaskSpec`,
`WorkflowTaskMessageSpec`, `Skill(type="dynamic")`,
`register_agent_workflow`, `enable_masher()` — no longer exist.

Two decisions drive this redesign:

1. **Workflows are code-shipped, full stop.** The chat-authoring UX
   (`publish_workflow` tool, authored skill + task bundles, publish/disable
   routes) is removed cleanly, not ported. Crew-specific workflows (e.g.
   `experiment-readout`, `metric-report`) come later as Python pipelines —
   out of scope here, see "Later" at the end.
2. **Don't reinvent the runtime surface.** Mash's `WorkflowService`
   (`pool.get_workflow_service()`) now owns definitions, runs, step events,
   resume, and SSE streaming; the mash admin UI Workflows tab is a complete
   reference implementation of the runner experience. Crew's BFF becomes a
   thin authenticated/workspace-scoped proxy, and the crew web UI mirrors the
   admin UI patterns.
3. **No backwards compatibility, anywhere.** This is a clean cutover: no
   compatibility shims, no dual code paths, no fenced-off dead code, no
   preserved legacy payload shapes or event names, no data kept "just in
   case". Old workflow state is dropped, old API/response shapes are
   replaced, and the upgrade + removal land as one change so no commit ships
   a half-migrated hybrid.

A useful consequence of 0.17.0: `HostBuilder.build()` registers the masher
suite unconditionally — eval + judge agents, and four default workflows
(`masher-trace-digest`, `masher-online-eval-curation`, `gen-synthetic-evals`,
`run-experiment`) attached to every host. The Workflow Runner therefore has
real content on day one, before crew ships any workflow of its own.

## Current state inventory (what exists today)

Authoring path (all deleted in Phase 1):

| Piece | Location |
| --- | --- |
| Publishing service (dynamic skill + TaskSpec registration) | `src/crew/workflow/service.py` |
| `publish_workflow` agent tool | `src/crew/workflow/tools.py`, registered in `src/crew/agents/data/spec.py` |
| Authored skill/workflow persistence | `src/crew/beta/store.py` (`upsert_authored_skill`, `upsert_authored_workflow`, `get/list_authored_workflow_bundle(s)`, `set_authored_workflow_status`, tables `authored_skills`, `authored_workflows`, `authored_workflow_tasks`) |
| Publish/validate/disable routes + authored enrichment | `src/crew/beta/routes/workflow.py` |
| Startup republish of authored workflows | `src/crew/beta/app.py` (`republish_published_workflows`) |
| Tests | `tests/test_workflow.py`, authored-workflow cases in `tests/test_beta_api.py`, `tests/test_beta_store.py` |

Runner path (rebuilt in Phase 2):

| Piece | Location | Problem |
| --- | --- | --- |
| BFF run/list/get/stream routes | `src/crew/beta/routes/workflow.py` | Task-shaped payloads; per-task workspace binding |
| Command-mode workflow ops | `src/crew/beta/routes/command.py` | Same |
| Workflows tab UI | `web/src/components/workflows/workflows-view.tsx`, `web/src/lib/api.ts`, `web/src/lib/types.ts`, `web/src/lib/commands.ts` | Renders `tasks`; no input-schema form, no step pipeline, no resume |
| CLI streaming/rendering | `src/crew/cli/main.py` (`_workflow_rows`, `_render_workflow_stream_event`) | Renders `workflow.task.*` events, which no longer exist |
| Per-task workspace bridge | `src/crew/shared/workspace_context.py` (`register_workflow_task_workspaces`) | Task registry keyed by task ids that no longer exist |

## Target architecture

```
web UI / CLI ──▶ crew BFF (auth + workspace scoping, thin proxy)
                     │
                     ▼
        pool.get_workflow_service()          ← mash owns everything below
        ├─ list_workflows()                  (id, metadata, step_kinds, input_schema)
        ├─ get_workflow_definition(id)       (ordered steps, per-step I/O schemas)
        ├─ run_workflow(id, input, dedup_key, session_id)   (pydantic-validated)
        ├─ list_runs(id, status/time filters, limit/offset)
        ├─ get_run(id, run_id)               (status, input, result, steps[])
        ├─ resume_run(id, run_id)            (re-enter failed run at failed step)
        ├─ list_run_step_events(id, run_id)  (persisted step.started/completed/failed)
        └─ stream_run_events(id, run_id)     (SSE: step.*, workflow.completed, workflow.error)
```

Crew adds only what mash cannot know: authentication, workspace scoping of
the routes, and product chrome. No workflow state is stored in the beta
store.

Reference implementation for the UX:
`mashpy/src/mash/api/web-admin/src/routes/{Workflows,WorkflowDetail,WorkflowRuns,WorkflowRunDetail}.jsx`,
`components/workflows/{RunWorkflowDrawer,StepDetailDrawer,WorkflowUI}.jsx`, and
`lib/workflow.js` (schema-driven form init/validation, definition/run step
merging, status tones, terminal-status handling).

## Phase 1 — Upgrade to 0.17.0 + delete UX-authored workflows (one cutover)

Goal: crew runs on 0.17.0 with the authoring path gone. The upgrade and the
removal are one change — there is no intermediate state where dead authoring
code is fenced off or stubbed to keep the app booting.

Upgrade:

- Bump `pyproject.toml` to `mashpy>=0.17.0`.
- `src/crew/app.py`: drop `.enable_masher()` (removed API); masher agents and
  default workflows now arrive via `HostBuilder.build()`. Verify `datasquad`
  (defined via `pool.define_host`) inherits the pool-default workflows
  (`define_host` merges `_default_workflow_ids`).

Backend deletions:

- Delete `src/crew/workflow/` entirely (service + tools).
- `src/crew/agents/data/spec.py`: drop `build_publish_workflow_tool`
  registration; sweep the data agent prompt/skills/README for
  workflow-authoring guidance.
- `src/crew/beta/app.py`: remove `WorkflowService` construction, the
  `workflow` runtime-context field, and the startup
  `republish_published_workflows()` call.
- `src/crew/shared/runtime_context.py`: remove the `workflow` service handle.
- `src/crew/beta/routes/workflow.py`: remove `POST /workflow/validate`,
  `POST /workflow` (publish), `POST /workflow/{id}/disable`, and all
  authored-bundle enrichment in list/get.
- `src/crew/beta/store.py`: remove the `authored_*` methods and stop creating
  the `authored_skills` / `authored_workflows` / `authored_workflow_tasks`
  tables.
- `src/crew/shared/workspace_context.py`: remove
  `register_workflow_task_workspaces` and the task-workspace registry (the
  request-id bridge for chat tools stays).

Data: `DROP TABLE IF EXISTS authored_skills, authored_workflows,
authored_workflow_tasks` at store init — a clean cut, no orphaned state.
Note the drop in the CHANGELOG.

Client/docs sweep:

- Root `README.md`: remove "registered workflows" authoring claims; describe
  the runner over built-in workflows instead.
- Web UI + CLI: remove authoring affordances if any exist (validate/publish
  calls in `web/src/lib/api.ts`); running/inspection breaks here too — that
  is acceptable mid-migration and restored in Phase 2.
- Delete `tests/test_workflow.py`; prune authored-workflow cases from
  `tests/test_beta_api.py` and `tests/test_beta_store.py`.

Exit criteria: host + BFF boot on 0.17.0 and a `crew repl` chat round-trip
works; the four masher workflows appear via
`pool.get_workflow_service().list_workflows()`;
`grep -ri "authored\|publish_workflow" src web tests` returns nothing
meaningful; full test suite green.

## Phase 2 — Workflow Runner on the mash runtime surface

Goal: configure inputs, run, and inspect any registered workflow (initially
the masher suite) from crew's web UI and CLI, at parity with the mash admin
UI Workflows tab.

### 2a. BFF: authenticated mash mounts, no crew workflow routes

(Revised after review: the original plan — BFF routes mirroring mash's
workflow router one-for-one — was implemented and then rejected as pure
duplication. Final design below.)

Crew ships **no** workflow HTTP routes. The mash app built by
`create_mash_api_app(pool)` already serves the full workflow API
(list/definition/run/runs/resume/step-events/SSE, with error mapping via
app-level exception handlers). The BFF:

- mounts that app at `/host` (CLI) and at root (web UI workflow calls, the
  `/admin` SPA), with **every mount fronted by a crew bearer-token ASGI
  wrapper** (`MashMountAuth`) — there is no unauthenticated mash surface;
  mash's own single-key auth stays disabled (`api_key=None`).
- accepts the token from the `Authorization` header (web UI, CLI) or from
  the cookie set at `/login/handle` (browser navigations to `/admin` and
  `/host/telemetry`, which cannot carry a header).
- runs the mash app's own lifespan from the BFF lifespan via
  `mash_api_app.router.lifespan_context(...)` instead of replicating its
  setup (mounted sub-apps don't receive lifespan events).
- drops workspace scoping from workflow paths — workflows are host-global;
  the web UI filters with mash's `?host=datasquad` param. Crew-specific
  pipelines will thread workspace through `workflow_input` when they arrive.

The CLI sends the stored crew login token as the `MashHostClient` bearer
key. `src/crew/beta/routes/command.py` (`surface == "workflows"`) keeps
calling `pool.get_workflow_service()` directly — the Python service API is
mash's supported surface; only the HTTP layer was duplicated.

### 2b. Web UI: rebuild the Workflows tab

Replace the task-centric `workflows-view.tsx` with the admin-UI experience,
restyled to crew (port the logic, not the look). Views:

1. **Workflow list** — cards/table with `workflow_id`, display name +
   description from metadata, step-kind summary chips (code/agent/mixed via
   `step_kinds`), latest-run status.
2. **Workflow detail** — pipeline visualization of the ordered steps (kind,
   agent id, skill, per-step I/O schema disclosure), workflow `input_schema`
   summary, recent runs table, "Run workflow" action.
3. **Run drawer** — schema-driven input form: seed defaults
   (`initialWorkflowInput`), per-field client validation
   (`validateWorkflowInput` port), raw-JSON escape hatch, optional
   `dedup_key`; surface 422 field errors from the BFF.
4. **Run detail** — status/timing/dedup header, workflow input + result JSON,
   pipeline with live per-step status (`mergeWorkflowSteps` pattern: overlay
   run `steps[]` on the definition), step drawer with the step's persisted
   events and I/O, **Resume** on failed runs, **Run again** pre-filled with
   the run's input. Live updates over the SSE endpoint with the
   reconnect-and-poll fallback the admin UI uses.

Port `lib/workflow.js` helpers to typed TS in `web/src/lib/workflow.ts`
(schema resolution incl. `$ref`/`anyOf`, field extraction, input init +
validation, step merging, status tones, terminal statuses, duration). Rewrite
`WorkflowListItem`/run types in `web/src/lib/types.ts` around steps; update
`web/src/lib/api.ts` (add definition, resume, step-events, run-list filters)
and `commands.ts` templates.

### 2c. CLI

- `_workflow_rows`: render steps (`step_id`/`kind`) instead of tasks.
- `_render_workflow_stream_event`: handle `step.started`, `step.completed`,
  `step.failed`, `workflow.completed`, `workflow.error`.
- Optional (nice-to-have): `crew workflow run/runs/show` command-mode verbs
  over the BFF, matching the UI capabilities.

Exit criteria: from crew's web UI, a user can open Workflows, see the four
masher workflows, fill `masher-trace-digest` inputs in the form, run it,
watch steps go live, open a step's events, resume a failed run; the same run
is streamable from the CLI. No workflow persistence exists in crew.

## Phase 3 — Tests, docs, hardening

- BFF route tests against a real pool + workflow service (happy path, 404 /
  409 / 422 mapping, host-attachment filtering, SSE payload shape).
- CLI rendering tests for the new event names; web unit tests for the
  `workflow.ts` helpers (port the admin UI's `workflow.test.js` cases).
- Update `README.md`, `docs/product.md`, and agent READMEs: workflows are
  code-shipped pipelines; the runner runs/inspects them; masher suite is
  built-in.
- CHANGELOG entry covering the removal (incl. the `authored_*` table drop)
  and the new runner.
- Verify end-to-end in docker compose (embedded Postgres): fresh boot, no
  authored tables created, masher workflows attached to `datasquad`.

## Later (explicitly out of scope)

Crew-specific pipelines, to be brainstormed after Phases 1–3 land:

- `experiment-readout` (code → agent → code): load config + data → compute
  stats → agent interpretation with structured output → persist artifact.
- `metric-report` (code, optional agent tail): resolve metric → compile SQL →
  execute → chart artifact → optional narrative.
- Shared plumbing they'll need: a `CrewRuntimeContext` closed over by code
  steps (mirroring `MasherRuntimeContext`), a service layer shared between
  chat tools and code steps, host attachment via `HostBuilder.workflow()` /
  `Host(workflows=...)`, and a scheduling story for batch runs.
