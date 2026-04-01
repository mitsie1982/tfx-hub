# End-to-End Verification Pipeline Guide

**Last Updated:** April 1, 2026

## Overview

The **Verify Full Pipeline** workflow (`verify_full_pipeline.yml`) provides a complete end-to-end verification for:
- Alerting infrastructure (Alertmanager API)
- Canary rollout integration (LaunchDarkly)
- Metric validation (Prometheus)
- Release dry-run simulation

This guide documents setup, usage, and troubleshooting.

---

## Quick Start

### 1. Configure Repository Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value | Required |
|--------|-------|----------|
| `ALERTMANAGER_URL` | `https://alertmanager.example.com` | Yes |
| `LAUNCHDARKLY_API_TOKEN` | `proj_XXXXX_env_YYYYY` | Yes |
| `PROMETHEUS_URL` | `http://prometheus:9090` | Yes |
| `ALERTMANAGER_AUTH_HEADER` | `Authorization: Bearer token` | Optional |
| `PUSHGATEWAY_URL` | `http://pushgateway:9091` | Optional |

### 2. Trigger the Workflow

1. Go to **Actions** tab
2. Select **"Verify Full Pipeline (manual)"**
3. Click **"Run workflow"**
4. Provide inputs:
   - **env:** `staging` (default)
   - **flag:** `ams_canary_release` (default)
   - **prometheus_url:** (leave empty to use secret)
   - **pushgateway_url:** (leave empty to use secret)
5. Click **"Run workflow"**

### 3. Monitor & Collect Results

- Watch real-time logs in the **"Run full pipeline verification"** step
- After completion, download `verification-logs` artifact
- Review `artifacts/verification_TIMESTAMP/run.log` for full transcript

---

## Workflow Architecture

```
┌─────────────────────────────────────────────────────┐
│ GitHub Actions: verify_full_pipeline.yml            │
├─────────────────────────────────────────────────────┤
│ on: workflow_dispatch (manual trigger)              │
│                                                      │
│ ┌──────────────────────────────────────────────┐   │
│ │ Step 1: Checkout + Setup (Node 18, pnpm)     │   │
│ └──────────────────────────────────────────────┘   │
│                      ↓                              │
│ ┌──────────────────────────────────────────────┐   │
│ │ Step 2: Run verify_full_pipeline.sh           │   │
│ │  With ALERTMANAGER_URL, LAUNCHDARKLY_TOKEN,  │   │
│ │  PROMETHEUS_URL, PUSHGATEWAY_URL             │   │
│ └──────────────────────────────────────────────┘   │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐    │
│  │ Stage 1: Alertmanager API Test             │    │
│  │  → trigger_alert_test.sh                   │    │
│  └────────────────────────────────────────────┘    │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐    │
│  │ Stage 2: Metric Spike (optional)           │    │
│  │  → simulate_metric_spike.sh                │    │
│  │  → Wait 90s for Prometheus scrape          │    │
│  └────────────────────────────────────────────┘    │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐    │
│  │ Stage 3: Canary 1% Promotion               │    │
│  │  → canary_launchdarkly.sh promote          │    │
│  └────────────────────────────────────────────┘    │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐    │
│  │ Stage 4: Staged Rollout Harness            │    │
│  │  → run_staged_rollout_test.sh              │    │
│  │  → Cohorts: 1%, 5%, 25%                    │    │
│  │  → Validates: crash_rate, 5xx_rate        │    │
│  │  → Auto-rollback on threshold breach       │    │
│  └────────────────────────────────────────────┘    │
│                      ↓                              │
│  ┌────────────────────────────────────────────┐    │
│  │ Stage 5: Dry-Run Release                   │    │
│  │  → dry_run_release.sh                      │    │
│  │  → Simulates APK/IPA build                 │    │
│  │  → Stages artifacts                        │    │
│  │  → Invokes canary + validation             │    │
│  └────────────────────────────────────────────┘    │
│                      ↓                              │
│ ┌──────────────────────────────────────────────┐   │
│ │ Step 3: Upload verification-logs artifact    │   │
│ └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Stages in Detail

### Stage 1: Alertmanager API Test

**Script:** `scripts/trigger_alert_test.sh`

**What it does:**
- Connects to `ALERTMANAGER_URL`
- Sends synthetic alert payload via `/api/v2/alerts`
- Validates HTTP 202 Accepted response

**Failure modes:**
- `ALERTMANAGER_URL` not set → **Skip** (log warning)
- HTTP code != 202 → **Fail stage** (exit with error)
- DNS/network error → **Fail stage** (timeout after 10s)

**Example output:**
```
---- Alertmanager API test ----
Triggering alert via POST https://alertmanager.example.com/api/v2/alerts
Alert payload: {...}
HTTP 202 Accepted
OK: Alertmanager API test
```

---

### Stage 2: Metric Spike (Optional)

**Script:** `scripts/simulate_metric_spike.sh`

**What it does:**
- Posts metric spike to Prometheus Pushgateway `/metrics/job/verification`
- Waits 90s for Prometheus scrape interval + rule evaluation
- Useful for verifying metric-driven alert rules fire correctly

**Failure modes:**
- `PUSHGATEWAY_URL` not set → **Skip** (log info)
- HTTP error → **Log but continue** (non-fatal)

**When to use:**
- Testing alert rule thresholds
- Verifying Pushgateway integration
- Simulating production metric spikes

**Example output:**
```
---- Pushgateway metric spike ----
Pushing metrics to http://pushgateway:9091/metrics/job/verification
Waiting 90s for Prometheus scrape and rule evaluation...
OK: Pushgateway metric spike
```

---

### Stage 3: Canary 1% Promotion

**Script:** `scripts/canary_launchdarkly.sh promote`

**What it does:**
- Connects to LaunchDarkly API v2
- Promotes feature flag to 1% of users in specified environment
- Uses PATCH semantic for rollout weight changes

**Failure modes:**
- `LAUNCHDARKLY_API_TOKEN` not set → **Exit with code 2** (fatal)
- Invalid token/project/env/flag → **HTTP 400-401** (fail stage)
- Network error → **Timeout** (exit 3)

**Requires:**
- Valid LaunchDarkly service token with write permissions
- Flag must exist in target environment
- Environment must use percentage-based rollout

**Example output:**
```
---- Canary promote 1% ----
Promoting flag ams_canary_release in env staging to 1% (best-effort)
LaunchDarkly API returned HTTP 200
Promote request accepted. Verify in LaunchDarkly console.
OK: Canary promote 1%
```

---

### Stage 4: Staged Rollout Harness

**Script:** `scripts/run_staged_rollout_test.sh`

**What it does:**
- Promotes through cohorts: 1% → 5% → 25%
- After each promotion, waits for observation window (default 5 min)
- Queries Prometheus for key metrics:
  - **Crash rate:** `increase(mobile_crashes_total[10m]) / increase(mobile_active_users_total[10m])`
  - **5xx rate:** `increase(api_responses_total{status=~"5.."}[5m]) / increase(api_responses_total[5m])`
- Validates against thresholds (configurable via env vars)
- Auto-rollbacks if thresholds exceeded

**Thresholds (configurable):**
```bash
CRASH_RATE_THRESHOLD=0.005    # 0.5%
API_5XX_THRESHOLD=0.01        # 1%
WINDOW_MINUTES=5              # Observation window
```

**Override in workflow/command:**
```bash
CRASH_RATE_THRESHOLD=0.01 WINDOW_MINUTES=2 ./scripts/run_staged_rollout_test.sh staging ams_canary_release
```

**Failure modes:**
- Metrics unavailable → **Exit 2** (missing Prometheus helper)
- PromQL query fails → **Log "0" and continue** (graceful degrade)
- Threshold breached → **Exit 4** (auto-rollback triggered)

**Example output:**
```
---- Staged rollout harness ----
Running staged rollout harness (cohorts 1%,5%,25%)
Promoting to 1%
Waiting 5 minutes for metrics to stabilize...
Observed crash_rate=0.002 api_5xx=0.004
Cohort 1% passed checks; continuing.
Promoting to 5%
Waiting 5 minutes for metrics to stabilize...
Observed crash_rate=0.003 api_5xx=0.005
Cohort 5% passed checks; continuing.
Promoting to 25%
... [similar output] ...
OK: Staged rollout harness
```

---

### Stage 5: Dry-Run Release

**Script:** `scripts/dry_run_release.sh`

**What it does:**
- Simulates Android APK build → `artifacts/staging/ams/ams-staging.apk`
- Simulates iOS IPA build → `artifacts/staging/ams/ams-staging.ipa`
- Optionally uploads to device farm (Firebase/AppCenter)
- Triggers canary 1% promotion
- Invokes staged rollout harness (with shorter observation window, default 1 min)
- Performs full rollback if validation fails

**Environment variables:**
```bash
APP="ams"                                  # App identifier
ENV="staging"                              # LaunchDarkly environment
DEVICE_FARM="none"                         # firebase | appcenter | none
WINDOW_MINUTES=1                           # Override rollout observation window
CRASH_RATE_THRESHOLD=0.01                 # Override threshold
```

**Failure modes:**
- Artifact staging fails → **Exit 1** (I/O error)
- Canary promotion fails → **Log and continue** (non-fatal)
- Staged rollout test fails → **Exit 5** (auto-rollback + abort)

**Example output:**
```
---- Dry-run release ----
Dry-run release for ams -> staging
Simulating Android APK
Simulating iOS IPA
Artifacts staged at /home/runner/work/tfx-hub/artifacts/staging/ams
Device farm not configured; skipping
Triggering canary 1%
Running staged rollout harness...
[... rollout output ...]
OK: Dry-run release
```

---

## Secrets Configuration

### Required Secrets

#### `ALERTS_MANAGER_URL`
LaunchDarkly environment's Alertmanager API endpoint.

```
Type: String
Example: https://alerts.example.com
Visibility: Write to logs (masked in GitHub UI)
```

#### `LAUNCHDARKLY_API_TOKEN`
LaunchDarkly service token with project-wide flag write permissions.

```
Type: String
Example: proj_xxxxx_env_yyyyy
Visibility: Masked (never logged)
Permissions: Flag write, environment access
How to generate: LaunchDarkly → Account settings → API tokens → Create token
```

#### `PROMETHEUS_URL`
Prometheus HTTP API endpoint.

```
Type: String
Example: http://prometheus:9090
Visibility: Write to logs (masked in GitHub UI)
Note: Must support /api/v1/query endpoint
```

### Optional Secrets

#### `ALERTMANAGER_AUTH_HEADER`
Authentication header for Alertmanager (if required).

```
Type: String
Example: Authorization: Bearer YOUR_TOKEN
Visibility: Masked (never logged)
```

#### `PUSHGATEWAY_URL`
Prometheus Pushgateway endpoint (for metric simulation).

```
Type: String
Example: http://pushgateway:9091
Visibility: Masked in logs
If not set: Stage 2 is skipped (non-fatal)
```

#### `FIREBASE_SERVICE_ACCOUNT`
Firebase Test Lab service account credentials (uncomment in workflow if needed).

```
Type: JSON
Format: Google service account JSON
If not set: Device farm uploads skipped (non-fatal)
```

#### `APPCENTER_API_TOKEN`
App Center API token for device farm uploads.

```
Type: String
Format: Bearer token
If not set: Device farm uploads skipped (non-fatal)
```

---

## Troubleshooting

### Workflow not visible in Actions tab

**Cause:** Workflow file not committed to main/default branch.

**Solution:**
```bash
git add .github/workflows/verify_full_pipeline.yml
git commit -m "Add verification workflow"
git push
```

Then refresh GitHub Actions tab after 1-2 minutes.

---

### Workflow fails at "Run full pipeline verification" step

**Check the log output for the specific stage failure:**

1. **Alertmanager API test failed**
   - Verify `ALERTMANAGER_URL` secret is set and reachable
   - Check firewall/network access from GitHub runners
   - Confirm Alertmanager v2 API is enabled

2. **Canary promote failed**
   - Check `LAUNCHDARKLY_API_TOKEN` is valid and not expired
   - Verify environment and flag keys match your LaunchDarkly project
   - Confirm token has write permissions to flags
   - Check LaunchDarkly web console for flag existence

3. **Staged rollout harness failed**
   - Check `PROMETHEUS_URL` is reachable and responding
   - Verify metrics exist: `mobile_crashes_total`, `mobile_active_users_total`, `api_responses_total`
   - In early testing, increase `CRASH_RATE_THRESHOLD` and `API_5XX_THRESHOLD` to avoid false negatives
   - Review `artifacts/verification_*.log` for detailed Prometheus query errors

4. **Dry-run release failed**
   - Check artifact staging directory permissions
   - Verify device farm credentials if using Firebase/AppCenter
   - Review nested script logs in artifact directory

---

### Metrics queries return "0"

**Cause:** Prometheus hasn't been instrumented with the required metrics yet.

**Solution:**
1. Ensure application emits metrics:
   - Mobile app: `mobile_crashes_total`, `mobile_active_users_total`, mobile exceptions
   - Backend: `api_responses_total` with `status` label, `api_request_duration_seconds`
2. See [Metrics Instrumentation Guide](metrics_instrumentation_backend.md) for implementation
3. Temporarily increase thresholds to bypass validation in early testing:
   ```bash
   CRASH_RATE_THRESHOLD=1.0 WINDOW_MINUTES=1 ./scripts/run_staged_rollout_test.sh staging ams_canary_release
   ```

---

### "Secrets not accessible" errors in run logs

**Cause:** Secret names are case-sensitive or not copied exactly.

**Solution:**
1. Go to **Settings → Secrets and variables → Actions**
2. Verify secret names match exactly:
   - `ALERTMANAGER_URL`
   - `LAUNCHDARKLY_API_TOKEN`
   - `PROMETHEUS_URL`
3. Ensure no trailing spaces in secret values
4. Re-run workflow after secret corrections

---

### Network timeouts from GitHub runners

**Cause:** GitHub-hosted runners may not have network access to internal monitoring endpoints.

**Solution:**
- Use self-hosted runners with appropriate network access
- Or expose endpoints publicly (with authentication)
- Or override URLs at trigger time via workflow_dispatch inputs

---

## Best Practices

1. **Start with staging environment**
   - Always test first in `env=staging`
   - Verify thresholds are reasonable for staging metrics
   - Graduate to production via separate workflow run

2. **Monitor verification success rate**
   - Run weekly on schedule (optional workflow variant)
   - Alert on failures to on-call team
   - Track MTBF of verification pipeline

3. **Adjust thresholds over time**
   - As system matures, tighten thresholds (lower CRASH_RATE_THRESHOLD, etc.)
   - Document threshold changes in release notes
   - Review threshold breaches for root causes

4. **Integrate with release workflow**
   - Consider triggering verification as prerequisite for production releases
   - Use `workflow_run` trigger to auto-verify after release
   - Block production releases if verification fails

5. **Maintain runbooks**
   - Document troubleshooting steps for your environment
   - Keep metric baseline expectations in release_and_monitoring_checklist.md
   - Update this guide as you extend the workflow

---

## Related Documentation

- [Alerting Test Runbook](alerting_test_runbook.md) — Alert receiver & Alertmanager setup
- [Release and Monitoring Checklist](release_and_monitoring_checklist.md) — Pre-release validation steps
- [Canary LaunchDarkly Runbook](canary_launchdarkly_runbook.md) — Canary rollout procedures
- [Metrics Instrumentation (Backend)](metrics_instrumentation_backend.md) — Emitting required metrics
- [Metrics Instrumentation (Mobile)](metrics_instrumentation_mobile.md) — Mobile metrics setup

---

## Quick Reference

| Task | Command |
|------|---------|
| Trigger manually | Go to Actions tab → "Verify Full Pipeline (manual)" → Run workflow |
| Override prometheus_url | In workflow_dispatch inputs, set `prometheus_url: http://custom:9090` |
| Skip Alertmanager test | Leave `ALERTMANAGER_URL` secret unset |
| Skip metric spike | Leave `PUSHGATEWAY_URL` secret unset |
| Faster testing | Set `WINDOW_MINUTES=1` and increase thresholds temporarily |
| View full logs | Download `verification-logs` artifact after run |
| Troubleshoot Prometheus | SSH into GitHub runner and curl `http://prometheus:9090/api/v1/query?query=...` |

---

## Version History

| Date | Change |
|------|--------|
| 2026-04-01 | Initial documentation for verify_full_pipeline.yml workflow |

