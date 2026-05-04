# PM Agent

The PM agent is the primary product-management agent for Mash Crew and is hosted through `crew.app:build_host`.

## Source of truth

- Product-manager system prompt in `src/crew/agents/pm/prompt.py`
- Packaged PM skills under `src/crew/agents/pm/skills/`
- Data subagent delegation metadata in `src/crew/agents/pm/subagents.py`

## Runtime state

- `.mash/pm/memory/`
- hosted request durability and observability events live in the runtime Postgres store configured by `MASH_RUNTIME_DATABASE_URL`

## Packaged skills

- `src/crew/agents/pm/skills/`
