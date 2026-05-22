---
title: Crew Workflow Publishing Design
doc_type: design
status: proposal
audience: developers
---

# Crew Workflow Publishing Design

## Summary

Crew should make workflow publishing a centralized runtime capability backed by
the Crew database.

Users should be able to create and publish workflows from chat, command mode,
and eventually the web UI. These entry points should stay thin: they gather
intent, assemble a normalized workflow definition, preview it for the user, and
call a shared workflow service. The service owns validation, persistence,
versioning, Mash workflow registration, and run-time input handling.

For v1, Crew should support linear deterministic workflows only, and workflow
tasks should be limited to already registered agents such as `data`, `pm`,
`masher`, and any future host-registered agents. Crew should not dynamically
create new agents as part of workflow publishing.

## Mash Grounding

Mash workflows are currently code-defined `WorkflowSpec` objects composed of
ordered `TaskSpec` entries. Each `TaskSpec` binds a `task_id` to an `AgentSpec`.
Mash core does not own task prompts, artifacts, approval semantics, branching,
or workflow template metadata.

Workflow execution sends each task agent a normal Mash request with JSON text
containing:

```json
{
  "workflow_id": "experiment-readout",
  "workflow_run_id": "mw:h_example:experiment-readout:abc",
  "task_id": "analyze-experiment",
  "workflow_input": {},
  "task_state": {}
}
```

The task agent must return JSON object text only. That object becomes the next
task state in DBOS workflow output. Invalid JSON, non-object JSON, or a failed
request fails the workflow run.

DBOS remains responsible for orchestration, run status, run history, active-run
deduplication, and task-state continuity. Crew should own authoring, template
metadata, validation, publishing, and policy.

## Central Workflow Service

Add a Crew workflow service that owns all DB-backed workflow lifecycle behavior.
It should be the only place that calls `host.register_workflow(...)` for
Crew-published workflows.

The service should:

- Persist workflow templates and immutable published template versions in the
  Crew database.
- Validate workflow ids, task ids, task order, input schema, and allowed
  `agent_id` values.
- Limit workflow tasks to agents already registered in the host.
- Convert active workflow template versions into Mash `WorkflowSpec` objects.
- Register active workflows with the Mash host on app startup.
- Register newly published workflows immediately when the app is running.
- Own disable and unpublish behavior so disabled workflows cannot be run from
  Crew surfaces.
- Wrap run requests to validate `workflow_input` and inject the selected
  template version/task definitions into the run input.

The initial store can live alongside the existing beta database store, but the
workflow service should be a separate domain service rather than workflow logic
embedded in route handlers, CLI code, or agent tools.

## Stored Workflow Shape

Store a normalized JSON workflow definition with:

- `workflow_id`
- `name`
- `description`
- `status`: `draft`, `published`, or `disabled`
- `version`
- `input_schema`
- ordered `tasks`

Each task should include:

- `task_id`
- `agent_id`
- `title`
- `instructions`
- expected JSON state/output description

Published versions should be immutable. Editing a published workflow creates a
new version. Runs should record the version they started from so old runs remain
understandable after later edits.

At run time, Crew should inject template metadata into the workflow input. The
exact envelope can evolve, but it should separate user-provided input from
template execution metadata:

```json
{
  "user_input": {
    "experiment_name": "signup_checkout"
  },
  "workflow_template_version": 3,
  "tasks": [
    {
      "task_id": "analyze-experiment",
      "agent_id": "data",
      "instructions": "Run the configured experiment analysis and return JSON state."
    },
    {
      "task_id": "frame-recommendation",
      "agent_id": "pm",
      "instructions": "Use the analysis state to write product recommendation state."
    }
  ]
}
```

Agents use `workflow_id` and `task_id` from the Mash workflow request to select
their task instructions from the injected metadata. They must return JSON object
state only.

## Shared Skill

Create a new shared skill:

```text
src/crew/skills/publish-workflow/SKILL.md
```

The skill should be registered in all agents through the existing shared skills
path, the same way `create-artifact` is made available across agents.

The skill should instruct agents to:

- Use it only when the user explicitly asks to create, publish, save, or turn a
  repeatable process into a workflow.
- Gather missing workflow intent: goal, trigger/input fields, repeatable steps,
  target agents, expected output, and side effects.
- Draft the normalized workflow definition, not Python code.
- Validate that every task maps to an existing agent.
- Preview the workflow before publishing.
- Require explicit approval before publishing.
- Call one workflow publishing tool, such as `publish_workflow_template`.
- Return the published `workflow_id`, version, task list, and run instructions.

The skill is only an orchestrator. It should not define persistence rules,
registration rules, versioning behavior, or API semantics. Those belong in the
workflow service.

## Thin Entry Points

### Chat

Chat publishing uses the shared `publish-workflow` skill. The agent gathers
requirements, drafts a normalized workflow definition, previews it, waits for
explicit approval, and calls the workflow publish tool.

### CLI

Add workflow publishing commands that call the same service methods:

```bash
crew workflow validate --file workflow.yml
crew workflow publish --file workflow.yml
crew workflow disable <workflow_id>
```

The CLI should not duplicate validation or persistence logic. It should parse
the file, call the workflow service, and render service responses or errors.

### API and Web

Extend workflow routes to call the same service for create, validate, publish,
disable, list, and run. The web Workflows page can later add a create/edit
drawer backed by these APIs.

Existing run surfaces should remain conceptually unchanged:

- list workflows
- run workflow
- inspect run status
- stream run events

The list/detail responses should include Crew metadata such as `name`,
`description`, `source: "crew-db"`, `version`, status, and task labels.

## Candidate Crew Workflows

### Experiment Readout Publisher

Run configured experiment analysis, compute SRM/lift/confidence, create a
readout artifact, then ask PM for recommendation framing.

### Weekly Business Review

Gather selected metric trends, identify notable movements, summarize likely
drivers, and publish a weekly business artifact.

### Launch Readiness Check

Combine metric availability, experiment status, prior artifacts, and PM risk
framing into a launch readiness brief.

### Funnel Drop Diagnosis

Analyze funnel metrics, identify the largest regression or drop-off, and produce
follow-up actions.

### Metric Config Stewardship

Draft missing source or metric config changes, validate schema, and pause for
explicit approval before writes.

## Test Plan

- Shared `publish-workflow` skill appears in `data`, `pm`, and future shared
  agent skill registries.
- Publishing rejects unknown agents, duplicate task ids, invalid workflow ids,
  and invalid input schemas.
- Published workflows persist as immutable versions and register with the host.
- App startup loads active DB-backed workflows and registers them.
- CLI, API, and agent-tool publishing produce the same stored template shape.
- Run path validates input, injects template metadata, and executes through
  existing agents.
- Disabled workflows are listed as disabled but cannot be run.
- Invalid task JSON output fails the workflow run cleanly under Mash's existing
  failure model.

## Assumptions

- V1 supports linear deterministic workflows only.
- V1 uses existing registered agents only; no dynamic agent creation.
- The shared skill name is `publish-workflow`.
- True pause/resume approval tasks are future work.
- Artifacts remain agent/tool side effects, not workflow-engine-owned state.
