# Monitoring, Observability, and Service Level Objectives

## Overview

TFX Hub uses comprehensive monitoring to ensure reliability and fast incident response.

## Service Level Objectives (SLOs)

### Availability SLO
- **Target**: 99.9% uptime
- **Monthly allowance**: ~43 minutes of downtime
- **Measurement**: HTTP 2xx responses / total requests

### Performance SLO
- **p50 Latency**: <100ms
- **p95 Latency**: <500ms
- **p99 Latency**: <1000ms
- **Measurement**: API request duration

### Error Rate SLO
- **Target**: <0.1% error rate
- **Definition**: HTTP 5xx / total requests
- **Measurement**: Real-time monitoring

## Monitoring Stack

```
Application Metrics
  ↓
Prometheus (scrapes every 15s)
  ↓
Grafana (visualizes)
  ↓
AlertManager (triggers alerts)
  ↓
Slack/PagerDuty (notifications)
```

### Components

1. **Prometheus** — Time-series metrics database
   - Scrapes `/metrics` endpoint
   - Stores 15GB (default, configurable)
   - Retention: 15 days

2. **Grafana** — Visualization and dashboards
   - Real-time graphs
   - Custom alerts
   - Multi-datasource support

3. **AlertManager** — Alert routing and grouping
   - Groups related alerts
   - Routes by severity
   - Integrates: Slack, PagerDuty, email

4. **Node Exporter** — System metrics
   - CPU, memory, disk
   - Network, filesystem
   - Process metrics

## Key Metrics

### Application

```
http_requests_total          # Total requests by method/path/status
http_request_duration_seconds  # Request latency histogram
http_errors_total            # Total errors by status/endpoint
active_connections           # Active database connections
queue_depth                  # Job queue length
```

### System

```
process_uptime_seconds       # Process uptime
nodejs_memory_usage_bytes    # Node.js memory (heap, external, etc.)
node_cpu_seconds_total       # CPU time by mode
node_disk_used_bytes         # Disk usage
node_network_transmit_bytes  # Network I/O
```

### Database

```
pg_stat_activity_count       # Active connections
pg_cache_hit_ratio           # Cache effectiveness
pg_slow_queries_total        # Queries >1s
pg_replication_lag_seconds   # Replication delay
```

## Alert Policy

### Critical (Severity: critical)
**Response Time**: Immediate (on-call notified)

- Service Down (Prometheus: `up == 0`)
- High Error Rate (>5% 5xx errors)
- Database Unavailable
- Certificate Expiring <7 days
- Memory/CPU >95% for >5min

**Action**: Page on-call engineer immediately

### Warning (Severity: warning)
**Response Time**: Within 1 hour

- High Latency (p95 >500ms for >5min)
- Memory >90% for >5min
- CPU >80% for >5min
- Slow queries detected
- High rate of specific errors

**Action**: Slack notification; investigate within 1 hour

### Info (Severity: info)
**Response Time**: Next business day

- Deployment completed
- Cache hit rate low
- Certificate expiring <30 days
- Dependency update available

**Action**: Log for review; no urgent action needed

## Dashboards

### Main Overview Dashboard
- Error rate (real-time)
- Request rate (5m average)
- p95 latency
- Memory and CPU usage
- Service status lights
- Alert summary

Access: https://grafana.tfxhub.com/dashboard/main

### Performance Dashboard
- Request latency (p50, p95, p99)
- Histogram distribution
- Slow queries
- Database metrics
- Cache hit rates

### Incident Dashboard
- Recent alerts fired
- Incident history
- MTTR (Mean Time To Recovery)
- MTTD (Mean Time To Detect)
- Top error types

## On-Call Runbook

### Alert Fires
1. **Page received** — Check Slack/PagerDuty
2. **Acknowledge** — Click acknowledge to notify team
3. **Investigate** — Check relevant dashboard
4. **Diagnose** — Follow specific runbook below
5. **Action** — Execute remediation
6. **Verify** — Confirm service restored
7. **Document** — Create incident report

### Common Issues

#### Service Down

**Alert**: `ServiceDown: up{job="tfx-hub-api"} == 0`

```bash
# 1. Check service status
curl https://api.tfxhub.com/health/live

# 2. Check logs
docker logs tfx-hub-api
kubectl logs -f deployment/tfx-hub

# 3. Check resource usage
top
df -h

# 4. Restart service
docker restart tfx-hub-api
# or
kubectl rollout restart deployment/tfx-hub

# 5. Monitor recovery
watch -n 1 'curl https://api.tfxhub.com/health/live'

# 6. If persists, escalate to team lead
```

#### High Error Rate

**Alert**: `HighErrorRate: rate(http_requests_total{status=~"5.."}[5m]) > 0.05`

```bash
# 1. Check application logs
docker logs --tail=100 tfx-hub-api

# 2. Identify error pattern
# Errors in specific endpoint? Type of error?

# 3. Check recent deployments
git log --oneline -n 5
# If recent deploy, consider rollback

# 4. Check dependencies (database, external APIs)
curl https://api.dependency.com/health

# 5. Scale horizontally if load-related
kubectl scale deployment tfx-hub --replicas=5

# 6. Open incident if unresolved in 5min
```

#### High Memory Usage

**Alert**: `HighMemoryUsage: heap_used / heap_total > 0.9`

```bash
# 1. Check current usage
ps aux | grep node
free -h

# 2. Monitor over time
watch -n 5 'ps aux | grep node'

# 3. If rising, likely memory leak
# Look for: unclosed connections, unbounded arrays, event listeners

# 4. Restart service to recover space temporarily
docker restart tfx-hub-api

# 5. Pin down root cause
# - Check logs for connection pool errors
# - Profile with node --inspect
# - Review recent code changes

# 6. Deploy fix ASAP
```

## Creating/Updating Alerts

To add new alert:

1. Edit `monitoring/alert_rules.yml`
```yaml
- alert: MyNewAlert
  expr: my_metric > 100
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Something is wrong"
    description: "Details here"
```

2. Test in Prometheus UI
3. Reload Prometheus: `docker restart prometheus`
4. Verify alert appears in AlertManager UI

## Metric Collection

### From Application
```javascript
// Add to API middleware
const prometheus = require('prom-client');

const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  buckets: [0.1, 0.5, 1, 2, 5],
  labelNames: ['method', 'route', 'status']
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route.path, res.statusCode)
      .observe(duration);
  });
  next();
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(prometheus.register.metrics());
});
```

### From Database
Use `postgres_exporter`:
```bash
docker run -e DATA_SOURCE_NAME="postgresql://..." \
  -p 9187:9187 prometheuscommunity/postgres-exporter
```

## Troubleshooting Metrics

### Metric not appearing
- Check `/metrics` endpoint manually
- Verify Prometheus scrape job configured
- Check Prometheus UI: Status → Targets

### Alerts not firing
- Verify alert rule syntax (Prometheus UI)
- Check AlertManager integration
- Look for `resolution` setting

### High disk usage
- Reduce retention: `--storage.tsdb.retention.time=7d`
- Increase disk space
- Lower scrape interval

## Further Reading

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Docs](https://grafana.com/docs)
- [SLO Fundamentals](https://www.oreilly.com/library/view/building-microservices/9781491950340/)
- [Google SRE Book](https://sre.google/sre-book/)

---

**On-call?** Check #incidents channel and recent alerts on Grafana dashboard.
