"""Phase 0 spine: CompiledPlan container, golden SQL, and the growth in-process seam.

These lock the current codegen and prove the compile→execute runtime end to end without
a live BigQuery client, so later phases (parameters, joins, windows) change the compiler
against a snapshot instead of blind.
"""

from __future__ import annotations

import unittest
from datetime import date, timedelta
from typing import Any, Dict, List

from crew.growth.context import WORKSPACE_ROOT_DEFAULT, CrewGrowthRuntimeContext
from crew.metrics_layer.service.config_repo import load_metric_entries_by_dataset
from crew.metrics_layer.service.context import build_tool_context
from crew.metrics_layer.service.plan import BindParam, CompiledPlan
from crew.metrics_layer.service.runtime import (
    QuerySpec,
    compile_entity_query,
    compile_multi_query,
    compile_query,
    execute_plan,
)

# The two datasets whose configs ship in the repo workspace.
DATASETS = ("product_usage_db", "crm_db")

TOOL_DICT_KEYS = [
    "metric_name",
    "source_id",
    "table_ref",
    "sql",
    "dimensions",
    "filters",
    "order_by",
    "limit",
    "warnings",
]


def _tool_context(dataset_id: str):
    return build_tool_context(WORKSPACE_ROOT_DEFAULT / dataset_id)


class _FakeQueryJob:
    def __init__(self, rows: List[Dict[str, Any]]) -> None:
        self._rows = rows

    def result(self) -> List[Dict[str, Any]]:
        return self._rows


class _FakeClient:
    """Records the executed SQL/job_config and returns canned rows."""

    def __init__(self, rows: List[Dict[str, Any]]) -> None:
        self._rows = rows
        self.calls: List[Dict[str, Any]] = []

    def query(self, sql, job_config=None, location=None):
        self.calls.append({"sql": sql, "job_config": job_config, "location": location})
        return _FakeQueryJob(self._rows)


class CompiledPlanTests(unittest.TestCase):
    def test_compile_returns_compiled_plan_with_row_shape(self) -> None:
        plan = compile_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            QuerySpec(metric_name="total_base_fee", dimensions=["plan_tier"]),
        )
        self.assertIsInstance(plan, CompiledPlan)
        self.assertEqual([c.name for c in plan.row_shape], ["plan_tier", "metric_value"])
        self.assertEqual(plan.row_shape[0].data_type, "STRING")
        # Phase 0 parity: dates still inlined, so no bound parameters yet.
        self.assertEqual(plan.parameters, [])

    def test_to_tool_dict_preserves_agent_shape(self) -> None:
        plan = compile_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            QuerySpec(metric_name="total_base_fee", dimensions=["plan_tier"]),
        )
        self.assertEqual(list(plan.to_tool_dict().keys()), TOOL_DICT_KEYS)

    def test_golden_sql_simple_metric(self) -> None:
        plan = compile_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            QuerySpec(metric_name="total_base_fee", dimensions=["plan_tier"]),
        )
        self.assertEqual(
            plan.sql,
            "SELECT\n"
            "  plan_tier AS plan_tier,\n"
            "  SUM(base_fee_usd) AS metric_value\n"
            "FROM `product_usage_db.plan_pricing`\n"
            "GROUP BY plan_tier\n"
            "LIMIT 100",
        )

    def test_date_range_binds_params_and_inline_matches_literal_sql(self) -> None:
        plan = compile_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            QuerySpec(
                metric_name="avg_tokens_per_org",
                dimensions=["org_name", "plan_tier"],
                date_range={
                    "dimension": "as_of_date",
                    "start": "2026-06-01",
                    "end": "2026-06-30",
                },
                order_by=[{"field": "metric_value", "direction": "DESC"}],
                limit=50,
            ),
            bigquery_project_id="proj-123",
        )
        # In-process path: bound @params (safe, cacheable).
        self.assertEqual(
            plan.sql,
            "SELECT\n"
            "  org_name AS org_name,\n"
            "  plan_tier AS plan_tier,\n"
            "  AVG(tokens_consumed) AS metric_value\n"
            "FROM `proj-123.product_usage_db.dim_orgs`\n"
            "WHERE\n"
            "  DATE(as_of_date) >= @p_as_of_date_start\n"
            "  AND DATE(as_of_date) <= @p_as_of_date_end\n"
            "GROUP BY org_name, plan_tier\n"
            "ORDER BY metric_value DESC\n"
            "LIMIT 50",
        )
        self.assertEqual(
            [(p.name, p.type, p.value) for p in plan.parameters],
            [
                ("p_as_of_date_start", "DATE", "2026-06-01"),
                ("p_as_of_date_end", "DATE", "2026-06-30"),
            ],
        )
        # Agent path (execute_sql_readonly, no bind values): inline literals reproduce
        # the pre-parameter SQL byte-for-byte.
        self.assertEqual(
            plan.render_inline(),
            "SELECT\n"
            "  org_name AS org_name,\n"
            "  plan_tier AS plan_tier,\n"
            "  AVG(tokens_consumed) AS metric_value\n"
            "FROM `proj-123.product_usage_db.dim_orgs`\n"
            "WHERE\n"
            "  DATE(as_of_date) >= DATE '2026-06-01'\n"
            "  AND DATE(as_of_date) <= DATE '2026-06-30'\n"
            "GROUP BY org_name, plan_tier\n"
            "ORDER BY metric_value DESC\n"
            "LIMIT 50",
        )
        # The agent tool payload uses the inline form.
        self.assertEqual(plan.to_tool_dict()["sql"], plan.render_inline())

    def test_all_repo_metrics_compile(self) -> None:
        # Smoke parity: every shipped metric still compiles to non-empty SELECT SQL.
        for dataset_id in DATASETS:
            context = _tool_context(dataset_id)
            entries = load_metric_entries_by_dataset(context=context, dataset_id=dataset_id)
            metric_names = {entry["name"] for entry in entries.values()}
            for metric_name in sorted(metric_names):
                with self.subTest(dataset=dataset_id, metric=metric_name):
                    plan = compile_query(
                        context, dataset_id, QuerySpec(metric_name=metric_name)
                    )
                    self.assertTrue(plan.sql.startswith("SELECT"))
                    self.assertIn("AS metric_value", plan.sql)


class ExecutePlanTests(unittest.TestCase):
    def test_execute_plan_binds_parameters_and_maps_rows(self) -> None:
        rows = [{"plan_tier": "pro", "metric_value": 99.0}]
        client = _FakeClient(rows)
        plan = CompiledPlan(
            metric_name="m",
            source_id="s",
            table_ref="`d.t`",
            sql="SELECT 1",
            dimensions=[],
            filters=[],
            order_by=[],
            limit=1,
            warnings=[],
            parameters=[BindParam(name="as_of", type="DATE", value="2026-07-18")],
        )
        out = execute_plan(plan, client=client, location="US")
        self.assertEqual(out, rows)
        self.assertEqual(client.calls[0]["sql"], "SELECT 1")
        self.assertEqual(client.calls[0]["location"], "US")
        bound = client.calls[0]["job_config"].query_parameters
        self.assertEqual(len(bound), 1)
        self.assertEqual(bound[0].name, "as_of")


class ParameterTests(unittest.TestCase):
    def test_array_param_binds_and_renders_inline(self) -> None:
        from crew.metrics_layer.service.plan import BindParam

        plan = compile_query(
            _tool_context("crm_db"),
            "crm_db",
            QuerySpec(
                metric_name="open_plays_by_org",
                dimensions=["org_id"],
                filters=[
                    "status IN UNNEST(@open_statuses)",
                    "org_id IN UNNEST(@org_ids)",
                ],
                parameters=[
                    BindParam("open_statuses", "ARRAY<STRING>", ["ready_to_send"]),
                    BindParam("org_ids", "ARRAY<STRING>", ["org_1", "org_2"]),
                ],
            ),
        )
        self.assertIn("status IN UNNEST(@open_statuses)", plan.sql)
        self.assertIn("org_id IN UNNEST(@org_ids)", plan.sql)
        # Inline (agent path) expands arrays to literals.
        inline = plan.render_inline()
        self.assertIn("status IN UNNEST(['ready_to_send'])", inline)
        self.assertIn("org_id IN UNNEST(['org_1', 'org_2'])", inline)
        # Bind (in-process) exposes both array parameters.
        self.assertEqual(
            {p.name for p in plan.parameters}, {"open_statuses", "org_ids"}
        )

    def test_stray_at_sign_in_string_literal_is_untouched(self) -> None:
        # A '@' inside a value must not be mistaken for a parameter reference.
        from crew.metrics_layer.service.plan import BindParam, CompiledPlan

        plan = CompiledPlan(
            metric_name="m",
            source_id="s",
            table_ref="`d.t`",
            sql="SELECT 1 WHERE domain = 'foo@bar.com' AND org_id IN UNNEST(@ids)",
            dimensions=[],
            filters=[],
            order_by=[],
            limit=1,
            warnings=[],
            parameters=[BindParam("ids", "ARRAY<STRING>", ["a"])],
        )
        self.assertEqual(
            plan.render_inline(),
            "SELECT 1 WHERE domain = 'foo@bar.com' AND org_id IN UNNEST(['a'])",
        )


class _SequencedClient:
    """Returns queued row-sets in call order (multi-query flows issue several)."""

    def __init__(self, responses: List[List[Dict[str, Any]]]) -> None:
        self._responses = list(responses)
        self.calls: List[Dict[str, Any]] = []

    def query(self, sql, job_config=None, location=None):
        self.calls.append({"sql": sql, "job_config": job_config, "location": location})
        return _FakeQueryJob(self._responses.pop(0))


class MultiMetricTests(unittest.TestCase):
    def test_multi_metric_golden_sql(self) -> None:
        plan = compile_multi_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            ["org_daily_tokens", "org_daily_active_users"],
            dimensions=["as_of_date", "org_id"],
            order_by=[{"field": "org_id", "direction": "ASC"}],
            limit=1000,
            bigquery_project_id="demo",
        )
        self.assertEqual(
            plan.sql,
            "SELECT\n"
            "  as_of_date AS as_of_date,\n"
            "  org_id AS org_id,\n"
            "  SUM(tokens_consumed) AS org_daily_tokens,\n"
            "  SUM(active_users) AS org_daily_active_users\n"
            "FROM `demo.product_usage_db.dim_orgs`\n"
            "GROUP BY as_of_date, org_id\n"
            "ORDER BY org_id ASC\n"
            "LIMIT 1000",
        )
        self.assertEqual(
            plan.metric_names, ["org_daily_tokens", "org_daily_active_users"]
        )
        self.assertEqual(
            [c.name for c in plan.row_shape],
            ["as_of_date", "org_id", "org_daily_tokens", "org_daily_active_users"],
        )

    def test_order_by_on_metric_column_is_allowed_in_multi(self) -> None:
        plan = compile_multi_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            ["org_daily_tokens", "org_daily_active_users"],
            dimensions=["org_id"],
            order_by=[{"field": "org_daily_tokens", "direction": "DESC"}],
        )
        self.assertIn("ORDER BY org_daily_tokens DESC", plan.sql)

    def test_cross_source_metrics_rejected(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            compile_multi_query(
                _tool_context("product_usage_db"),
                "product_usage_db",
                ["org_daily_tokens", "total_base_fee"],
            )
        self.assertIn("share base_source", str(ctx.exception))

    def test_duplicate_metric_column_rejected(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            compile_multi_query(
                _tool_context("product_usage_db"),
                "product_usage_db",
                ["org_daily_tokens", "org_daily_tokens"],
                dimensions=["org_id"],
            )
        self.assertIn("duplicate metric column", str(ctx.exception))


class JoinTests(unittest.TestCase):
    def test_many_to_one_join_golden_sql(self) -> None:
        plan = compile_multi_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            ["org_daily_tokens"],
            dimensions=["org_id", "plan_tier", "base_fee_usd"],
            bigquery_project_id="demo",
        )
        self.assertEqual(
            plan.sql,
            "SELECT\n"
            "  orgs.org_id AS org_id,\n"
            "  orgs.plan_tier AS plan_tier,\n"
            "  plan_pricing.base_fee_usd AS base_fee_usd,\n"
            "  SUM(orgs.tokens_consumed) AS org_daily_tokens\n"
            "FROM `demo.product_usage_db.dim_orgs` AS orgs\n"
            "LEFT JOIN `demo.product_usage_db.plan_pricing` AS plan_pricing\n"
            "  ON orgs.plan_tier = plan_pricing.plan_tier\n"
            "GROUP BY org_id, plan_tier, base_fee_usd\n"
            "LIMIT 100",
        )

    def test_no_join_emitted_when_no_joined_dimension_requested(self) -> None:
        # Same source, but only base dimensions → no alias, no JOIN (parity).
        plan = compile_multi_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            ["org_daily_tokens"],
            dimensions=["org_id", "plan_tier"],
            bigquery_project_id="demo",
        )
        self.assertNotIn("JOIN", plan.sql)
        self.assertIn("FROM `demo.product_usage_db.dim_orgs`\n", plan.sql)
        self.assertIn("SUM(tokens_consumed) AS org_daily_tokens", plan.sql)


class WindowedMetricTests(unittest.TestCase):
    def test_windowed_metric_golden_sql(self) -> None:
        plan = compile_multi_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            ["tokens_recent_28d"],
            dimensions=["org_id"],
            parameters=[BindParam("as_of", "DATE", date(2026, 7, 18))],
        )
        self.assertEqual(
            plan.sql,
            "SELECT\n"
            "  org_id AS org_id,\n"
            "  SUM(IF(as_of_date > DATE_SUB(@as_of, INTERVAL 28 DAY), "
            "tokens_consumed, 0)) AS tokens_recent_28d\n"
            "FROM `product_usage_db.dim_orgs`\n"
            "GROUP BY org_id\n"
            "LIMIT 100",
        )
        # Agent path inlines the anchor param.
        self.assertIn("DATE_SUB(DATE '2026-07-18', INTERVAL 28 DAY)", plan.render_inline())

    def test_ratio_over_windowed_and_point_window(self) -> None:
        plan = compile_multi_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            ["token_slope", "active_users_now"],
            dimensions=["org_id"],
            parameters=[BindParam("as_of", "DATE", date(2026, 7, 18))],
        )
        # token_slope = SAFE_DIVIDE(recent - prior, prior) over windowed SUMs.
        self.assertIn("SAFE_DIVIDE(", plan.sql)
        self.assertIn(
            "SUM(IF(as_of_date <= DATE_SUB(@as_of, INTERVAL 28 DAY), tokens_consumed, 0))",
            plan.sql,
        )
        # A length-1 "at anchor" window (dev_now) with NULL else for MAX.
        self.assertIn(
            "MAX(IF(as_of_date = @as_of, active_users, NULL)) AS active_users_now",
            plan.sql,
        )


class HavingTests(unittest.TestCase):
    def test_having_clause_golden_sql(self) -> None:
        plan = compile_multi_query(
            _tool_context("product_usage_db"),
            "product_usage_db",
            ["surface_first_seen"],
            dimensions=["org_id", "product_surface"],
            having=["surface_first_seen > DATE_SUB(@as_of, INTERVAL 75 DAY)"],
            parameters=[BindParam("as_of", "DATE", date(2026, 7, 18))],
            limit=1000,
        )
        self.assertEqual(
            plan.sql,
            "SELECT\n"
            "  org_id AS org_id,\n"
            "  product_surface AS product_surface,\n"
            "  MIN(activity_date) AS surface_first_seen\n"
            "FROM `product_usage_db.user_activity`\n"
            "GROUP BY org_id, product_surface\n"
            "HAVING\n"
            "  surface_first_seen > DATE_SUB(@as_of, INTERVAL 75 DAY)\n"
            "LIMIT 1000",
        )
        self.assertIn(
            "HAVING\n  surface_first_seen > DATE_SUB(DATE '2026-07-18', INTERVAL 75 DAY)",
            plan.render_inline(),
        )


class ExpansionSignalsMigrationTests(unittest.TestCase):
    def test_compute_expansion_signals_reads_windowed_metrics(self) -> None:
        from crew.growth.warehouse import compute_expansion_signals

        trend = [
            {
                "org_id": "org_1",
                "org_name": "Org One",
                "plan_tier": "pro",
                "token_slope": 0.5,
                "active_dev_growth": 0.4,
                "active_users_prior": 4.0,
                "active_users_recent": 6.0,
                "active_users_now": 6,
            }
        ]
        surface = [
            {"org_id": "org_1", "product_surface": "workflow", "first_seen": date(2026, 7, 1)}
        ]

        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _SequencedClient([trend, surface])

        candidates = compute_expansion_signals(ctx, "2026-07-18")
        self.assertEqual(len(candidates), 1)
        cand = candidates[0]
        self.assertEqual(cand.org_id, "org_1")
        self.assertEqual(cand.token_slope, 0.5)
        self.assertEqual(cand.active_dev_growth, 0.4)
        self.assertEqual(cand.active_users_start, 4)
        self.assertEqual(cand.active_users_now, 6)
        self.assertTrue(cand.new_surface_adopted)
        self.assertEqual(cand.new_surface, "workflow")
        # 45*0.5 + 30*0.4 + 25 = 59.5.
        self.assertEqual(cand.pqa_raw, 59.5)
        # Trend read is the windowed compiled query (bound @as_of anchor).
        trend_sql = ctx._client.calls[0]["sql"]
        self.assertIn("DATE_SUB(@as_of, INTERVAL 28 DAY)", trend_sql)


class PullUsagePanelMigrationTests(unittest.TestCase):
    def test_pull_usage_panel_reads_price_via_compiled_join(self) -> None:
        from crew.growth.warehouse import pull_usage_panel

        as_of = date(2026, 7, 18)
        created = date(2026, 1, 1)
        # Flat 100 tokens/day over the full lookback → current == baseline, no decay.
        # Price columns arrive on every row from the compiled orgs→plan_pricing join.
        series = [
            {
                "as_of_date": as_of - timedelta(days=offset),
                "org_id": "org_1",
                "org_name": "Org One",
                "plan_tier": "pro",
                "created_date": created,
                "base_fee_usd": 500.0,
                "per_million_tokens_usd": 10.0,
                "org_daily_tokens": 100,
                "org_daily_active_users": 5,
            }
            for offset in range(40)
        ]

        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _SequencedClient([series])

        panel = pull_usage_panel(ctx, "2026-07-18")
        self.assertEqual(len(panel), 1)
        row = panel[0]
        self.assertEqual(row.org_id, "org_1")
        self.assertEqual(row.plan_tier, "pro")
        self.assertEqual(row.baseline_tokens, 100.0)
        self.assertEqual(row.current_tokens, 100.0)
        self.assertEqual(row.decay_pct, 0.0)
        self.assertEqual(row.sustained_days, 0)
        self.assertEqual(row.active_users, 5)
        self.assertEqual(row.age_days, (as_of - created).days)
        # base_fee 500 + trailing-30d tokens (30*100) / 1e6 * price 10 = 500.03.
        self.assertEqual(row.consumption_mrr, 500.03)
        # A single compiled read now (price folded into the join, no second query).
        self.assertEqual(len(ctx._client.calls), 1)
        executed = ctx._client.calls[0]["sql"]
        self.assertIn("LEFT JOIN `proj-123.product_usage_db.plan_pricing`", executed)
        self.assertIn("ON orgs.plan_tier = plan_pricing.plan_tier", executed)


class EntityReadTests(unittest.TestCase):
    def test_entity_read_golden_sql(self) -> None:
        plan = compile_entity_query(
            _tool_context("crm_db"),
            "crm_db",
            "company_enrichment",
            attributes=["domain", "company_name", "headcount"],
            filters=["domain IN UNNEST(@domains)"],
            parameters=[BindParam("domains", "ARRAY<STRING>", ["acme.com"])],
            bigquery_project_id="demo",
        )
        self.assertEqual(
            plan.sql,
            "SELECT\n"
            "  domain AS domain,\n"
            "  company_name AS company_name,\n"
            "  headcount AS headcount\n"
            "FROM `demo.crm_db.company_enrichment`\n"
            "WHERE\n"
            "  domain IN UNNEST(@domains)\n"
            "LIMIT 1000",
        )
        # No aggregation: no GROUP BY and no metric columns.
        self.assertNotIn("GROUP BY", plan.sql)
        self.assertEqual(plan.metric_names, [])
        self.assertIn("domain IN UNNEST(['acme.com'])", plan.render_inline())

    def test_unknown_attribute_rejected(self) -> None:
        with self.assertRaises(ValueError) as ctx:
            compile_entity_query(
                _tool_context("crm_db"),
                "crm_db",
                "accounts",
                attributes=["org_id", "not_a_column"],
            )
        self.assertIn("not found in source", str(ctx.exception))

    def test_resolve_accounts_reads_via_entity_archetype(self) -> None:
        from crew.growth import crm

        rows = [
            {
                "org_id": "org_1",
                "account_name": "Org One",
                "domain": "org1.com",
                "owner": "ae@co",
                "segment": "smb",
                "lifecycle_stage": "customer",
                "plan_tier": "pro",
                "consumption_mrr": 500.0,
                "active_users": 5,
                "thesis": None,
            }
        ]
        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _FakeClient(rows)

        accounts = crm.resolve_accounts(ctx, ["org_1"])
        self.assertEqual(set(accounts), {"org_1"})
        self.assertEqual(accounts["org_1"]["consumption_mrr"], 500.0)
        executed = ctx._client.calls[0]["sql"]
        self.assertIn("FROM `proj-123.crm_db.accounts`", executed)
        self.assertNotIn("GROUP BY", executed)

    def test_read_enrichment_stringifies_dates(self) -> None:
        from crew.growth import crm

        rows = [
            {
                "domain": "org1.com",
                "company_name": "Org One Inc",
                "headcount": 42,
                "funding_stage": "series_a",
                "last_raised_date": date(2025, 3, 1),
                "hiring_signals": 3,
                "tech_stack": "python",
                "industry": "devtools",
                "is_personal_domain": False,
            }
        ]
        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _FakeClient(rows)

        enrichment = crm.read_enrichment(ctx, ["org1.com"])
        # DATE rendered to an ISO string (matches the prior CAST AS STRING).
        self.assertEqual(enrichment["org1.com"]["last_raised_date"], "2025-03-01")
        self.assertEqual(enrichment["org1.com"]["headcount"], 42)


class WriteSeamTests(unittest.TestCase):
    def test_entity_table_ref_reads_table_from_source_config(self) -> None:
        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        self.assertEqual(
            ctx.entity_table_ref("crm_db", "plays"), "`proj-123.crm_db.plays`"
        )

    def test_write_play_upserts_via_config_derived_table(self) -> None:
        from crew.growth import writes

        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _FakeClient([])
        writes.write_play(
            ctx,
            {
                "play_id": "run:org_1",
                "org_id": "org_1",
                "workflow_id": "consumption-dip-rescue",
                "play_type": "sales_assisted_checkin",
                "status": "ready_to_send",
            },
        )
        sql = ctx._client.calls[0]["sql"]
        self.assertIn("MERGE `proj-123.crm_db.plays` T", sql)
        self.assertIn("ON T.play_id = S.play_id", sql)
        bound = {p.name for p in ctx._client.calls[0]["job_config"].query_parameters}
        self.assertIn("play_id", bound)

    def test_update_account_thesis_targets_config_table(self) -> None:
        from crew.growth import writes

        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _FakeClient([])
        writes.update_account_thesis(ctx, "org_1", "expanding on workflows")
        sql = ctx._client.calls[0]["sql"]
        self.assertIn("UPDATE `proj-123.crm_db.accounts`", sql)
        self.assertIn("SET thesis = @thesis", sql)


class AgentToolSurfaceTests(unittest.TestCase):
    def _analyst_tools(self, dataset_id: str):
        from crew.agents.data.tools import build_analyst_tools

        tools = build_analyst_tools(workspace_root=WORKSPACE_ROOT_DEFAULT / dataset_id)
        return {tool.name: tool for tool in tools}

    def test_metric_tool_supports_parameters_and_having_inline(self) -> None:
        import asyncio
        import json

        tools = self._analyst_tools("product_usage_db")
        result = asyncio.run(
            tools["compile_metric_configs_to_sql"].execute(
                {
                    "metric_names": ["tokens_recent_28d"],
                    "dimensions": ["org_id"],
                    "having": ["metric_value > 0"],
                    "parameters": [{"name": "as_of", "type": "DATE", "value": "2026-07-18"}],
                }
            )
        )
        self.assertFalse(result.is_error)
        plan = json.loads(result.content)["plans"][0]
        # Agent path: the anchor parameter is inlined for execute_sql_readonly.
        self.assertIn("DATE_SUB(DATE '2026-07-18', INTERVAL 28 DAY)", plan["sql"])
        self.assertIn("HAVING", plan["sql"])

    def test_entity_read_tool_compiles_projection(self) -> None:
        import asyncio
        import json

        tools = self._analyst_tools("crm_db")
        result = asyncio.run(
            tools["compile_entity_read_to_sql"].execute(
                {
                    "source": "company_enrichment",
                    "attributes": ["domain", "headcount"],
                    "filters": ["domain IN UNNEST(@domains)"],
                    "parameters": [
                        {"name": "domains", "type": "ARRAY<STRING>", "value": ["acme.com"]}
                    ],
                }
            )
        )
        self.assertFalse(result.is_error)
        sql = json.loads(result.content)["plan"]["sql"]
        self.assertNotIn("GROUP BY", sql)
        self.assertIn("domain IN UNNEST(['acme.com'])", sql)


class GrowthSeamTests(unittest.TestCase):
    def test_compile_and_run_executes_compiled_sql_in_process(self) -> None:
        rows = [{"plan_tier": "pro", "metric_value": 12.5}]
        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _FakeClient(rows)

        out = ctx.compile_and_run(
            "product_usage_db",
            "total_base_fee",
            dimensions=["plan_tier"],
            limit=50,
        )
        self.assertEqual(out, rows)
        executed_sql = ctx._client.calls[0]["sql"]
        # Project id from the growth context flows into the compiled table ref.
        self.assertIn("`proj-123.product_usage_db.plan_pricing`", executed_sql)
        self.assertIn("LIMIT 50", executed_sql)

    def test_open_plays_for_uses_bound_params_via_compiled_metric(self) -> None:
        from crew.growth import crm

        rows = [{"org_id": "org_1", "metric_value": 2}, {"org_id": "org_3", "metric_value": 1}]
        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _FakeClient(rows)

        result = crm.open_plays_for(ctx, ["org_1", "org_2", "org_3"])
        self.assertEqual(result, {"org_1", "org_3"})

        call = ctx._client.calls[0]
        self.assertIn("`proj-123.crm_db.plays`", call["sql"])
        self.assertIn("status IN UNNEST(@open_statuses)", call["sql"])
        self.assertIn("org_id IN UNNEST(@org_ids)", call["sql"])
        bound = {p.name for p in call["job_config"].query_parameters}
        self.assertEqual(bound, {"open_statuses", "org_ids"})

    def test_open_opps_for_short_circuits_on_empty_input(self) -> None:
        from crew.growth import crm

        ctx = CrewGrowthRuntimeContext(project_id="proj-123")
        ctx._client = _FakeClient([])
        self.assertEqual(crm.open_opps_for(ctx, []), set())
        # No query issued for an empty id list.
        self.assertEqual(ctx._client.calls, [])


if __name__ == "__main__":
    unittest.main()
