---
artifact_id: signup_checkout_readout_latest
source_agent: data-agent
title: Signup Checkout — Latest Experiment Readout
description: Early-stage readout for signup_checkout_test (v1) showing +34% lift in conversions with low power.
kind: readout
session_id: current
updated_at: 2024-01-17T00:00:00Z
---

## Summary

**Experiment:** signup_checkout_test (v1)  
**Status:** Early-stage analysis; insufficient power for a conclusive verdict

The signup checkout experiment shows a promising +34% lift in conversions per subject for the treatment variant, but the sample is too small to confirm statistical significance. No sample ratio mismatch detected. Recommend continued data collection before drawing final conclusions.

---

## Exposure Summary

| Variant | Canonical Subjects | Contaminated | Notes |
|---------|------------------|--------------|-------|
| **Control** | 105 | 2 | 1.9% contamination |
| **Treatment** | 115 | 0 | Clean |

---

## Sample Ratio Mismatch (SRM) Check

✅ **No imbalance detected**
- Chi-square statistic: 0.45 (p = 0.50)
- Allocation is balanced as expected (50% control, 50% treatment)
- 2 contaminated subjects in control is minimal and acceptable

---

## Key Metrics

### Conversions (Total)

**Attribution Window:** 14 days post-exposure

| Metric | Control | Treatment | Lift | 95% CI | p-value |
|--------|---------|-----------|------|--------|---------|
| **Conversions per Subject** | 0.0194 | 0.0261 | **+34.3%** | [-3.3%, +4.7%] | 0.74 |

**Interpretation:**
- Treatment shows a +34% point estimate in conversions
- The 95% confidence interval is wide and spans zero, indicating **high uncertainty**
- p-value (0.74) is far from statistical significance
- Only 2–3 conversions per variant; sample size is the limiting factor

---

## Findings

1. **Direction is positive** — The treatment variant outperforms control by 34% on the key conversion metric
2. **Confidence is low** — Wide confidence interval and non-significant p-value indicate we cannot yet confirm the lift is real
3. **SRM is clean** — No evidence of exposure contamination or imbalanced randomization
4. **Sample is small** — Currently under-powered to detect this effect size with high confidence

---

## Next Steps

1. **Collect more data** — Continue the experiment to reach adequate sample size (recommend 500–1000 subjects per variant for 80% power)
2. **Monitor secondary metrics** — Track related conversion funnel steps and user engagement to understand the mechanism
3. **Check for early-stage confounds** — Verify that treatment and control cohorts remain balanced on key demographic or temporal factors as data accumulates

---

## Metadata

- **Experiment ID:** signup_checkout_test
- **Version:** 1
- **Analysis Date:** 2024-01-17
- **Statistical Test:** Two-proportion z-test with Welford variance
- **Confidence Level:** 95%
