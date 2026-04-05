# crew

`crew` is a virtual crew of role-based agents built on top of `mash`.
It currently centers on two hosted agents:

- `pm`: help users think like a strong product manager
- `data`: answer data and metrics questions through role-based skills

Two shared product surfaces are now first-class in the repo:

- `metrics_layer`: deterministic semantic metric configs and SQL compilation
- `artifacts`: reusable Markdown files created from agent conversations

Artifacts are created explicitly by the agent via the shared `create-artifact` skill. Artifact files live under `.mash/artifacts/`.

## Running the host

Set `MASH_DATA_DIR` to the directory where runtime state for every agent is stored.
By default, `build_host()` sets `MASH_DATA_DIR=.mash`, so Mash stores each agent under `.mash/<agent>/state.db`.
Structured runtime events and turns live in that SQLite database's `logs` and `turns` table respectively.

Start the built-in Mash host:

```bash
mash host serve --host-app crew.app:build_host
```


## Interacting with the agents

Connect once to write the default `api_base_url`, optional `api_key`, and optional default agent to `~/.mash/cli.json`.
Later `mash repl`, `mash status`, `mash agents`, and `crew agent ...` can reuse that config.

```bash
mash connect --api-base-url http://127.0.0.1:8000 --agent pm
```

Use the built-in Mash CLI for conversational work:

```bash
mash repl
mash repl --agent data
mash invoke "Create an artifact from this session"
mash invoke --agent data "Compile metric spend_total for marketing"
```

PM is the default primary agent.
Data is directly addressable by agent id and available to PM through `InvokeSubagent`.
Masher is registered as a built-in subagent for runtime diagnostics against the configured Mash event store, including recent sessions and traces.

## Artifact workflow

Artifacts are created inside an agent conversation, not through a separate CLI mutation command.

Typical flow:

```bash
mash repl
```

Then ask the current agent to:

- `create an artifact from this session`
- `turn this analysis into an artifact`
- `find the artifact about activation experiments`

The shared `create-artifact` skill uses Mash runtime memory tools to inspect the current session, drafts flexible Markdown with required frontmatter plus `## Summary` and `## Next Steps`, and writes the file to `.mash/artifacts/<artifact_id>.md`.

## Crew CLI

`crew` is a lightweight wrapper around Mash plus local deterministic services.

Examples:

```bash
crew agent repl --agent pm
crew agent invoke --agent data "Compile metric spend_total for marketing"

crew artifact list
crew artifact show launch_readout_q2
crew artifact search "launch readiness"

crew metrics list --dataset marketing
crew metrics show --dataset marketing --kind metric --name spend_total
crew metrics compile --dataset marketing --metric spend_total --dimension campaign_id
```

`crew artifact` is read-only in v1.
Artifact creation remains agent-led inside `mash repl`.

## Internal modules

- `crew.app`: host entrypoint with `build_host()`
- `crew.metrics_layer`: shared metrics-layer validation and SQL compilation
- `crew.artifacts`: artifact schema, deterministic CRUD/search services, and agent tools
- `crew.skills`: shared skills available to crew agents, including `create-artifact`
- `crew.cli`: lightweight wrapper for `agent`, `artifact`, and `metrics` commands
