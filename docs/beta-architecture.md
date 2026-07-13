# Crew Beta Architecture — crew as a standalone application over a mash host

Status: proposal

The beta system, designed from scratch: a user-facing crew application
(auth, users, sessions, workspaces, commands) that talks to a mash-composed
agent host **over HTTP with a service key**. Crew is a client of mash, not
a wrapper around it.

## Topology

```
                      public origin                    internal network
             ┌──────────────────────────┐      ┌───────────────────────────┐
  browser ──▶│  web (Next.js)           │      │                           │
             └──────────┬───────────────┘      │  crew-host                │
                        │ crew token           │  ├─ mash AgentPool        │
             ┌──────────▼───────────────┐      │  │   (data, pm, masher)   │
  CLI ──────▶│  crew-api                │─────▶│  ├─ mash API (run_host)   │
   crew token│  ├─ auth / users         │ MASH │  ├─ workflows + runs      │
             │  ├─ sessions             │ API  │  ├─ telemetry + admin UI  │
             │  ├─ workspaces           │ KEY  │  └─ crew tools (metrics,  │
             │  ├─ commands             │      │      artifacts, exps)     │
             │  ├─ artifacts serving    │      │                           │
             │  └─ /host/* passthrough  │      └────────────┬──────────────┘
             └──────────┬───────────────┘                   │
                        │                                   │
             ┌──────────▼───────────────┐      ┌────────────▼──────────────┐
             │  crew db (users,         │      │  mash runtime db (traces, │
             │  sessions, workspaces)   │      │  runs, session state)     │
             └──────────────────────────┘      └───────────────────────────┘
                        └── one Postgres instance, two databases ──┘
```

Two services, one public origin, one trust boundary:

- **crew-host** — crew's agents and tools registered on a mash `AgentPool`,
  served by mash's stock `run_host()` on an internal address, authenticated
  by a single `MASH_API_KEY`. It has no concept of users. Its only client is
  crew-api. Note that "independent service" does not mean "stock mash
  binary": mash is a hosting framework — the data/pm agent specs, their
  tools, and future crew workflow pipelines are crew Python code imported
  into this process. crew-host is a ~20-line crew entrypoint:
  `run_host(build_pool(), config=MashHostConfig(api_key=...))`.
- **crew-api** — the product. Owns identity (users, tokens), session
  records, workspaces, and the command surface. Everything user-facing
  authenticates here, exactly once.

## Design principles

1. **One public origin, per-user auth exactly once.** The browser and CLI
   only ever hold crew tokens and only ever talk to crew-api. The mash API
   key never leaves the internal network.
2. **crew-host is headless and user-blind.** It answers "run this message in
   this session on this host composition" and "run/inspect this workflow".
   Authorization of *who* may do that is crew-api's job, done before the
   request crosses the boundary.
3. **Don't re-implement mash's HTTP surface.** Where clients need raw mash
   capability (workflow runner, the CLI's mash shell), crew-api forwards
   requests through a single generic passthrough, not per-route rewrites.
4. **Context rides the request.** Anything crew-host needs at
   tool-execution time is carried in the request payload. The two services
   share no memory and no side channels; a request contains everything
   needed to execute it.

## crew-host

- Built by `build_pool()`: data + pm agents, masher suite (arrives with
  `HostBuilder.build()` on mash ≥ 0.17), the `datasquad` composition, and —
  later — crew's own workflow pipelines.
- Served by mash's own `run_host` / `mash.api.main`. No crew routes, no
  custom lifespan, no mounting. Mash's app runs exactly as mash designed it,
  including its exception handlers, API logging, and OpenAPI docs.
- Auth: `MASH_API_KEY` (mash supports this natively via config/env). Bound
  to the internal network only.
- **Operator UIs (admin, telemetry) are internal tools.** They are served by
  crew-host on the internal address; operators reach them by private network
  or port-forward. Mash already handles its own cookie auth for the admin
  SPA when an API key is set. Crew-api does not proxy, restyle, or
  re-authenticate them — deleting an entire class of cookie/header
  gymnastics that only existed to expose operator tools on the product
  origin.

## crew-api

### Auth and users

Allowlisted handles, a users table, and HMAC-signed bearer tokens issued at
login — stateless to verify, so crew-api needs no token store and scales
without session affinity. Tokens are meaningful only to crew-api. The
architecture requires no cookies: the one surface that ever needed
cookie auth (a browser navigating to an admin SPA) lives internally on
crew-host, where mash handles it natively.

### Sessions

A session is a crew record: `(session_id, user_id, workspace_id, agent_id,
label, timestamps)`. Mash sessions are **implicit and caller-named** — the
caller mints the id and mash threads it through everything — so crew-api is
the single place sessions come into existence, and the session id is the
natural join key between the two systems.

Chat flow:

1. `POST /workspace/{ws}/sessions` → crew-api mints an opaque session id
   and stores the record.
2. `POST .../sessions/{id}/messages` → crew-api authorizes ownership, then
   submits to crew-host over HTTP (`POST /api/v1/hosts/datasquad/request`
   with the service key), attaching the session's workspace as request
   metadata (see "Passing workspace context" below).
3. `GET .../requests/{rid}/events` → crew-api opens the host's SSE stream
   with the service key and re-streams to the browser, applying its own
   payload shaping (trace summaries etc.) as product features, not as
   plumbing.

### Workspaces

A workspace is a crew concept: a named data scope (config directory,
BigQuery dataset binding, artifact root). crew-api owns listing, validation,
and the workspace-scoped route hierarchy. crew-host consumes workspace
identity only through the context channel below.

Workspace *content* is filesystem state used by both services: crew-host
tools write artifacts and read metric/experiment configs; crew-api's command
surface reads configs and serves artifacts. In compose this is a shared
volume; if artifact volume becomes a problem, artifacts move to object
storage behind a crew-api service — an evolution, not a redesign.

### Commands

The `/command` surface (metrics, experiments, artifacts, skills) is pure
crew-api: it reads workspace files and compiles SQL locally, no host
involvement. Workflow operations invoked through the command palette are
just client conveniences over the host's workflow API and go through the
same passthrough as everything else — crew-api holds no workflow logic.

### The `/host/*` passthrough

One generic authenticated forwarder:

```
ANY /host/{path}  →  verify crew token → forward to crew-host/{path}
                     with Authorization: Bearer <MASH_API_KEY>,
                     streaming both directions (SSE included)
```

~30 lines of httpx. No knowledge of payload shapes, no per-route code, so it
cannot drift from mash. This is what the web workflow runner calls
(`/host/api/v1/workflow/...`) and what the CLI's `MashHostClient`/mash shell
drives (`crew-api/host` as its base URL, crew token as its bearer key). If
finer authorization is ever needed (e.g. read-only users), it is expressed
here as path/method policy — still without re-implementing routes.

## Passing workspace context from crew-api to tool calls

Workspace is a crew concept. Mash never learns what it means — it only
delivers it, the way HTTP delivers a request body without reading it.

**The problem, concretely.** Alice has workspaces `marketing_db` and
`sales_db` — each a directory of metric and experiment configs with its own
BigQuery dataset. From a `marketing_db` session she asks: *"what's our
weekly activation rate?"* crew-api authorizes the request and submits it to
crew-host. The data agent calls its tool
`compile_metric_configs_to_sql(metric_names=["activation_rate"])`, and the
tool must open `workspaces/{which?}/metrics/activation_rate.yaml` and query
`{which?}` dataset. Asked from a `sales_db` session, the host receives the
same message and the agent makes the same tool call — but the tool must
read different files and a different dataset. The workspace is known only
to crew-api (it lives on the session record), and nothing in the tool call
carries it. The user never types it, and the model must never choose it: a
prompt-injected "use workspace sales_db" must not work, because workspace
is a data boundary. So the workspace has to travel inside the request, at
the infrastructure level, from crew-api to the tool.

**What mash needs to implement: caller metadata that reaches tools.**

1. The submit API accepts an optional `metadata` JSON object next to
   `message` and `session_id`. Mash treats it as opaque. (This is not the
   existing `context` parameter — that one is prompt text the model sees.
   `metadata` is for code, invisible to the model.)
2. Mash stores it on the request record it already keeps, so a request
   replayed after a crash runs with the same metadata.
3. The engine makes it readable during execution. Mash already does exactly
   this for its own fields — while a request runs, any code inside can call
   `mash.logging.get_session_id()` because the engine binds it around the
   run. Add the same for metadata: `mash.logging.get_request_metadata()`.
4. When a primary agent invokes a subagent, the subagent's request inherits
   the parent's metadata, so tools called during delegation see the same
   context.

This is a small change: the internal plumbing (a `request_metadata` dict
threaded through the engine, with selected fields bound for the duration of
a run) already exists — it just isn't open to callers or readable by tools.

**How crew uses it.**

- crew-api, on every message submit, sends the workspace it already has in
  hand from the authorization step:

  ```
  POST crew-host/api/v1/hosts/datasquad/request
  { "message": "...", "session_id": "...",
    "metadata": { "workspace": "marketing_db" } }
  ```

- crew tools resolve the workspace with one helper:

  ```python
  def current_workspace_id() -> str:
      metadata = mash.logging.get_request_metadata() or {}
      return metadata.get("workspace") or DEFAULT_WORKSPACE
  ```

  The fallback covers requests that don't come from crew-api (masher
  workflow runs, ad-hoc mash tooling) and tools run locally by the CLI.

- crew-host carries no workspace state and asks no one: the answer is in
  the request it is already executing.

**Alternatives rejected.**

- **Workspace as a tool parameter the model fills in.** Puts a data
  boundary under model control; prompt injection could redirect a session
  to another workspace.
- **crew-host asks crew-api (or reads its database) which workspace a
  session belongs to.** Creates a call cycle between the two services and
  adds a network dependency to every tool call, to learn something the
  request could simply carry.
- **One host process per workspace.** Turns a lightweight data scope into a
  deployment unit; N workspaces would mean N processes.

Workflows don't need any of this: crew-authored pipelines declare
`workspace_id` as a field of their typed `workflow_input`, so it arrives
validated and recorded per run.

## Data and storage

- **crew db** (users, sessions, workspaces metadata) and **mash runtime db**
  (traces, runs, durable state) are separate databases — one Postgres
  instance in compose, two logical databases, no cross-schema reads. The
  session id is the only join key, and it only ever joins in crew-api.
- **Workspace volume** shared between the two containers (read/write for
  crew-host tools, read for crew-api commands and artifact serving).

## Operations

- Healthchecks: crew-api `GET /health` (public, unauthenticated); crew-host
  `GET /api/v1/health` (internal; mash serves it).
- Restart independence: deploying crew-api does not kill in-flight agent
  runs; crew-host restarts surface as a 502 from the passthrough and a
  dropped SSE stream, which clients handle with reconnect-and-poll.
- Scaling: crew-api is stateless (tokens are HMAC, no session affinity) and
  scales horizontally. crew-host scales as mash prescribes (DBOS-durable
  runtime); crew-api reaches it through one internal URL either way.

## Phased implementation plan

This plan cuts over from the current single-process beta without preserving
its accidental coupling as a permanent compatibility layer. Each phase has a
testable exit gate and a deletion list. Temporary bridges must be removed in
the phase that makes them obsolete, rather than left for a later cleanup.

### Cutover invariants

- Product chat always enters through the workspace/session routes on
  crew-api. Those routes authorize ownership and attach trusted workspace
  metadata before forwarding the request.
- `/host/*` is a raw Mash capability passthrough, not a product-chat submit
  path. In particular, a client using the Mash shell through `/host` is doing
  ad-hoc Mash work with the default workspace; it is not resuming an owned
  Crew session. `crew repl` must use the Crew session/message API.
- Only crew-api is public. crew-host is addressable only on the private
  service network and requires `MASH_API_KEY` even there.
- Only crew-host opens the Mash runtime database. Only crew-api opens the Crew
  application database. Neither service imports the other's store or reads
  the other's tables.
- Workspace identity is selected by crew-api, never by the model. Agent and
  subagent tools read it from `mash.logging.get_request_metadata()`.
- There is exactly one active runtime for a given Mash runtime database during
  the cutover. We do not shadow-submit user requests to two hosts.
- Operator surfaces (`/admin`, `/telemetry`, Mash docs) stay on crew-host and
  are never mounted or forwarded by crew-api.

### Phase 0 — Pin Mash 0.18 and freeze the boundary

Land the dependency upgrade and establish contract tests before changing the
process topology.

- Require `mashpy>=0.18.0` and regenerate `uv.lock`.
- Add a focused contract test proving that caller metadata:
  - is accepted by `AgentPool.submit_host_request()` and the HTTP host-submit
    endpoint;
  - is visible to a primary agent tool through
    `mash.logging.get_request_metadata()`; and
  - survives primary-to-subagent delegation.
- Record the service contract in configuration:
  - `CREW_DATABASE_URL`: Crew users, sessions, and workspace records;
  - `MASH_DATABASE_URL`: Mash runtime, workflow, trace, memory, and telemetry
    data;
  - `CREW_HOST_URL`: internal crew-host origin, with no `/host` suffix; and
  - `MASH_API_KEY`: service credential shared only by crew-api and crew-host.
- Add an HTTP contract fixture that runs Mash's stock app as an external ASGI
  target. Subsequent crew-api tests should exercise HTTP requests and streams
  against this fixture rather than reaching into `AgentPool` internals.

Exit gate: the lock resolves Mash 0.18, the metadata contract passes for both
primary and delegated tool calls, and the external-host fixture can pass a
healthcheck and stream a request to completion.

### Phase 1 — Replace the workspace bridge with caller metadata

Make workspace propagation correct while the system is still one process.
This isolates the semantic change from the deployment change.

- In `send_message`, pass `metadata={"workspace": workspace_id}` directly to
  `submit_host_request`.
- Change `current_workspace_id()` to resolve in this order:
  1. validated `workspace` from `get_request_metadata()`;
  2. the explicit `bound_workspace()` override used by local command code;
  3. the locally selected CLI workspace; and
  4. `DEFAULT_WORKSPACE_NAME`.
- Treat malformed or unknown request metadata as an execution error, not as a
  silent fallback. The fallback is only for absent metadata on intentional
  ad-hoc/local calls; an explicitly supplied invalid workspace must not widen
  access.
- Add tests for two concurrent sessions in different workspaces and for a
  delegated tool call. They must resolve independently with no process-global
  registry state.

Delete in this phase:

- `_request_workspace_registry` and `register_request_workspace()`;
- the `get_request_id()` lookup used only by that registry;
- the `AgentPool.submit_host_request` monkey-patch in `beta/app.py`; and
- registry-oriented tests and comments.

Exit gate: all hosted tool calls resolve workspace solely from Mash caller
metadata, concurrent requests cannot cross workspaces, and no request-id to
workspace map remains in Crew.

### Phase 2 — Separate ownership and persistence before separating processes

Run the current application briefly with two logical databases. This proves
the data boundary without introducing network failure modes at the same time.

- Provision `crew_app` and `mash_runtime` databases in the same Postgres
  instance. Use distinct database users if deployment tooling permits it.
- Keep the existing Mash-owned database as `mash_runtime` so durable requests,
  traces, memories, and workflow runs remain intact. Copy only the Crew-owned
  `users`, `sessions`, and workspace metadata tables into `crew_app`.
- Stop seeding `MASH_DATABASE_URL` from `CREW_DATABASE_URL` in `build_pool()`.
  Both settings become explicit and startup fails fast if either required
  value is absent.
- Replace `BetaStore._ensure_schema()` as a migration mechanism with versioned,
  idempotent Crew migrations. In particular, remove the startup-time
  `DROP TABLE IF EXISTS` cleanup for obsolete workflow tables; perform that
  removal once in a named migration after a backup.
- Verify that session joins are done in crew-api using the shared session id,
  never with a cross-database query.

Exit gate: the monolith passes its full suite while its Crew store and Mash
runtime use different database URLs, and database-role tests show that each
side lacks permission to read the other's database.

### Phase 3 — Create the standalone crew-host

Extract the runtime as a stock Mash deployment with no Crew API lifecycle or
authentication code around it.

- Add a small crew-host entrypoint that builds the pool, defines `datasquad`,
  and calls `run_host(pool, config=MashHostConfig(...))`.
- Make host composition deterministic at startup. `datasquad` and any
  crew-authored workflows are code-shipped host configuration; crew-host must
  not depend on `~/.crew/hosts.json` or a CLI publish step to become ready.
- Configure the stock Mash app with `MASH_DATABASE_URL`, `MASH_API_KEY`, and an
  internal bind address. Do not mount it under a Crew app or manually enter
  its lifespan.
- Build a dedicated crew-host container command. Mount the workspace volume
  read/write and expose no public host port in production Compose. A dev-only
  profile may publish a loopback port for operator access.
- Keep `/admin`, `/telemetry`, `/docs`, and `/api/v1/health` exactly as Mash
  serves them. Validate Mash API-key and admin-cookie behavior directly.

Delete from the host side in this phase:

- `BetaStore` and Crew token/auth imports;
- `shared.runtime_context` bindings (and the module if no domain service still
  uses it);
- `MashMountAuth`, the root and `/host` mounts, manual Mash lifespan handling,
  and `mash_api_app` state; and
- any operator-UI cookie plumbing owned by Crew.

Exit gate: crew-host starts independently, reports healthy, serves the stock
Mash API and operator UIs with its service key, executes a `datasquad` request
with workspace metadata, and continues running while crew-api is stopped.

### Phase 4 — Turn crew-api into an HTTP client

Replace every in-process runtime call with a narrow internal client, then add
the one generic public passthrough.

- Make `BetaAppState` own only the Crew store, Crew config, and a reusable
  `httpx.AsyncClient` configured with `CREW_HOST_URL` and `MASH_API_KEY`.
- Convert the product session routes as follows:
  - message submit: authorize the Crew session, POST to
    `/api/v1/hosts/datasquad/request`, and attach workspace metadata;
  - request events: open the Mash SSE endpoint with the service key and
    re-stream it while retaining Crew's product event normalization;
  - interaction responses, history, signals, search, trace detail, and
    compaction: call the corresponding stock Mash endpoints after Crew
    ownership checks; and
  - session list/detail enrichment: join Crew records with Mash responses in
    crew-api, tolerating a temporarily unavailable host without losing the
    Crew session record.
- Preserve Mash status codes and structured error payloads where possible;
  translate connect failures and timeouts to a stable `502 MASH_PROXY_ERROR`.
  Use separate connect, ordinary response, and streaming-idle timeouts.
- Implement `ANY /host/{path:path}` as a streaming reverse proxy. Strip the
  caller's authorization and hop-by-hop headers, inject the service key,
  preserve method/query/body/status/content headers, and stream in both
  directions without buffering SSE.
- Add an explicit path/method policy at the passthrough boundary. Start with
  the Mash capability required by the web workflow runner and CLI
  browse/compose/workflow commands; do not accidentally expose operator UI
  paths. Product authorization must not depend on Mash understanding Crew
  tokens.
- Change the web workflow client from root `/api/v1/workflow/...` URLs to
  `/host/api/v1/workflow/...`. Keep workflow schemas and response payloads
  owned by Mash; Crew adds no workflow serializers.
- Change `crew repl` to submit messages, interactions, and event streams
  through `BetaClient`. Reuse the shell rendering/input components where
  practical, but do not let `MashRemoteShell` bypass Crew ownership and
  workspace injection. Reserve `mash connect` through `/host` for explicitly
  ad-hoc Mash operations.
- Convert workflow command-palette operations from direct
  `get_workflow_service()` calls to the same internal HTTP client or return the
  Mash passthrough URL to the caller. Keep no second workflow implementation.

Delete in this phase:

- all `_beta_state(request).host`, `_data_agent()`, and `_data_client()` use;
- internal `ASGITransport` calls to the mounted Mash app;
- workflow-session id parsing and task-to-agent inference used to reach
  in-process traces;
- the root Mash mount and the browser `crew_token` cookie; and
- documentation that describes the BFF as the host process.

Exit gate: a test configuration in which crew-api has no `AgentPool` can run
the complete web and CLI product flows through crew-host, including SSE,
interaction responses, workflow runs, and primary-to-subagent workspace
propagation. Restarting crew-api does not interrupt an in-flight host run.

### Phase 5 — Deploy and cut traffic over

Perform a single controlled production cutover after the remote-mode suite is
green; do not maintain embedded and remote execution modes indefinitely.

1. Back up both logical databases and record the currently deployed image
   digests.
2. Apply the Crew database migration and verify row counts plus sampled
   session ownership records.
3. Start crew-host against `mash_runtime`; wait for Mash health, registered
   agents, `datasquad`, workflows, and a metadata-bearing smoke request.
4. Start crew-api against `crew_app` and the internal host URL. Its readiness
   check must verify its own store and a bounded crew-host health request;
   liveness must remain local so a host outage does not restart crew-api.
5. Run smoke tests through the public origin: login, create/resume session in
   two workspaces, delegated tool call, SSE reconnect, interaction response,
   workflow list/run/status, artifact serving, and CLI login/repl.
6. Route web and CLI traffic to the new crew-api deployment. Leave the old
   monolith stopped so it cannot compete for the Mash runtime database.
7. Observe request error rate, stream disconnects, queue depth, workflow
   completion, and workspace-resolution errors through at least one normal
   operating window before removing the old deployment artifacts.

Rollback is image-and-routing based, not a permanent code switch: stop the new
services before restarting the old monolith, restore the pre-cutover database
snapshot if the new host accepted writes that the old runtime cannot safely
consume, and rerun the smoke suite. No two runtimes may point at the same
runtime database concurrently.

Exit gate: all product traffic uses crew-api, all execution occurs on
crew-host, and independent restart tests pass in the deployed environment.

### Phase 6 — Remove the monolith and harden the boundary

Finish the redesign by deleting the scaffolding that made the old topology
possible and by enforcing the new topology in CI.

- Split or parameterize the image so crew-api does not install/import agent
  runtime code and crew-host does not install/import Crew auth/store routes.
- Update Compose to contain `crew-api` and `crew-host`, with only crew-api
  published; give crew-api a read-only workspace mount and crew-host a
  read/write mount.
- Remove the old `crew` service, embedded-host factory, duplicate root workflow
  exposure, stale healthchecks, and obsolete environment aliases.
- Remove client-side host composition as a prerequisite for `datasquad`.
  If `crew compose` remains as an operator feature, label and authorize it as
  such; it must not be part of ordinary user setup.
- Reduce `BetaStore` to application-owned tables and operations. Remove old
  authored-workflow/task schema remnants and tests permanently.
- Add architecture tests that fail if crew-api imports `mash.runtime`, creates
  an `AgentPool`, mounts a Mash ASGI app, or connects to `MASH_DATABASE_URL`,
  and if crew-host imports `crew.beta` or reads `CREW_DATABASE_URL`.
- Add security tests for service-key replacement, stripped caller credentials,
  passthrough allow/deny policy, cross-user session access, invalid workspace
  metadata, and prompt attempts to select another workspace.
- Update README, contributing instructions, deployment examples, diagrams,
  ports, and operator runbooks only after they describe the two-service system
  exclusively.

Exit gate: searches for the deleted bridge/mount symbols return no production
code, each service can be built and tested independently, and the architecture
tests make a return to in-process coupling a deliberate change rather than an
accident.

### Final debt-removal checklist

The redesign is complete only when all of these are gone:

- request-id-to-workspace registries and submit monkey-patches;
- a Crew `ContextVar` as the hosted-request workspace transport;
- Mash app mounts, duplicate `/api/v1` exposure, and `MashMountAuth`;
- Crew-token cookies created only to navigate Mash operator UIs;
- direct `AgentPool`, agent runtime, workflow service, memory store, or Mash
  event-store access from crew-api;
- `ASGITransport` calls used as an in-process service boundary;
- one database URL or database role shared by both services;
- startup-time destructive schema cleanup;
- product `crew repl` submissions through the raw Mash passthrough; and
- docs/tests that call the combined process a BFF or rely on it hosting agents.
