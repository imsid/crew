---
artifact_id: expansion-pqa-mw_r_MOcTjou79UcU_expansion-pqa_PppIp1tXFgiFOSHq
format: markdown
source_agent: growth
title: PQA Expansion Play Curation
description: Curated plays and account assignments for expansion-pqa run mw:r_MOcTjou79UcU:expansion-pqa:PppIp1tXFgiFOSHq
kind: curation_briefing
session_id: mw:r_MOcTjou79UcU:expansion-pqa:PppIp1tXFgiFOSHq
updated_at: 2026-09-07T17:55:46Z
---

## Summary

Curated 2 qualified PQA candidate accounts into 2 distinct expansion plays based on company headroom and motion requirements: 1 self-serve upgrade nudge for a startup approaching company saturation on the Team tier, and 1 sales expansion briefing for an enterprise beachhead with massive expansion headroom following recent Series E funding.

- Run: `mw:r_MOcTjou79UcU:expansion-pqa:PppIp1tXFgiFOSHq` (`expansion-pqa`)
- Accounts: 2 across 2 plays

## Plays

### Self-Serve Upgrade Nudge: Team to Business

- **Accounts** (1): org_expand_small (`org_expand_small`)
- **Criteria**: High PQA score (>90) with strong token growth (+120%) and workflow adoption, but approaching organizational saturation (9 active devs in a 12-person startup). With limited organizational headroom, self-serve upgrade to the Business tier is the lowest-friction, right-sized motion without human sales overhead.
- **Copy template**:

  ```text
  Hi {org_name} team,
  
  We noticed your team has grown from {active_users_start} to {active_users_now} active developers on Ampere and recently adopted automated workflows, driving a {token_slope}x increase in token consumption.
  
  With {active_users_now} developers building and running workflows, you are nearing the limits of the Team tier. Upgrading to the Business tier unlocks higher concurrency and rate limits, lower token pricing ($14/M vs $18/M), and priority support to keep your automations running smoothly.
  
  Upgrade your workspace in settings: https://app.ampere.ai/settings/billing
  ```

- **Rendered for org_expand_small**:

  > Hi org_expand_small team,
  > 
  > We noticed your team has grown from 3 to 9 active developers on Ampere and recently adopted automated workflows, driving a 2.20x increase in token consumption.
  > 
  > With 9 developers building and running workflows, you are nearing the limits of the Team tier. Upgrading to the Business tier unlocks higher concurrency and rate limits, lower token pricing ($14/M vs $18/M), and priority support to keep your automations running smoothly.
  > 
  > Upgrade your workspace in settings: https://app.ampere.ai/settings/billing

### Enterprise AE Expansion Briefing: Beachhead to Enterprise Contract

- **Accounts** (1): org_expand_enterprise (`org_expand_enterprise`)
- **Criteria**: Enterprise account showing rapid organic usage growth (4 to 9 devs, +120% token slope, workflow adoption) on Business tier with massive expansion headroom (4,000 headcount, ~800 potential developer seats) and urgent timing (Series E closed 35 days prior, 60 open engineering roles). The 9-dev footprint is a beachhead requiring immediate human sales engagement during the active post-raise tooling consolidation window.
- **Copy template**:

  ```text
  Account: {org_name} (Owner: {owner})
  
  Signal Summary:
  - Usage: {active_users_start} -> {active_users_now} active devs (+{active_dev_growth}%), token growth slope {token_slope}x, new surface adopted: {new_surface}.
  - Context: {headcount} employees, {funding_stage} funded (raised {last_raised_date}), {hiring_signals} open engineering roles.
  
  Expansion Angle:
  Current usage on Business tier is a beachhead across ~800 potential engineers. Fresh Series E funding puts them directly within the 60–90 day post-close window when tooling consolidation decisions occur.
  
  Recommended Action:
  Engage engineering leadership to initiate an Enterprise tier committed-use motion ($10/M token pricing, VPC/on-prem options, enterprise SLAs, and centralized governance).
  ```

- **Rendered for org_expand_enterprise**:

  > Account: org_expand_enterprise (Owner: Priya Nair)
  > 
  > Signal Summary:
  > - Usage: 4 -> 9 active devs (+125%), token growth slope 2.20x, new surface adopted: workflow.
  > - Context: 4,000 employees, Series E funded (raised 35 days ago), 60 open engineering roles.
  > 
  > Expansion Angle:
  > Current usage on Business tier is a beachhead across ~800 potential engineers. Fresh Series E funding puts them directly within the 60–90 day post-close window when tooling consolidation decisions occur.
  > 
  > Recommended Action:
  > Engage engineering leadership to initiate an Enterprise tier committed-use motion ($10/M token pricing, VPC/on-prem options, enterprise SLAs, and centralized governance).

## Candidates

| Org ID | Org Name | Play | active_users_start | active_users_now | token_slope | owner | active_dev_growth | new_surface | headcount | funding_stage | last_raised_date | hiring_signals |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `org_expand_small` | org_expand_small | Self-Serve Upgrade Nudge: Team to Business | 3 | 9 | 2.2 | — | — | — | — | — | — | — |
| `org_expand_enterprise` | org_expand_enterprise | Enterprise AE Expansion Briefing: Beachhead to Enterprise Contract | 4 | 9 | 2.2 | Priya Nair | 125 | workflow | 4000 | Series E | 35 days ago | 60 |

## Next Steps

- **Self-Serve Upgrade Nudge: Team to Business** — send the copy above to 1 account: org_expand_small
- **Enterprise AE Expansion Briefing: Beachhead to Enterprise Contract** — send the copy above to 1 account: org_expand_enterprise
- The run's rows are in `crm_db.play_candidates` and `crm_db.plays` filtered by `run_id = 'mw:r_MOcTjou79UcU:expansion-pqa:PppIp1tXFgiFOSHq'`.
