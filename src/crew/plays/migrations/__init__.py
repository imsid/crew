"""Schema for the tables the play workflows own, and the runner that applies it.

One ``.sql`` file per migration, applied in filename order at crew-host boot. Every
statement must be safe to re-run — ``CREATE TABLE IF NOT EXISTS`` and nothing that
fails on a second pass — because boot applies all of them every time.

Failures are fatal: the host does not come up if the schema could not be applied.

The data loaders hold no DDL: the schema lives here, in one place, in SQL.
"""

from __future__ import annotations

from pathlib import Path

from ..context import PlayRuntimeContext
from ..data_loaders import play_candidates, plays

MIGRATIONS_DIR = Path(__file__).resolve().parent


def migration_files() -> list[Path]:
    return sorted(MIGRATIONS_DIR.glob("*.sql"))


def render(sql: str, ctx: PlayRuntimeContext) -> str:
    """Substitute the ``{source_id}`` placeholders with real table references."""

    return sql.format(
        play_candidates=play_candidates.table_ref(ctx),
        plays=plays.table_ref(ctx),
    )


def statements(sql: str) -> list[str]:
    """Split a migration file into executable statements.

    Line comments come out first: a ``--`` line may contain a semicolon, which would
    otherwise split one statement into two halves that are each invalid SQL. Comments
    are never inside a string literal in these files.
    """

    stripped = "\n".join(
        line for line in sql.splitlines() if not line.lstrip().startswith("--")
    )
    return [part.strip() for part in stripped.split(";") if part.strip()]


def run_migrations(ctx: PlayRuntimeContext) -> int:
    """Apply every migration. Returns the number of statements executed.

    Both failure modes are fatal, by design: the host must not come up believing it
    has tables it does not have. A missing project id and a rejected statement (no
    dataset WRITER, bad SQL) each raise, and crew-host fails to boot.
    """

    if not ctx.project_id:
        raise RuntimeError(
            "BIGQUERY_PROJECT_ID must be set to apply the play migrations"
        )

    executed = 0
    for path in migration_files():
        for index, statement in enumerate(
            statements(render(path.read_text(encoding="utf-8"), ctx)), start=1
        ):
            try:
                ctx.execute_write(statement)
            except Exception as exc:
                raise RuntimeError(
                    f"play migration {path.name} failed at statement {index}: {exc}"
                ) from exc
            executed += 1
    return executed


__all__ = ["MIGRATIONS_DIR", "migration_files", "render", "run_migrations", "statements"]
