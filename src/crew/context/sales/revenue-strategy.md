---
title: Ampere — Revenue & Sales Strategy
doc_type: company-context
author_role: Chief Revenue Officer
audience: growth-crew
status: current
last_reviewed: 2026-05-29
---

# Ampere — Revenue & Sales Strategy

> Written by the CRO. This is the **operational spec** for the two Growth Crew workflows: the
> segmentation thresholds the code steps apply, the PQA definition, the play catalog the agent steps
> choose from, the holdout methodology, and the dedupe rules. Code and prompts must stay consistent
> with the numbers here — this doc is the source of truth for both.

---

## 1. Owning NRR: the two motions

NRR = (this period's consumption revenue from existing accounts) ÷ (last period's). We move it two ways:

- **Retention (stop the leak)** — the *Consumption Dip Rescue* workflow. A consumption business has no
  cancel event, so we manufacture one from usage decay and act before the revenue is gone.
- **Expansion (drive the growth)** — the *Expansion / PQA Engine*. Find product-qualified accounts,
  size the ceiling with company signal, run the right motion.

Every play carries a **holdout arm** so we prove *lift vs. control*, not activity.

---

## 2. Consumption Dip Rescue — thresholds & segmentation

### Signal (code step `score_and_gate`)
For each org, from `pull_usage_panel`:

- `baseline` = trailing 4-week average daily tokens (weeks -5..-1, excluding the current week).
- `current` = trailing 7-day average daily tokens.
- **`decay_pct` = (baseline − current) / baseline.**
- `sustained_days` = consecutive days the daily tokens have been below `0.8 × baseline`.
- `revenue_weight` = the account's `consumption_revenue` (monthly $), which sets how hard we fight.

### Gate (must all hold to open a play)
- `decay_pct ≥ 0.30` (a real dip, not noise), **and**
- `sustained_days ≥ 5` (sustained, not a weekend), **and**
- account is not brand-new (`age ≥ 21 days`, so onboarding ramps don't false-positive), **and**
- no open play already exists for the org (dedupe — see §6).

### Severity segments (drives motion + priority)

| Segment | Condition | Motion |
|---|---|---|
| **critical** | `revenue_weight ≥ $2,000/mo` **or** enterprise | human play, escalate to CSM |
| **high** | `revenue_weight ≥ $500/mo` and startup | sales-assisted briefing |
| **watch** | `revenue_weight < $500/mo` | self-serve nudge only |
| **ignore** | hobbyist / `free` / revenue ≈ 0 | no play (log only) |

`$ at-risk` for a play = `revenue_weight × decay_pct` (the monthly revenue the dip is on track to lose).

---

## 3. Expansion / PQA — the PQA score

**PQA = Product-Qualified Account:** an account whose *product usage* says it's ready to grow, before
any human has touched it. Distinct from a PQL (a single qualified *lead/user*); we qualify the whole org.

### Raw PQA signal (code step `compute_expansion_signals`)
From `product_usage_db`, per org, over the recent window:

- `token_slope` = 4-week trend in daily tokens (normalized % growth).
- `active_dev_growth` = change in weekly active developers (this 4 wks vs prior 4 wks).
- `new_surface_adopted` = started using a surface (esp. `workflow`) it wasn't using before.

**Raw PQA score (0–100)**, weighted toward the expansion flywheel:
```
pqa_raw = 45 × clamp(token_slope)        # consumption is the money
        + 30 × clamp(active_dev_growth)  # more humans = durable
        + 25 × new_surface_adopted       # workflow adoption steps revenue up permanently
```
An org qualifies as a PQA candidate at **`pqa_raw ≥ 40`**. This is only the *raw* score — the agent
step fuses it with company headroom and timing to decide what it actually means (see §4).

---

## 4. Fused expansion thesis (agent step `build_expansion_thesis`)

Raw usage is necessary but not sufficient. The agent fuses three axes:

- **Usage trajectory** — the raw PQA signal (who is growing, how fast).
- **Company headroom** — from enrichment (`headcount`, `funding_stage`, `tech_stack`): how big the
  ceiling is. See [[personas-and-tiers]] for the beachhead-vs-ceiling judgment.
- **Timing moment** — recent raise, active eng hiring, new tech adoption = "now is the moment."

Output: `motion` (self-serve vs sales), `tam_estimate` (rough $ ceiling), `confidence` (0–1), and a
one-paragraph thesis citing the specific evidence.

### Motion decision rule of thumb
| Usage | Ceiling (company) | Timing | → Motion |
|---|---|---|---|
| strong | small (hobbyist / near-cap startup) | any | **self-serve nudge** |
| strong | large (funded startup / enterprise) | hot (raise/hiring) | **sales briefing this week** |
| strong | large | cold | **sales briefing, normal priority** |
| moderate | large | hot | **sales briefing, lower priority** (worth a human because ceiling×timing) |
| moderate | small | any | **self-serve nudge or hold** |

---

## 5. Play catalog

The agent steps (`select_and_draft_play`, `personalize_play`) choose from this catalog. Each play has a
segment/motion fit and a canonical shape.

### Rescue plays (Dip Rescue)
- **`self_serve_reengage`** (watch) — automated, developer-voiced nudge with the account's own usage
  evidence; points at one re-engagement path. No human.
- **`sales_assisted_checkin`** (high) — briefing to the account owner: what dipped, likely cause,
  suggested outreach. Human sends.
- **`csm_escalation`** (critical) — briefing to the CSM with `$ at-risk`, surface-level diagnosis,
  and prior-touch context. Human owns, often same-day.

### Expansion plays (PQA)
- **`self_serve_upgrade_nudge`** (self-serve motion) — nudge toward the next rung (workflow templates,
  tier upgrade) with usage evidence and a one-click path.
- **`sales_expansion_briefing`** (sales motion) — briefing to the rep: usage evidence + company context
  + TAM estimate + suggested angle. Human runs the motion.

Copy voice: developer-first, evidence-led, one clear next step, never invents numbers. Consistent with
the CMO's campaign themes in [[acquisition-strategy]].

---

## 6. Holdout methodology & dedupe

### Holdout (proof, not activity)
Every play is split into **treatment** (we act) and **control** (deliberately held out) so we can later
measure **lift vs. holdout** — did the play move consumption vs. comparable untouched accounts.

- Assignment is **deterministic** so runs are reproducible and idempotent:
  `control` iff `hash(org_id) mod 10 == 0` (≈10% holdout), else `treatment`.
- The arm is recorded on the play (`crm_db.plays.holdout_arm`). Control accounts get a play row with
  `status = held_out` and **no outbound** — they exist only for measurement.
- The paired weekly **readout** (follow-on, not in this build) computes `$ rescued` / `pipeline` and
  `lift vs. holdout`. This build assigns and records arms so that readout is buildable later.

### Dedupe (never double-touch)
Before opening any play, check `crm_db`:
- **Dip Rescue:** skip if the org has an **open play** (`status in (ready_to_send, briefing_ready)`)
  from any workflow — one motion per account at a time.
- **Expansion:** skip if the org has an **open opportunity** (`opportunities.stage` open) — sales is
  already working it; don't cut across the rep.

Deduped accounts are logged in the run summary as `skipped_dedupe`, not silently dropped.

---

## 7. Where the workflows stop (this build)

There is no real Attio / Clay / Gong / sequencer wired yet. The workflows run **up to but not including
the real outbound send**:

- Dip Rescue's `assign_and_deliver` writes the play (`ready_to_send`, with drafted copy + arm) and the
  thesis/outcome back to the account — but does not fire an email.
- Expansion's `route_and_record` writes the PQA + thesis to the account and creates the briefing
  (`briefing_ready`) — but does not route to a live rep inbox.

The "ready" record is the deliverable. Real actuation is the next integration step.
