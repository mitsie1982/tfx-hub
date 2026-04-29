# Canary Rollout Integration Runbook (LaunchDarkly / Unleash)

## Purpose
Integrate canary rollout operations with a feature flag provider and provide repeatable test lanes.

## Setup
1. Copy `config/canary/provider.env.example` to your secure env source.
2. Set provider env vars.
3. Export env vars in your shell/session.

## Commands
- Status: `./scripts/canary_rollout_integrated.sh ams 1 status`
- Promote: `./scripts/canary_rollout_integrated.sh ams 5 promote`
- Rollback: `./scripts/canary_rollout_integrated.sh ams 1 rollback`
- Test lanes: `./scripts/test_canary_lanes.sh ams`

## Staged Lane Guidance
- 1%: initial smoke window
- 5%: low risk expansion
- 25%: medium confidence
- 100%: full rollout

## Rollback Policy
Rollback immediately if crash/error alerts exceed configured thresholds.
