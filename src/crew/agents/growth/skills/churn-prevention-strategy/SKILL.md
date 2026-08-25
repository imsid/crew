---
name: churn-prevention-strategy
description: Read a consumption-dip run — what the decay signal means, how to group the accounts into a few plays, and how to write the copy. Load for the curate step of consumption-dip-rescue.
---

# Churn Prevention Strategy

The judgment half of a `consumption-dip-rescue` run. The code step picked the accounts
and put everything about them on the row; this is how to read them and what to do.

If `candidate_count` is 0, nothing qualified. Stop: no tool calls, no artifact, no
plays. Return zeros and a note naming the run.

## The signal

Revenue is usage, so a sustained drop in tokens *is* the churn event, and it is early —
the money is still there when you see it. Three fields carry it:

- `decay_pct` — depth, against the account's own four-week baseline. The headline
  number, and the one that belongs in the copy.
- `sustained_days` — whether it is real. A week is a holiday or a release freeze;
  twelve consecutive days below 0.8x baseline is a habit that changed.
- `dollars_at_risk` — `consumption_mrr x decay_pct`. What it is worth, and how much
  human attention it earns. Sort by it.

`active_users` separates the causes: flat while tokens fall means usage per developer
is dropping (they are doing part of the work elsewhere); falling means people are
leaving the tool, which is worse and faster.

Then read the drop against the company. `headcount` is the denominator — 14 active devs
is saturation at 60 people and a beachhead at 3,200. `funding_stage`, `last_raised_date`
and `hiring_signals` are timing: a company that just raised and is hiring engineers is
not shrinking, so its dip is a product or champion problem, not a budget one. `thesis`,
when present, is the account team's standing read; `owner` is who acts on it.

## Grouping

A play is a set of accounts that get the same argument in the same voice. Three or four
per run. Two things decide the lines:

- **Who reads it.** A briefing for a CSM and a message to a customer are different
  documents. Never in the same play.
- **What the argument is.** If two groups need materially different first sentences,
  they are two plays.

Weight by what the account is worth — `dollars_at_risk` and `plan_tier` together, and
they disagree often enough that the judgment is the point. If eleven accounts are all
mid-sized startups with broad decay, that is one play, not eleven.

## Copy

One template per play, rendered per account.

- Lead with their own drop: `{org_name}'s token usage is down {decay_pct} from their
  four-week baseline`. Specific, theirs, checkable.
- Then sustain, then money. One next step, not three.
- Formats matter: `percent0` renders 0.476 as "48%", which is what a human reads.
- Never state a cause you cannot see. "Worth a call — find out what changed" is honest;
  "your team switched to a competitor" is a guess that will embarrass the sender.

## Before you finish

Preview each template against real rows. Every account on exactly one play,
`unassigned_remaining` 0. The set should read as something a CSM lead can act on in ten
minutes.
