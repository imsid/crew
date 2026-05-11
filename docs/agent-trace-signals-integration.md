# Crew Agent Trace + Signals Integration

## Goal

Use `mashpy>=0.2.9` to make agent-mode chat durable across reloads:

- historical assistant turns can render a reasoning trace after SSE is gone
- per-turn runtime signals can be displayed with human-readable definitions

## New mash capabilities

- `GET /api/v1/telemetry/reasoning-trace`
  - input: `agent_id`, `session_id`, `trace_id`
  - output: compact persisted reasoning-trace summary from the runtime event log
- `GET /api/v1/agent/{agent_id}/sessions/{session_id}/signals`
  - output: signal `definitions` plus per-turn `signals`

Important runtime detail:

- in mash, persisted `turn_id == trace_id`
- Crew can use the existing history `turn_id` as the stable key for trace hydration

## Recommended Crew shape

### 1. Keep the Beta BFF as the only browser-facing integration point

The web app already authenticates against the Beta BFF, not the Mash host directly. That means the BFF should proxy and normalize the new mash endpoints.

For the current in-process deployment, that proxy should still call the Mash API contract itself, not reimplement trace construction from Mash internals.

Recommended BFF routes:

- `GET /sessions/{session_id}/turns/{turn_id}/trace`
- `GET /sessions/{session_id}/signals`

Implementation detail:

- `/sessions/{session_id}/turns/{turn_id}/trace` should proxy `GET /api/v1/telemetry/reasoning-trace`
- `/sessions/{session_id}/signals` can stay as a concrete Beta endpoint backed by Mash session signal APIs

### 2. Treat live trace and persisted trace as two sources for one UI model

Current state:

- live runs build `ExecutionTraceState` incrementally from SSE `agent.trace` events
- historical turns only hydrate text from `/sessions/{session_id}/history`

Recommended state model:

- during a live run, keep using SSE as the source of truth
- after reload, fetch the persisted trace by `turn_id`
- normalize persisted payloads into the same `ExecutionTraceState` shape the UI already renders

This avoids a second renderer path.

### 3. Load historical traces lazily

Do not fetch traces for every historical turn on initial session load.

Recommended behavior:

- history load returns messages immediately
- each assistant turn keeps `turn_id` in message metadata
- when the user expands a trace card, fetch `/sessions/{session_id}/turns/{turn_id}/trace`
- cache by `["session-trace", sessionId, turnId]`

Why:

- long sessions would otherwise create an N-request hydration burst
- most historical traces will never be opened

### 4. Use history for signal values, signals endpoint for definitions

Crew already gets per-turn `signals` from history. The new session-signals route should mainly provide:

- the canonical `definitions`
- a full per-session signal view when needed

Recommended behavior:

- keep using `turn.signals` from history as the fast path for values
- fetch `/sessions/{session_id}/signals` once per session when the UI needs labels/descriptions
- merge definitions by signal name and values by `turn_id`

### 5. Render signals as run diagnostics, not core message content

Recommended UI placement:

- show signals inside the trace card footer or a small “Run diagnostics” section
- render friendly labels from `definitions`
- prioritize a compact first pass:
  - `unused_tools`
  - `unused_tool_tokens`

Suggested presentation:

- `Unused tools: web_search`
- `Unused tool tokens: 42`

This keeps the main answer readable while still exposing agent-efficiency diagnostics.

## Frontend rollout plan

### Phase 1

- add web API client helpers for the two new BFF endpoints
- preserve `turn_id` on hydrated assistant messages
- lazy-load persisted traces on trace-card expand

### Phase 2

- load session signal definitions once per session
- render signal diagnostics for each turn using history values plus definitions

### Phase 3

- optionally prefetch the most recent turn trace after session load
- optionally add session-level analytics summaries from signals

## Edge cases

- If telemetry is unavailable or the trace is missing, keep the assistant text visible and degrade the trace card to an unavailable state.
- Persisted traces are summary-level and may be less detailed than live SSE-derived traces. The UI should accept missing per-tool result metadata.
- Signals should remain optional. A turn with no persisted signals should still render normally.
