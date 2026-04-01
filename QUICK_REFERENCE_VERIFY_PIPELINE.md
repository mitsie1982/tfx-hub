# Verify Full Pipeline - Quick Reference Card

**Verification Status:** ✅ READY  
**Last Updated:** 2026-04-01

---

## 🚀 How to Run (30 seconds)

1. Go to **Actions** tab → **"Verify Full Pipeline (manual)"**
2. Click **"Run workflow"**
3. Leave defaults or customize `env` and `flag`
4. Click **"Run workflow"**
5. Wait 15-30 min, download `verification-logs` artifact

---

## 📋 What Gets Tested

| Stage | What | Success | Fail |
|-------|------|---------|------|
| 1 | Alert test → Alertmanager | HTTP 202 | Abort |
| 2 | Metric spike → Pushgateway | Push OK | Skip |
| 3 | Flag promote → LaunchDarkly | HTTP 200 | Abort |
| 4 | Staged rollout → Prometheus | Metrics pass | Rollback |
| 5 | Release simulation → Artifacts | APK/IPA staged | Rollback |

---

## 🔑 Required Secrets (Set These First!)

```
Settings → Secrets and variables → Actions
Add these:

ALERTMANAGER_URL        = https://alertmanager.example.com
LAUNCHDARKLY_API_TOKEN  = proj_xxxxx_env_yyyyy
PROMETHEUS_URL          = http://prometheus:9090
```

Optional:
```
ALERTMANAGER_AUTH_HEADER = Authorization: Bearer token
PUSHGATEWAY_URL          = http://pushgateway:9091
```

---

## 📊 Log Locations

```
GitHub UI:
  Actions tab → Run details → "Run full pipeline verification" step

Downloaded artifact:
  verification-logs/ → artifacts/verification_TIMESTAMP/run.log
```

Look for lines:
```
OK: Alertmanager API test
OK: Canary promote 1%
OK: Staged rollout harness
OK: Dry-run release
```

---

## ❌ Quick Troubleshooting

| Error | Fix |
|-------|-----|
| `LAUNCHDARKLY_API_TOKEN not set` | Add to repo secrets |
| `Prometheus unreachable` | Check `PROMETHEUS_URL` secret, firewall |
| `Flag not found` | Verify flag exists in LaunchDarkly, env key correct |
| `Metrics return 0` | App not emitting metrics yet (expected early on) |
| `Threshold breached` | Increase `CRASH_RATE_THRESHOLD` in early testing |

See **[Full Troubleshooting Guide](docs/verify_full_pipeline_guide.md#troubleshooting)**

---

## 📝 Documentation

- **[Comprehensive Guide](docs/verify_full_pipeline_guide.md)** — All details
- **[Setup Checklist](docs/verify_full_pipeline_setup_checklist.md)** — Configuration steps
- **[Deployment Summary](DEPLOYMENT_SUMMARY.md)** — What's deployed
- **[release_and_monitoring_checklist.md](docs/release_and_monitoring_checklist.md)** — Pre-release steps

---

## 🔧 Custom Runs

**Use different environment:**
```
env: production
flag: my_feature_flag
prometheus_url: http://prod-prom:9090
```

**Faster testing (1 min observation windows):**
```
# In workflow_dispatch inputs at runtime
# Or edit verify_staged_rollout_test.sh:
WINDOW_MINUTES=1 CRASH_RATE_THRESHOLD=0.01 \
  ./scripts/run_staged_rollout_test.sh staging ams_canary_release
```

---

## 💡 Tips

✓ Run on **staging first** before production  
✓ Verify secrets are **not empty** (Settings → Secrets)  
✓ **Download the logs** even on success for record-keeping  
✓ Share logs with team in **incident post-mortems**  
✓ Use **before every production release** as validation gate  

---

## 📞 Need Help?

| Area | Reference |
|------|-----------|
| Workflow setup | Setup Checklist |
| Alertmanager errors | alerting_test_runbook.md |
| LaunchDarkly errors | canary_launchdarkly_runbook.md |
| Prometheus queries | metrics_instrumentation_*.md |
| General troubleshoot | Full Guide → Troubleshooting |

---

## Files Checklist

```
✓ .github/workflows/verify_full_pipeline.yml
✓ scripts/verify_full_pipeline.sh
✓ scripts/trigger_alert_test.sh
✓ scripts/simulate_metric_spike.sh
✓ scripts/canary_launchdarkly.sh
✓ scripts/run_staged_rollout_test.sh
✓ scripts/dry_run_release.sh
✓ docs/verify_full_pipeline_guide.md
✓ docs/verify_full_pipeline_setup_checklist.md
✓ DEPLOYMENT_SUMMARY.md
✓ This file: QUICK_REFERENCE.md
```

---

**Print this card or bookmark the [Full Guide](docs/verify_full_pipeline_guide.md)** for quick access!
