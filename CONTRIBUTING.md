# Contributing to Crew

How to work on crew: set up your environment, make changes, and test them by
deploying the whole stack with a single command. For day-to-day usage, see
[README.md](README.md).

## Prerequisites

- Docker
- [uv](https://docs.astral.sh/uv/) (Python venv, for running the tests)
- An Anthropic API key

## Setup

```bash
uv sync --extra dev                  # venv for the test suite
cp .env.example .env                 # then set ANTHROPIC_API_KEY + CREW_BETA_*
```

`.env` notes:

- **Do not quote values** — `python-dotenv` treats quotes as literal
  characters.
- Precedence is **shell env > per-agent `.env` > project `.env`**. Per-agent
  files (`src/crew/agents/<id>/.env`) are for giving `data` and `pm`
  different models or keys; keep shared settings in the project `.env`.
  Agent `.env` files never end up in images (`.dockerignore` excludes them).

## Run

One command builds and deploys Postgres, crew-host, crew-api, and the web UI.
Rerun it after making changes; `--build` picks them up.

```bash
docker compose up -d --build
```

| Service | Port | What |
| --- | --- | --- |
| `db` | `127.0.0.1:5434` | Postgres |
| `crew-api` | `127.0.0.1:8003` | Public web/CLI API and authenticated Mash passthrough |
| `crew-host` | private only | Stock Mash host, agents, workflows, and operator UIs |
| `web` | `127.0.0.1:3000` | The Next.js web UI |

Open [http://127.0.0.1:3000](http://127.0.0.1:3000) and log in as a username
from `CREW_BETA_ALLOWED_USERS`. The CLI talks to the same process, as the
same user, so sessions show up in both:

```bash
crew login alice --api-base-url http://127.0.0.1:8003
crew browse                              # the agent pool
crew --workspace marketing_db repl       # chat; session shows up in the web UI
```

Configuration notes:

- The web image bakes `NEXT_PUBLIC_CREW_API_BASE_URL` into the browser
  bundle at build time (build arg in `web/Dockerfile`); rebuild `web` with
  that arg to serve from a non-local origin.
- BigQuery: mount the service-account JSON and set
  `GOOGLE_APPLICATION_CREDENTIALS`, `BIGQUERY_PROJECT_ID`, and
  `BIGQUERY_MCP_URL`. Without them the data agent still runs and reports
  itself unconfigured.
- Probes: crew-api `GET /health`; crew-host `GET /api/v1/health` with the
  service key.

### Resetting to a clean state

Postgres only runs `docker/postgres/init-databases.sql` when it initializes
an **empty** data volume. A volume from an older deployment therefore lacks
the `crew_api`/`mash_host` roles, and crew-host fails startup with
`password authentication failed`. To wipe all data and re-initialize from
scratch:

```bash
docker compose down -v   # stop everything and delete the Postgres volume
docker compose up -d     # fresh volume: init script creates the roles + DBs
```

To upgrade in place instead (keeping existing data), apply the init script
manually before starting: `docker exec -i mash-crew-db-1 psql -U mash -d
postgres < docker/postgres/init-databases.sql`.

## Tests

```bash
uv run --extra dev python -m pytest                    # backend
cd web && npm install && npm test && npm run typecheck # web
```

## Adding a Workspace

Workspace content lives under `src/crew/workspace/<name>/` (metrics-layer
configs, experiment configs, artifacts). Add a directory there, then ship its
files as package data: the relevant globs are already declared under
`[tool.setuptools.package-data]` in `pyproject.toml`. Select it at runtime
with `crew workspace set <name>`; the default is `marketing_db`.

## Adding an Agent

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
   `.agent(<spec>, metadata=<spec>.build_subagent_metadata())` call. To put
   it in the default composition, add it to `define_default_host()` and the
   `DEFAULT_HOSTS` seed in `crew/cli/hosts_store.py`.
4. **Degrade gracefully.** If the agent needs credentials, register it
   unconditionally and gate the capability — e.g. return `[]` from
   `build_mcp_servers()` when unconfigured (see `data`).
5. **Ship data files as package data** by adding globs to
   `[tool.setuptools.package-data]` in `pyproject.toml`.

## Architecture

Crew is a Mash application: a flat agent pool with hosts composed
dynamically over it (`crew compose` — see the README).

- `src/crew/app.py` — `build_pool()` registers the `data` and `pm` agents;
  `define_default_host()` composes the default `datasquad` host at crew-host
  startup.
- `src/crew/agents/` — agent specs, prompts, skills, and metadata.
- `src/crew/metrics_layer/`, `experimentation/`, `artifacts/` — the domain
  services the data agent's tools and the CLI's command mode call.
- `src/crew/cli/` — the CLI, a client of crew-api: `repl`/`sessions` use the
  authenticated API (`beta_client.py`, token in `~/.crew/auth.json`);
  `browse`/`compose`/`hosts`/`workflow` use the Mash API forwarded at `/host`,
  sending the same stored token as the bearer key;
  `metrics`/`experiment`/`artifact`/`workspace` are local inspection. Host
  compositions live in `~/.crew/hosts.json` (`hosts_store.py`).
- `src/crew/beta/` — crew-api: auth, users, sessions, workspaces, commands,
  product event shaping, and the restricted `/host` reverse proxy.
- `src/crew/host.py` — crew-host entrypoint: builds `datasquad` and runs
  Mash's stock API with the internal service key.
- `src/crew/workspace/` — packaged workspaces such as `marketing_db`.
- `web/` — the Next.js frontend.

The CLI and the web UI are both clients of crew-api, authenticated as the
same user, so sessions live once and show up in both. See the
[mashpy docs](https://github.com/imsid/mashpy) for framework details.
