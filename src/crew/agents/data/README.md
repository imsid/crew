# Data Agent

The Data agent is hosted through `crew.app:build_host` and is addressed with `--agent data` from the Mash CLI.

## Source of truth

- BigQuery MCP (remote exploration)
- Metrics-layer configs under `.mash/metrics_layer/configs/`
- Metrics-layer schemas under `src/crew/metrics_layer/schema/`
- Experiment configs under `.mash/experimentation/configs/`

## Runtime state

- `.mash/data/logs/`
- `.mash/data/memory/`

## Packaged skills

- `src/crew/agents/data/skills/`
