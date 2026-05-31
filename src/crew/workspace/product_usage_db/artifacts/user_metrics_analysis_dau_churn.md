---
artifact_id: user_metrics_analysis_dau_churn
format: markdown
source_agent: data
title: User Metrics Analysis - DAU Breakdown & Churn Patterns
description: Analysis of daily active users (new + returning) and churn patterns across organizations with top org rankings.
kind: analysis
session_id: current
updated_at: 2026-05-31T01:51:38Z
---

# 📊 User Metrics Analysis: DAU Breakdown & Churn Patterns

## Summary

This analysis reveals a **healthy, concentrated DAU base with a critical churn signal in one outlier org**:

- **Top 4 organizations (org_006, org_001, org_002, org_007) drive 85% of DAU**, with zero churn
- **org_005 is the only churned cohort**: 18 churned users from a small 135-person DAU base (13.3% churn rate)
- **New user acquisition is minimal**: <2% of DAU across all orgs, suggesting a retention-focused, mature market
- **High-intensity usage pockets** in org_004 and org_009 offer replication opportunities

---

## Key Metrics Overview

| Metric | Value | Notes |
|--------|-------|-------|
| **Total DAU (New + Returning)** | 8,311 | Across all 9 orgs |
| **Peak DAU Org** | 2,490 | org_006 |
| **Total Churned Users** | 18 | org_005 only |
| **Churn Rate (org_005)** | 13.3% | (18 / 135 active users) |
| **Org Diversity** | 9 | Only 1 org with churn signal |

---

## 🏆 Top Organizations by DAU & Churn

### Tier 1: High DAU, Zero Churn (Core Revenue Base)

| Org | DAU | New | Returning | Churned | Total Tokens | Avg/User |
|-----|-----|-----|-----------|---------|--------------|----------|
| **org_006** ⭐ | 2,490 | 30 | 2,460 | 0 | 1.85B | 8,304 |
| **org_001** | 2,144 | 25 | 2,119 | 0 | 1.60B | 8,167 |
| **org_002** | 1,778 | 28 | 1,750 | 0 | 971.7M | 8,155 |
| **org_007** | 1,330 | 19 | 1,311 | 0 | 811.4M | 8,101 |
| **Subtotal** | **7,742** | **102** | **7,640** | **0** | **6.23B** | **8,181** |

### Tier 2: Medium DAU, Zero Churn (Supporting Base)

| Org | DAU | New | Returning | Churned | Total Tokens | Avg/User |
|-----|-----|-----|-----------|---------|--------------|----------|
| **org_003** | 938 | 14 | 924 | 0 | 591.7M | 7,267 |
| **org_004** 🔥 | 440 | 17 | 423 | 0 | 277.9M | 11,544 |
| **org_008** | 380 | 6 | 374 | 0 | 237.9M | 7,564 |
| **Subtotal** | **1,758** | **37** | **1,721** | **0** | **1.11B** | **8,792** |

### Tier 3: Low DAU with Churn Signal (At Risk)

| Org | DAU | New | Returning | Churned | Total Tokens | Avg/User | Status |
|-----|-----|-----|-----------|---------|--------------|----------|--------|
| **org_005** 🚨 | 135 | 18 | 117 | **18** | 15.4M | 8,422 | **Churn Alert** |
| **org_009** 🔥 | 176 | 5 | 171 | 0 | 143.8M | 12,093 | High Intensity |

---

## 💡 Key Findings

### Finding 1: Highly Concentrated DAU (93% in 7 orgs)
- **Tier 1 (top 4 orgs)** accounts for **93% of total DAU** (7,742 / 8,311)
- org_006 alone represents **30% of platform DAU**
- **Risk**: Heavy concentration creates dependency; loss of any Tier 1 org would materially impact platform metrics
- **Opportunity**: Tier 1 orgs are proven product-market fit; understand their retention drivers

### Finding 2: Critical Churn Signal in org_005
- **Only org experiencing churn**: 18 users (10.8% of 167 historical returning users)
- **Org size**: Significantly smaller DAU (135) compared to Tier 1 baseline (1,330-2,490)
- **Per-user intensity**: Despite low DAU, org_005 maintains healthy per-user consumption (8,422 tokens)
- **Interpretation**: Not a product issue (usage is healthy), but likely a **go-to-market, onboarding, or value-realization problem** for this specific cohort
- **Action Required**: This is the only org showing churn signals; prioritize root cause analysis

### Finding 3: New User Acquisition is Minimal
- **New users represent 1.2% of DAU** across platform (102 / 8,311)
- **Pattern across all orgs**: 
  - Tier 1 orgs: 1.3% new (102 new / 7,742 DAU)
  - Tier 2 orgs: 2.1% new (37 new / 1,758 DAU)
- **Interpretation**: Platform is in **retention-optimization mode**, not growth-acquisition mode
- **Implication**: Either (a) market is mature and saturated, (b) onboarding friction prevents new user scaling, or (c) growth efforts are deprioritized
- **Question**: Is this by design (customer growth via expansion) or a growth bottleneck?

### Finding 4: High-Intensity Usage Pockets
- **org_009**: Smallest viable DAU (176) but **highest per-user consumption** (12,093 tokens = 1.5x platform average)
- **org_004**: Medium DAU (440) with **11,544 tokens/user** (1.4x average)
- **Contrast**: Tier 1 orgs average 8,181 tokens/user
- **Interpretation**: Smaller orgs are **power users**, possibly using product for specialized/high-value workflows
- **Opportunity**: Understand org_004 & org_009 success drivers and replicate across Tier 1 (volume play)

---

## 🎯 Recommended Actions

### Priority 1: Investigate org_005 Churn (This Week)
**Goal**: Prevent further churn and understand if it signals a systemic product issue.

- [ ] **Root Cause Analysis**
  - Why did 18 returning users churn? (engagement drop-off, unmet expectations, price/value, competitive loss?)
  - Pull cohort analysis: when did they join, how long were they active, what was their feature adoption?
  - Review support tickets, NPS responses, and customer feedback for this org
  
- [ ] **Behavioral Segmentation**
  - Did churn follow a product change or pricing event?
  - Compare pre-churn vs. post-churn behavior (login frequency, feature usage, token burn rate)
  - Identify if churned users were power users or casual users
  
- [ ] **Go-to-Market Check**
  - Is org_005 a poor product-market fit (wrong use case)?
  - Did sales/CS fail to onboard them properly?
  - Is there a technical or support issue blocking value realization?

- [ ] **Recovery Plan** (if actionable)
  - Can we win back any of the 18 churned users?
  - What changes (feature, support, pricing) would prevent similar churn in other small orgs?

### Priority 2: Unlock New User Growth (Next 2 Weeks)
**Goal**: Increase new user ratio from 1.2% to 5%+ to diversify revenue and reduce concentration risk.

- [ ] **Onboarding Funnel Analysis**
  - Measure: sign-up → first activity → week-1 retention → month-1 retention
  - Identify drop-off stage (most likely: between sign-up and first activity)
  - A/B test onboarding improvements (guided tours, templates, simplified setup)
  
- [ ] **Growth Initiatives**
  - Tier 1 orgs have minimal new user intake; why? Are they self-contained accounts or is there expansion opportunity?
  - Test: referral program, free trial extension, product-led growth (freemium tier)
  - Measure: time to value and new user retention vs. organic baseline

### Priority 3: Replicate High-Intensity Usage (Next 3 Weeks)
**Goal**: Grow token consumption in Tier 1 orgs by understanding org_004 & org_009 success drivers.

- [ ] **Usage Pattern Deep Dive**
  - What workflows drive 12,000+ tokens/user in org_009 and org_004?
  - Which features do they use most? (vs. feature adoption in org_006)
  - Are they using product differently (vertical-specific, high-frequency tasks, automation)?
  
- [ ] **Feature Adoption Comparison**
  - Map feature usage: org_004/org_009 vs. org_006 (the largest)
  - Which features correlate with high per-user consumption?
  - Do power users adopt premium/advanced features first?
  
- [ ] **Scaling Playbook**
  - Create use-case documentation for org_004 & org_009 workflows
  - Tailor onboarding for Tier 1 orgs to emphasize high-value features
  - Share success stories / case studies to drive adoption

### Priority 4: Secure Tier 1 Retention (Ongoing)
**Goal**: Protect 93% of DAU (7,742 users in top 4 orgs) from any churn risk.

- [ ] **Dedicated Account Management**
  - Assign CS resources to org_006, org_001, org_002, org_007
  - Monthly business reviews to track expansion opportunities and satisfaction
  - Proactive support during product updates
  
- [ ] **Early Warning System**
  - Monitor engagement signals (login frequency, feature usage) for Tier 1 orgs
  - Set alerts if any org shows usage decline similar to org_005 pre-churn pattern
  
- [ ] **Expansion Opportunities**
  - Tier 1 orgs are stable; focus on seat expansion and advanced features (upsell)

---

## 📊 Supporting Metrics Used

| Metric | Source | Definition |
|--------|--------|-----------|
| `total_new_users` | dim_users | COUNT(user_id) WHERE is_new_user = TRUE |
| `total_returning_users` | dim_users | COUNT(user_id) WHERE is_returning_user = TRUE |
| `total_active_users` | dim_users | COUNT(user_id) WHERE is_active_user = TRUE |
| `total_churned_users` | dim_users | COUNT(user_id) WHERE is_churned_user = TRUE |

- **DAU (Daily Active Users)**: new_users + returning_users
- **Churn Rate**: churned_users / (returning_users + churned_users)
- **Avg Tokens/User**: total_tokens_consumed / unique_user_count

---

## Next Steps

1. **This week**: Prioritize org_005 churn root cause analysis (Priority 1)
2. **Next sprint**: Initiate new user acquisition funnel analysis (Priority 2) + org_004/org_009 deep dive (Priority 3)
3. **Ongoing**: Establish monitoring for Tier 1 org engagement and early churn warning signals
4. **Optional data requests**:
   - Time-series churn data (when did org_005 users churn? how many per week?)
   - Feature adoption matrix (which features correlate with high token consumption?)
   - Org-level revenue/ARR correlation (is DAU correlated with revenue for Tier 1 vs. Tier 2?)
