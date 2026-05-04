# Data Agent

The Data agent is hosted through `crew.app:build_host` and is addressed with `--agent data` from the Mash CLI.

## Source of truth

- BigQuery MCP (remote exploration)
- Metrics-layer configs under `workspace/<name>/metrics_layer/configs/`
- Metrics-layer schemas under `src/crew/metrics_layer/schema/`
- Experiment configs under `workspace/<name>/experimentation/configs/`

## Runtime state

- `.mash/data/memory/`
- hosted request durability and observability events live in the runtime Postgres store configured by `MASH_RUNTIME_DATABASE_URL`

## Packaged skills

- `src/crew/agents/data/skills/`
