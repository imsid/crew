---
name: building-expansion-thesis
description: Fuse a product-qualified account's usage trajectory with company enrichment and timing into an expansion thesis — motion, TAM estimate, confidence. Use in the Expansion/PQA workflow's thesis step.
---

# Building an Expansion Thesis

You are handed product-qualified accounts (org_id, token_slope, active_dev_growth,
active_users_start→now, new_surface_adopted, pqa_raw) already enriched with company signal
(domain, segment, headcount, funding_stage, last_raised_date, hiring_signals, tech_stack,
consumption_mrr). For **each** candidate, fuse the three axes into a thesis. Keep every
candidate; copy fields through; add the thesis fields.

## The three axes

1. **Usage trajectory** — who is growing and how fast (token_slope, active-dev growth, a
   newly adopted `workflow` surface = the expansion flywheel turning on).
2. **Company headroom** — how big the ceiling is. `headcount` is the key: 9 active devs in a
   12-person company is near the ceiling; 9 in a 4,000-person company is a beachhead with
   enormous headroom. Also weigh `funding_stage` (budget) and `tech_stack` fit.
3. **Timing moment** — is now the moment? A recent raise (`last_raised_date` within ~90 days)
   or heavy eng hiring (`hiring_signals`) means budget and urgency are present now.

## What to produce per candidate

- `motion` — `"self_serve"` or `"sales"`. Rule of thumb:
  - strong usage + **small** ceiling (hobbyist / near-cap startup) → `self_serve`.
  - strong usage + **large** ceiling (funded startup / enterprise), esp. hot timing →
    `sales`.
  - moderate usage + large ceiling + hot timing → `sales` (the ceiling × timing justifies a
    human even if usage is only moderate).
- `tam_estimate` — a rough dollar ceiling for the account, reasoned from headcount and how
  many devs could plausibly land on Ampere at the account's tier pricing. Show the logic
  briefly (e.g., "~200 eng × partial adoption at business rates ≈ $X/yr").
- `confidence` — 0–1, how strong the combined signal is.
- `thesis` — one tight paragraph: what the usage shows, how big the ceiling is, why now,
  and the recommended motion. Cite the specific numbers you were given.

## Principles

- Raw usage is necessary but not sufficient. Two accounts with identical `pqa_raw` can
  deserve opposite motions — the company signal decides. This fusion is the whole point.
- Never invent firmographics; reason only from the enrichment provided. If enrichment is a
  personal domain / headcount ~1 (a hobbyist), the ceiling is low → `self_serve`, low TAM.
- Be concrete about "why now." "They just raised a Series E and are hiring 60 engineers" is
  a moment; "established public company, no recent catalyst" is normal priority.
