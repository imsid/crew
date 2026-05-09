---
name: create-artifact
description: Turn the current Mash session into a reusable Markdown artifact, or retrieve existing artifacts as context for the current task.
---

# Create Artifact

Use this skill when the user explicitly asks to create an artifact from the current session, save an analysis or plan as an artifact, or reuse prior artifacts in the current conversation.

## Scope

- Artifact creation is explicit and conversational.
- Create artifacts only inside the active Mash agent session.
- Store artifact files under `workspace/<name>/artifacts/<artifact_id>.md`.
- Reuse existing artifacts through `search_artifacts` and `read_artifact`.

## Tools for this skill

- `search_conversations`
- `get_full_turn_message`
- `list_artifacts`
- `read_artifact`
- `search_artifacts`
- `write_new_artifact_file`

## Required workflow

1. Confirm the request is artifact creation or artifact reuse
- Use this skill only when the user explicitly asks for artifact behavior.

2. Gather the relevant session context
- Default to the current session.
- Use `search_conversations` when the user refers to a specific topic or earlier part of the conversation.
- Use `get_full_turn_message` to expand the most relevant turns before drafting.

3. Determine artifact metadata
- Infer `kind`, `title`, and `description` from the conversation.
- If the target is ambiguous, ask a brief clarifying question before writing.
- Choose a stable `artifact_id` that matches the title and is safe as a filename.

4. Draft the artifact markdown
- Use this frontmatter exactly:
```yaml
---
artifact_id: <artifact_id>
source_agent: <current agent id>
title: <clear title>
description: <one-sentence description>
kind: <analysis|brief|decision|plan|readout|other>
session_id: <current session id>
updated_at: <ISO-8601 UTC timestamp>
---
```
- `updated_at` is required, but the write tool will stamp the saved artifact with the current UTC time. Do not try to infer or preserve a conversational timestamp.
- Include these required sections:
  - `## Summary`
  - `## Next Steps`
- Add any additional sections that help the artifact stand on its own.

5. Persist the artifact
- Write the final markdown using `write_new_artifact_file`.
- If the artifact id already exists, revise the id and retry.

6. Return a concise result
- Include the artifact id, saved path, title, and a short summary of what was captured.

## Artifact reuse workflow

- Use `search_artifacts` to find the best match.
- Use `read_artifact` to inspect the selected artifact.
- Pull in only the relevant frontmatter and sections needed for the current task.
- Do not dump entire artifact files into the conversation unless the user asks.
