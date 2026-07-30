---
title: Ampere — Business Model
doc_type: company-context
author_role: Chief Product Officer
audience: growth-crew
status: current
last_reviewed: 2026-05-29
---

# Ampere — Business Model

> Written by the CPO as the durable source of truth for how Ampere makes money.
> The Growth Crew workflows read this to reason about revenue, not just activity.

## What Ampere is

Ampere is an **AI coding-agent platform**. Developers work with Ampere through three surfaces:

- **chat** — conversational coding help, Q&A, pair-programming.
- **command** — deterministic CLI commands invoked from the terminal or CI (`ampere run`, `ampere fix`, …).
- **workflow** — durable, multi-step automations (code review, migration, refactor pipelines) that run agent loops on a schedule or trigger.

Every meaningful unit of work runs a model. **Revenue is usage.** There is no seat we can count on; the
thing customers pay for is the tokens their developers and automations consume.

## The consumption model

Ampere bills on **tokens consumed**, on top of a plan base fee. This is the single most important fact
about the business:

- **Revenue is a flow, not a subscription.** A customer never "cancels." They just consume less, and the
  revenue quietly leaks away. There is no churn event to catch — the signal has to be *manufactured* from
  the usage trajectory itself. This is the core reason the Consumption Dip Rescue workflow exists.
- **Expansion is organic.** More developers, more automations, and heavier surfaces (workflow > chat)
  all push consumption up without any new contract. Our job is to notice the accounts that are ready to
  grow and remove the friction — before a competitor does.

### Token economics

Tokens are consumed by the token-bearing activities. `command` executions are metered but effectively
free (they orchestrate rather than infer); the money is in `chat`, `workflow`, and `artifacts`:

| Activity | Surface | Relative token weight |
|---|---|---|
| `chat_messages_sent` | chat | light (400–1,800 tok/msg) |
| `artifacts_published` | chat / workflow | medium (1,200–5,000 tok) |
| `workflows_run` | workflow | heavy (2,500–9,000 tok/run) |
| `commands_executed` | command | zero billable tokens |

**Workflow adoption is the expansion flywheel.** An org that moves from chat-only into `workflow` runs
multiplies its token consumption several-fold. New-surface adoption is therefore one of the strongest
expansion signals we have.

## Plan tiers

Four tiers. The base fee buys a token allowance; overage is billed per million tokens. Higher tiers
unlock the heavier surfaces and the controls enterprises require.

| Tier | Base fee (mo) | Token price ($/M) | Who it's for | Notable gates |
|---|---|---|---|---|
| **free** | $0 | n/a (capped allowance) | hobbyists, evaluators | chat + command only; no workflow; community support |
| **team** | $99 | $18 | small startups, 3–15 devs | workflow unlocked; shared artifacts |
| **business** | $600 | $14 | scaling startups / mid-market | SSO, roles, higher rate limits, priority support |
| **enterprise** | custom (≥ $2,500 committed) | $10 (committed-use) | large orgs | VPC/on-prem option, audit, SLA, dedicated CSM |

Pricing constants live in `product_usage_db.plan_pricing` so the workflows compute `$` figures the same
way finance does: **`consumption_revenue = base_fee + tokens_consumed / 1e6 × per_million_tokens_usd`**.

## Why NRR is the goal metric

Because revenue is usage on an installed base, **Net Revenue Retention** is the number that captures the
whole business in one figure: this period's consumption revenue from existing accounts ÷ last period's.

- Below 100% → the base is leaking faster than it expands. Every silent dip is unrecovered revenue.
- Above 100% → expansion is outrunning the leak. This is the only durable growth for a consumption
  business, because it compounds without new logos.

The two Growth Crew workflows own the two halves of NRR: **Dip Rescue stops the leak**, **Expansion/PQA
drives the growth**. See [[personas-and-tiers]] for what a dip and an expansion look like per customer
type, and the CRO's [[revenue-strategy]] for the plays and thresholds.
