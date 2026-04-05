# Artifact Schema

Artifacts are flexible Markdown files with required frontmatter and two required
sections. The model may add additional sections as needed.

## Required Frontmatter

```yaml
---
artifact_id: launch_readout_q2
source_agent: pm
title: Q2 Launch Readout
description: Summary of launch performance, risks, and follow-up actions.
kind: readout
session_id: pm-session-123
updated_at: 2026-04-05T12:00:00Z
---
```

## Required Sections

```md
## Summary

Concise summary of the artifact.

## Next Steps

- Follow-up action 1
- Follow-up action 2
```

## Notes

- Additional sections are allowed.
- Artifact files are stored under `.mash/artifacts/`.
- `artifact_id` must be unique within the artifact store.
