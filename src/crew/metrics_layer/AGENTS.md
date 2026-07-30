# AGENTS Guide for `src/crew/metrics_layer`

## Scope
Semantic metrics layer config schema (`schema/`), runtime configs under
`workspace/<name>/metrics_layer/configs/{sources,metrics}`, and internal service modules under `service/`.

The layer is a **read model** with two query archetypes: metric aggregations
(`compile_metric_plan` / `compile_multi_metric_plan` — simple/windowed/ratio metrics,
many-to-one joins, filters, HAVING, typed parameters) and non-aggregated entity reads
(`compile_entity_plan`). `service/runtime.py` compiles a `QuerySpec` to a `CompiledPlan`
and executes it; in-process callers bind parameters, the agent path inlines them via
`CompiledPlan.render_inline`. Writes are **not** part of this layer.

## Invariants
- Tool-facing public entrypoints must live in `service/tool_entrypoints.py`.
- `src/crew/agents/data/tools.py` is registration-only and must only define:
  - `build_steward_tools`
  - `build_analyst_tools`
- Config files must remain under `workspace/<name>/metrics_layer/configs/{sources,metrics}`.
- Schema validation is required before config writes.
- SQL execution is a two-step contract:
  - compile with `compile_metric_configs_to_sql` (aggregations) or `compile_entity_read_to_sql` (record lookups)
  - execute returned SQL with MCP `execute_sql_readonly`

## Refactor Guardrails
- Keep tool names and JSON contracts stable.
- Keep deterministic error payload structures for tool failures.
- Keep semantic logic grounded in config-defined sources/metrics; do not bypass with ad-hoc raw-table semantics.

## Testing
- Run DB local tool tests after changes:
  - `uv run python -m unittest tests.data.test_local_tools -v`
