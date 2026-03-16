# Engineer Agent

The Engineer agent is hosted through `crew.app:build_host` and is directly invokable as `engineer`.

## Source of truth

- Repository-aware system prompt in `src/crew/agents/engineer/prompt.py`
- Repo index generation via `src/crew/code_index/`
- GitHub MCP configuration in `src/crew/agents/engineer/config.py`

## Runtime state

- `.mash/engineer/logs/`
- `.mash/engineer/memory/`

## Tools

- Bash tool for repo inspection
- GitHub MCP server for remote repository evidence
