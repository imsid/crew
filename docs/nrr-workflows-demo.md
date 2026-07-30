---
title: Own NRR — Workflows Demo Runbook
doc_type: runbook
status: current
---

# Own NRR — Workflows Demo Runbook

Two durable Growth Crew workflows on mock data for **Ampere**, a fictional consumption-billed
AI coding-agent platform (context: `src/crew/context/`):

- **`consumption-dip-rescue`** (1a) — stops the leak. Manufactures a churn-equivalent signal
  from usage decay, diagnoses it, drafts a rescue play, assigns a holdout arm, writes it back.
- **`expansion-pqa`** (1b) — drives expansion. Scores product-qualified accounts, enriches with
  company signal, fuses usage × headroom × timing into a thesis, personalizes a play.

Both **stop before real outbound** — the deliverable is a `ready_to_send` / `briefing_ready`
play in `crm_db.plays`, plus the thesis written back to `crm_db.accounts`.

Each also has a **read-only WHO-only sub-workflow** that runs just the deterministic candidate
steps — no agent, no writes — for previewing exactly who would be actioned:

- **`consumption-dip-who`** — `pull-usage-panel` → `score-and-gate`, terminating at the gated,
  segmented `DipRescueState` candidate set.
- **`expansion-pqa-who`** — `compute-expansion-signals` → `resolve-and-enrich-company`, terminating
  at the enriched `ExpansionState` candidate set.

They reuse the parent workflows' own code-step closures (`src/crew/growth/{dip_rescue,expansion}.py`),
so the WHO logic is guaranteed identical; they simply drop the agent and write steps.

## Architecture

- **Code steps** (deterministic) read/write BigQuery via `crew.growth.CrewGrowthRuntimeContext`
  (`src/crew/growth/{warehouse,crm}.py`). They own the **WHO**: gating, segmentation, dedupe,
  holdout split, and all writes.
- **Agent steps** run the **`growth`** agent (`src/crew/agents/growth/`) with structured output,
  grounded by three skills. They own the **WHAT**: dip diagnosis, expansion thesis, and copy.
- The final code step re-derives the authoritative candidate set and overlays the agent's
  per-org judgment by `org_id`, so the result is correct regardless of LLM echo fidelity.

All four workflows are registered in `src/crew/app.py:build_pool()` (via
`crew.growth.build_growth_workflows`) and attached to the `datasquad` host. The two `-who`
sub-workflows are read-only: they contain only code steps and never touch `crm_db` writes.

## Data (BigQuery, project `mash-487416`)

Generators live in `/Users/sid/Projects/mos/`:

```bash
cd /Users/sid/Projects/mos
PROJECT_ID=mash-487416 uv run python bq_product_usage.py   # product_usage_db (+ plan_pricing)
PROJECT_ID=mash-487416 uv run python bq_crm.py             # crm_db (accounts, enrichment, plays, opps)
```

`bq_crm.py` reads the org list from `dim_orgs`, so run `bq_product_usage.py` first.

### Prerequisite: BigQuery write access for the host principal

The workflows **write** to `crm_db` (and read both datasets). The deployed `crew-host` container
authenticates as the service account in `GOOGLE_APPLICATION_CREDENTIALS`
(`marketing-db-mcp@mash-487416.iam.gserviceaccount.com`), which currently has **read-only**
access. Grant it write on both demo datasets (dataset-level WRITER is enough) — run as a project
owner:

```bash
bq update --dataset --source <(bq show --format=prettyjson mash-487416:crm_db \
  | jq '.access += [{"role":"WRITER","userByEmail":"marketing-db-mcp@mash-487416.iam.gserviceaccount.com"}]') \
  mash-487416:crm_db
# repeat for mash-487416:product_usage_db
```

(Running a source host locally with your own `gcloud` ADC — `GOOGLE_APPLICATION_CREDENTIALS=` — also
works and needs no grant.)

## Run

Via the CLI (talks to the running host through `crew-api`):

```bash
crew workflow list
crew workflow run consumption-dip-rescue --input '{"as_of_date":"2026-05-29"}'
crew workflow run expansion-pqa          --input '{"as_of_date":"2026-05-29"}'
crew workflow status consumption-dip-rescue <run_id>
```

Or directly against the mash host API (Bearer `MASH_API_KEY`):

```bash
curl -s -X POST -H "Authorization: Bearer $MASH_API_KEY" -H 'Content-Type: application/json' \
  -d '{"input":{"as_of_date":"2026-05-29"}}' \
  http://127.0.0.1:8004/api/v1/workflow/consumption-dip-rescue/run
```

`dry_run: true` in the input computes everything but skips the crm_db writes.

To preview *who* would be actioned without running the agent or writing anything, run the
read-only sub-workflows (same input shape; they read both datasets and write nothing):

```bash
crew workflow run consumption-dip-who --input '{"as_of_date":"2026-05-29"}'
crew workflow run expansion-pqa-who   --input '{"as_of_date":"2026-05-29"}'
```

Their output is the candidate `DipRescueState` / `ExpansionState` — the same gated, segmented,
deduped set the parent workflow feeds to its agent steps.

## Expected results (as_of 2026-05-29)

**Dip Rescue** — 2 plays, $1,342 at risk:

| Org | Segment | Play | Outcome |
|---|---|---|---|
| Atlas Systems (`org_dip_enterprise`) | critical | `csm_escalation` | ~$973 at risk (chat collapsed hardest) |
| Northwind Labs (`org_dip_startup`) | high | `sales_assisted_checkin` | ~$369 at risk (workflow led) |
| jdoe (`org_dip_hobbyist`) | — | — | **ignored** ($0 revenue-weight) |
| Meridian Data (`org_dip_dedupe`) | — | — | **skipped** (open play) |

**Expansion / PQA** — 2 plays, the core contrast (same 3→9 dev delta, PQA 94.9, opposite motions):

| Org | Headcount | Motion | Play |
|---|---|---|---|
| Bit Forge (`org_expand_small`) | 12 (ceiling) | self_serve | `self_serve_upgrade_nudge`, TAM ~$12.8K |
| Vertex Global (`org_expand_enterprise`) | 4,000 (beachhead, just raised) | sales | `sales_expansion_briefing`, TAM ~$85K–$400K |
| Cobalt AI (`org_expand_dedupe`) | — | — | **skipped** (open opportunity) |

Inspect what was written:

```sql
SELECT org_id, play_type, status, holdout_arm, dollars_at_risk, thesis, draft_copy
FROM `mash-487416.crm_db.plays` WHERE run_id != 'seed' ORDER BY workflow_id, org_id;
```

## Reset between runs

Workflows dedupe against open plays/opps, so a second run skips accounts already actioned. To
demo fresh:

```bash
cd /Users/sid/Projects/mos && PROJECT_ID=mash-487416 uv run python reset_crm_demo.py
```

This clears workflow-written plays (keeping the two seeded dedupe rows) and blanks account theses.

## Follow-on (not built)

The paired weekly **readout** workflows from the pitch (lift-vs-holdout, $ rescued, pipeline →
NRR contribution). Holdout arms are assigned and recorded now (`plays.holdout_arm`,
`status='held_out'`), so the readout is buildable on top.
