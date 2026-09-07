"""The play workflows and the BigQuery access behind them.

Three pieces, in dependency order:

- ``context`` — the BigQuery client and the query primitives everything shares.
- ``data_loaders`` — one module per table, holding the SQL that reads and writes it.
- ``workflows`` — one package per workflow, calling those loaders.
- ``migrations`` — the tables' schema, as SQL, applied at crew-host boot.

``render`` sits beside them: pure copy-template functions, no database.

The workflows pass selected rows to the ``growth`` agent for judgment; code alone owns
the database reads and writes.
"""

from __future__ import annotations

from .context import PlayRuntimeContext
from .migrations import run_migrations
from .workflows import build_play_workflows

__all__ = ["PlayRuntimeContext", "build_play_workflows", "run_migrations"]
