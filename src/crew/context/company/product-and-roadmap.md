---
title: Ampere — Product & Roadmap
doc_type: company-context
author_role: Chief Product Officer
audience: growth-crew
status: current
last_reviewed: 2026-05-29
---

# Ampere — Product & Roadmap

> The product surface map and where it's going. The Growth Crew uses this to attribute a consumption
> dip to a *specific* surface, and to reason about which new surface an account is ready to adopt.

## The three surfaces

### chat (surface: `chat`)
The entry point. Conversational coding: ask a question, paste an error, get a fix. Low token weight
per message but high frequency. Almost every account starts here. Health of `chat` usage is the best
proxy for **daily active developers** — when chat drops, the humans have stopped showing up.

- Activities: `chat_messages_sent`, `artifacts_published` (a chat can produce a saved artifact).
- Leading indicator of: overall account engagement, seat expansion within an org.

### command (surface: `command`)
Deterministic CLI. `ampere run`, `ampere fix`, `ampere review`. Runs in the terminal and in CI.
Metered but **not billable** — commands orchestrate model calls rather than being the inference
themselves. High command usage without token growth means an account is automating but not yet
leaning on the paid surfaces; it's a self-serve expansion opening.

- Activities: `commands_executed`.
- Leading indicator of: CI/CD integration depth, stickiness, readiness for `workflow`.

### workflow (surface: `workflow`)
The durable automation engine and the **expansion flywheel**. Multi-step agent loops: automated code
review on every PR, large-scale migrations, scheduled refactors. Heaviest token weight by far. Gated
to `team` and above. When an account turns on `workflow`, consumption steps up permanently.

- Activities: `workflows_run`, `artifacts_published`.
- Leading indicator of: durable expansion, platform commitment, enterprise readiness.

## Consumption ladder

The healthy growth path — and the map the Expansion/PQA workflow walks:

```
free (chat + command)  →  team (adds workflow)  →  business (scale + controls)  →  enterprise (committed)
        hobbyist                 startup                  scaling startup                  large org
```

Each rung up the ladder is a **new-surface adoption** or a **tier upgrade**, both of which the
warehouse can see before a human notices.

## Roadmap (next two quarters) — expansion levers

The Growth Crew should treat these as *reasons to reach out now*, matched to account signal:

- **Workflow templates marketplace** (shipping) — one-click adoption of `workflow` for chat-heavy
  accounts that haven't crossed the gate. Primary self-serve expansion lever for startups.
- **CI-native review** (shipping) — deepens `command`→`workflow` conversion for command-heavy accounts.
- **Org-level usage analytics + budgets** (beta) — unblocks `business`-tier upgrades where finance
  wants controls before scaling spend.
- **VPC / on-prem workflow runners** (planned) — the gate that converts security-sensitive enterprises
  from `business` to `enterprise` committed-use.
- **Fine-tuned repo context** (planned) — raises tokens-per-developer across all tiers; lifts the
  ceiling for already-expanding accounts.

## How this maps to signals

| If the warehouse shows… | The likely product story is… | Relevant roadmap lever |
|---|---|---|
| chat down, command flat | fewer active devs, disengagement | re-engagement, not a feature |
| chat flat, command up, no workflow | automating in CI, ready for more | workflow templates / CI-native review |
| workflow adopted, tokens climbing | durable expansion underway | usage analytics + budgets (business upgrade) |
| all surfaces up, headcount large | enterprise-shaped growth | VPC runners → committed-use |

See [[personas-and-tiers]] for how the same raw delta means different things by customer size.
