---
title: crew README
doc_type: setup-guide
status: current
audience: developers
---

# crew

`crew` is a local agent workspace built on top of `mash`.
It is currently organized around a primary data agent plus a supporting
product subagent:

- `data`: primary agent for analytics, metrics, experiments, artifacts, and workflows on top of BigQuery
- `pm`: supporting subagent for product framing, prioritization, and trade-off analysis

The packaged default workspace is `marketing_db`. Workspace content lives under
`src/crew/workspace/<name>/...`. In a local checkout, runtime state defaults to
`<repo>/.mash` unless you point memory or runtime persistence at Postgres.

For the product-level overview, see [docs/product.md](docs/product.md). For
agent-specific details, jump to [Documentation Map](#documentation-map).

## What Is In This Repo?

```text
src/crew/app.py              Host entrypoint via crew.app:build_host
src/crew/metrics_layer/      Semantic metrics and SQL compilation
src/crew/experimentation/    Experiment configs, planning, and analysis helpers
src/crew/artifacts/          Durable Markdown and HTML artifact services
src/crew/workflow/           Workflow validation, publishing, and registration
src/crew/workspace/          Packaged workspaces such as marketing_db
src/crew/agents/             Agent specs, prompts, skills, and subagent wiring
web/                         Beta Next.js frontend
docs/                        Product and design docs
```

## Quick Start

Create and activate the local environment:

```bash
uv sync --extra dev
source .venv/bin/activate
```

Configure the host runtime in a project-level `.env`:

```bash
CREW_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/crew_db
DBOS_CONDUCTOR_KEY=your_dbos_conductor_key
```

Configure the `data` agent in `src/crew/agents/data/.env`:

```bash
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
BIGQUERY_PROJECT_ID=your_gcp_project_id
BIGQUERY_MCP_URL=https://bigquery.googleapis.com/mcp
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your_gcp_project_id
```

Configure the `pm` agent in `src/crew/agents/pm/.env`:

```bash
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
```

Start the local host:

```bash
mash host serve --host-app crew.app:build_host
```

Save the connection once:

```bash
mash connect --api-base-url http://127.0.0.1:8000 --agent data
```

After that, use either [Crew CLI](#crew-cli) or [Beta Web App](#beta-web-app).

## Runtime Notes

- `CREW_DATABASE_URL` is the shared Postgres database used by the beta backend,
  agent runtime, and all persisted state. It is automatically forwarded to the
  underlying Mash runtime (`MASH_DATABASE_URL`) at startup.
- `MASH_DATA_DIR` still defaults to `<repo>/.mash` in a checkout for local
  runtime state unless you override it explicitly.
- `DBOS_CONDUCTOR_KEY` is required whenever the hosted Mash runtime starts.
- Shell environment variables take precedence over per-agent `.env` files.
- Keep shared runtime settings at the project or shell level, not inside agent
  `.env` files.

## Crew CLI

Use agent mode for free-form questions. In practice, most users should start
with `data`:

```bash
crew agent repl
>>  "what metrics are available in the metrics layer?"
```

Use command mode for deterministic inspection:

```bash
crew metrics list
crew metrics show --kind metric --name spend_total
crew metrics compile --metric spend_total --dimension campaign_id
crew metrics chart --metric spend_total --date-dimension start_date --grain day

crew experiment list
crew experiment show --name signup_checkout_test
crew experiment plan --name signup_checkout_test
crew experiment analyze --name signup_checkout_test

crew artifact list
crew artifact show launch_readout_q2
crew artifact search "launch readiness"

crew workflow list
crew workflow run weekly-business-review --input '{"week":"2026-05-19"}'
crew workflow status weekly-business-review <run_id>
```

### Workspaces

`crew` defaults to `marketing_db`. Manage the active workspace with the
`workspace` subcommand:

```bash
crew workspace list           # list available workspaces (* marks active)
crew workspace show           # show current workspace and config source
crew workspace set my_db      # persist as default in ~/.crew/config.json
crew workspace unset          # clear config, revert to marketing_db default
```

Resolution order: Beta API route context > request registry >
`~/.crew/config.json` > default (`marketing_db`).

Local workspace content lives under `src/crew/workspace/<name>/`.

### Artifacts

Artifacts are created from an agent conversation rather than a separate mutation
command.

Typical flow:

```bash
crew agent repl --agent data
```

Then ask the agent to create or find an artifact, for example:

- `create an artifact from this session`
- `turn this analysis into an artifact`
- `find the artifact about activation experiments`

Artifact files live under `workspace/<name>/artifacts/`.

### Workflows

Crew also supports registered workflows for bounded multi-step execution across
host agents.

Use the workflow commands to inspect and run them:

```bash
crew workflow list
crew workflow run <workflow_id> --input '{"key":"value"}'
crew workflow status <workflow_id> <run_id>
```

## Beta Web App

The beta web app runs a FastAPI BFF under `crew.beta` plus a Next.js frontend
under `web/`. The BFF starts the Crew host internally, so you do not need to
run `mash host serve` separately for web development.

Set the beta access-control env vars in your shell or project `.env`:

```bash
CREW_BETA_ALLOWED_USERS=alice,bob
CREW_BETA_AUTH_SECRET=replace_me_for_local_beta
CREW_BETA_TOKEN_TTL_SECONDS=604800
CREW_BETA_CORS_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

The shared database and runtime env vars from [Quick Start](#quick-start) still
apply because the beta BFF builds the same `data` and `pm` runtime.

Start the BFF:

```bash
uv run uvicorn crew.beta:build_beta_app --factory --reload --port 8000
```

Configure the frontend in `web/.env.local`:

```bash
NEXT_PUBLIC_CREW_API_BASE_URL=http://127.0.0.1:8000
```

Install and run the web app:

```bash
cd web
npm install
npm run dev
```

The local app runs at [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Documentation Map

- [docs/product.md](docs/product.md): product overview, usage model, and system
  concepts
- [src/crew/agents/data/README.md](src/crew/agents/data/README.md): data agent
  source-of-truth and runtime notes
- [src/crew/agents/pm/README.md](src/crew/agents/pm/README.md): PM agent prompt,
  skills, and delegation references

## Prerequisites

- Python 3.10+
- [`uv`](https://docs.astral.sh/uv/)
- Node.js 20+ and `npm` for the beta web app
- Postgres for hosted runtime durability and optional memory storage
- an Anthropic API key
- BigQuery access for the data agent
