# Release and Monitoring Checklist

## Purpose
This document defines the release gating, rollout plan, monitoring KPIs, alerting thresholds, and runbooks to ensure safe production releases for TFX Hub AMS and Contractor apps.

## Release Preconditions
- All CI checks pass (unit, integration, lint, E2E).
- Security scan and secret checks pass.
- Observability initialization present in app entry points.
- Signing credentials configured in CI secrets.
- Feature flags configured for canary rollout.

## Release Steps
1. Create release branch and bump versions.
2. Run full test suite and E2E smoke tests.
3. Build artifacts for target platforms.
4. Upload artifacts to staging stores and distribute to internal testers.
5. Run device farm smoke tests.
6. Deploy backend changes (if any) with migration plan.
7. Start canary rollout for mobile app via staged rollout (Play Store) or phased release (App Store).
8. Monitor KPIs for the canary window (see KPIs below).
9. If stable, promote rollout to wider audience; otherwise rollback.

## Canary Rollout Strategy
- **Duration**: 1–24 hours depending on risk.
- **Cohorts**: 1% -> 5% -> 25% -> 100% (adjust per risk).
- **Gates**: No critical errors; error rate below threshold; crash-free users above threshold.
- **Automated rollback**: If any critical alert fires, trigger rollback lane and notify on-call.

## Rollback Criteria
- Crash rate increases by > 200% vs baseline.
- Error rate (5xx or client-side exceptions) increases by > 100% vs baseline.
- Key business metric drop (e.g., checkout conversion) > 5% sustained for 15 minutes.
- Manual decision by on-call + product owner.
