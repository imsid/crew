# mash-crew

`mash-crew` is a Virtual crew of role-based agents built on top of mash. It has three agents:

- `pm`: help users think like a strong product manager
- `data`: answer data and metrics questions through role-based skills
- `engineer`: answer repository and implementation questions by inspecting the codebase


## Running the host

Set `MASH_DATA_DIR` to the directory where runtime state and logs for every agent are stored. By default, `build_host()` sets `MASH_DATA_DIR=.mash`, so Mash stores logs and SQLite state under `.mash/<agent>/`.

Start the built-in Mash host:

```bash
mash host serve --host-app crew.app:build_host
```


## Interacting with the agents

Connect once to write the default api_base_url, optional api_key, and optional default agent to ~/.mash/cli.json, and later mash repl, mash status, mash agents, etc. read from that file if you do not pass flags

```bash
mash connect --api-base-url http://127.0.0.1:8000 --agent pm
```

Then use the built-in Mash CLI:

```bash
mash repl
mash invoke "Explain the auth flow"
mash repl --agent data
mash invoke --agent data "Compile metric spend_total for marketing"
```

PM is the default primary agent. Data agent is also directly addressable by agent id and available to PM through `InvokeSubagent`.

## Internal modules

- `crew.app`: host entrypoint with `build_host()`
- `crew.metrics_layer`: shared metrics-layer validation and SQL compilation
- `crew.code_index`: shared repo indexing helpers
