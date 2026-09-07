---
name: consumption-dip
description: Turn a selected consumption-dip run into actionable retention plays and evidence-based copy. Use for the curate-plays step of the consumption-dip workflow.
---

# Curate a consumption-dip run

The precheck has already selected the accounts. Decide which retention action fits each
one. Code validates and persists the result.

## Read the evidence

Treat the supplied evidence and company context as the sources of truth. Use the company
context for the business model, customer types, priorities, and any stated voice. Do not
import thresholds, segments, or causal assumptions from another company or playbook.

Missing data is unknown, not negative evidence. Distinguish what the row shows from what
you infer. A plausible cause may shape a diagnostic next step, but should not be stated
as fact.

If no accounts were selected, return an empty curation with a brief summary. Otherwise,
review every account and place each one on exactly one play.

## Design the plays

Use the fewest plays that preserve a meaningful difference in action. Accounts belong
together when the same audience should take the same next step for the same reason.
Separate them when the audience, urgency, or action changes. Do not create empty plays or
a play per account unless the evidence truly calls for a unique response.

For each play:

- Name the action clearly.
- State the shared evidence and decision in `criteria`.
- Write one concise template for its intended audience, with one next step.

Use only facts supported by the account evidence. Follow any routing, prioritization, or
voice rules in the company context.

Return the structured curation after this reasoning pass. Do not call other tools or
attempt to write state.
