# Monitoring Integration Checklist

## Phase 11: Populate Monitoring Placeholders

### Backend Integration
- [ ] Import `prom-client` in package.json
- [ ] Add health endpoints (`/health/live`, `/health/ready`, `/metrics`)
- [ ] Instrument request middleware for API latencies and request counts
- [ ] Add database query instrumentation (duration, slow queries)
- [ ] Track business metrics (checkout, job submission)
- [ ] Emit metrics to Prometheus endpoint at `/metrics`
- [ ] Test: `curl http://localhost:3000/metrics`

### Mobile Integration
- [ ] Setup Firebase Crashlytics for NDK crash reporting
- [ ] Create custom metrics service for business events
- [ ] Instrument app lifecycle (session start/end)
- [ ] Track checkout and job submission flows
- [ ] Implement beacon endpoint to send metrics to backend
- [ ] Send canary cohort identifier with each event
- [ ] Test: verify metrics appear in backend `/metrics` endpoint

### Prometheus Setup
- [ ] Update `monitoring/prometheus.yml` with real target configs
- [ ] Copy `prometheus_alerts_real.yml` to `/etc/prometheus/rules/`
- [ ] Configure scrape intervals (15s for API, 30s for node)
- [ ] Test Prometheus UI: `http://localhost:9090`
- [ ] Verify metrics ingestion: check targets tab
- [ ] Validate alert rules: check alerts tab

### Grafana Setup
- [ ] Start Grafana container or local instance
- [ ] Add Prometheus data source: `http://localhost:9090`
- [ ] Import dashboard from `grafana_dashboard_real.json`
- [ ] Verify panels are loading (API requests, error rate, etc.)
- [ ] Configure alert notifications (Slack, PagerDuty)
- [ ] Test alerting: trigger a test alert

### Alertmanager Setup
- [ ] Start Alertmanager container
- [ ] Configure Slack/email/PagerDuty receivers in `monitoring/alertmanager.yml`
- [ ] Test webhook delivery
- [ ] Verify alert routing works for different severity levels

### Canary Monitoring
- [ ] Deploy backend with metrics instrumentation
- [ ] Deploy mobile app version with feature flag for canary (1% cohort)
- [ ] Monitor crash rate for canary cohort: `mobile_crashes_total{canary="true"}`
- [ ] Set alert threshold: rollback if crash rate > 1% (see `CanaryRolloutHealthDegraded`)
- [ ] Prepare rollback procedure if alert fires

### Validation
- [ ] Backend metrics endpoint returns valid Prometheus format
- [ ] Prometheus scrapes metrics successfully (check targets page)
- [ ] All alert rules load without syntax errors
- [ ] Grafana panels display real data
- [ ] Sample alerts fire and route correctly
- [ ] Request latency and crash rate trends visible

### Production Deployment
- [ ] Configure persistent volumes for Prometheus/Grafana data
- [ ] Set up S3/GCS remote storage for long-term metrics retention
- [ ] Enable TLS for Prometheus, Grafana, Alertmanager endpoints
- [ ] Configure backup and restore procedures
- [ ] Set retention policy: 30 days local, unlimited remote
- [ ] Document on-call runbook with alert response procedures

### Post-Deployment
- [ ] Monitor baseline metrics for 1-2 days (establish normal ranges)
- [ ] Fine-tune alert thresholds based on actual traffic patterns
- [ ] Verify low false-positive rate
- [ ] Add SLO tracking dashboards
- [ ] Begin canary rollouts with monitoring gates enabled
