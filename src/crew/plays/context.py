"""Runtime dependencies shared by the play workflow code steps.

Code steps are deterministic Python and cannot use the agents' MCP connection, so
they read BigQuery through a direct client held on this context (mirrors
``MasherRuntimeContext``). The BigQuery client is created lazily on first use, so
importing a module that takes a context never touches the network.

Credentials resolve via Application Default Credentials — locally the developer's
gcloud ADC, in the deployed host the service account in ``GOOGLE_APPLICATION_CREDENTIALS``.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from google.cloud import bigquery

from ..metrics_layer.service.config_repo import load_source_config
from ..metrics_layer.service.context import build_tool_context
from ..metrics_layer.service.plan import CompiledPlan
from ..metrics_layer.service.runtime import (
    QuerySpec,
    compile_multi_query,
    execute_plan,
    run_entity_query,
    run_multi_query,
    run_query,
)

USAGE_DATASET_DEFAULT = "product_usage_db"
CRM_DATASET_DEFAULT = "crm_db"
BQ_LOCATION_DEFAULT = "US"

# Workspaces (one dir per dataset) live under ``src/crew/workspace``; this module is
# ``src/crew/plays/context.py``, so the packaged default is two parents up + workspace.
WORKSPACE_ROOT_DEFAULT = Path(__file__).resolve().parents[1] / "workspace"


@dataclass
class PlayRuntimeContext:
    """BigQuery project + dataset ids for the play workflow code steps."""

    project_id: str
    usage_dataset_id: str = USAGE_DATASET_DEFAULT
    crm_dataset_id: str = CRM_DATASET_DEFAULT
    location: str = BQ_LOCATION_DEFAULT
    workspace_root: Path = WORKSPACE_ROOT_DEFAULT
    _client: Any = None

    @classmethod
    def from_env(cls) -> "PlayRuntimeContext":
        project_id = (
            os.getenv("BIGQUERY_PROJECT_ID")
            or os.getenv("PROJECT_ID")
            or os.getenv("GOOGLE_CLOUD_PROJECT")
            or ""
        ).strip()
        workspace_root = os.getenv("GROWTH_WORKSPACE_ROOT")
        return cls(
            project_id=project_id,
            usage_dataset_id=os.getenv("GROWTH_USAGE_DATASET", USAGE_DATASET_DEFAULT),
            crm_dataset_id=os.getenv("GROWTH_CRM_DATASET", CRM_DATASET_DEFAULT),
            location=os.getenv("BIGQUERY_LOCATION", BQ_LOCATION_DEFAULT),
            workspace_root=(
                Path(workspace_root) if workspace_root else WORKSPACE_ROOT_DEFAULT
            ),
        )

    def client(self) -> Any:
        if self._client is None:

            if not self.project_id:
                raise RuntimeError(
                    "BIGQUERY_PROJECT_ID must be set for Growth Crew workflows"
                )
            self._client = bigquery.Client(project=self.project_id)
        return self._client

    def entity_table_ref(self, dataset_id: str, source_id: str) -> str:
        """Backticked ``project.dataset.table`` for a source, read from its config.

        The physical table name is declared once (in the source YAML) and shared by the
        read compiler and the write seam, so the two can't drift.
        """

        tool_context = build_tool_context(Path(self.workspace_root) / dataset_id)
        source_cfg = load_source_config(
            context=tool_context,
            dataset_id=dataset_id,
            source_id=source_id,
            source_cache={},
        )
        dataset = source_cfg["dataset"]
        table = source_cfg["table"]
        if self.project_id:
            return f"`{self.project_id}.{dataset}.{table}`"
        return f"`{dataset}.{table}`"

    def execute_write(self, sql: str, params: list[Any] | None = None) -> None:
        """Run a DDL/DML statement — the write primitive the data loaders share."""

        job_config = bigquery.QueryJobConfig(query_parameters=params or [])
        self.client().query(sql, job_config=job_config, location=self.location).result()

    def execute_transaction(self, statements: list[tuple[str, list[Any]]]) -> None:
        """Run several DML statements as one BigQuery multi-statement transaction.

        The sibling of ``execute_write`` for writes that are one fact: the statements
        commit together or not at all. A failure in any of them rolls the whole script
        back and re-raises, so a caller never sees a half-applied write.

        Query parameters are script-wide, so the statements share one namespace: a name
        used by two statements must carry the same value, and a genuine conflict is a
        programming error caught here rather than a silent overwrite.
        """

        if not statements:
            return

        merged: dict[str, Any] = {}
        for _, params in statements:
            for param in params or []:
                name = str(getattr(param, "name", "") or "")
                if not name:
                    # A positional parameter has no name to share by, and the script
                    # concatenates the statements, so its placeholder would bind
                    # against the wrong one.
                    raise ValueError(
                        "a transaction's query parameters must be named; "
                        f"{type(param).__name__} was passed without a name"
                    )
                existing = merged.get(name)
                if existing is not None and existing.to_api_repr() != param.to_api_repr():
                    raise ValueError(
                        f"transaction parameter '{name}' is bound to two different "
                        "values; parameters are script-wide"
                    )
                merged[name] = param

        body = "\n".join(f"{sql.strip().rstrip(';')};" for sql, _ in statements)
        script = (
            "BEGIN\n"
            "BEGIN TRANSACTION;\n"
            f"{body}\n"
            "COMMIT TRANSACTION;\n"
            "EXCEPTION WHEN ERROR THEN\n"
            "ROLLBACK TRANSACTION;\n"
            "RAISE;\n"
            "END;"
        )
        self.execute_write(script, list(merged.values()))

    def query(self, sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
        """Run a hand-written SELECT and return rows as dicts.

        The read primitive for the candidate tables, which the metrics layer does not
        model: they are a workflow's working set, not a read model over the warehouse.
        """

        job_config = bigquery.QueryJobConfig(query_parameters=params or [])
        result = (
            self.client()
            .query(sql, job_config=job_config, location=self.location)
            .result()
        )
        return [dict(row) for row in result]

    def compile_and_run(
        self,
        dataset_id: str,
        metric_name: str,
        *,
        dimensions: list[str] | None = None,
        filters: list[str] | None = None,
        date_range: dict[str, str] | None = None,
        order_by: list[dict[str, str]] | None = None,
        limit: int = 1000,
        parameters: list[Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Compile a metrics_layer metric to SQL and run it on the shared client.

        The in-process seam the code steps use in place of hand-written SQL: it builds a
        tool context rooted at ``workspace_root/<dataset_id>`` (the metrics_layer service
        derives the dataset id from the workspace directory name) and executes the
        compiled plan on the same BigQuery client ``query`` uses.
        """

        tool_context = build_tool_context(Path(self.workspace_root) / dataset_id)
        spec = QuerySpec(
            metric_name=metric_name,
            dimensions=list(dimensions or []),
            filters=list(filters or []),
            date_range=date_range,
            order_by=list(order_by or []),
            limit=limit,
            parameters=list(parameters or []),
        )
        return run_query(
            tool_context,
            dataset_id,
            spec,
            client=self.client(),
            bigquery_project_id=self.project_id,
            location=self.location,
        )

    def compile_and_run_multi(
        self,
        dataset_id: str,
        metric_names: list[str],
        *,
        dimensions: list[str] | None = None,
        filters: list[str] | None = None,
        date_range: dict[str, str] | None = None,
        order_by: list[dict[str, str]] | None = None,
        limit: int = 1000,
        parameters: list[Any] | None = None,
        having: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        """Compile several metrics sharing a base source into one SELECT and run it.

        The multi-measure sibling of ``compile_and_run``: each metric is a value column
        aliased by its name, so one org-day-grain read returns tokens and active users
        together instead of two zipped queries.
        """

        tool_context = build_tool_context(Path(self.workspace_root) / dataset_id)
        return run_multi_query(
            tool_context,
            dataset_id,
            list(metric_names),
            client=self.client(),
            dimensions=list(dimensions or []),
            filters=list(filters or []),
            date_range=date_range,
            order_by=list(order_by or []),
            limit=limit,
            parameters=list(parameters or []),
            having=list(having or []),
            bigquery_project_id=self.project_id,
            location=self.location,
        )

    def compile_multi(
        self,
        dataset_id: str,
        metric_names: list[str],
        **kwargs: Any,
    ) -> CompiledPlan:
        """Compile a multi-metric read without running it.

        The seam a selection function uses when the SQL itself is part of the output:
        the compiled text goes on the candidate set so the agent (and the artifact)
        can see exactly which query produced the run.
        """

        tool_context = build_tool_context(Path(self.workspace_root) / dataset_id)
        return compile_multi_query(
            tool_context,
            dataset_id,
            list(metric_names),
            bigquery_project_id=self.project_id,
            **kwargs,
        )

    def run_plan(self, plan: CompiledPlan) -> list[dict[str, Any]]:
        """Execute an already-compiled plan on the shared client."""

        return execute_plan(plan, client=self.client(), location=self.location)

    def read_entity(
        self,
        dataset_id: str,
        source_id: str,
        *,
        attributes: list[str],
        filters: list[str] | None = None,
        order_by: list[dict[str, str]] | None = None,
        limit: int = 1000,
        parameters: list[Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Read declared attributes of an entity source by key (no aggregation).

        The entity-read archetype for record lookups (accounts, enrichment) that aren't
        metrics — a projection filtered by key, served from the same source configs.
        """

        tool_context = build_tool_context(Path(self.workspace_root) / dataset_id)
        return run_entity_query(
            tool_context,
            dataset_id,
            source_id,
            client=self.client(),
            attributes=list(attributes),
            filters=list(filters or []),
            order_by=list(order_by or []),
            limit=limit,
            parameters=list(parameters or []),
            bigquery_project_id=self.project_id,
            location=self.location,
        )


__all__ = ["PlayRuntimeContext"]
