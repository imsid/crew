---
artifact_id: all-metrics-dashboard
format: markdown
source_agent: data-agent
title: All Metrics Dashboard
description: Complete metrics overview with all available metrics from the metrics_layer
kind: artifact
session_id: mw_h_rhXzxEBa5BWC
updated_at: 2026-05-27T19:17:57Z
---

## Summary

All metrics from the metrics_layer have been compiled and executed without filters, providing a comprehensive view of marketing and conversion performance.

### Metrics Executed (6 total)
1. **Clicks Total**: 802,235
2. **Spend Total**: $1,789,141.73  
3. **Conversions Total**: 200
4. **Purchase Customers**: 165
5. **Repeat Purchase Customers**: 1
6. **Conversion Value Total**: $50,643.64

### Performance Ratios
- Conversion Rate: 0.025% (200 / 802,235 clicks)
- Cost Per Conversion: $8,945.71
- Average Value Per Customer: $306.93
- Repeat Purchase Rate: 0.61% (1 / 165 customers)

### Data Sources
- Source 1: `ad_performance` table (campaign_ads)
  - Compiled metrics: Clicks Total, Spend Total
- Source 2: `conversion_events` table (conversion_events)
  - Compiled metrics: Conversions Total, Purchase Customers, Repeat Purchase Customers, Conversion Value Total

All queries executed without date range restrictions or dimensional filters for full dataset visibility.

## Next Steps

- **Dive deeper**: Use the analyst role to explore metrics by dimension (e.g., campaign, channel, date)
- **Set date ranges**: Filter metrics to specific time periods for trend analysis
- **Compare variants**: Use experiment-analyst for A/B test readouts with these metrics
- **Create new metrics**: Define additional metrics based on your analytical needs using the steward role
- **Monitor trends**: Track how these metrics change over time with regular dashboard snapshots
