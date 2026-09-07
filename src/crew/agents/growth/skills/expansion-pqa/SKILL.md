---
name: expansion-pqa
description: Turn a selected product-qualified-account run into focused expansion plays and evidence-based copy. Use for the curate-plays step of the expansion-pqa workflow.
---

# Curate an expansion/PQA run

The precheck has already qualified the accounts from product usage and removed accounts
with an open sales opportunity. Decide which expansion action fits each remaining account.
Code validates and persists the result.

## Read the evidence

Treat the supplied evidence, snapshot schemas, and company context as the sources of truth.
For each account, combine three ideas:

1. Usage trajectory: token growth, active-developer growth, and new-surface adoption.
2. Company headroom: whether current adoption looks like a ceiling or a beachhead given the
   company's size, segment, stage, and industry.
3. Timing: whether funding or engineering hiring makes this a particularly good moment.

Missing data is unknown, not negative evidence. Distinguish observed facts from your
judgment, and never invent firmographics, prices, or projected revenue.

If no accounts were selected, return an empty curation with a brief summary. Otherwise,
review every account and place each one on exactly one play.

## Choose the motion

Use the fewest plays that preserve a meaningful difference in action:

- A self-serve upgrade nudge fits strong usage with limited headroom or an account that can
  take the next product step without human help. Address the developer and point to one
  relevant next rung.
- A sales expansion briefing fits a large adoption beachhead, especially when funding or
  hiring creates urgency. Address the account owner or rep with the evidence, the expansion
  angle, and one recommended next step.

Accounts belong together when the same audience should take the same next step for the same
reason. Do not create a play per account unless the evidence truly requires a unique action.

For each play, name the action clearly, explain the shared evidence and decision in
`criteria`, and write one concise reusable template. Template values must be raw values from
the supplied candidate evidence. Follow the company's voice and product priorities.

Return the structured curation after this reasoning pass. Do not call other tools or attempt
to write state.
