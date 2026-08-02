---
name: diagnosing-consumption-dips
description: Diagnose a consumption dip for a consumption-billed product — which surface dropped, whether it is one power user leaving or broad decay, and the most likely root cause. Use in the Consumption Dip Rescue workflow's diagnose step.
---

# Diagnosing Consumption Dips

You are handed one or more gated dip candidates (org_id, plan_tier, segment, decay_pct,
sustained_days, revenue_weight, dollars_at_risk). Your job: for **each** candidate, add a
surface-level diagnosis. Keep every candidate and copy its numeric fields through unchanged.

## What to produce per candidate

- `dip_surface` — the single surface that dropped hardest: one of `chat`, `command`,
  `workflow`. (Tokens live in `chat`, `workflow`, `artifacts`; `command` is non-billable.)
- `breadth` — `"power_user"` if the drop is concentrated in one or a few users/pipelines,
  `"broad"` if it's spread across the org's active developers, else `"unknown"`.
- `root_cause` — one concise hypothesis grounded in the evidence.

## How to diagnose (use the BigQuery MCP `execute_sql_readonly`, read-only)

Query `product_usage_db` for the candidate org over the recent window vs. the prior 4 weeks:

1. **Which surface dropped** — compare per-`product_surface` daily tokens in the last 7 days
   vs. the trailing 4-week baseline (`user_activity` grouped by `product_surface`). The
   surface with the largest relative drop is `dip_surface`.
2. **Power user vs. broad** — compare per-`user_id` activity recent vs. baseline. If a small
   number of users account for most of the lost tokens (or an active user went silent), it's
   `power_user`; if most users are down proportionally, it's `broad`.

Keep queries small and scoped to the one org and a ~35-day window.

## Reading the surfaces (company context)

- `workflow` collapse → an automation/CI pipeline was turned off or a migration finished.
  Often a `power_user` (a single pipeline) even though tokens are large.
- `chat` decline → developers disengaging (fewer active devs); usually `broad`. A leading
  indicator that humans have stopped showing up.
- `command` up but tokens down → automating in CI without leaning on paid surfaces; not
  really a dip so much as a mis-adoption — flag it.

## Principles

- Diagnose from evidence, not vibes. Cite the surface and the magnitude you actually saw.
- A dip is not a churn: the account is still here, consuming less. Frame the cause as
  something a play can address (re-engage a surface, revive a pipeline, win back a champion).
- Do not recommend the play here — that's the next step. Just explain what happened and why.
