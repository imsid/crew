---
artifact_id: consumption-dip-mw_r_7Bny8RIPnVhW_consumption-dip_HCFWZ4dZQJjhJPWS
format: markdown
source_agent: growth
title: Consumption Dip Retention Plays Briefing
description: Curated plays and account assignments for consumption-dip run mw:r_7Bny8RIPnVhW:consumption-dip:HCFWZ4dZQJjhJPWS
kind: curation_briefing
session_id: mw:r_7Bny8RIPnVhW:consumption-dip:HCFWZ4dZQJjhJPWS
updated_at: 2026-09-07T03:27:44Z
---

## Summary

Curated 3 candidate accounts facing sustained consumption dips into 3 distinct, action-oriented retention plays representing $1,738.19 in total monthly revenue at risk. Plays are segmented by customer tier, primary failure mode, and designated account owner.

- Run: `mw:r_7Bny8RIPnVhW:consumption-dip:HCFWZ4dZQJjhJPWS` (`consumption-dip`)
- Accounts: 3 across 3 plays

## Plays

### Enterprise Dedicated CSM Retention Check-In

- **Accounts** (1): Atlas Systems (`org_dip_enterprise`)
- **Criteria**: Enterprise tier accounts with assigned CSMs experiencing broad, org-wide consumption decay and significant monthly dollars at risk (> $1,000/mo).
- **Copy template**:

  ```text
  Hi team,
  
  I've been monitoring {org_name}'s usage on Ampere over the past month and noticed a ~{decay_pct} decrease in active chat and token consumption across your {active_users} developers over the last {sustained_days} days.
  
  Given your team's scale, I want to ensure there aren't any internal blockers, recent policy changes, or workflow friction points getting in the way of developer productivity.
  
  Do you have 15 minutes this week for a brief sync so we can review adoption trends, gather feedback from your team, and ensure you're getting maximum value from your Enterprise deployment?
  
  Best,
  {sender_name}
  Customer Success Manager, Ampere
  ```

- **Rendered for Atlas Systems**:

  > Hi team,
  > 
  > I've been monitoring Atlas Systems's usage on Ampere over the past month and noticed a ~36% decrease in active chat and token consumption across your 32 developers over the last 17 days.
  > 
  > Given your team's scale, I want to ensure there aren't any internal blockers, recent policy changes, or workflow friction points getting in the way of developer productivity.
  > 
  > Do you have 15 minutes this week for a brief sync so we can review adoption trends, gather feedback from your team, and ensure you're getting maximum value from your Enterprise deployment?
  > 
  > Best,
  > Marcus Lee
  > Customer Success Manager, Ampere

### Technical Automation & CI/CD Pipeline Diagnostic

- **Accounts** (1): Northwind Labs (`org_dip_startup`)
- **Criteria**: Business tier startup accounts experiencing sudden, near-total decay in workflow executions across all active developers, signaling potential CI/CD breakages or automation errors.
- **Copy template**:

  ```text
  Hi team,
  
  I noticed that workflow automation runs on Ampere dropped sharply across {org_name} over the past {sustained_days} days, bringing overall daily token usage down by ~{decay_pct} across your {active_users} developers.
  
  When we see workflow executions drop org-wide all at once, it typically points to a broken CI/CD integration, webhook/API key expiration, or recent deployment pipeline refactor rather than a shift in team demand.
  
  Could we hop on a quick 10-minute diagnostic call, or can I review your workflow run logs to help get your automated pipelines back online?
  
  Best,
  {sender_name}
  Ampere
  ```

- **Rendered for Northwind Labs**:

  > Hi team,
  > 
  > I noticed that workflow automation runs on Ampere dropped sharply across Northwind Labs over the past 17 days, bringing overall daily token usage down by ~53% across your 14 developers.
  > 
  > When we see workflow executions drop org-wide all at once, it typically points to a broken CI/CD integration, webhook/API key expiration, or recent deployment pipeline refactor rather than a shift in team demand.
  > 
  > Could we hop on a quick 10-minute diagnostic call, or can I review your workflow run logs to help get your automated pipelines back online?
  > 
  > Best,
  > Dana Reyes
  > Ampere

### Startup Developer Adoption & Sprint Health Check

- **Accounts** (1): Meridian Data (`org_dip_dedupe`)
- **Criteria**: Business tier startup accounts with sustained consumption decay (>40% drop over 14+ days) across core development workflows.
- **Copy template**:

  ```text
  Hi team,
  
  I'm reaching out from Ampere to check in on how things are going with {org_name}'s engineering team. Over the last {sustained_days} days, we noticed your team's daily token consumption has decreased by ~{decay_pct} across your {active_users} developers.
  
  Whether this is due to a shift in sprint cycles, new priorities, or specific friction points your team encountered with coding tools, we'd love to help support your roadmap.
  
  Would you be open to a brief 15-minute call this week to share how the team is currently utilizing Ampere and see if there are areas we can optimize?
  
  Best,
  {sender_name}
  Ampere
  ```

- **Rendered for Meridian Data**:

  > Hi team,
  > 
  > I'm reaching out from Ampere to check in on how things are going with Meridian Data's engineering team. Over the last 17 days, we noticed your team's daily token consumption has decreased by ~48% across your 11 developers.
  > 
  > Whether this is due to a shift in sprint cycles, new priorities, or specific friction points your team encountered with coding tools, we'd love to help support your roadmap.
  > 
  > Would you be open to a brief 15-minute call this week to share how the team is currently utilizing Ampere and see if there are areas we can optimize?
  > 
  > Best,
  > Sam Okafor
  > Ampere

## Candidates

| Org ID | Org Name | Play | decay_pct | active_users | sustained_days | sender_name |
| --- | --- | --- | --- | --- | --- | --- |
| `org_dip_enterprise` | Atlas Systems | Enterprise Dedicated CSM Retention Check-In | 0.3639 | 32 | 17 | Marcus Lee |
| `org_dip_startup` | Northwind Labs | Technical Automation & CI/CD Pipeline Diagnostic | 0.5329 | 14 | 17 | Dana Reyes |
| `org_dip_dedupe` | Meridian Data | Startup Developer Adoption & Sprint Health Check | 0.4789 | 11 | 17 | Sam Okafor |

## Next Steps

- **Enterprise Dedicated CSM Retention Check-In** — send the copy above to 1 account: Atlas Systems
- **Technical Automation & CI/CD Pipeline Diagnostic** — send the copy above to 1 account: Northwind Labs
- **Startup Developer Adoption & Sprint Health Check** — send the copy above to 1 account: Meridian Data
- The run's rows are in `crm_db.play_candidates` and `crm_db.plays` filtered by `run_id = 'mw:r_7Bny8RIPnVhW:consumption-dip:HCFWZ4dZQJjhJPWS'`.
