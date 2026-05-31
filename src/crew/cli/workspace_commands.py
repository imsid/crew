"""Workspace management CLI commands."""

from __future__ import annotations

import argparse

from mash.cli.render import RichRenderer

from ..shared.config import CrewConfig, get_current_workspace, save_config
from ..shared.runtime_paths import DEFAULT_WORKSPACE_NAME, workspace_dir
from ..shared.workspaces import list_workspaces, resolve_workspace


def workspace_list(args: argparse.Namespace, renderer: RichRenderer) -> int:
    """List all available workspaces."""
    workspaces = list_workspaces()
    current = get_current_workspace()

    rows = []
    for ws in workspaces:
        marker = "* " if ws["workspace_id"] == current else "  "
        rows.append([marker + ws["workspace_id"], ws["path"]])

    renderer.table(["Workspace", "Path"], rows)

    if current:
        renderer.info(f"Current: {current}")
    else:
        renderer.info(f"Current: {DEFAULT_WORKSPACE_NAME} (default)")

    return 0


def workspace_show(args: argparse.Namespace, renderer: RichRenderer) -> int:
    """Show current workspace."""
    current = get_current_workspace()

    if current:
        renderer.info(f"Workspace: {current}")
        renderer.info(f"Path: {workspace_dir(current)}")
        renderer.info("Source: ~/.crew/config.json")
    else:
        renderer.info(f"Workspace: {DEFAULT_WORKSPACE_NAME} (default)")
        renderer.info(f"Path: {workspace_dir(DEFAULT_WORKSPACE_NAME)}")
        renderer.info("Source: Default (no config set)")
        renderer.info("Use 'crew workspace set <name>' to configure")

    return 0


def workspace_set(args: argparse.Namespace, renderer: RichRenderer) -> int:
    """Set default workspace."""
    workspace_id = args.workspace_id

    # Validate workspace exists
    resolve_workspace(workspace_id)  # Raises if not found

    # Save config
    config = CrewConfig(workspace_id=workspace_id)
    path = save_config(config)

    renderer.info(f"Workspace set to: {workspace_id}")
    renderer.info(f"Config saved to: {path}")

    return 0


def workspace_unset(args: argparse.Namespace, renderer: RichRenderer) -> int:
    """Clear workspace configuration."""
    # Clear config
    config = CrewConfig(workspace_id=None)
    save_config(config)

    renderer.info("Workspace configuration cleared")
    renderer.info(f"Will use default: {DEFAULT_WORKSPACE_NAME}")

    return 0
