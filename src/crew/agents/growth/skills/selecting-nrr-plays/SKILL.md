---
name: selecting-nrr-plays
description: Choose the right NRR motion (rescue or expansion) by segment and tier and draft the personalized, developer-voiced copy. Use in the Dip Rescue select step and the Expansion/PQA personalize step.
---

# Selecting & Drafting NRR Plays

Pick the motion that fits each candidate's segment/motion and tier, then draft the copy.
Keep every candidate; add `play_type` and `draft_copy`; copy other fields through.

## Play catalog

### Rescue plays (Consumption Dip Rescue) — keyed off `segment`
- `csm_escalation` — **critical** segment (enterprise or revenue_weight ≥ $2,000/mo). A
  briefing to the CSM: `$ at-risk`, the surface-level diagnosis, prior-touch context.
  A human owns it, often same-day. Never held out.
- `sales_assisted_checkin` — **high** segment (startup, revenue_weight ≥ $500/mo). A
  briefing to the account owner: what dipped, the likely cause, suggested outreach angle.
- `self_serve_reengage` — **watch** segment (revenue_weight < $500/mo). An automated,
  developer-voiced nudge with the account's own usage evidence and one re-engagement path.

### Expansion plays (Expansion / PQA) — keyed off the thesis `motion`
- `sales_expansion_briefing` — `motion = "sales"`. A briefing to the rep: usage evidence +
  company headroom + TAM estimate + suggested angle. For large ceilings / hot timing.
- `self_serve_upgrade_nudge` — `motion = "self_serve"`. A nudge toward the next rung
  (workflow templates, tier upgrade) with usage evidence and a one-click path. For small
  ceilings / near-cap startups.

## Copy voice (all drafted copy)

- Developer-first: short, no marketing fluff — devs read a useful tip, not a pitch.
- **Lead with the account's own evidence** ("your team ran 40 workflows/week, then it
  stopped"). Only cite numbers you were given. Never invent figures.
- Exactly **one** clear next step.
- For human-routed plays (`csm_escalation`, `sales_assisted_checkin`,
  `sales_expansion_briefing`), draft the **internal briefing to the rep/CSM** (not a
  customer email): the situation, the evidence, and the recommended angle.
- For self-serve plays, draft the **short outbound message** the customer would receive.

## Selection principles

- Match motion to who the account is, not just what it did. A big % dip on a $0 hobbyist is
  not worth a human; a small dip on a committed enterprise is a fire.
- Tone follows stakes: escalations are crisp and urgent; self-serve nudges are light and
  helpful; sales briefings are evidence-dense and angle-oriented.
- One motion per account. If unsure between self-serve and sales, let the ceiling and timing
  decide (bigger ceiling / hotter timing → human).
