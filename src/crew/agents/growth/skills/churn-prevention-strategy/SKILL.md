---
name: churn-prevention-strategy
description: Read a consumption-dip run — what the decay signal means, how to group the accounts into a few plays, and how to write the copy. Load for the curate step of consumption-dip-rescue.
---

# Churn Prevention Strategy

The strategy half of a `consumption-dip-rescue` run. The code step already picked the
accounts; this is how to read them, how to group them, and how the copy goes.

## 1. What the signal means

Ampere is billed by tokens on top of a plan base fee. **Revenue is usage**, so there is
no cancel event to react to — an account leaves by using less, quarter over quarter,
until the invoice is small enough that nobody renews it. The consumption dip is the
churn-equivalent signal, and it is early: the money is still there when you see it.

Three snapshot fields carry the signal, and they mean different things:

- **`decay_pct`** — depth, against the account's *own* four-week baseline. A 40% drop is
  40% off what that account normally does, not off some cohort average. This is the
  headline number and the one that belongs in the copy.
- **`sustained_days`** — whether it is real. A week of low usage is a holiday, a sprint
  boundary, a release freeze. Twelve consecutive days below 0.8x baseline is a habit
  that has changed. Depth without sustain is noise; sustain is what makes it a leak.
- **`dollars_at_risk`** — what it is worth, `consumption_mrr x decay_pct`. This is the
  number that decides how much human attention the account is owed.

Read them together. A 70% drop on a $180/mo account is a smaller problem than a 25% drop
on a $9,000/mo enterprise account, and `dollars_at_risk` already says so. Sort by it.

`active_users` and `account_age_days` are the context that separates causes: a dip with
active users flat is *usage per developer* falling (they are using something else for
part of the work); a dip with active users falling is *people leaving the tool*. The
second is worse and moves faster.

## 2. Grouping the run into plays

A play is a group of accounts that get the same argument in the same voice. Three or
four per run is the right order of magnitude. Two things decide where the lines fall:

- **Who reads it.** Copy written for a CSM or account owner and copy written for the
  customer are different documents. Never mix them in one play.
- **What the argument is.** Accounts whose developer count collapsed need a different
  opening than accounts whose developers are still there but doing less. If two groups
  would get materially different first sentences, they are two plays.

Weight the response to what the account is worth. `plan_tier` and `dollars_at_risk`
read together are what you have: an enterprise account, or anything carrying serious
money, is worth a named human's time this week; a small account is worth an automated
nudge and nothing more. The two fields disagree often enough that the judgment is the
point — a $700/mo enterprise account is still an enterprise relationship, and a
$3,000/mo team account is a real fire whatever its tier says.

Resist splitting further. If eleven accounts are all mid-sized startups with a broad
decay, that is **one** play with one template, not eleven. Writing a play per account
means you have misunderstood the job.

## 3. Writing the copy

One template per play, rendered per account from its own snapshot.

- **Lead with their own drop.** `{org_name}'s token usage is down {decay_pct} from their
  four-week baseline` beats any framing you could invent. It is specific, it is theirs,
  and it is checkable.
- **Then the sustain, then the money.** Depth says something happened; sustain says it
  stuck; dollars say why anyone should care today.
- **One next step.** A call this week, a template to try, a doc to read. Not three.
- **Good template variables** are the fields that vary per account and carry weight:
  `decay_pct` (`percent0`), `sustained_days` (`integer`), `dollars_at_risk` (`usd0`),
  `org_name`, `active_users` (`integer`). Formats matter — `percent0` renders 0.476 as
  "48%", which is what a human reads; the raw 0.476 is not.
- **Never state a cause you cannot see.** The snapshots say usage fell, not why. "Worth a
  call — find out what changed" is honest; "your team switched to a competitor" is a
  guess that will embarrass whoever sends it.
- **Match the voice to the reader.** An internal briefing is situation, evidence,
  recommended angle — dense and unpolished is fine. A customer message is short,
  developer-voiced, and leads with something useful to them.

## 4. Sanity checks before you finish

- Preview each play's copy against real rows. If a rendered example reads oddly for an
  actual account, the template is wrong, not the account.
- Every account is on exactly one play; `unassigned_remaining` is 0.
- The plays add up to a story a CSM lead could act on in ten minutes.
