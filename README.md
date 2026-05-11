---
title: crew README
doc_type: setup-guide
status: current
audience: developers
---

# crew

`crew` is a local agent workspace built on top of `mash`.
It currently runs a data-first host where:

- `data` is the primary agent for analytics, metrics, and evidence gathering
- `pm` is a supporting subagent for product framing, prioritization, and trade-off analysis
- `masher` is a built-in diagnosis subagent for trace and runtime event analysis

For a higher-level product overview, see [docs/product.md](docs/product.md).

The packaged default workspace is `marketing_db`. Workspace content lives under
`src/crew/workspace/<name>/...`, while local agent state lives under `<repo>/.mash`
when running from a checkout. Hosted runtime durability, SSE replay, observability,
and Masher trace inspection are backed by the runtime Postgres store configured with
`MASH_RUNTIME_DATABASE_URL`. Agent memory uses Postgres when
`MASH_MEMORY_DATABASE_URL` is set.

## What Crew Includes

- `metrics_layer`: semantic metric and source definitions plus SQL compilation
- `experimentation`: deterministic experiment contracts and SQL planning
- `artifacts`: reusable Markdown or HTML outputs created from agent conversations
- `crew` CLI: the main interface for conversational work, metrics commands, and artifact commands
- Mash host runtime: the execution engine that powers the local agent host

## Local Development Setup

### Prerequisites

- Python 3.10+
- [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+ and `npm` for the beta web app
- Postgres for the hosted runtime and agent memory store
- an Anthropic API key
- BigQuery access for the data agent

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd mash-crew
```

### 2. Install dependencies

```bash
uv sync --extra dev
source .venv/bin/activate
```

Activating `.venv` puts the local `crew` and `mash` entrypoints on your `PATH` for the current shell.

### 3. Configure hosted runtime environment

`crew.app:build_host` currently loads the `data` and `pm` agent environments.
Shell environment variables take precedence over agent `.env` files.

Create a project-level `.env` with the hosted runtime settings:

```bash
MASH_RUNTIME_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/mash_runtime
MASH_MEMORY_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/mash_memory
DBOS_CONDUCTOR_KEY=your_dbos_conductor_key
```

Field notes:

- `MASH_RUNTIME_DATABASE_URL`: required for hosted runtime durability, SSE replay, observability, and Masher trace reads
- `MASH_MEMORY_DATABASE_URL`: required if you want Crew agent memory to use `PostgresMemoryStore`; when unset, Mash falls back to local SQLite files under `MASH_DATA_DIR`
- `DBOS_CONDUCTOR_KEY`: required whenever the hosted Mash runtime starts
- Postgres must be reachable from the host process before starting `mash host serve` or the beta BFF
- keep these at the project or shell level, not in per-agent `.env` files

### 4. Configure agent-specific environment

Create `src/crew/agents/data/.env` with:

```bash
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
BIGQUERY_PROJECT_ID=your_gcp_project_id
BIGQUERY_MCP_URL=https://bigquery.googleapis.com/mcp
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
```

Field notes:

- `ANTHROPIC_API_KEY`: required
- `ANTHROPIC_MODEL`: optional, defaults to `claude-haiku-4-5-20251001`
- `BIGQUERY_PROJECT_ID`: required for the current data-agent workflow
- `BIGQUERY_MCP_URL`: optional, defaults to `https://bigquery.googleapis.com/mcp`
- `GOOGLE_APPLICATION_CREDENTIALS`: required for the standard local service-account setup
- `GOOGLE_CLOUD_PROJECT`: recommended for local ADC / Google client resolution

Create `src/crew/agents/pm/.env` with:

```bash
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

Field notes:

- `ANTHROPIC_API_KEY`: required
- `ANTHROPIC_MODEL`: optional, defaults to `claude-haiku-4-5-20251001`

### 5. Start the local host

`crew` uses Mash as its host runtime. Start the host with:

```bash
mash host serve --host-app crew.app:build_host
```

By default, local agent state is stored under `<repo>/.mash` when running from a checkout.
If `MASH_MEMORY_DATABASE_URL` is set, agent memory is stored in Postgres instead of those
local SQLite files. Set `MASH_DATA_DIR` explicitly if you want to override the local fallback
location.

### 6. Connect once

Save the local host URL and default agent:

```bash
mash connect --api-base-url http://127.0.0.1:8000 --agent data
```

After this, `crew agent ...` commands can reuse the saved connection.

## Beta Web App

The beta web app uses a FastAPI BFF under `crew.beta`.
Unlike the CLI flow above, the beta BFF starts the Crew host internally, so you do **not**
need to run `mash host serve` separately for the web app.

### Beta-specific environment

Set the beta access controls in your shell or project `.env`:

```bash
CREW_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/crew_beta
CREW_BETA_ALLOWED_USERS=alice,bob
CREW_BETA_AUTH_SECRET=replace_me_for_local_beta
```

Optional beta settings:

```bash
CREW_BETA_TOKEN_TTL_SECONDS=604800
CREW_BETA_CORS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

Field notes:

- `CREW_DATABASE_URL`: required Postgres connection string for beta users and session ownership
- `CREW_BETA_ALLOWED_USERS`: required comma-separated list or JSON array of allowed handles
- `CREW_BETA_AUTH_SECRET`: recommended dedicated secret for beta auth signing
- `CREW_BETA_TOKEN_TTL_SECONDS`: optional auth token TTL; defaults to 7 days
- `CREW_BETA_CORS_ALLOWED_ORIGINS`: optional comma-separated list or JSON array of allowed web origins; defaults to `http://127.0.0.1:3000,http://localhost:3000`
- Postgres must be reachable before starting the beta BFF

The existing hosted runtime and agent env vars from the setup steps above are still required because
the beta BFF builds the same `data` and `pm` runtime under the hood.

### Start the FastAPI beta BFF

From the repo root:

```bash
uv run uvicorn crew.beta:build_beta_app --factory --reload --port 8000
```

This starts the beta FastAPI backend at `http://127.0.0.1:8000`.

### Start the beta web app

The beta web app now uses `Next.js` App Router with Tailwind, shadcn-style UI
primitives, `assistant-ui` for chat, `react-markdown` for Markdown artifact rendering,
and sandboxed iframes for HTML artifacts.

Install the frontend dependencies once:

```bash
cd web
npm install
```

Create `web/.env.local` with the required backend URL:

```bash
NEXT_PUBLIC_CREW_API_BASE_URL=http://127.0.0.1:8000
```

This should be the origin of the Crew Beta FastAPI BFF.
For local development, use `http://127.0.0.1:8000`.
For a deployed environment, use that deployed backend origin instead.

Then start the Next.js dev server:

```bash
npm run dev
```

By default the web app runs at `http://127.0.0.1:3000`.

### Beta app flow

1. Start the FastAPI beta BFF.
2. Start the Next.js web app from `web/`.
3. Open `http://127.0.0.1:3000`.
4. Log in with one of the handles from `CREW_BETA_ALLOWED_USERS`.
5. Open Chat, Metrics, Experiments, or Artifacts from the left sidebar.

## Using The Crew CLI

### Agent mode

Use agent mode for free-form questions and conversational workflows:

```bash
crew agent repl --agent data
crew agent invoke --agent data "What changed in activation over the last 4 weeks?"
```

`crew agent invoke` submits an async hosted runtime request and waits for the terminal SSE event before printing the final response.

### Command mode

Use command mode for direct deterministic operations against the selected workspace.
If you do not pass `--workspace`, `crew` defaults to `marketing_db`:

```bash
crew metrics list
crew metrics show --kind metric --name spend_total
crew metrics compile --metric spend_total --dimension campaign_id

crew experiment list
crew experiment show --name signup_checkout_test
crew experiment plan --name signup_checkout_test

crew artifact list
crew artifact show launch_readout_q2
crew artifact search "launch readiness"
```

### Switching workspaces

Use the global `--workspace` flag to run a command against a different workspace:

```bash
crew --workspace marketing_db version
crew --workspace marketing_db artifact list
crew --workspace marketing_db metrics list
crew --workspace marketing_db experiment list
```

In a local checkout, `crew` resolves workspaces under:

```bash
src/crew/workspace/
```

For example, if you add a workspace at `src/crew/workspace/my_new_workspace`, you can
target it directly with:

```bash
crew --workspace my_new_workspace metrics list
```

To make a workspace the default for your current shell session, set `CREW_WORKSPACE`:

```bash
export CREW_WORKSPACE=my_new_workspace
crew version
crew metrics list
```

Unset or change `CREW_WORKSPACE` to switch back.

## Artifact Workflow

Artifacts are created inside an agent conversation, not through a separate CLI mutation command.

Typical flow:

```bash
crew agent repl --agent data
```

Then ask the agent to:

- `create an artifact from this session`
- `turn this analysis into an artifact`
- `find the artifact about activation experiments`

Artifact files live under `workspace/<name>/artifacts/`.
They are reusable Markdown or HTML outputs that teams can search, read, and reference later.

## Internal Modules

- `crew.app`: host entrypoint with `build_host()`
- `crew.metrics_layer`: semantic metric definitions and SQL compilation
- `crew.experimentation`: experiment configs, deterministic SQL planning, and stats helpers
- `crew.artifacts`: artifact schema, deterministic CRUD/search services, and agent tools
- `crew.skills`: shared skills available to crew agents, including `create-artifact`
- `crew.cli`: CLI for agent mode plus metrics and artifact command mode
