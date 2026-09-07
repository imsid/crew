---
artifact_id: consumption-dip-rescue-mw_r_CBsgvU7QMtXz_consumption-dip-rescue_iCmMgCXUQPzzmANG
format: markdown
source_agent: growth
title: Consumption Dip Rescue Strategy Briefing
description: Curated plays and account assignments for consumption dip run mw:r_CBsgvU7QMtXz:consumption-dip-rescue:iCmMgCXUQPzzmANG
kind: curation_briefing
session_id: session-curate-plays
updated_at: 2026-08-25T06:34:52Z
---

## Summary

This curation run analyzed **3 candidate accounts** experiencing sustained token consumption decay as of **2026-05-28**, representing a total monthly consumption revenue of **$4,222.70** and **$1,738.19/month in dollars at risk** (aggregate decay of ~41.2%). 100% of candidate accounts (3 of 3) have been assigned to tailored plays targeting their specific decay drivers:

- **Enterprise Executive Escalation**: 1 account, **$1,022.61/mo at risk** (58.8% of total risk).
- **Technical CI/CD & Workflow Diagnostic**: 1 account, **$385.99/mo at risk** (22.2% of total risk).
- **Startup Core Team Re-engagement**: 1 account, **$329.59/mo at risk** (19.0% of total risk).

---

## Play Breakdown

| Play Name | Accounts | Dollars at Risk | Criteria | Play ID |
| :--- | :---: | :---: | :--- | :--- |
| **Enterprise Account Executive Escalation** | 1 | $1,022.61 | Enterprise-tier account with high dollars at risk (>$1,000/mo) and large headcount (3,200), where active developers represent an enterprise beachhead. | `mw:r_CBsgvU7QMtXz:consumption-dip-rescue:iCmMgCXUQPzzmANG:enterprise-account-executive-escalation` |
| **Technical Workflow & Integration Diagnostic** | 1 | $385.99 | High-saturation startup account exhibiting steep decay (>50%) driven by sudden org-wide workflow execution drops, indicating potential CI/CD or automation breakage. | `mw:r_CBsgvU7QMtXz:consumption-dip-rescue:iCmMgCXUQPzzmANG:technical-workflow-integration-diagnostic` |
| **Startup Core Team Re-engagement** | 1 | $329.59 | Funded mid-market/startup tier accounts experiencing persistent consumption decay across core developer seats without an active integration failure thesis. | `mw:r_CBsgvU7QMtXz:consumption-dip-rescue:iCmMgCXUQPzzmANG:startup-core-team-re-engagement` |

### Play 1: Enterprise Account Executive Escalation
- **Target Account**: Atlas Systems (`org_dip_enterprise`)
- **Criteria**: Enterprise-tier account with high dollars at risk (>$1,000/mo) and significant headcount where active users represent an enterprise beachhead.
- **Copy Template**:
  ```text
  {org_name}'s token usage is down {decay_pct} from their four-week baseline, sustained over the last {sustained_days} days with {dollars_at_risk}/month at risk across {active_users} active developers (total company headcount: {headcount}). Assigned owner {owner}: schedule an executive check-in with the primary sponsor this week to review enterprise workflow adoption and address any governance or platform blockers.
  ```
- **Rendered Example (Atlas Systems)**:
  > Atlas Systems's token usage is down 36% from their four-week baseline, sustained over the last 17 days with $1,023/month at risk across 32 active developers (total company headcount: 3,200). Assigned owner Marcus Lee (CSM): schedule an executive check-in with the primary sponsor this week to review enterprise workflow adoption and address any governance or platform blockers.

### Play 2: Technical Workflow & Integration Diagnostic
- **Target Account**: Northwind Labs (`org_dip_startup`)
- **Criteria**: High-saturation startup account exhibiting steep decay (>50%) driven by sudden org-wide workflow execution drops, indicating potential CI/CD or automation breakage.
- **Copy Template**:
  ```text
  {org_name}'s token usage is down {decay_pct} from their four-week baseline, sustained over {sustained_days} days with {dollars_at_risk}/month at risk across {active_users} active developers. Assigned owner {owner}: reach out to their lead engineer to inspect automated pipeline logs and verify whether recent CI/CD or workflow automation updates failed.
  ```
- **Rendered Example (Northwind Labs)**:
  > Northwind Labs's token usage is down 53% from their four-week baseline, sustained over 17 days with $386/month at risk across 14 active developers. Assigned owner Dana Reyes: reach out to their lead engineer to inspect automated pipeline logs and verify whether recent CI/CD or workflow automation updates failed.

### Play 3: Startup Core Team Re-engagement
- **Target Account**: Meridian Data (`org_dip_dedupe`)
- **Criteria**: Funded mid-market/startup tier accounts experiencing persistent consumption decay across core developer seats without an active integration failure thesis.
- **Copy Template**:
  ```text
  {org_name}'s token usage is down {decay_pct} from their four-week baseline, sustained over {sustained_days} days with {dollars_at_risk}/month at risk across {active_users} active developers. Assigned owner {owner}: set up a working session with their engineering lead to review sprint workload shifts, gather developer feedback, and unblock active usage.
  ```
- **Rendered Example (Meridian Data)**:
  > Meridian Data's token usage is down 48% from their four-week baseline, sustained over 17 days with $330/month at risk across 11 active developers. Assigned owner Sam Okafor: set up a working session with their engineering lead to review sprint workload shifts, gather developer feedback, and unblock active usage.

---

## Coverage Analysis

- **Total Candidates Evaluated**: 3
- **Total Candidates Assigned**: 3 (100% assignment coverage)
- **Unassigned Remaining**: 0
- **Total Revenue at Risk Covered**: $1,738.19 / $1,738.19 (100%)

---

## Data & Selection Reference

### Candidate Records (`crm_db.play_candidates` snapshot)

| Org ID | Org Name | Plan Tier | Headcount | Active Devs | Baseline Daily Tokens | Current Daily Tokens | Decay % | Sustained Days | Consumption MRR | Dollars at Risk | Assigned Owner | Assigned Play ID |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- | :--- |
| `org_dip_enterprise` | Atlas Systems | enterprise | 3,200 | 32 | 1,171,144.2 | 745,021.9 | 36.39% | 17 | $2,810.15 | $1,022.61 | Marcus Lee (CSM) | `...:enterprise-account-executive-escalation` |
| `org_dip_startup` | Northwind Labs | business | 60 | 14 | 354,113.8 | 165,408.3 | 53.29% | 17 | $724.32 | $385.99 | Dana Reyes | `...:technical-workflow-integration-diagnostic` |
| `org_dip_dedupe` | Meridian Data | business | 45 | 11 | 246,754.7 | 128,588.4 | 47.89% | 17 | $688.23 | $329.59 | Sam Okafor | `...:startup-core-team-re-engagement` |

### Defined Plays (`crm_db.plays`)

1. **`mw:r_CBsgvU7QMtXz:consumption-dip-rescue:iCmMgCXUQPzzmANG:enterprise-account-executive-escalation`**
   - Name: Enterprise Account Executive Escalation
   - Criteria: Enterprise-tier account with high dollars at risk (>$1,000/mo) and significant headcount where active users represent an enterprise beachhead.
   - Variables: `active_users`, `decay_pct`, `dollars_at_risk`, `headcount`, `org_name`, `owner`, `sustained_days`

2. **`mw:r_CBsgvU7QMtXz:consumption-dip-rescue:iCmMgCXUQPzzmANG:technical-workflow-integration-diagnostic`**
   - Name: Technical Workflow & Integration Diagnostic
   - Criteria: High-saturation startup account exhibiting steep decay (>50%) driven by sudden org-wide workflow execution drops, indicating potential CI/CD or automation breakage.
   - Variables: `active_users`, `decay_pct`, `dollars_at_risk`, `org_name`, `owner`, `sustained_days`

3. **`mw:r_CBsgvU7QMtXz:consumption-dip-rescue:iCmMgCXUQPzzmANG:startup-core-team-re-engagement`**
   - Name: Startup Core Team Re-engagement
   - Criteria: Funded mid-market/startup tier accounts experiencing persistent consumption decay across core developer seats without an active integration failure thesis.
   - Variables: `active_users`, `decay_pct`, `dollars_at_risk`, `org_name`, `owner`, `sustained_days`

### Run Selection SQL

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

---

## Next Steps

1. **Immediate Execution**: CSMs Marcus Lee, Dana Reyes, and Sam Okafor should execute their respective play briefing instructions within 24–48 hours.
2. **Technical Incident Check**: Dana Reyes to coordinate with Ampere developer support if Northwind Labs confirms CI/CD integration errors or platform rate-limiting.
3. **Follow-up Monitoring**: Re-evaluate trailing 7-day daily token consumption for all 3 orgs in the subsequent weekly run to track recovery velocity.
