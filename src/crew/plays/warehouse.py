"""Deterministic warehouse reads over ``product_usage_db`` for the code steps.

These are the "code fetches the signal" half of the pitch: pure, idempotent queries
that manufacture the churn-equivalent dip signal (1a) and the raw product-qualified
account signal (1b). The *judgment* over these numbers happens in the agent steps.

Thresholds mirror src/crew/context/sales/revenue-strategy.md.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta

from ..metrics_layer.service.plan import BindParam
from .context import PlayRuntimeContext
from .models import ExpansionCandidate, UsageRow

# Dip signal windows (see revenue-strategy.md §2).
CURRENT_WINDOW_DAYS = 7
BASELINE_WINDOW_DAYS = 28
BASELINE_OFFSET_DAYS = 7  # baseline excludes the current 7-day window
SUSTAINED_THRESHOLD = 0.8  # a day "counts" as dipped below 0.8 x baseline

# PQA signal windows (see revenue-strategy.md §3).
PQA_WINDOW_DAYS = 28
PQA_QUALIFY_MIN = 40.0
NEW_SURFACE_WINDOW_DAYS = (
    75  # a surface first used within this window = "newly adopted"
)


def _to_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


# --------------------------------------------------------------------------------------
# 1a — pull_usage_panel
# --------------------------------------------------------------------------------------


def pull_usage_panel(ctx: PlayRuntimeContext, as_of_date: str) -> list[UsageRow]:
    """Per-org token series vs. its own 4-week baseline, as of ``as_of_date``."""
    as_of = _to_date(as_of_date)
    lookback = BASELINE_WINDOW_DAYS + BASELINE_OFFSET_DAYS + 5  # small margin
    start = (as_of - timedelta(days=lookback)).isoformat()

    # One org-day-grain read returns both measures (tokens + active users) plus the
    # tier's base fee and token price, folded in via the compiled orgs→plan_pricing join.
    series = ctx.compile_and_run_multi(
        ctx.usage_dataset_id,
        ["org_daily_tokens", "org_daily_active_users"],
        dimensions=[
            "as_of_date",
            "org_id",
            "org_name",
            "plan_tier",
            "created_date",
            "base_fee_usd",
            "per_million_tokens_usd",
        ],
        date_range={"dimension": "as_of_date", "start": start, "end": as_of_date},
        order_by=[
            {"field": "org_id", "direction": "ASC"},
            {"field": "as_of_date", "direction": "ASC"},
        ],
        limit=1000,
    )

    by_org: dict[str, list[dict]] = {}
    for row in series:
        by_org.setdefault(row["org_id"], []).append(row)

    panel: list[UsageRow] = []
    for org_id, rows in by_org.items():
        rows.sort(key=lambda r: r["as_of_date"])
        tokens_by_date = {
            r["as_of_date"]: float(r["org_daily_tokens"] or 0.0) for r in rows
        }
        latest = rows[-1]

        current = _window_mean(tokens_by_date, as_of, 0, CURRENT_WINDOW_DAYS)
        baseline = _window_mean(
            tokens_by_date,
            as_of,
            BASELINE_OFFSET_DAYS,
            BASELINE_OFFSET_DAYS + BASELINE_WINDOW_DAYS,
        )
        decay_pct = (baseline - current) / baseline if baseline > 0 else 0.0
        sustained_days = _sustained_days(tokens_by_date, as_of, baseline)

        # revenue-weight: plan base fee + trailing-30d token dollars.
        thirty_day_tokens = sum(
            float(r["org_daily_tokens"] or 0.0)
            for r in rows
            if _within(r["as_of_date"], as_of, 30)
        )
        base_fee = float(latest["base_fee_usd"] or 0.0)
        price = float(latest["per_million_tokens_usd"] or 0.0)
        consumption_mrr = base_fee + thirty_day_tokens / 1e6 * price

        created = latest["created_date"]
        created_date = created if isinstance(created, date) else _to_date(str(created))
        age_days = (as_of - created_date).days

        panel.append(
            UsageRow(
                org_id=org_id,
                org_name=str(latest["org_name"]),
                plan_tier=str(latest["plan_tier"]),
                baseline_tokens=round(baseline, 1),
                current_tokens=round(current, 1),
                decay_pct=round(decay_pct, 4),
                sustained_days=sustained_days,
                age_days=age_days,
                active_users=int(latest["org_daily_active_users"] or 0),
                consumption_mrr=round(consumption_mrr, 2),
            )
        )
    panel.sort(key=lambda r: r.decay_pct, reverse=True)
    return panel


def _within(day: date, as_of: date, days: int) -> bool:
    return 0 <= (as_of - day).days < days


def _window_mean(
    tokens_by_date: dict[date, float], as_of: date, start_offset: int, end_offset: int
) -> float:
    """Mean daily tokens over [as_of-end_offset+1 .. as_of-start_offset]."""
    values = [
        tokens_by_date[day]
        for day in tokens_by_date
        if start_offset <= (as_of - day).days < end_offset
    ]
    return sum(values) / len(values) if values else 0.0


def _sustained_days(
    tokens_by_date: dict[date, float], as_of: date, baseline: float
) -> int:
    """Consecutive days back from ``as_of`` with tokens below 0.8 x baseline."""
    if baseline <= 0:
        return 0
    threshold = SUSTAINED_THRESHOLD * baseline
    count = 0
    day = as_of
    while day in tokens_by_date:
        if tokens_by_date[day] < threshold:
            count += 1
            day = day - timedelta(days=1)
        else:
            break
    return count


# --------------------------------------------------------------------------------------
# 1b — compute_expansion_signals
# --------------------------------------------------------------------------------------


def compute_expansion_signals(
    ctx: PlayRuntimeContext, as_of_date: str
) -> list[ExpansionCandidate]:
    """Raw product-qualified-account signal per org (token slope, dev growth, new surface)."""

    as_of = _to_date(as_of_date)

    # Recent-vs-prior token/dev windows and their slopes are now declarative windowed
    # metrics anchored on @as_of; the ratios compose over them. The outer date_range
    # bounds the scan to the two comparison windows (mirrors the old BETWEEN).
    outer_start = (as_of - timedelta(days=2 * PQA_WINDOW_DAYS)).isoformat()
    trend_rows = ctx.compile_and_run_multi(
        ctx.usage_dataset_id,
        [
            "token_slope",
            "active_dev_growth",
            "active_users_prior",
            "active_users_recent",
            "active_users_now",
        ],
        dimensions=["org_id", "org_name", "plan_tier"],
        date_range={"dimension": "as_of_date", "start": outer_start, "end": as_of_date},
        parameters=[BindParam("as_of", "DATE", as_of)],
        limit=1000,
    )
    trend = {r["org_id"]: r for r in trend_rows}

    # "Newly adopted" = the surface's first-ever activity falls inside the recent
    # window (a surface the org wasn't using before). Uses full history (no date_range)
    # so a mid-window onset is caught; the recency cut is a HAVING on the MIN aggregate.
    surface_rows = ctx.compile_and_run_multi(
        ctx.usage_dataset_id,
        ["surface_first_seen"],
        dimensions=["org_id", "product_surface"],
        having=[
            f"surface_first_seen > DATE_SUB(@as_of, INTERVAL {NEW_SURFACE_WINDOW_DAYS} DAY)"
        ],
        parameters=[BindParam("as_of", "DATE", as_of)],
        limit=1000,
    )
    new_surface: dict[str, str] = {}
    for row in surface_rows:
        # Prefer the workflow surface (the expansion flywheel) when several are new.
        existing = new_surface.get(row["org_id"])
        if existing != "workflow":
            new_surface[row["org_id"]] = str(row["product_surface"])

    candidates: list[ExpansionCandidate] = []
    for org_id, row in trend.items():
        # Slopes come from the ratio metrics (NULL when prior == 0 → treat as 0.0).
        token_slope = float(row["token_slope"] or 0.0)
        active_dev_growth = float(row["active_dev_growth"] or 0.0)
        dev_prior = float(row["active_users_prior"] or 0.0)
        dev_recent = float(row["active_users_recent"] or 0.0)

        surface = new_surface.get(org_id)
        adopted = surface is not None
        pqa_raw = (
            45.0 * _clamp01(token_slope)
            + 30.0 * _clamp01(active_dev_growth)
            + 25.0 * (1.0 if adopted else 0.0)
        )
        if pqa_raw < PQA_QUALIFY_MIN:
            continue

        candidates.append(
            ExpansionCandidate(
                org_id=org_id,
                org_name=str(row["org_name"]),
                plan_tier=str(row["plan_tier"]),
                token_slope=round(token_slope, 4),
                active_dev_growth=round(active_dev_growth, 4),
                active_users_start=int(round(dev_prior)),
                active_users_now=int(row["active_users_now"] or round(dev_recent)),
                new_surface_adopted=adopted,
                new_surface=surface,
                pqa_raw=round(pqa_raw, 1),
            )
        )
    candidates.sort(key=lambda c: c.pqa_raw, reverse=True)
    return candidates


__all__ = ["pull_usage_panel", "compute_expansion_signals"]
