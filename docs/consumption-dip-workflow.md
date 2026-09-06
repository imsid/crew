# Consumption dip workflow

Status: implemented on `feat/candidate-table-workflow`

## Goal

Turn a deterministic set of accounts with a consumption dip into a small set of
actionable retention plays.

The workflow has one boundary: code owns facts and side effects; the agent owns
judgment. The model should not query the warehouse, reproduce source records, validate
its own payload through tool calls, or write the result.

## Shape

```text
select-play-candidates (code)
  -> curate-plays (agent)
  -> commit-plays (code)
```

### 1. Select play candidates

The precheck:

- validates the requested workspace;
- reads usage and account context;
- applies the workflow's qualification rules;
- writes the run's candidate rows; and
- returns the selected rows with schemas describing every snapshot field.

Its output is intentionally limited to what the agent needs:

```python
class CandidateSet(BaseModel):
    as_of_date: str
    org_snapshot_schema: dict[str, dict[str, str]]
    usage_snapshot_schema: dict[str, dict[str, str]]
    candidates: list[CandidateRecord]
```

The selection SQL, run metadata, and database lookup mechanics do not belong in the
agent prompt. The workflow envelope and code steps already own them.

### 2. Curate plays

The agent receives the complete `CandidateSet`, loads the `consumption-dip` skill, and
returns one structured answer:

```python
class TemplateVariable(BaseModel):
    format: Literal["percent", "usd", "integer", "number", "text"]


class CuratedCandidate(BaseModel):
    org_id: str
    org_name: str
    values: dict[str, StrictStr | StrictInt | StrictFloat | StrictBool]


class CuratedPlay(BaseModel):
    play_name: str
    criteria: str
    copy_template: str
    template_vars: dict[str, TemplateVariable]
    candidates: list[CuratedCandidate]


class CuratedRun(BaseModel):
    title: str
    summary: str
    plays: list[CuratedPlay]
```

The model decides:

- which accounts warrant the same action;
- the audience, urgency, and next step for each play; and
- the evidence-based copy template for that play.

Each play carries its assigned accounts and only the values used by its template. The
output contains no separate assignment list and does not repeat complete snapshots.

The mandatory skill load followed by the structured answer is the complete agent loop.
No workflow-specific database or artifact tools are registered on the Growth agent.

### 3. Commit plays

The postcheck:

- reads the run's organization IDs to validate coverage and membership;
- validates play names, templates, values, and formatting;
- derives stable play IDs and all system-owned fields;
- writes plays and assignments in one transaction;
- renders the briefing directly from the curated plays; and
- returns counts read from the database.

Validation runs before mutation and reports all problems together. A failed proposal
leaves no partial state. A retry is idempotent.

## Instruction boundaries

The three instruction sources have distinct jobs:

- The Growth system prompt defines the durable role and the code/agent boundary. It is
  company- and workflow-neutral.
- Company context defines the business model, customer types, and operating priorities.
  A different company changes these documents rather than editing agent instructions.
- The `consumption-dip` skill explains how to make this workflow's judgment. It does not
  copy company facts, schemas, or qualification rules.

Snapshot schemas travel with each run. They are the authority for field meaning and
units, so the skill remains valid when a workflow changes its fields or thresholds.

## What stays deterministic

- qualification and dedupe rules;
- workspace and run identity;
- candidate persistence;
- assignment and template validation;
- play ID generation;
- transactional writes;
- artifact structure and rendering; and
- final counts.

## What remains judgment

- interpreting the signal in the current company context;
- deciding which differences merit separate actions;
- choosing the audience, urgency, and next step; and
- writing concise copy grounded in available evidence.

## Performance target

The previous workflow spent agent turns on reads, per-play writes, per-account
assignments, previews, and artifact generation. The redesigned agent loop is two model
turns: load the named skill, then return the curation. `max_steps` is three to leave one
recovery step without allowing a long-running loop.

The structured output includes only the values referenced by each play's template, not
the complete source snapshots.

## Reuse

The shared postcheck does not name consumption fields or branch on the workflow ID. A
second play workflow can reuse `CuratedRun`, validation, persistence, and rendering by
supplying its own deterministic selector, snapshot schemas, company context, and skill.
