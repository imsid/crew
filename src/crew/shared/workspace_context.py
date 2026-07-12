"""
Workspace context management for Crew.

This module bridges workspace context across synchronous (API routes) and
asynchronous (agent tool execution) boundaries.

## Context Resolution Strategy

When agent tools call current_workspace_id(), the workspace is resolved in order:

1. **ContextVar (_workspace_id)** - Set by bound_workspace() context manager
   - Used by Beta API routes (from URL path parameter)
   - Automatically propagates through async stack

2. **Request Registry (_request_workspace_registry)** - Maps request_id → workspace_id
   - Used when agent tools execute in a different async context
   - Populated by register_request_workspace() after async agent calls
   - Bridges the async boundary when ContextVar is no longer accessible

3. **Config File (~/.crew/config.json)** - Persistent workspace preference
   - Shared by CLI and Beta API
   - Set via 'crew workspace set <name>'

4. **Default (marketing_db)** - Final fallback

## Why Two-Level Lookup (ContextVar + Registry)?

Beta API routes use bound_workspace() to set the ContextVar. However, when the
async agent call completes and agent tools execute, they run in a different
async context where the ContextVar is no longer accessible. The request registry
bridges this gap by mapping Mash's request_id to the workspace.

## Usage Patterns

### Beta API Route:
```python
with bound_workspace(workspace_id):
    request_id = await client.post_request(...)
register_request_workspace(request_id, workspace_id)
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

try:  # pragma: no cover - depends on Mash runtime internals
    from mash.logging import get_request_id
except Exception:  # pragma: no cover
    get_request_id = None  # type: ignore[assignment]

from .runtime_paths import selected_workspace_name, workspace_dir

_workspace_id: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "crew_workspace_id",
    default=None,
)
_request_workspace_registry: dict[str, str] = {}


@contextmanager
def bound_workspace(workspace_id: str) -> Iterator[None]:
    normalized = selected_workspace_name(workspace_id)
    token = _workspace_id.set(normalized)
    try:
        yield
    finally:
        _workspace_id.reset(token)


def register_request_workspace(request_id: str | None, workspace_id: str) -> None:
    normalized_request_id = str(request_id or "").strip()
    if not normalized_request_id:
        return
    _request_workspace_registry[normalized_request_id] = selected_workspace_name(workspace_id)


def current_workspace_id() -> str:
    """
    Get current workspace ID from available context.

    Resolution order:
    1. ContextVar (Beta API route context from URL path)
    2. Request registry (async agent tool context)
    3. Config file (~/.crew/config.json)
    4. Default (marketing_db)
    """
    # Try ContextVar first (Beta API routes)
    direct = _workspace_id.get()
    if direct:
        return direct

    # Try request registry (async agent tools from Beta API)
    if get_request_id is not None:
        request_id = str(get_request_id() or "").strip()
        if request_id and request_id in _request_workspace_registry:
            return _request_workspace_registry[request_id]

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
