# mash-crew Architecture

`mash-crew` is one Mash host app built directly on `mashpy`.

## Host shape

- `crew.app:build_host` is the single app entrypoint
- `pm` is the primary agent
- `data` is registered as a subagent with metadata and is also directly addressable through the host API
- the built-in Mash host API and telemetry UI are served by `mash host serve`

There is no custom `crew` CLI, `crew-api`, or wrapper REPL layer.

## Agent implementation

Each role agent is implemented as an `AgentSpec`:

- PM: `src/crew/agents/pm/spec.py`
- Data: `src/crew/agents/data/spec.py`

Each spec owns:

- LLM provider construction
- tool registration
- skill registration
- MCP server registration
- agent config construction
- runtime store and log destinations

## Shared modules

- `src/crew/metrics_layer`
  Shared metrics-layer config access, YAML schema validation, and SQL compilation logic. The Data agent uses this directly.
- `src/crew/code_index`
  Shared repo indexing logic and `repomap.sh`. PM uses it internally to prepare repository context, but it is not exposed as a Mash tool.

## User flow

Users start the deployment with:

```bash
mash host serve --host-app crew.app:build_host
```

Users interact with the built-in Mash client:

```bash
mash repl
mash repl --agent data
mash invoke --agent pm "..."
```

PM handles product and codebase questions. It delegates to Data only for metrics-layer and BigQuery-specific work.
