"""
Workspace context management for Crew.

Hosted requests receive their workspace as opaque Mash caller metadata. Local
commands may still bind a workspace explicitly or use the CLI selection.

## Context Resolution Strategy

When agent tools call current_workspace_id(), the workspace is resolved in order:

1. **Mash request metadata** - Trusted workspace attached by crew-api
2. **ContextVar (_workspace_id)** - Explicit local command override
3. **Config File (~/.crew/config.json)** - Persistent workspace preference
   - Shared by CLI and Beta API
   - Set via 'crew workspace set <name>'

4. **Default (marketing_db)** - Final fallback

## Usage Patterns

### Beta API Route:
```python
await client.post_request(..., metadata={"workspace": workspace_id})
```

### CLI:
```python
# User sets workspace once
$ crew workspace set product_usage_db

# All subsequent commands use it
$ crew agent repl
```

### Agent Tool:
```python
workspace_dir = current_workspace_dir()  # Resolves automatically
```
"""

from __future__ import annotations

import contextvars
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

try:  # pragma: no cover - unavailable only in stripped local installs
    from mash.logging import get_request_metadata
except Exception:  # pragma: no cover
    get_request_metadata = None  # type: ignore[assignment]

from .runtime_paths import selected_workspace_name, workspace_dir

_workspace_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "crew_workspace_id",
    default=None,
)
@contextmanager
def bound_workspace(workspace_id: str) -> Iterator[None]:
    normalized = selected_workspace_name(workspace_id)
    token = _workspace_id.set(normalized)
    try:
        yield
    finally:
        _workspace_id.reset(token)


def current_workspace_id() -> str:
    """
    Get current workspace ID from available context.

    Resolution order:
    1. Mash caller metadata (hosted agent/tool execution)
    2. ContextVar (explicit local command context)
    3. Config file (~/.crew/config.json)
    4. Default (marketing_db)
    """
    if get_request_metadata is not None:
        metadata = get_request_metadata() or {}
        if not isinstance(metadata, dict):
            raise ValueError("Mash request metadata must be an object")
        if "workspace" in metadata:
            requested = str(metadata.get("workspace") or "").strip()
            if not requested:
                raise ValueError("request metadata workspace must be non-empty")
            normalized = selected_workspace_name(requested)
            workspace_dir(normalized, require_exists=True)
            return normalized

    direct = _workspace_id.get()
    if direct:
        return direct

    # Try config file (shared by CLI and Beta API)
    try:
        from .config import get_current_workspace
        from .workspaces import resolve_workspace

        workspace_id = get_current_workspace()
        if workspace_id:
            # Validate workspace still exists
            resolve_workspace(workspace_id)
            return workspace_id
    except Exception:
        pass  # Config not available, invalid, or workspace doesn't exist

    # Default fallback
    from .runtime_paths import DEFAULT_WORKSPACE_NAME

    return DEFAULT_WORKSPACE_NAME


def current_workspace_dir() -> Path:
    return workspace_dir(current_workspace_id(), require_exists=True)
