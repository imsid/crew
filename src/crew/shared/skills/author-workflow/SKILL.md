---
name: author-workflow
description: Design and publish reusable non-code Crew workflows through chat after collecting the required SKILL and workflow contracts.
---

# Author Workflow

Use this skill when the user explicitly asks to create, publish, save, or turn a repeatable process into a workflow.

## Required Outcome

Create a reusable authored SKILL plus a normalized workflow definition that processes the workflow input and publishes one HTML artifact. Publish only after explicit user approval. Do not write Python code. Do not call `publish_workflow` until the user approves the preview.

## Tools

- Use `publish_workflow` only after explicit approval.
- For session-to-workflow requests, use `search_conversations` and `get_full_turn_message` before drafting.

## Required workflow

1. Confirm workflow intent
- Use this skill only for repeatable workflow creation or publishing.
- Capture the user goal, success criteria, expected final output, and side effects.

2. Handle session-to-workflow requests
- If the user asks to turn the current conversation into a workflow, use Mash runtime history tools before drafting.
- First call `search_conversations` with `scope` set to `session` to find the relevant turns from the current session. Use several targeted searches if needed, such as the business goal, analysis topic, tools used, outputs produced, and user approval language.
- Then call `get_full_turn_message` with `pairs` containing the relevant `session_id` and `turn_id` values to load the full user and assistant messages.
- Use the loaded turns to infer reusable inputs, ordered steps, decisions already made, expected outputs, side effects, and structured output fields.
- Ask only for missing contract details that cannot be inferred from the session history.
- Include `source_session_id` in the workflow definition when publishing from conversation history.

3. Generate the reusable SKILL contract
- `skill.name`: stable lowercase name using letters, numbers, hyphens, or underscores.
- The SKILL name must describe the reusable instruction set, not the workflow id or a version. Examples: `experiment-readout-analyst`, `weekly_metrics_review`, `launch-readiness-checker`.
- `skill.description`: one sentence describing when to use the SKILL to produce raw workflow results and publish them as an HTML artifact.
- `skill.content`: complete reusable task instructions that can be loaded by the workflow task agent.
- The SKILL content must instruct the task agent to process the user's workflow input, produce the raw results, and publish them by calling `write_new_artifact_file`.
- The `write_new_artifact_file` call must use this shape:
```json
{
  "artifact_content": "<artifact document containing required frontmatter and the raw results in the HTML body>",
  "format": "html"
}
```
- The artifact document passed as `artifact_content` must include the required artifact frontmatter fields: `artifact_id`, `format`, `source_agent`, `title`, `description`, `kind`, `session_id`, and `updated_at`.
- The artifact document body should contain the raw workflow results. Do not invent a separate artifact publishing mechanism.
- After `write_new_artifact_file` succeeds, use the tool result's `artifact_id` or `title` as `artifact_name`, then return only the structured result with the run time and artifact name.

4. Gather the workflow contract
- `workflow.workflow_id`: stable lowercase id using letters, numbers, and hyphens.
- `workflow.name`: short human-readable name.
- `workflow.description`: one-sentence purpose.
- `workflow.input_schema`: JSON object schema describing the user request and any required parameters needed to generate the HTML artifact.

5. Gather the single task contract
- Create exactly one workflow task for v1 authored workflows.
- `task_id`: stable lowercase id using letters, numbers, and hyphens.
- `agent_id`: the primary agent id.
- `title`: short label.
- `structured_output`: use exactly this JSON object schema unless the user explicitly asks to rename fields:
```json
{
  "type": "object",
  "properties": {
    "run_time": {
      "type": "string",
      "description": "ISO 8601 timestamp when the workflow task completed."
    },
    "artifact_name": {
      "type": "string",
      "description": "Name or artifact_id of the HTML artifact created by write_new_artifact_file."
    }
  },
  "required": ["run_time", "artifact_name"],
  "additionalProperties": false
}
```
- Put all execution instructions, expected inputs, required tools/skills, side effects, and any internal step sequence in the generated SKILL content.
- Treat the workflow task as the entrypoint into the authored SKILL, not as a place to store separate instructions.

6. Preview before publishing
- Show the SKILL name, SKILL description, SKILL content summary, workflow id, workflow name, input schema, single task, assigned agent, side effects, structured output schema, and source session id when present.
- Ask for explicit approval of both the workflow design and the fixed `structured_output` schema before publishing.
- If the user asks for changes, revise the preview and ask again.

7. Publish after approval
- Call `publish_workflow` with one normalized object containing `skill`, `workflow`, and `tasks`.
- Return the published `workflow_id`, `skill_name`, primary owner agent, task list, and run instructions.
- Only say the workflow was published if the `publish_workflow` tool returns a successful result.
- If `publish_workflow` is unavailable or returns an error, stop and report the exact failure. Do not use `InvokeSubagent`, artifact search, or prose instructions as a substitute for publishing.
