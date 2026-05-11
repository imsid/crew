# AGENTS Guide for `src/crew/artifacts`

## Scope
Artifact schema (`schema/`), deterministic artifact service code (`service/`), and
agent tool registration in `src/crew/artifacts/tools.py`.

## Invariants
- Artifacts live under `workspace/<name>/artifacts/<artifact_id>.md` or `workspace/<name>/artifacts/<artifact_id>.html`.
- Artifact files are the source of truth.
- Required frontmatter fields:
  - `artifact_id`
  - `format`
  - `source_agent`
  - `title`
  - `description`
  - `kind`
  - `session_id`
  - `updated_at`
- Required Markdown sections:
  - `## Summary`
  - `## Next Steps`
- Tool-facing public entrypoints must live in `service/tool_entrypoints.py`.
- The only write path in v1 is `write_new_artifact_file`.

## Refactor Guardrails
- Keep tool names stable and prefer additive JSON contract changes.
- Keep artifact validation deterministic.
- Do not add database-backed artifact state in v1.

## Testing
- Run artifact service and CLI tests after changes:
  - `uv run --extra dev pytest -q tests/test_artifacts.py tests/test_crew_cli.py`
