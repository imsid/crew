---
name: debug
description: Debug a Mash workflow run in this repository's local Docker Compose stack from an `mw:` workflow run ID. Use to trace step snapshots, agent telemetry, container drift, validation failures, and local end-to-end verification.
---

# Debug a local workflow run

Treat the run ID as the primary key for the investigation. Work from persisted runtime
evidence toward source code; do not infer the agent input or output from the final error.

Start read-only. A local container may still connect to an external warehouse, so do not
rebuild services, resume or start runs, or alter data unless the user asked for a fix or
authorized that verification. Never print API keys or credential files.

## Establish the running system

Confirm the repository branch and worktree, then inspect the Compose definition and
running services. Determine whether application source is bind-mounted or installed in
the image. In this repository only the workspace is mounted; changing branch source does
not change a running `crew-host`. `docker compose up -d` can reuse an old image, so never
assume the container matches the checkout.

Use `docker compose ps`, the relevant health endpoint, and narrowly scoped service logs.
Prefer persisted run and telemetry APIs over log scraping; logs are supporting evidence.

## Read the run

Derive the workflow ID from the run ID or confirm it through the workflow-list endpoint.
Query the authenticated API from inside `crew-host`, reading `MASH_API_KEY` from the
container environment without echoing it. URL-encode the complete run ID.

Retrieve:

- `GET /api/v1/workflow/{workflow_id}/runs/{run_id}`
- `GET /api/v1/workflow/{workflow_id}/runs/{run_id}/step-events`

Record the workflow input, session ID, status, final error, and every step's kind, status,
attempt, input snapshot, output snapshot, agent request ID, and error. Find the first step
whose output is wrong; later validation errors are often only the detector.

For data-writing workflows, compare entity identities at every boundary. Distinguish a
wrong value produced by selection from one introduced by the agent or commit step.

## Trace an agent step

When a step has an agent request ID and the run has a session ID:

1. Query `/api/v1/telemetry/traces?session_id={session_id}` and select the trace whose
   `workflow_run_id` exactly matches the run.
2. Query `/api/v1/telemetry/events` with `agent_id`, `session_id`, and `trace_id`.
3. Query `/api/v1/telemetry/trace/analysis` with the same identifiers.

Inspect the initial workflow message, loaded skill, provider-facing
`structured_output_request`, tool calls and full tool results, terminal structured output,
step count, tool count, duration, and tokens. In particular, check whether memory,
conversation, or artifact tools introduced facts from another run.

Do not rely on an agent's prose account of its work. The tool-result events show what it
actually read, and the terminal structured output shows what crossed the workflow
boundary.

## Compare the container with the checkout

If snapshots do not match current models or instructions, inspect the installed modules
inside `crew-host` with Python `inspect`, including:

- the module path and source for the relevant step models;
- Pydantic `model_fields` and `model_json_schema()`;
- the built agent prompt, model, `max_steps`, registered custom tools, and whether Mash
  runtime tools are enabled; and
- Mash's normalized structured-output schema, not only raw Pydantic schema.

State container drift explicitly when proven. Rebuilding is part of the fix, not evidence
that the original run used the new code.

For structured output, look for dynamic dictionaries. Mash closes every object schema
for strict provider portability; a map whose keys are generated at runtime can therefore
become `additionalProperties: false` and only admit `{}`. Prefer arrays of typed
`{name, ...}` records at an agent boundary, then convert them to mappings in code and
reject duplicate names.

Also account for Mash's additive forward pipeline: a code step can receive workflow
envelope fields alongside the previous step output. Keep the agent output model strict,
but use a separate code-step input model when the envelope must be ignored.

## Fix and verify

When the user requested a fix, change the earliest faulty boundary and add a regression
that exercises the real invariant: provider-normalized schema, runtime tool exposure,
pipeline input composition, identity coverage, or transactional behavior. Keep business
reasoning in the skill/company context and structural requirements in typed code fields.

Run focused tests, the full suite, compilation, and diff checks. If local Docker
verification is authorized:

1. Rebuild the affected image explicitly with `docker compose up -d --build ...`.
2. Wait for health and re-inspect the live installed contract.
3. Start a fresh run with the original inputs. Do not rewrite history or present a new run
   as a retry of the old immutable run.
4. Verify all step statuses, database-backed result counts, the generated artifact, and
   agent trace efficiency.

Stop after one successful verification run. If it fails, use its new evidence to continue
the same investigation; do not launch repeated runs blindly.

## Report

Give the user:

- the root cause, separated into contributing failures when needed;
- evidence from the exact run and trace;
- the code or operational fix;
- tests and local Docker verification, including the new run ID; and
- any generated files, failed diagnostic runs, or uncommitted changes left behind.
