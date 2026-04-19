# AGENTS Guide for `src/crew/experimentation`

## Scope
Experiment config schema (`schema/`), runtime configs under
`.mash/experimentation/configs/<dataset_id>/experiments`, and internal service modules under `service/`.

## Invariants
- Tool-facing public entrypoints must live in `service/tool_entrypoints.py`.
- Experiment configs may reference metrics-layer metric ids only.
- Exposure semantics come from the canonical BigQuery `experiment_exposures` table.
- Experiment analysis must be deterministic:
  - canonical exposure is the first exposure per subject
  - contaminated subjects are excluded from effect analysis
  - metric joins use metrics-layer source `subject` and `ts`

## Testing
- Run local tool and CLI tests after changes:
  - `uv run python -m unittest tests.data.test_local_tools -v`
  - `uv run pytest -q tests/test_crew_cli.py tests/test_data_prompt.py`

