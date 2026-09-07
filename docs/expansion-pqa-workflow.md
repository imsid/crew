# Expansion/PQA workflow

Status: implemented

## Goal

Turn a deterministic set of product-qualified accounts into a small set of actionable
expansion plays. Product usage identifies which accounts are growing; the Growth Agent
uses company headroom and timing to decide whether that growth calls for a self-serve nudge
or a sales briefing.

The workflow uses the same boundary as Consumption Dip: code owns facts and side effects;
the agent owns judgment.

## Shape

```text
select-play-candidates (code)
  -> curate-plays (agent, expansion-pqa skill)
  -> commit-plays (code)
```

The curation and commit steps are shared with Consumption Dip. Expansion supplies only its
own deterministic selection logic, snapshot schemas, workflow ID, and Growth skill.

## 1. Select play candidates

The precheck:

- computes token growth, active-developer growth, and new-surface adoption;
- combines them into the deterministic raw PQA score;
- keeps accounts with `pqa_raw >= 40`;
- removes accounts already covered by an open opportunity;
- attaches CRM and company context;
- writes one `crm_db.play_candidates` row per eligible account; and
- returns those rows with schemas explaining every snapshot field.

The usage snapshot contains:

- `as_of_date`;
- `token_slope`;
- `active_dev_growth`;
- `active_users_start` and `active_users_now`;
- `new_surface_adopted` and, when present, `new_surface`; and
- `pqa_raw`.

The organization snapshot contains the plan tier plus available account context such as
owner, segment, lifecycle stage, headcount, funding stage, last raise, hiring signals, and
the account team's existing thesis.

## 2. Curate plays

The Growth agent receives the complete candidate set and loads the `expansion-pqa` skill.
It cannot query the warehouse or write state.

For every account it judges:

- usage trajectory — how quickly product use and the active team are growing;
- company headroom — whether current adoption is a ceiling or a beachhead; and
- timing — whether funding or engineering hiring makes now a meaningful moment.

It then groups all accounts into the fewest plays that preserve a meaningful action
difference. The expected motions are:

- a developer-facing self-serve upgrade nudge; or
- an internal sales expansion briefing.

The result uses the shared `CuratedRun` contract: play name, criteria, reusable copy
template, template-variable declarations, and the assigned candidates with only the raw
values needed to render their copy.

## 3. Commit plays

The shared postcheck:

- validates that every selected account appears on exactly one non-empty play;
- rejects unknown accounts, duplicate assignments, and invalid template values;
- derives stable play IDs;
- commits play definitions and candidate assignments in one transaction;
- renders the briefing from the validated structured output; and
- returns persisted assignment counts.

A failed proposal leaves no partial play state, and retrying a successful commit does not
duplicate plays or artifacts.

## Scope

The deliverable is the committed candidate set, play set, assignments, and briefing
artifact. This workflow does not send outbound messages, route work to a live rep inbox,
assign experimental holdouts, update account theses, or calculate a downstream NRR
readout.

## Why one agent step

The previous expansion design separated thesis building from personalization and threaded a
large mutable account model through both agent turns. The candidate-table design gives one
Growth turn all required evidence and asks for one closed structured result. Selection,
validation, rendering, and persistence remain deterministic code.
