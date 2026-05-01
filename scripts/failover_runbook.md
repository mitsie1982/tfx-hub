# Failover Runbook

## When to Trigger
- Major outage in primary region
- Azure Front Door or health checks indicate downtime

## Steps
1. Confirm outage and notify stakeholders.
2. Promote secondary region to primary (Azure Portal or CLI).
3. Update DNS if needed.
4. Monitor recovery and validate services.
5. Document incident and lessons learned.
