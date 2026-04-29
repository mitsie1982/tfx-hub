# Verify Full Pipeline - Setup & Configuration Checklist

**Purpose:** Ensure the end-to-end verification workflow is properly configured and ready for use.

**Audience:** DevOps engineers, release managers, CI/CD maintainers.

**Last Updated:** April 1, 2026

---

## Pre-Flight Checklist

### ✓ Repository Configuration

- [ ] Workflow file exists at `.github/workflows/verify_full_pipeline.yml`
- [ ] Workflow is committed to main branch (not draft/WIP)
- [ ] Workflow syntax is valid (test with `yamllint` or GitHub validation)
- [ ] All referenced scripts exist in `scripts/` directory

**Verification command:**
```bash
ls -la .github/workflows/verify_full_pipeline.yml
git log --oneline .github/workflows/verify_full_pipeline.yml | head -1
```

---

### ✓ Helper Scripts Present & Executable

- [ ] `scripts/trigger_alert_test.sh` ← Alertmanager API test
- [ ] `scripts/simulate_metric_spike.sh` ← Pushgateway metric injection
- [ ] `scripts/canary_launchdarkly.sh` ← Feature flag promotion
- [ ] `scripts/run_staged_rollout_test.sh` ← Cohort validation
- [ ] `scripts/dry_run_release.sh` ← Release simulation
- [ ] `scripts/verify_full_pipeline.sh` ← Main orchestration script

**Verification command:**
```bash
for script in trigger_alert_test.sh simulate_metric_spike.sh canary_launchdarkly.sh \
  run_staged_rollout_test.sh dry_run_release.sh verify_full_pipeline.sh; do
  [ -x "scripts/$script" ] && echo "✓ $script" || echo "✗ $script"
done
```

**Fix missing execute permission:**
```bash
chmod +x scripts/*.sh
git add scripts/*.sh
git commit -m "chore: ensure shell scripts are executable"
```

---

### ✓ GitHub Secrets Configured

Go to **Settings → Secrets and variables → Actions** and verify these are present:

| Secret | Status | Value Sample |
|--------|--------|-------------|
| `ALERTMANAGER_URL` | [ ] Added | `https://alerts.example.com` |
| `LAUNCHDARKLY_API_TOKEN` | [ ] Added | `proj_xxxxx_env_yyyyy` |
| `PROMETHEUS_URL` | [ ] Added | `http://prometheus:9090` |
| `ALERTMANAGER_AUTH_HEADER` | [ ] Added (optional) | `Authorization: Bearer xxxx` |
| `PUSHGATEWAY_URL` | [ ] Added (optional) | `http://pushgateway:9091` |

**Validation:**
- [ ] All required secrets have non-empty values
- [ ] No trailing whitespace in secret values
- [ ] Secret names match exactly (case-sensitive)

**Adding secrets via CLI:**
```bash
gh secret set ALERTMANAGER_URL -b "https://alerts.example.com"
gh secret set LAUNCHDARKLY_API_TOKEN -b "proj_xxxxx_env_yyyyy"
gh secret set PROMETHEUS_URL -b "http://prometheus:9090"
```

---

### ✓ Alertmanager Configuration

- [ ] Alertmanager API v2 is enabled and responding
- [ ] Endpoint `ALERTMANAGER_URL` is reachable from GitHub (or self-hosted runners)
- [ ] Authentication (if needed) is configured in `ALERTMANAGER_AUTH_HEADER`
- [ ] Alertmanager receivers are configured for Slack/PagerDuty (optional, for alert testing)

**Test connectivity:**
```bash
# From GitHub runner environment or local terminal with network access
curl -X GET -H "Authorization: Bearer ${ALERTMANAGER_AUTH_HEADER}" \
  "${ALERTMANAGER_URL}/api/v2/status" | jq .
```

Expected response:
```json
{
  "cluster": { "name": "alertmanager", "peers": [...] },
  "config": { "original": "..." },
  "uptime": "...",
  "version": "..."
}
```

---

### ✓ LaunchDarkly Configuration

- [ ] Service token created with write permissions to flags
- [ ] Token is stored as `LAUNCHDARKLY_API_TOKEN` secret
- [ ] Test flag (`ams_canary_release` or custom) exists in all target environments
- [ ] Flag is configured with percentage-based rollout (not boolean)
- [ ] Environment keys match your LaunchDarkly project setup

**Test token before adding to secrets:**
```bash
# Locally (with token exported)
export LAUNCHDARKLY_API_TOKEN="your_token_value"
curl -X GET -H "Authorization: Bearer $LAUNCHDARKLY_API_TOKEN" \
  "https://app.launchdarkly.com/api/v2/projects" | jq '.items[0].key'
```

Expected: Your project key is returned.

**Verify flag exists:**
```bash
curl -X GET -H "Authorization: Bearer $LAUNCHDARKLY_API_TOKEN" \
  "https://app.launchdarkly.com/api/v2/flags/default/ams_canary_release" | jq '.key'
```

Expected: `ams_canary_release`

---

### ✓ Prometheus Configuration

- [ ] Prometheus HTTP API is enabled and accessible
- [ ] Endpoint `PROMETHEUS_URL` is reachable from GitHub runners
- [ ] Alert rules are loaded from `monitoring/prometheus_alerts.yml`
- [ ] Metrics exist or will be populated during test:
  - [ ] `mobile_crashes_total` (counter)
  - [ ] `mobile_active_users_total` (gauge)
  - [ ] `api_responses_total` (counter with `status` label)

**Test connectivity:**
```bash
curl -X GET "${PROMETHEUS_URL}/api/v1/query?query=up" | jq '.data.result | length'
```

Expected: A count of Prometheus targets (>0).

**Check if metrics exist:**
```bash
# Once application is running and emitting metrics
curl -X GET \
  "${PROMETHEUS_URL}/api/v1/query?query=increase(mobile_crashes_total[10m])" | jq '.data.result'
```

If no results, metrics haven't been emitted yet (expected in early testing).

---

### ✓ Pushgateway Configuration (Optional)

- [ ] Pushgateway is deployed and accessible
- [ ] Endpoint `PUSHGATEWAY_URL` is reachable from GitHub runners
- [ ] Prometheus is configured to scrape Pushgateway (if using stage 2 metric spike)

**Test connectivity:**
```bash
curl -X GET "${PUSHGATEWAY_URL}/metrics" | head -20
```

Expected: Metrics output or empty response (no error).

**Optional: Skip this stage**
If Pushgateway is not available, leave `PUSHGATEWAY_URL` secret empty or unset. Stage 2 will be skipped safely.

---

### ✓ Documentation

- [ ] `docs/verify_full_pipeline_guide.md` is present and up-to-date
- [ ] This checklist document is added to repository
- [ ] Team is aware of verification workflow location and how to trigger it
- [ ] On-call runbook references verification workflow for release validation

**Documentation locations:**
```
docs/verify_full_pipeline_guide.md          ← This guide
docs/release_and_monitoring_checklist.md    ← Pre-release validation steps
docs/alerting_test_runbook.md               ← Alertmanager setup details
docs/canary_launchdarkly_runbook.md         ← Canary rollout procedures
```

---

## Initial Test Run

### Step 1: Trigger First Workflow Run

1. Go to GitHub repository → **Actions** tab
2. Find **"Verify Full Pipeline (manual)"** in the left sidebar
3. Click **"Run workflow"** button
4. Leave defaults (or customize env/flag if desired):
   - **env:** `staging`
   - **flag:** `ams_canary_release`
   - **prometheus_url:** (leave empty)
   - **pushgateway_url:** (leave empty)
5. Click **"Run workflow"** to start

---

### Step 2: Monitor Execution

**Real-time logs:**
- Watch the **"Run full pipeline verification"** step logs
- Look for `OK:` or `FAIL:` markers for each stage
- Expected duration: 10-30 minutes (depends on Prometheus query time and observation windows)

**Check points:**
- [ ] Stage 1 (Alertmanager test) completes or skips gracefully
- [ ] Stage 2 (Metric spike) skips if Pushgateway not configured
- [ ] Stage 3 (Canary promote) shows HTTP 200 or 202 response
- [ ] Stage 4 (Staged rollout) waits and validates metrics
- [ ] Stage 5 (Dry-run release) stages artifacts and completes

---

### Step 3: Collect Artifacts

1. After workflow completes, go to **Artifacts** section
2. Download `verification-logs` ZIP file
3. Extract and review `artifacts/verification_TIMESTAMP/run.log`

**Key sections to review:**
```
[timestamp] ---- Alertmanager API test ----
[timestamp] ---- Pushgateway metric spike ----
[timestamp] ---- Canary promote 1% ----
[timestamp] ---- Staged rollout harness ----
[timestamp] ---- Dry-run release ----
```

Each section should show `OK:` or `FAIL:` with details.

---

### Step 4: Troubleshoot If Needed

**If workflow fails:**

1. **Check error message in job logs**
   - Identify which stage failed
   - Note the HTTP status code or error message

2. **Verify secrets are accessible**
   - Go to **Settings → Secrets → Actions**
   - Confirm secret names and ensure they're not empty

3. **Test endpoints manually from your machine:**
   ```bash
   # Alertmanager
   curl -v "${ALERTMANAGER_URL}/api/v2/status"

   # LaunchDarkly
   curl -H "Authorization: Bearer ${LAUNCHDARKLY_API_TOKEN}" \
     "https://app.launchdarkly.com/api/v2/projects"

   # Prometheus
   curl "${PROMETHEUS_URL}/api/v1/query?query=up"
   ```

4. **Refer to [Troubleshooting Guide](verify_full_pipeline_guide.md#troubleshooting)** for detailed solutions

---

## Post-Deployment Configuration

### Integrate with Pre-Release Process

**Add to your release runbook:**

> Before deploying to production:
> 1. Trigger **"Verify Full Pipeline (manual)"** workflow
> 2. Wait for completion (typically 15-30 minutes)
> 3. Review `verification-logs` artifact
> 4. Ensure all 5 stages show `OK:`
> 5. Only proceed with production release if verification passes

**Example workflow_run trigger** (optional, for auto-verification):

```yaml
# .github/workflows/release-production.yml (add this trigger)
on:
  push:
    branches: [main]
    paths:
      - 'packages/mobile/**'
      - 'packages/backend/**'
  workflow_dispatch:

jobs:
  release:
    ...

  # Add after release job:
  verify-release:
    needs: release
    if: success()
    uses: ./.github/workflows/verify_full_pipeline.yml
    with:
      env: production
      flag: ams_canary_release
    secrets: inherit
```

---

### Monitor Verification Success Rate

**Recommended monitoring:**

1. **Dashboard metric:** Track workflow success rate over time
   ```
   (succeeded_runs / total_runs) * 100
   ```

2. **Alert on failures:**
   - Set up GitHub Actions notification for failed runs
   - OR integrate with Slack/PagerDuty via workflow step

3. **Weekly review:**
   - Review past week's verification runs
   - Adjust thresholds or alert rules based on patterns

**Example Slack notification step:**
```yaml
- name: Notify Slack on failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -d '{"text":"Verification pipeline failed: ${{ github.run_id }}"}'
```

---

### Extend & Customize

**Future enhancements:**

- [ ] Add device farm integration (Firebase Test Lab / App Center)
- [ ] Create scheduled variant (daily/weekly verification)
- [ ] Integrate with incident response workflows
- [ ] Add post-verification health check dashboard
- [ ] Extend metrics validation (add business KPIs)

---

## Maintenance

### Monthly Check

- [ ] Review workflow execution logs for anomalies
- [ ] Verify all secrets still have valid/current values
- [ ] Test LaunchDarkly token hasn't been revoked
- [ ] Confirm Prometheus metrics are being emitted (sample check)
- [ ] Update this checklist if infrastructure changes

### When Updating Scripts

After modifying any helper script:

```bash
# Validate syntax
bash -n scripts/verify_full_pipeline.sh

# Run local test (if possible)
ALERTMANAGER_URL="..." LAUNCHDARKLY_API_TOKEN="..." \
  PROMETHEUS_URL="http://localhost:9090" \
  ./scripts/verify_full_pipeline.sh staging ams_canary_release

# Commit changes
git add scripts/
git commit -m "chore(verify): improve error handling in verify_full_pipeline.sh"
git push
```

---

## Rollback Plan

If verification workflow causes issues:

1. **Temporarily disable workflow:**
   ```bash
   git rm .github/workflows/verify_full_pipeline.yml
   git commit -m "chore: temporarily disable verification workflow"
   git push
   ```

2. **Or restrict to specific users:**
   ```yaml
   # In workflow file, add jobs:<job>:if condition:
   if: github.event.sender.login == 'approved-user'
   ```

3. **Investigate root cause** in spare environment

4. **Restore with fixes** after testing

---

## FAQ

**Q: Can I run this workflow on production?**
A: Yes, but it performs actual canary promotions. Use a safeguard environment like staging first, then only promote to production when confident.

**Q: How long does verification take?**
A: Typically 15-30 minutes (depends on observation windows in Stage 4). For faster testing, set `WINDOW_MINUTES=1` in workflow_dispatch inputs.

**Q: What if Prometheus has no metrics yet?**
A: Queries will return `0`, and staged rollout will pass (since 0 < thresholds). This is expected during early dev. As system matures and metrics are emitted, thresholds become meaningful.

**Q: Can I use self-hosted runners?**
A: Yes! Self-hosted runners can have better network access to internal monitoring endpoints. Change `runs-on: ubuntu-latest` to `runs-on: [self-hosted, linux]`.

**Q: How do I rotate LaunchDarkly token?**
A: 1. Generate new token in LaunchDarkly console. 2. Update `LAUNCHDARKLY_API_TOKEN` secret in GitHub. 3. Revoke old token in LaunchDarkly. No code changes needed.

---

## Support & Escalation

| Issue | Owner | Next Steps |
|-------|-------|-----------|
| Workflow syntax error | DevOps | File issue on repo; provide workflow file snippet |
| LaunchDarkly token invalid | LaunchDarkly team | Regenerate token; update secret |
| Prometheus unreachable | Observability team | Check firewall; confirm endpoint is live |
| Alertmanager API changes | Alerting team | Update `trigger_alert_test.sh` with new payload schema |
| Staged rollout fails | Canary lead | Review metric thresholds; adjust based on current baseline |

---

## Version History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-01 | DevOps | Initial setup checklist created |

---

**Document Status:** ✅ Ready for use
**Last Review:** 2026-04-01
**Next Review:** 2026-05-01
