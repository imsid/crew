"""Statistical helpers for experiment analysis."""

from __future__ import annotations

from typing import Any, Dict, List


def compute_experiment_results(
    control_variant: str,
    allocation_weights: Dict[str, float],
    exposure_counts: List[Dict[str, Any]],
    metric_summaries: List[Dict[str, Any]],
) -> Dict[str, Any]:
    try:
        from scipy import stats
        from statsmodels.stats.multitest import multipletests
    except Exception as exc:
        raise RuntimeError(
            "compute_experiment_results requires scipy and statsmodels to be installed"
        ) from exc

    exposure_by_variant = {
        str(row["variant_id"]): int(row["canonical_subjects"]) for row in exposure_counts
    }
    observed_variants = sorted(exposure_by_variant)
    if control_variant not in exposure_by_variant:
        raise ValueError(
            f"control_variant '{control_variant}' is missing from exposure counts"
        )
    if allocation_weights:
        expected = [allocation_weights.get(variant, 0.0) for variant in observed_variants]
        if any(weight <= 0 for weight in expected):
            raise ValueError("allocation_weights must cover all observed variants with positive values")
        total = sum(expected)
        expected = [weight / total for weight in expected]
    else:
        expected = [1.0 / len(observed_variants)] * len(observed_variants)
    total_subjects = sum(exposure_by_variant.values())
    srm_expected = [total_subjects * weight for weight in expected]
    srm_stat, srm_p_value = stats.chisquare(
        [exposure_by_variant[variant] for variant in observed_variants],
        f_exp=srm_expected,
    )

    metric_results = []
    for metric_summary in metric_summaries:
        metric_id = str(metric_summary["metric_id"])
        rows = metric_summary["rows"]
        by_variant = {str(row["variant_id"]): row for row in rows}
        control = by_variant.get(control_variant)
        if control is None:
            raise ValueError(
                f"metric '{metric_id}' is missing control variant '{control_variant}'"
            )
        raw_p_values = []
        comparisons = []
        for variant_id, row in sorted(by_variant.items()):
            if variant_id == control_variant:
                continue
            control_n = int(control["exposed_subjects"])
            variant_n = int(row["exposed_subjects"])
            if control_n < 2 or variant_n < 2:
                p_value = None
                statistic = None
                ci_low = None
                ci_high = None
            else:
                control_mean = float(control["metric_sum"]) / control_n
                variant_mean = float(row["metric_sum"]) / variant_n
                control_std = _sample_std(
                    sum_value=float(control["metric_sum"]),
                    sum_squares=float(control["metric_sum_squares"]),
                    n=control_n,
                )
                variant_std = _sample_std(
                    sum_value=float(row["metric_sum"]),
                    sum_squares=float(row["metric_sum_squares"]),
                    n=variant_n,
                )
                statistic, p_value = stats.ttest_ind_from_stats(
                    mean1=variant_mean,
                    std1=variant_std,
                    nobs1=variant_n,
                    mean2=control_mean,
                    std2=control_std,
                    nobs2=control_n,
                    equal_var=False,
                )
                ci_low, ci_high = _welch_ci(
                    stats_module=stats,
                    variant_mean=variant_mean,
                    variant_std=variant_std,
                    variant_n=variant_n,
                    control_mean=control_mean,
                    control_std=control_std,
                    control_n=control_n,
                )
                raw_p_values.append(p_value)
            comparisons.append(
                {
                    "variant_id": variant_id,
                    "control_variant": control_variant,
                    "control_mean": float(control["metric_sum"]) / max(int(control["exposed_subjects"]), 1),
                    "variant_mean": float(row["metric_sum"]) / max(int(row["exposed_subjects"]), 1),
                    "lift": (
                        None
                        if float(control["metric_sum"]) == 0
                        else (
                            (float(row["metric_sum"]) / max(int(row["exposed_subjects"]), 1))
                            / (float(control["metric_sum"]) / max(int(control["exposed_subjects"]), 1))
                            - 1.0
                        )
                    ),
                    "statistic": statistic,
                    "p_value": p_value,
                    "ci_low": ci_low,
                    "ci_high": ci_high,
                    "adjusted_p_value": None,
                }
            )
        if raw_p_values:
            _, adjusted, _, _ = multipletests(raw_p_values, method="holm")
            adjusted_iter = iter(adjusted.tolist())
            for comparison in comparisons:
                if comparison["p_value"] is not None:
                    comparison["adjusted_p_value"] = next(adjusted_iter)
        metric_results.append({"metric_id": metric_id, "comparisons": comparisons})

    return {
        "srm": {
            "variants": observed_variants,
            "observed_counts": exposure_by_variant,
            "expected_weights": {
                variant: expected[idx] for idx, variant in enumerate(observed_variants)
            },
            "chi_square_statistic": float(srm_stat),
            "p_value": float(srm_p_value),
        },
        "metrics": metric_results,
    }


def _sample_std(sum_value: float, sum_squares: float, n: int) -> float:
    if n <= 1:
        return 0.0
    variance = (sum_squares - ((sum_value * sum_value) / n)) / (n - 1)
    return max(variance, 0.0) ** 0.5


def _welch_ci(
    stats_module: Any,
    variant_mean: float,
    variant_std: float,
    variant_n: int,
    control_mean: float,
    control_std: float,
    control_n: int,
) -> tuple[float, float]:
    standard_error = (
        (variant_std * variant_std / variant_n)
        + (control_std * control_std / control_n)
    ) ** 0.5
    if standard_error == 0:
        diff = variant_mean - control_mean
        return diff, diff
    numerator = (
        (variant_std * variant_std / variant_n)
        + (control_std * control_std / control_n)
    ) ** 2
    denominator = 0.0
    if variant_n > 1:
        denominator += (
            (variant_std * variant_std / variant_n) ** 2 / (variant_n - 1)
        )
    if control_n > 1:
        denominator += (
            (control_std * control_std / control_n) ** 2 / (control_n - 1)
        )
    degrees_freedom = max(numerator / denominator, 1.0) if denominator else 1.0
    critical_value = float(stats_module.t.ppf(0.975, degrees_freedom))
    diff = variant_mean - control_mean
    margin = critical_value * standard_error
    return diff - margin, diff + margin

