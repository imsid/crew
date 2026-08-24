---
artifact_id: consumption-dip-rescue-mw_r_q_bt0xKxyY42_consumption-dip-rescue_HnZIexchiU4ur0KC
format: markdown
source_agent: growth
title: Consumption Dip Rescue - mw:r_q_bt0xKxyY42:consumption-dip-rescue:HnZIexchiU4ur0KC
description: Churn prevention play curation readout for consumption-dip-rescue run mw:r_q_bt0xKxyY42:consumption-dip-rescue:HnZIexchiU4ur0KC
kind: readout
session_id: mw:r_q_bt0xKxyY42:consumption-dip-rescue:HnZIexchiU4ur0KC
updated_at: 2026-08-24T05:08:45Z
---

# Consumption Dip Rescue: Run mw:r_q_bt0xKxyY42:consumption-dip-rescue:HnZIexchiU4ur0KC

## Summary

- **Workflow ID:** `consumption-dip-rescue`
- **Run ID:** `mw:r_q_bt0xKxyY42:consumption-dip-rescue:HnZIexchiU4ur0KC`
- **As of Date:** `2026-08-23`
- **Candidate Count:** 0
- **Total Dollars at Risk:** $0.00 / month
- **Run Overview:** No accounts qualified as candidate risks in this run. Usage across the evaluated customer base remained steady against their respective 4-week baselines without breaching the sustained decay thresholds.

## Plays

| Play Name | Account Count | Dollars Covered | Criteria | Copy Template | Rendered Example |
| :--- | :--- | :--- | :--- | :--- | :--- |
| *None Created* | 0 | $0.00 | N/A (0 candidates in run) | N/A | N/A |

*Note: Since candidate count is 0, no plays were defined or assigned for this run.*

## Coverage

- **Total Run Candidates:** 0
- **Total Accounts Assigned:** 0
- **Unassigned Remaining:** 0
- **Coverage:** 100%

## Data

### Tables & Verification Queries

```sql
-- Check candidates in CRM DB for this run
SELECT *
FROM `mash-487416.crm_db.play_candidates`
WHERE run_id = 'mw:r_q_bt0xKxyY42:consumption-dip-rescue:HnZIexchiU4ur0KC';

-- Check plays in CRM DB for this run
SELECT *
FROM `mash-487416.crm_db.plays`
WHERE run_id = 'mw:r_q_bt0xKxyY42:consumption-dip-rescue:HnZIexchiU4ur0KC';
```

### Upstream Selection SQL

```sql
SELECT
  orgs.as_of_date AS as_of_date,
  orgs.org_id AS org_id,
  orgs.org_name AS org_name,
  orgs.plan_tier AS plan_tier,
  orgs.created_date AS created_date,
  plan_pricing.base_fee_usd AS base_fee_usd,
  plan_pricing.per_million_tokens_usd AS per_million_tokens_usd,
  SUM(orgs.tokens_consumed) AS org_daily_tokens,
  SUM(orgs.active_users) AS org_daily_active_users
FROM `mash-487416.product_usage_db.dim_orgs` AS orgs
LEFT JOIN `mash-487416.product_usage_db.plan_pricing` AS plan_pricing
  ON orgs.plan_tier = plan_pricing.plan_tier
WHERE
  DATE(orgs.as_of_date) >= @p_as_of_date_start
  AND DATE(orgs.as_of_date) <= @p_as_of_date_end
GROUP BY as_of_date, org_id, org_name, plan_tier, created_date, base_fee_usd, per_million_tokens_usd
ORDER BY org_id ASC, as_of_date ASC
LIMIT 1000
```

## Next Steps

- **Ongoing Monitoring**: Maintain daily scheduled runs of `consumption-dip-rescue` to catch emerging dips early.
- **Upstream Verification**: Confirm pipeline execution cadence and ensure baseline window data remains fresh.
