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
- `masher` is enabled for runtime diagnostics and evals.

For a higher-level product overview, see [docs/product.md](docs/product.md).

## What Crew Includes

- `metrics_layer`: semantic metric and source definitions plus SQL compilation
- `experimentation`: deterministic experiment contracts and SQL planning
- `artifacts`: reusable Markdown outputs created from agent conversations
- `crew` CLI: the main interface for conversational work, metrics commands, and artifact commands
- Mash host runtime: the execution engine that powers the local agent host

## Local Setup

### Prerequisites

- Python 3.10+
- [`uv`](https://docs.astral.sh/uv/)
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

### 3. Configure agent environment

`crew.app:build_host` currently loads the `data` and `pm` agent environments.
Shell environment variables take precedence over agent `.env` files.

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

### 4. Start the local host

`crew` uses Mash as its host runtime. Start the host with:

```bash
mash host serve --host-app crew.app:build_host
```

By default, runtime state is stored under `.mash/`.
If `MASH_DATA_DIR` is not set, `build_host()` defaults it to `.mash`.

### 5. Connect once

Save the local host URL and default agent:

```bash
mash connect --api-base-url http://127.0.0.1:8000 --agent data
```

After this, `crew agent ...` commands can reuse the saved connection.

## Using The Crew CLI

### Agent mode

Use agent mode for free-form questions and conversational workflows:

```bash
crew agent repl --agent data
crew agent invoke --agent data "What changed in activation over the last 4 weeks?"
```

### Command mode

Use command mode for direct deterministic operations against metrics and artifacts:

```bash
crew metrics list --dataset marketing_db
crew metrics show --dataset marketing_db --kind metric --name spend_total
crew metrics compile --dataset marketing_db --metric spend_total --dimension campaign_id

crew experiment list --dataset marketing_db
crew experiment show --dataset marketing_db --name signup_checkout_test
crew experiment plan --dataset marketing_db --name signup_checkout_test

crew artifact list
crew artifact show launch_readout_q2
crew artifact search "launch readiness"
```

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

Artifact files live under `.mash/artifacts/`.
They are reusable Markdown outputs that teams can search, read, and reference later.

## Internal Modules

- `crew.app`: host entrypoint with `build_host()`
- `crew.metrics_layer`: semantic metric definitions and SQL compilation
- `crew.experimentation`: experiment configs, deterministic SQL planning, and stats helpers
- `crew.artifacts`: artifact schema, deterministic CRUD/search services, and agent tools
- `crew.skills`: shared skills available to crew agents, including `create-artifact`
- `crew.cli`: CLI for agent mode plus metrics and artifact command mode
