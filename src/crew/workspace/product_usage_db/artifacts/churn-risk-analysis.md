---
artifact_id: churn-risk-analysis
format: markdown
source_agent: data
title: At-Risk Orgs Churn Analysis
description: Identifies organizations showing early warning signals of churn based on activity trends Dec 10-24, 2024
kind: analysis
session_id: current
updated_at: 2026-05-31T19:57:55Z
---

# At-Risk Orgs Churn Analysis
**Analysis Period:** Dec 10-24, 2024  
**Purpose:** Identify organizations showing early warning signals of churn

---

## Summary

Your orgs segment into **3 risk tiers** based on activity trends. The analysis compares activity velocity week-over-week (Dec 10-17 vs. Dec 18-24) and identifies early warning signals:

- **CRITICAL** (≤2 active days + <10 total activities): Immediate account recovery needed
- **HIGH** (≤3 active days OR zero activity last 7 days): At-risk, needs warm outreach
- **MEDIUM** (>50% activity decline): Declining trajectory, needs engagement intervention
- **HEALTHY**: Stable or growing activity

---

## Churn Risk Signals Tracked

### 1. **Frequency** — Active Days
Shows engagement consistency. Orgs with ≤2 active days are burning out fast.

### 2. **Volume** — Total Activities  
Scale of usage. Low activity + low frequency = high churn risk.

### 3. **Momentum** — Week-over-Week Change
**Critical indicator:** Activity collapsing week-to-week shows velocity decline.  
Example: org dropped from 500 → 100 activities (80% decline).

### 4. **Recency** — Last 7 Days Activity
Zero activity in the most recent week is a strong recency signal of disengagement.

---

## Risk Tier Definitions & Actions

| Risk Level | Criteria | Action | Timeline |
|-----------|----------|--------|----------|
| 🔴 **CRITICAL** | ≤2 active days + <10 total activities | High-touch sales outreach / account recovery call | Within 24 hours |
| 🟠 **HIGH** | ≤3 active days OR zero activity last 7 days | Warm email from CS + product insights | Within 3 days |
| 🟡 **MEDIUM** | >50% activity drop week-to-week | Automated feature recommendations + email nurture | This week |
| 🟢 **HEALTHY** | Consistent or growing activity | No action, monitor | Ongoing |

---

## Metrics Used

From your metrics_layer:
- **Daily Activity Count** — Sum of activity_count per org per day
- **Base Source:** user_activity_events (daily granularity)
- **Dimensions Analyzed:** org_id, activity_date

---

## Recommended Next Steps

### 1. **Drill Into At-Risk Orgs**
For each HIGH/CRITICAL org, investigate:
- Which features are being abandoned?
- What was the trigger event (last login, last feature used)?
- Are there support tickets or billing issues correlated with the decline?
- Who are the power users vs. inactive users within that org?

### 2. **Define Intervention Tiers by Org Value**
Weight your outreach by org size/ARR:
```
CRITICAL + HIGH-ARR → Sales team executive check-in + dedicated CS
CRITICAL + MID-ARR  → Product-led re-engagement flow + email
CRITICAL + LOW-ARR  → Automated win-back campaigns
```

### 3. **Measure Intervention Impact (RCT)**
Design a control/treatment test to prove outreach works:
- **Treatment:** Reach out to HIGH/CRITICAL segment with [intervention X]
- **Control:** Don't reach out (random sample, same segment)
- **Metrics:**
  - % orgs reactivated (activity > 0 in next 7 days)
  - Days to first activity after contact
  - Revenue impact (if available)

### 4. **Create Operational Churn Metrics** (Long-term)
Consider adding these to your metrics_layer for ongoing monitoring:
- **Activity Velocity** — 7-day rolling WoW % change
- **Inactivity Days** — Days since last activity per org
- **Feature Breadth Decline** — Decreasing # of distinct features used
- **Org Value-at-Risk** — Org ARR × predicted churn probability

---

## Data & Methodology

**Calculation:**
```sql
WITH activity_by_week AS (
  SELECT org_id,
    SUM(CASE WHEN activity_date >= '2024-12-18' THEN activity_count END) AS last_7_days,
    SUM(CASE WHEN activity_date < '2024-12-18' THEN activity_count END) AS prev_7_days
  FROM user_activity
  WHERE activity_date BETWEEN '2024-12-10' AND '2024-12-24'
  GROUP BY org_id
)
```

**Risk classification:**
- CRITICAL: active_days ≤ 2 AND total_activities < 10
- HIGH: active_days ≤ 3 OR last_7_days = 0
- MEDIUM: (last_7_days / prev_7_days) < 0.5
- HEALTHY: everything else

**Confidence & Limitations:**
- Analysis covers only 15 days; may not capture weekly/monthly seasonality
- No org metadata (size, segment, onboarding date) to weight intervention priority
- No causal attribution; correlation between activity decline and churn intent

---

## What's Missing (Next Phase)

To make this production-ready, you'd want:

1. **Org Metadata**
   - Segment, ARR, onboarding date, plan tier
   - Allows you to weight intervention by customer lifetime value

2. **Feature Usage Breakdown**
   - Which products/features are users abandoning?
   - Are certain features correlated with churn?

3. **Support & Billing Signals**
   - Are churn-risk orgs filing more support tickets?
   - Any payment failures or plan downgrades?

4. **User Turnover Within Org**
   - Is the org losing team members (churn at user level)?
   - Loss of a power user could trigger org churn.

5. **Outcome Tracking**
   - Did the org eventually churn? (label for ML modeling)
   - How long after inactivity until they cancel?

---

## Next Steps

1. **Review the at-risk list** — Are these orgs you expected to flag?
2. **Add org metadata** — Let me create a richer source with org_name, segment, ARR
3. **Define intervention** — What's your playbook for HIGH/CRITICAL reach-outs?
4. **Plan the RCT** — Want to design a control test to measure reactivation impact?
5. **Build recurring metrics** — Create churn_risk_score metric for weekly dashboards?
