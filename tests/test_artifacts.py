from __future__ import annotations

import asyncio
from pathlib import Path
from unittest.mock import patch

from crew.agents.data.spec import DataAgentSpec
from crew.agents.engineer.spec import EngineerAgentSpec
from crew.agents.pm.spec import PMAgentSpec
from crew.artifacts.service.context import build_tool_context
from crew.artifacts.service.parser import parse_and_validate_artifact
from crew.artifacts.service.repo import (
    list_artifacts,
    read_artifact,
    search_artifacts,
    write_new_artifact_file,
)
from crew.artifacts.tools import build_artifact_tools


def _artifact_markdown(
    artifact_id: str = "launch_readout_q2",
    *,
    title: str = "Q2 Launch Readout",
    description: str = "Summary of launch performance and follow-up work.",
    kind: str = "readout",
    source_agent: str = "pm",
    session_id: str = "pm-session-1",
) -> str:
    return f"""---
artifact_id: {artifact_id}
source_agent: {source_agent}
title: {title}
description: {description}
kind: {kind}
session_id: {session_id}
updated_at: 2026-04-05T12:00:00Z
---

## Summary

Launch performance was strong in paid and lifecycle channels.

## Evidence

- Activation improved 12% week over week.

## Next Steps

- Investigate conversion lag by channel.
"""


def _artifact_html(
    artifact_id: str = "launch_dashboard_q2",
    *,
    title: str = "Q2 Launch Dashboard",
    description: str = "Interactive launch dashboard with inline charts and layout.",
    kind: str = "readout",
    source_agent: str = "pm",
    session_id: str = "pm-session-1",
) -> str:
    return f"""---
artifact_id: {artifact_id}
format: html
source_agent: {source_agent}
title: {title}
description: {description}
kind: {kind}
session_id: {session_id}
updated_at: 2026-04-05T12:00:00Z
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>{title}</title>
    <style>
      body {{ font-family: sans-serif; margin: 24px; }}
      .grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }}
      .card {{ border: 1px solid #d6d3d1; border-radius: 12px; padding: 16px; }}
    </style>
  </head>
  <body>
    <main>
      <h1>{title}</h1>
      <div class="grid">
        <section class="card">
          <h2>Summary</h2>
          <p>Activation improved 12% week over week.</p>
        </section>
        <section class="card">
          <h2>Visualization</h2>
          <svg width="220" height="80" viewBox="0 0 220 80" role="img" aria-label="Trend">
            <polyline fill="none" stroke="#2563eb" stroke-width="4" points="10,60 70,48 130,38 210,18"></polyline>
          </svg>
        </section>
      </div>
      <script>
        document.body.dataset.rendered = "true";
      </script>
    </main>
  </body>
</html>
"""


def test_parse_and_validate_artifact_accepts_flexible_sections() -> None:
    payload = parse_and_validate_artifact(_artifact_markdown())

    assert payload["frontmatter"]["artifact_id"] == "launch_readout_q2"
    assert payload["frontmatter"]["format"] == "markdown"
    assert payload["sections"]["Summary"].startswith("Launch performance")
    assert payload["sections"]["Evidence"].startswith("- Activation")
    assert payload["sections"]["Next Steps"].startswith("- Investigate")


def test_artifact_service_lists_reads_searches_and_writes(tmp_path: Path) -> None:
    context = build_tool_context(tmp_path)
    write_payload = write_new_artifact_file(context, _artifact_markdown())

    assert write_payload["status"] == "written"
    assert write_payload["artifact_id"] == "launch_readout_q2"
    assert write_payload["format"] == "markdown"
    assert write_payload["updated_at"].endswith("Z")
    assert write_payload["updated_at"] != "2026-04-05T12:00:00Z"

    listed = list_artifacts(context)
    assert listed["count"] == 1
    assert listed["artifacts"][0]["title"] == "Q2 Launch Readout"
    assert listed["artifacts"][0]["format"] == "markdown"
    assert listed["artifacts"][0]["updated_at"] == write_payload["updated_at"]

    read_payload = read_artifact(context, "launch_readout_q2")
    assert read_payload["frontmatter"]["source_agent"] == "pm"
    assert read_payload["frontmatter"]["format"] == "markdown"
    assert "## Summary" in read_payload["content"]
    assert read_payload["frontmatter"]["updated_at"] == write_payload["updated_at"]

    searched = search_artifacts(context, query="launch performance", limit=5)
    assert searched["count"] == 1
    assert searched["results"][0]["artifact_id"] == "launch_readout_q2"
    assert searched["results"][0]["format"] == "markdown"


def test_artifact_service_supports_html_documents(tmp_path: Path) -> None:
    context = build_tool_context(tmp_path)
    markdown_payload = write_new_artifact_file(context, _artifact_markdown())
    html_payload = write_new_artifact_file(
        context,
        artifact_content=_artifact_html(),
        format="html",
    )

    assert html_payload["artifact_id"] == "launch_dashboard_q2"
    assert html_payload["format"] == "html"
    assert html_payload["path"].endswith(".html")

    listed = list_artifacts(context)
    assert listed["count"] == 2
    assert {item["format"] for item in listed["artifacts"]} == {"markdown", "html"}

    html_read = read_artifact(context, "launch_dashboard_q2")
    assert html_read["format"] == "html"
    assert html_read["frontmatter"]["format"] == "html"
    assert html_read["ordered_sections"] == []
    assert "<body>" in html_read["content"]

    html_search = search_artifacts(context, query="interactive dashboard", limit=5)
    assert html_search["count"] == 1
    assert html_search["results"][0]["artifact_id"] == "launch_dashboard_q2"
    assert html_search["results"][0]["preview"] == "Interactive launch dashboard with inline charts and layout."

    duplicate_error = None
    try:
        write_new_artifact_file(
            context,
            artifact_content=_artifact_html(artifact_id=markdown_payload["artifact_id"]),
            format="html",
        )
    except ValueError as exc:
        duplicate_error = str(exc)
    assert duplicate_error is not None
    assert "artifact already exists" in duplicate_error


def test_artifact_service_rejects_empty_or_malformed_html(tmp_path: Path) -> None:
    context = build_tool_context(tmp_path)
    malformed = """---
artifact_id: malformed_html
format: html
source_agent: pm
title: Broken HTML
description: Broken.
kind: readout
session_id: pm-session-1
updated_at: 2026-04-05T12:00:00Z
---
<html><head><title>Broken</title></head><body>"""

    with patch("crew.artifacts.service.repo._current_utc_timestamp", return_value="2026-05-10T12:00:00Z"):
        try:
            write_new_artifact_file(context, artifact_content=malformed, format="html")
            raise AssertionError("expected html validation to fail")
        except ValueError as exc:
            assert "html artifact must include a <body>...</body> block" in str(exc)


def test_artifact_tools_execute_against_workspace_root(tmp_path: Path) -> None:
    tools = {tool.name: tool for tool in build_artifact_tools(tmp_path)}
    write_result = asyncio.run(
        tools["write_new_artifact_file"].execute(
            {"artifact_markdown": _artifact_markdown(artifact_id="artifact_one")}
        )
    )
    assert not write_result.is_error

    list_result = asyncio.run(tools["list_artifacts"].execute({}))
    assert not list_result.is_error
    assert "artifact_one" in list_result.content

    html_write_result = asyncio.run(
        tools["write_new_artifact_file"].execute(
            {
                "artifact_content": _artifact_html(artifact_id="artifact_html"),
                "format": "html",
            }
        )
    )
    assert not html_write_result.is_error
    assert "\"format\": \"html\"" in html_write_result.content


def test_shared_artifact_skill_and_tools_are_available_across_agents(
    tmp_path: Path,
) -> None:
    pm_spec = PMAgentSpec()
    data_spec = DataAgentSpec()

    assert "create-artifact" in {skill.name for skill in pm_spec.build_skills().list_skills()}
    assert "create-artifact" in {skill.name for skill in data_spec.build_skills().list_skills()}
    assert {
        "list_artifacts",
        "read_artifact",
        "search_artifacts",
        "write_new_artifact_file",
    }.issubset(set(pm_spec.build_tools().list_tools()))
    assert {
        "list_artifacts",
        "read_artifact",
        "search_artifacts",
        "write_new_artifact_file",
    }.issubset(set(data_spec.build_tools().list_tools()))

    with patch.dict(
        "os.environ",
        {
            "GITHUB_REPOS": str(tmp_path),
            "GITHUB_URL": "https://github.com/org/repo",
        },
        clear=False,
    ):
        engineer_spec = EngineerAgentSpec()
        assert "create-artifact" in {
            skill.name for skill in engineer_spec.build_skills().list_skills()
        }
        assert {
            "list_artifacts",
            "read_artifact",
            "search_artifacts",
            "write_new_artifact_file",
        }.issubset(set(engineer_spec.build_tools().list_tools()))
