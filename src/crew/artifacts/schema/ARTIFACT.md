# Artifact Schema

Artifacts are flexible document files with required frontmatter.
Markdown artifacts require two required sections. HTML artifacts require a
self-contained HTML document body.

## Required Frontmatter

```yaml
---
artifact_id: launch_readout_q2
format: markdown
source_agent: pm
title: Q2 Launch Readout
description: Summary of launch performance, risks, and follow-up actions.
kind: readout
session_id: pm-session-123
updated_at: 2026-04-05T12:00:00Z
---
```

## Required Markdown Sections

```md
## Summary

Concise summary of the artifact.

## Next Steps

- Follow-up action 1
- Follow-up action 2
```

## Notes

- Additional sections are allowed for Markdown artifacts.
- HTML artifacts must include a `<body>...</body>` block and stay self-contained with inline CSS/JS/SVG only.
- Artifact files are stored under `workspace/<name>/artifacts/`.
- `artifact_id` must be unique within the artifact store.
