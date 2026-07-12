# Crew

A virtual crew of role-based agents for analytics and product work, built on
the [Mash](https://github.com/imsid/mashpy) SDK. You self-host it: run the
crew on your laptop or your own server and talk to it over the CLI or the
beta web app.

The deployment is a flat pool of agents; which agents work together is your
configuration. The CLI ships one composition out of the box, the
**`datasquad`** host:

- **`data`** — the primary. Analytics, metrics, experiments, artifacts, and
  workflows on top of BigQuery.
- **`pm`** — a subagent for product framing, prioritization, and trade-off
  analysis.

Entering `datasquad` routes your messages to `data`, which delegates product
questions to `pm`. Compose your own hosts over the same pool with `crew
compose` — see [Composing Hosts](#composing-hosts). Subagent delegation, tool
approval, and durable interactions are handled by the Mash runtime.

## Quick Start

```bash
# 1. Configure and start Postgres, crew-host, crew-api, and the web UI.
cp .env.example .env   # set ANTHROPIC_API_KEY, CREW_BETA_ALLOWED_USERS, CREW_BETA_AUTH_SECRET
docker compose up -d --build

# 2. Install the CLI, log in as your user, and chat
curl -fsSL https://raw.githubusercontent.com/imsid/crew/main/install.sh | sh
crew login alice --api-base-url http://127.0.0.1:8003
crew repl                                   # chat in a session shared with the UI
```

The web UI is at [http://127.0.0.1:3000](http://127.0.0.1:3000). The CLI and
web UI both authenticate with crew-api, so sessions are shared between them.
Agent execution runs independently on the private crew-host service.

`ANTHROPIC_API_KEY` is required — the host refuses to start without it.
`DBOS_CONDUCTOR_KEY` is optional: the durable runtime self-hosts against
Postgres and starts fine without it; set it only to connect to DBOS Conductor
for cloud observability. BigQuery is optional: set `BIGQUERY_PROJECT_ID` /
`BIGQUERY_MCP_URL` (and mount a service-account JSON via
`GOOGLE_APPLICATION_CREDENTIALS`) to light up the data agent's BigQuery
tools; without them the agent still runs and explains what to configure.

## The Agents

**Data** is the primary. It owns the semantic metrics layer, experiment
configs and analysis, and durable artifacts, querying BigQuery through a
read-only MCP allowlist. It delegates product-framing questions to PM.

**PM** is a delegated specialist for product strategy: framing,
prioritization, roadmap trade-offs, and synthesis of user and product
signals. It has no repository or BigQuery access — it reasons over what the
data agent and the conversation provide.

## Crew CLI

The CLI is a client of crew-api. Log in once, then chat in a session that
is shared with the web UI:

```bash
crew login alice                # authenticate (saved to ~/.crew/auth.json)
crew repl                       # chat in a new session (datasquad: data + pm)
crew repl --session-id data_ab  # resume an existing session
crew sessions                   # list your sessions (same as the UI)
>> what metrics are available in the metrics layer?
```

Messages route through the `datasquad` host (the data primary delegating to
PM). Sessions are created under your user in crew-api, so the CLI and UI see
the same ones. Product REPL messages always pass through crew-api so session
ownership is checked and trusted workspace metadata reaches agent tools.

Use **command mode** for deterministic local inspection:

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

Command mode reads the packaged workspace locally and needs no connection.
The crew-api base URL is taken from `crew login` (or `--api-base-url` /
`CREW_API_BASE_URL`). Its authenticated `/host` passthrough exposes selected
raw Mash APIs for browse, composition, and workflow commands.

### Composing Hosts

The pool is flat — which agents work together is your configuration.
`crew browse` shows the pool, the attachable workflows, and your configured
hosts; `crew compose` creates or replaces one (idempotent `PUT` on the host)
and saves it to `~/.crew/hosts.json`; `crew hosts` lists them.

```bash
crew browse                                  # pool + workflows + your hosts
crew compose money --primary data            # a data-only host
crew compose research --primary pm --subagents data
```

The config file is seeded with the `datasquad` composition on first use. The
authenticated `crew repl` chats through `datasquad`; to drive another host
ad hoc, use stock Mash tooling through crew-api's `/host` passthrough. These
are raw/default-workspace operations and do not resume a Crew-owned session.

### Workspaces

Crew defaults to the `marketing_db` workspace. Manage the active one with the
`workspace` subcommand:

```bash
crew workspace list           # list available workspaces (* marks active)
crew workspace show           # show current workspace and config source
crew workspace set my_db      # persist as default in ~/.crew/config.json
crew workspace unset          # clear config, revert to the marketing_db default
```

Resolution order: Mash caller metadata > explicit local command context >
`~/.crew/config.json` > default (`marketing_db`).

### Artifacts

Artifacts are created from an agent conversation, not a separate command. In
a REPL, ask the agent to `create an artifact from this session`, `turn this
analysis into an artifact`, or `find the artifact about activation
experiments`. Browse them with `crew artifact list / show / search`.

### Workflows

Workflows are code-shipped, typed step pipelines registered with the Mash
runtime — durable, observable, and resumable. Every host ships with the
built-in masher suite (trace digests, online eval curation, synthetic eval
generation, experiment runs). Inspect and run them with
`crew workflow list / run / status`.

## Web App

crew-api serves the user-facing API used by the CLI and **Next.js frontend**
(`web/`). It forwards authorized execution to the private crew-host. The
compose stack from the Quick Start serves the frontend at
[http://127.0.0.1:3000](http://127.0.0.1:3000); see
[CONTRIBUTING.md](CONTRIBUTING.md) for the two-service development model.

## Telemetry

Mash telemetry and `/admin` are operator-only surfaces served directly by
crew-host on the private network. Use a port-forward or the development host
profile with `MASH_API_KEY`; crew-api deliberately does not proxy them.

## Documentation

- [docs/product.md](docs/product.md) — product overview, usage model, and
  system concepts
- [src/crew/agents/data/README.md](src/crew/agents/data/README.md) — data
  agent source-of-truth and runtime notes
- [src/crew/agents/pm/README.md](src/crew/agents/pm/README.md) — PM agent
  prompt, skills, and delegation references
- [CONTRIBUTING.md](CONTRIBUTING.md) — local development, Docker deployment,
  adding workspaces and agents, and releasing binaries

## Prerequisites

- An Anthropic API key and a DBOS conductor key
- Postgres for runtime durability (bundled in the Docker image, or bring your
  own)
- BigQuery access for the data agent's query tools (optional)
