# Plan 1 — Upgrade mashpy and Remove the Growth Workflows

Two independent pieces of housekeeping that leave the repo in a clean state:
mashpy moves to 0.21.1, and the five-step growth workflows come out.

Plan 2 (`candidate-table-workflow-design.md`) builds the replacement. The two are
independent: nothing here depends on that design, and nothing here needs to run.
This plan is edits and deletions only.

---

## 1. Upgrade mashpy 0.21.0 → 0.21.1

`pyproject.toml` pins `mashpy>=0.21.0`; `uv.lock` resolves 0.21.1's predecessor.

0.21.1 is a single fix on top of 0.21.0 — *"close request streams reliably:
terminal dedupe, atomic reads, recorded lifecycle state"* (mashpy #175). Runtime
behaviour only; no API surface changes, so nothing in `crew` has to adapt.

| Step | Action |
|---|---|
| 1 | `pyproject.toml`: `mashpy>=0.21.0` → `mashpy>=0.21.1` |
| 2 | `uv lock --upgrade-package mashpy` |
| 3 | `uv sync` |
| 4 | `uv run pytest` — the existing 18 test modules |
| 5 | Boot `crew-host` and confirm the `datasquad` host composes |

Because the fix is in request-stream lifecycle, the check that matters is step 5:
the host boots and composes. No workflow run needed.

If step 4 surfaces anything, it's a genuine regression rather than an expected
migration cost — 0.21.0 → 0.21.1 is a patch.

---

## 2. Remove the growth workflows

### What goes

| Path | Action | Why |
|---|---|---|
| `src/crew/growth/` | rename to `src/crew/plays/` | `growth` is an agent, not a module. The surviving code is BigQuery access and warehouse queries for play workflows, so it moves out from under the agent's name. `CrewGrowthRuntimeContext` becomes `PlayRuntimeContext` |
| `plays/dip_rescue.py` | delete | The five-step workflow and both its registrations |
| `plays/expansion.py` | delete | Same |
| `plays/models.py` | trim | Delete the step-threading containers: `DipRescueInput`, `DipRescueState`, `DipCandidate`, `DipRescueSummary`, `ExpansionInput`, `ExpansionState`, `ExpansionSummary`. **Keep `UsageRow`, and keep `ExpansionCandidate` trimmed to its code-set fields** — `warehouse.py` returns both, so deleting the file breaks the queries that survive |
| `plays/writes.py` | delete | `write_play` / `update_account_thesis` were the final steps' write path |
| `plays/crm.py` | trim | Delete `open_plays_for`, `open_opps_for`, `holdout_arm`. Keep `resolve_accounts` and `read_enrichment` |
| `plays/__init__.py` | trim | Drop `build_growth_workflows`; keep the context export |
| `src/crew/app.py` | trim | Remove the `register_default_workflow` loop (`app.py:43-45`) and its import |
| `src/crew/agents/growth/skills/diagnosing-consumption-dips/` | delete | Diagnosis was a workflow step |
| `src/crew/agents/growth/skills/selecting-nrr-plays/` | delete | Selection was a workflow step |
| `src/crew/agents/growth/skills/building-expansion-thesis/` | delete | Thesis was a workflow step |
| `src/crew/workspace/marketing_db/artifacts/` — 9 files | delete | Near-duplicate output from repeated runs on 2026-08-02: `consumption-dip-rescue-*` (3), `expansion-*` (4), `nrr-play-select-draft-*`, `select-and-draft-play-*`. All untracked, none referenced |
| `docs/nrr-workflows-demo.md` | delete | Runbook for the deleted workflows |
| `tests/test_app.py` | edit | Drop `expansion-pqa` / `expansion-pqa-who` from the registered-workflow assertion (lines 49-50). The `growth` agent and `("pm", "growth")` subagent assertions stay |
| `tests/test_api.py` | edit | Line 203 lists `growth` among agents — unchanged, the agent stays |
| `tests/metrics_layer/test_runtime.py` | edit | Repoint `crew.growth.*` imports at `crew.plays.*`. Delete the two `writes` cases (lines ~619, ~640) and the `crm` cases covering `open_plays_for` / `open_opps_for`. Keep the `pull_usage_panel`, `compute_expansion_signals`, `resolve_accounts` and `read_enrichment` cases |

### What stays, deliberately

| Path | Why |
|---|---|
| `plays/context.py` | The BigQuery access used by everything that follows |
| `plays/warehouse.py` | `pull_usage_panel` and `compute_expansion_signals` are the real signal queries. They return `UsageRow` / `ExpansionCandidate`, which is why `models.py` is trimmed rather than deleted |
| `plays/crm.py` (trimmed) | `resolve_accounts` / `read_enrichment` build the expansion org snapshot |
| `src/crew/agents/growth/` — spec, prompt, config | The Growth Expert stays registered as a `datasquad` subagent |
| `src/crew/workspace/crm_db/**` | The semantic layer is separate work. Plan 2 reshapes what it needs |
| `crm_db.plays` and its rows | Demo data. Plan 2 decides its fate along with the new schema |
| `docs/growth-expert-pitch.html`, `docs/product.md`, `src/crew/context/**` | Strategy, not implementation. `context/sales/revenue-strategy.md` remains the source of the gate thresholds |

### Interim state

Between the two plans the `growth` agent has a persona and no skills, and no
growth workflows are registered. That's intentional — the deleted skills document
steps that no longer exist, and leaving them would mislead the agent. The agent
stays reachable through `datasquad` chat.

---

## 3. Verify

| Check | How |
|---|---|
| Nothing imports the deleted modules | `grep -rn "dip_rescue\|build_growth_workflows\|DipRescue\|ExpansionState\|crew.growth" src tests` returns nothing |
| `src/crew/growth/` no longer exists | `ls src/crew/growth` fails |
| Tests pass | `uv run pytest` |
| Host boots | `crew-host` starts, `datasquad` composes with `data` + `pm` + `growth` |
| No workflows registered | `crew workflow list` is empty |

---

## 4. Order

1. Upgrade mashpy, run tests (§1)
2. Delete (§2)
3. Verify (§3)
4. Commit as two changes: the upgrade, then the removal

No workflow runs. The only thing executed is the test suite and a host boot.
