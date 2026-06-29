# Contributing to Crew

This guide covers local development, running the host with Docker Compose,
extending crew with workspaces and agents, and releasing the CLI binary and
Docker image. For day-to-day usage, see [README.md](README.md).

## Local Development

This is the loop for working on the agents, the CLI, the metrics/experiment
layers, or the beta backend: run the host from source so code changes don't
need an image rebuild.

### Prerequisites

- [uv](https://docs.astral.sh/uv/) (manages Python and the venv)
- Docker (for Postgres)
- An Anthropic API key and a DBOS conductor key
- Node.js 20+ and `npm` (only for the beta web app)
- BigQuery access (optional, for the data agent's query tools)

### Setup

```bash
cd mash-crew
uv sync --extra dev                  # create the venv (with pytest, pyinstaller)
docker compose up -d db              # Postgres only, published on 127.0.0.1:5434
cp .env.example .env
```

In `.env`, set `ANTHROPIC_API_KEY` (`DBOS_CONDUCTOR_KEY` is optional — see
below). The `CREW_DATABASE_URL` line already points at the compose Postgres
(`postgresql://mash:mash@127.0.0.1:5434/mash_crew`). It is forwarded to the
Mash runtime as `MASH_DATABASE_URL` at startup.

Notes on configuration:

- **Do not quote values** in `.env` — `python-dotenv` treats quotes as
  literal characters.
- Precedence is **shell env > per-agent `.env` > project `.env`**. Per-agent
  files live at `src/crew/agents/<id>/.env` and are useful for giving `data`
  and `pm` different models or keys locally. Keep shared runtime settings
  (database, DBOS key) at the project or shell level, not in agent files.
- `MASH_DATA_DIR` defaults to `<repo>/.mash` in a checkout for local runtime
  state.

### Run the crew process (BFF)

The BFF is the single host process: it hosts the agents in-process, serves the
web/CLI API, and mounts the raw Mash host API under `/host`. The CLI is a
client of it, so run the BFF (not a bare `mash host serve`) for the CLI to
work. Set the beta access-control variables (in your shell or `.env`):

```bash
CREW_BETA_ALLOWED_USERS=alice,bob
CREW_BETA_AUTH_SECRET=replace_me_for_local_beta
CREW_BETA_TOKEN_TTL_SECONDS=604800
CREW_BETA_CORS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

```bash
uv run uvicorn crew.beta:build_beta_app --factory --reload --port 8003
```

Then, in another terminal, log in and chat:

```bash
crew login alice --api-base-url http://127.0.0.1:8003
crew browse      # browse available agents in the pool
crew workspace <list|show|set|unset> # manage available workspaces
crew --workspace <workspace_name> repl  # enter the repl for a workspace. session is shared with the web UI; 
crew --workspace <workspace_name> sessions # list all active sessions in the workspace
```

### Tests

```bash
uv run --extra dev python -m pytest
```

## Web App

The Next.js frontend lives under `web/` and talks to the crew process (the
BFF) above — there is no separate host to run. Point it at the BFF and start
it:

```bash
echo 'NEXT_PUBLIC_CREW_API_BASE_URL=http://127.0.0.1:8003' > web/.env.local
cd web && npm install && npm run dev
```

The app runs at [http://127.0.0.1:3000](http://127.0.0.1:3000). Log in with a
username from `CREW_BETA_ALLOWED_USERS`; sessions are shared with the CLI.

## The Docker Image

One image (`ghcr.io/imsid/crew`), two servers, selected by
`CREW_SERVE_MODE`:

- **`beta`** — the `crew.beta` FastAPI BFF. It hosts the agents in-process,
  serves the auth/session/workflow routes the web UI and the `crew` CLI use,
  and mounts the raw Mash host API (and telemetry UI) under `/host`. This is
  the README quick start and the mode the `crew` CLI talks to.
- **`host`** (default) — just the Mash host API over `crew.app:build_pool`
  with the telemetry UI at `/telemetry`, for stock `mash` tooling. No auth,
  web UI, or `/host` mount.

It is also dual-mode for the database, selected by whether a database URL is
provided (`MASH_DATABASE_URL` or `CREW_DATABASE_URL`) in
`docker-entrypoint.sh`:

- **unset** — single-container mode: the entrypoint initializes and starts an
  embedded Postgres on the data volume (`$CREW_DATA_DIR/pg`), then runs.
- **set** — external-database mode: the embedded Postgres is skipped entirely
  and the server connects to yours.

The entrypoint keeps `MASH_DATABASE_URL` (read by the runtime) and
`CREW_DATABASE_URL` (read by the beta BFF) in sync, so you only need to set
one. Either server still needs `ANTHROPIC_API_KEY` in the environment (via
`env_file: .env`); the runtime fails to start without it. `DBOS_CONDUCTOR_KEY`
is optional — the durable runtime self-hosts against Postgres and starts fine
without it; set it only to connect to DBOS Conductor for cloud observability.
The beta server additionally reads the `CREW_BETA_*` variables.

`docker compose up -d` runs the host in external-database mode locally: one
Postgres container plus the crew host built from source (`cp .env.example
.env` first). The beta BFF is a second service behind a compose profile —
bring it up on port 8001 (same image, `CREW_SERVE_MODE=beta`) with:

```bash
docker compose --profile beta up -d
```

To run the beta server standalone from the image:

```bash
docker run -d --name crew-beta -p 8001:8000 \
  -e CREW_SERVE_MODE=beta \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e CREW_BETA_ALLOWED_USERS=alice -e CREW_BETA_AUTH_SECRET=... \
  -v crew-data:/var/lib/crew \
  ghcr.io/imsid/crew:latest
```

The Next.js frontend under `web/` is deployed separately (e.g. Vercel or any
static host) and points `NEXT_PUBLIC_CREW_API_BASE_URL` at the beta server.

BigQuery in a container: mount the service-account JSON and point
`GOOGLE_APPLICATION_CREDENTIALS` at the mounted path, alongside
`BIGQUERY_PROJECT_ID` and `BIGQUERY_MCP_URL`. Without them the data agent
still registers and reports itself unconfigured.

`GET /health` (beta) and `GET /host/api/v1/health` (mounted Mash API) report
readiness, useful as probes behind a reverse proxy or orchestrator.

## Adding a Workspace

Workspace content lives under `src/crew/workspace/<name>/` (metrics-layer
configs, experiment configs, artifacts). Add a directory there, then ship its
files as package data: the relevant globs are already declared under
`[tool.setuptools.package-data]` in `pyproject.toml`, so matching files are
included in the wheel and the Docker `pip install .`. Select it at runtime
with `crew workspace set <name>` (persisted to `~/.crew/config.json`); the
default is `marketing_db`.

## Hosts and Composition

The pool ships flat — `build_pool()` defines no hosts. Hosts are
configuration, composed over the pool dynamically:

- `crew browse` lists the pool, attachable workflows, and your configured
  hosts.
- `crew compose <id> --primary <agent> [--subagents a,b] [--workflows w]`
  defines-or-replaces a host on the deployment (idempotent `PUT
  /v1/hosts/{id}`) and saves it to the CLI host config file.
- `crew hosts` lists the configured hosts. `crew repl` chats through the
  default `datasquad` host (authenticated, via the BFF); to enter another
  composed host ad hoc, use stock `mash repl --host <id>` against the mounted
  `/host` API.

The CLI host config file is `~/.crew/hosts.json` (`crew/cli/hosts_store.py`),
seeded with the `datasquad` composition (data primary, pm subagent) on first
use. It is stdlib-only so it can be imported by the standalone CLI binary
without the server stack.

The BFF auto-routes chat to `datasquad`, so it calls `define_default_host()`
(`crew/app.py`) at startup to ensure that host exists on its pool before
routing. `DEFAULT_HOST_ID` is the shared constant.

## Adding an Agent

To add an agent to the pool:

1. **Create the spec package** under `src/crew/agents/<name>/` with a
   `spec.py` implementing a Mash `AgentSpec` (tools, LLM, system prompt,
   config) and a `build_subagent_metadata()` returning an `AgentMetadata`.
   The `pm` agent is the smallest complete example; `data` shows the MCP and
   skills patterns.
2. **Write the metadata carefully.** `AgentMetadata` is both the `crew
   browse` listing and the delegation directory a primary reads when your
   agent serves as a subagent — vague `usage_guidance` produces vague
   routing.
3. **Register it in the pool.** In `crew/app.py` `build_pool()`, add a
   `.agent(<spec>, metadata=<spec>.build_subagent_metadata())` call. It is now
   browsable (`crew browse`) and composable into hosts (`crew compose`). To
   put it in the default composition, add it to `define_default_host()` and
   the `DEFAULT_HOSTS` seed in `crew/cli/hosts_store.py`.
4. **Degrade gracefully.** If the agent needs credentials, register it
   unconditionally and gate the capability — e.g. return `[]` from
   `build_mcp_servers()` when unconfigured (see `data`).
5. **Ship data files as package data** by adding globs to
   `[tool.setuptools.package-data]` in `pyproject.toml`.

## Releasing the CLI Binary and Image

Tag a version to build and publish both the standalone CLI binary and the
Docker image:

```bash
git tag v0.1.0
git push origin v0.1.0
```

- `release.yml` builds `crew` binaries for macOS (arm64) and Linux (x86_64)
  with PyInstaller and uploads them to a GitHub Release. The build uses
  `--collect-all crew` so the package data the local-inspection commands read
  (skills, metrics/experiment schema YAML, workspace fixtures) is bundled
  into the binary.
- `docker.yml` publishes the multi-arch (amd64 + arm64) image to
  `ghcr.io/imsid/crew` tagged `latest` and the version.

One-time setup: after the first image push, set the GHCR package to public in
the repo's package settings so `docker run` works without authentication.

The install script (`install.sh`) always fetches the latest release:

```bash
curl -fsSL https://raw.githubusercontent.com/imsid/crew/main/install.sh | sh
```

`workflow_dispatch` on either workflow builds without releasing, as a
pipeline check.

## Architecture

Crew is a Mash application: a flat agent pool with hosts composed dynamically
over it.

- `src/crew/app.py` — `build_pool()`: registers the `data` and `pm` agents as
  a flat pool and enables the masher (no hosts). `define_default_host()`
  composes the `datasquad` host on a pool; `DEFAULT_HOST_ID` is the shared
  constant.
- `src/crew/agents/` — agent specs, prompts, skills, and metadata.
- `src/crew/metrics_layer/`, `experimentation/`, `artifacts/`, `workflow/` —
  the domain services the data agent's tools and the CLI's command mode call.
- `src/crew/cli/` — the CLI. `repl`/`sessions` are authenticated clients of
  the BFF (`beta_client.py`, with the token in `auth_store.py` →
  `~/.crew/auth.json`); `browse`/`compose`/`hosts`/`workflow` use the Mash API
  the BFF mounts at `/host`; `metrics`/`experiment`/`artifact`/`workspace` are
  local inspection. `hosts_store.py` is the `~/.crew/hosts.json` composition
  config.
- `src/crew/beta/` — the FastAPI BFF: the single host process. It builds the
  pool, calls `define_default_host()`, serves the user-scoped session API, and
  mounts the Mash host API at `/host` so the CLI and stock `mash` tooling
  share the same in-process host.
- `src/crew/workspace/` — packaged workspaces such as `marketing_db`.
- `web/` — the Next.js frontend.

The CLI and the web UI are both clients of the BFF, authenticated as the same
user, so sessions live once in the BFF tables and show up in both. `crew repl`
chats through the `datasquad` host (`POST /v1/hosts/datasquad/request`), which
gives the `data` primary an `InvokeSubagent` tool over `pm`. To drive another
composed host ad hoc, point stock `mash repl --host <id>` at the mounted
`/host` API. See the [mashpy docs](https://github.com/imsid/mashpy) for
framework details.
