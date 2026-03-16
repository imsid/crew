# AGENTS Guide for `src/crew/metrics_layer`

## Scope
Semantic metrics layer config schema (`schema/`), runtime configs under
`.mash/metrics_layer/configs/<dataset_id>/{sources,metrics}`, and internal service modules under `service/`.

## Invariants
- Tool-facing public entrypoints must live in `service/tool_entrypoints.py`.
- `src/crew/agents/data/tools.py` is registration-only and must only define:
  - `build_steward_tools`
  - `build_analyst_tools`
- Config files must remain under `.mash/metrics_layer/configs/<dataset_id>/{sources,metrics}`.
- Schema validation is required before config writes.
- SQL execution is a two-step contract:
  - compile with `compile_metric_configs_to_sql`
  - execute returned SQL with MCP `execute_sql`

## Refactor Guardrails
- Keep tool names and JSON contracts stable.
- Keep deterministic error payload structures for tool failures.
- Keep semantic logic grounded in config-defined sources/metrics; do not bypass with ad-hoc raw-table semantics.

## Testing
- Run DB local tool tests after changes:
  - `uv run python -m unittest tests.data.test_local_tools -v`
