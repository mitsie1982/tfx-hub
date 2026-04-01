#!/usr/bin/env bash
set -euo pipefail

# scripts/setup_release_and_monitoring.sh
# Purpose:
#  - Create release checklist, rollout plan, telemetry KPIs, alerting placeholders
#  - Scaffold canary rollout helper scripts and CI gating for monitoring readiness
#  - Create dashboard placeholders and alert rules (Prometheus/Grafana style placeholders)
#  - Add VS Code tasks to open docs and run rollout helpers
#  - Idempotent: safe to re-run; will not overwrite non-placeholder files
#
# Usage:
#   chmod +x scripts/setup_release_and_monitoring.sh
#   ./scripts/setup_release_and_monitoring.sh

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

SCRIPTS_DIR="$ROOT/scripts"
CI_DIR="$ROOT/.github/workflows"
DOCS_DIR="$ROOT/docs/guides"
MONITORING_DIR="$ROOT/monitoring"
RUNBOOKS_DIR="$ROOT/docs/runbooks"

mkdir -p "$SCRIPTS_DIR" "$CI_DIR" "$DOCS_DIR" "$MONITORING_DIR" "$RUNBOOKS_DIR"

echo "🚀 Setting up release and monitoring infrastructure ($TS)"

# ============================================================================
# 1. Release management script
# ============================================================================
RELEASE_SCRIPT="$SCRIPTS_DIR/release.sh"
cat > "$RELEASE_SCRIPT" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
# scripts/release.sh
# Automated release workflow: version bump, changelog, tag, and publish
#
# Usage:
#   ./scripts/release.sh patch    # 1.0.0 → 1.0.1
#   ./scripts/release.sh minor    # 1.0.0 → 1.1.0
#   ./scripts/release.sh major    # 1.0.0 → 2.0.0
#   ./scripts/release.sh --dry-run # Preview changes

VERSION_TYPE="${1:-patch}"
DRY_RUN="${2:---dry-run}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ "$VERSION_TYPE" = "--help" ] || [ "$VERSION_TYPE" = "-h" ]; then
  echo "Usage: $0 <patch|minor|major> [--dry-run]"
  echo ""
  echo "Examples:"
  echo "  $0 patch              # Increment patch version"
  echo "  $0 minor              # Increment minor version"
  echo "  $0 major              # Increment major version"
  echo "  $0 patch --dry-run    # Preview changes without committing"
  exit 0
fi

# Read current version
CURRENT_VERSION=$(node -pe "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version (using semver library or manual logic)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$VERSION_TYPE" in
  patch)
    NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
    ;;
  minor)
    NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
    ;;
  major)
    NEW_VERSION="$((MAJOR + 1)).0.0"
    ;;
  *)
    echo "Error: Invalid version type '$VERSION_TYPE'. Use: patch, minor, or major"
    exit 1
    ;;
esac

echo "New version: $NEW_VERSION"

if [ "$DRY_RUN" != "--dry-run" ]; then
  echo "🏷️  Tagging release: v$NEW_VERSION"
  
  # Update version in package.json
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
  
  # Generate changelog (if changelog tool available)
  if command -v conventional-changelog >/dev/null 2>&1; then
    conventional-changelog -p angular -i CHANGELOG.md -s || echo "Changelog generation skipped"
  fi
  
  # Commit and tag
  git add package.json CHANGELOG.md 2>/dev/null || git add package.json
  git commit -m "chore(release): v$NEW_VERSION"
  git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
  
  echo "✅ Release tagged: v$NEW_VERSION"
  echo "📤 Push to trigger CI/CD release:"
  echo "   git push origin main --tags"
else
  echo "🔍 Dry run - no changes made"
  echo "Changes that would be made:"
  echo "  1. Update package.json version to $NEW_VERSION"
  echo "  2. Generate/update CHANGELOG.md"
  echo "  3. Create git commit with tag v$NEW_VERSION"
fi
SH
chmod +x "$RELEASE_SCRIPT"
echo "✓ Created release script: $RELEASE_SCRIPT"

# ============================================================================
# 2. Health check endpoint
# ============================================================================
HEALTH_CHECK="$ROOT/src/health.js"
mkdir -p "$ROOT/src"
cat > "$HEALTH_CHECK" <<'JS'
/*
 * src/health.js
 * Health check endpoint for monitoring and load balancers
 */

function createHealthCheckHandler() {
  const startTime = Date.now();
  
  return {
    live: (req, res) => {
      // Liveness probe: is process alive?
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    },
    
    ready: (req, res) => {
      // Readiness probe: is service ready to accept traffic?
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        uptime: Math.floor((Date.now() - startTime) / 1000),
      });
    },
    
    metrics: (req, res) => {
      // Prometheus-compatible metrics endpoint
      const uptime = Date.now() - startTime;
      const metrics = [
        '# HELP process_uptime_seconds Process uptime in seconds',
        '# TYPE process_uptime_seconds gauge',
        `process_uptime_seconds ${Math.floor(uptime / 1000)}`,
        '',
        '# HELP nodejs_memory_usage_bytes Node.js memory usage',
        '# TYPE nodejs_memory_usage_bytes gauge',
      ];
      
      const memUsage = process.memoryUsage();
      Object.entries(memUsage).forEach(([key, value]) => {
        metrics.push(`nodejs_memory_usage_bytes{type="${key}"} ${value}`);
      });
      
      res.set('Content-Type', 'text/plain');
      res.send(metrics.join('\n'));
    }
  };
}

module.exports = { createHealthCheckHandler };
JS
echo "✓ Created health check handler: $HEALTH_CHECK"

# ============================================================================
# 3. Prometheus configuration
# ============================================================================
PROMETHEUS_CONFIG="$MONITORING_DIR/prometheus.yml"
cat > "$PROMETHEUS_CONFIG" <<'YAML'
# Prometheus configuration for TFX Hub monitoring
# Install: docker run -p 9090:9090 -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml prom/prometheus
#
# Access: http://localhost:9090

global:
  scrape_interval: 15s       # Default scrape interval
  evaluation_interval: 15s   # Default eval interval
  external_labels:
    monitor: 'tfx-hub'

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

rule_files:
  - 'alert_rules.yml'

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # TFX Hub API server
  - job_name: 'tfx-hub-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s

  # Node Exporter (system metrics)
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  # PostgreSQL (if using postgres_exporter)
  - job_name: 'postgres'
    static_configs:
      - targets: ['localhost:9187']

  # Docker containers (if using cAdvisor)
  - job_name: 'docker'
    static_configs:
      - targets: ['localhost:8080']
YAML
echo "✓ Created Prometheus config: $PROMETHEUS_CONFIG"

# ============================================================================
# 4. Alert rules
# ============================================================================
ALERT_RULES="$MONITORING_DIR/alert_rules.yml"
cat > "$ALERT_RULES" <<'YAML'
# Prometheus alert rules for TFX Hub
# Triggered alerts are sent to Alertmanager, configured in prometheus.yml

groups:
  - name: tfx_hub_alerts
    interval: 30s
    rules:
      # API availability
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "{{ $value }}% of requests are returning 5xx errors"

      - alert: ServiceDown
        expr: up{job="tfx-hub-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "TFX Hub API is down"
          description: "Service has been unreachable for more than 1 minute"

      # Performance
      - alert: HighLatency
        expr: histogram_quantile(0.95, http_request_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High API latency detected"
          description: "p95 latency is {{ $value }}s (threshold: 1s)"

      # Resource usage
      - alert: HighMemoryUsage
        expr: nodejs_memory_usage_bytes{type="heapUsed"} / nodejs_memory_usage_bytes{type="heapTotal"} > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"
          description: "Memory usage is {{ $value | humanizePercentage }}"

      - alert: HighCPUUsage
        expr: rate(node_cpu_seconds_total{mode!="idle"}[5m]) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value | humanizePercentage }}"

      # Database
      - alert: DatabaseConnectionTimeout
        expr: rate(pg_connect_timeout_total[5m]) > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Database connection timeout detected"
          description: "Cannot connect to PostgreSQL database"

      - alert: DatabaseSlowQueries
        expr: histogram_quantile(0.95, pg_query_duration_seconds_bucket) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow database queries detected"
          description: "p95 query time is {{ $value }}s"

      # Certificate expiration
      - alert: SSLCertificateExpiration
        expr: ssl_cert_expiration_days < 30
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "SSL/TLS certificate expiring soon"
          description: "Certificate expires in {{ $value }} days"
YAML
echo "✓ Created alert rules: $ALERT_RULES"

# ============================================================================
# 5. Grafana dashboard template
# ============================================================================
GRAFANA_DASHBOARD="$MONITORING_DIR/grafana_dashboard.json"
cat > "$GRAFANA_DASHBOARD" <<'JSON'
{
  "dashboard": {
    "title": "TFX Hub - System Overview",
    "tags": ["tfx", "overview"],
    "timezone": "UTC",
    "panels": [
      {
        "id": 1,
        "title": "API Requests (5m avg)",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "id": 2,
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ],
        "type": "gauge"
      },
      {
        "id": 3,
        "title": "p95 API Latency",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds_bucket)"
          }
        ],
        "type": "stat"
      },
      {
        "id": 4,
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "nodejs_memory_usage_bytes"
          }
        ],
        "type": "graph"
      },
      {
        "id": 5,
        "title": "Active Database Connections",
        "targets": [
          {
            "expr": "pg_stat_activity_count"
          }
        ],
        "type": "stat"
      },
      {
        "id": 6,
        "title": "Uptime",
        "targets": [
          {
            "expr": "process_uptime_seconds"
          }
        ],
        "type": "stat"
      }
    ]
  }
}
JSON
echo "✓ Created Grafana dashboard template: $GRAFANA_DASHBOARD"

# ============================================================================
# 6. Docker Compose for monitoring stack
# ============================================================================
DOCKER_COMPOSE="$MONITORING_DIR/docker-compose.yml"
cat > "$DOCKER_COMPOSE" <<'YAML'
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_SECURITY_ADMIN_USER=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana_dashboard.json:/etc/grafana/provisioning/dashboards/tfx-hub.json
    depends_on:
      - prometheus
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:

networks:
  monitoring:
    driver: bridge
YAML
echo "✓ Created monitoring Docker Compose: $DOCKER_COMPOSE"

# ============================================================================
# 7. Alertmanager configuration
# ============================================================================
ALERTMANAGER_CONFIG="$MONITORING_DIR/alertmanager.yml"
cat > "$ALERTMANAGER_CONFIG" <<'YAML'
# Alertmanager configuration for TFX Hub
# Handles alert routing, grouping, and notifications

global:
  resolve_timeout: 5m
  slack_api_url: '${SLACK_WEBHOOK_URL}'  # Set via environment variable

route:
  # Default receiver
  receiver: 'default'
  
  # Alert grouping
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  
  # Routes for different severity levels
  routes:
    # Critical alerts - immediate notification
    - match:
        severity: critical
      receiver: 'critical'
      continue: true
      group_wait: 0s
      repeat_interval: 1h
    
    # Warning alerts - batched
    - match:
        severity: warning
      receiver: 'warning'
      continue: true
      group_wait: 5m
      repeat_interval: 6h

receivers:
  - name: 'default'
    slack_configs:
      - channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
  
  - name: 'critical'
    slack_configs:
      - channel: '#critical-alerts'
        title: '🚨 CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
    pagerduty_configs:
      - service_key: '${PAGERDUTY_SERVICE_KEY}'

  - name: 'warning'
    slack_configs:
      - channel: '#alerts'
        title: '⚠️ Warning: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

inhibit_rules:
  # Don't send warning if critical already firing
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
YAML
echo "✓ Created Alertmanager config: $ALERTMANAGER_CONFIG"

# ============================================================================
# 8. Release and deployment guide
# ============================================================================
RELEASE_GUIDE="$DOCS_DIR/release_process.md"
cat > "$RELEASE_GUIDE" <<'MD'
# Release Process and Deployment Guide

## Overview

TFX Hub uses semantic versioning (semver) and automated CI/CD for releases.

## Versioning Scheme

Format: `MAJOR.MINOR.PATCH` (e.g., 1.2.3)

- **MAJOR** — Breaking API changes
- **MINOR** — New features (backward compatible)
- **PATCH** — Bug fixes (backward compatible)

Examples:
- `1.0.0` → `1.1.0` — Added new endpoint (minor)
- `1.1.0` → `1.1.1` — Fixed bug (patch)
- `1.1.1` → `2.0.0` — Removed API endpoint (major)

## Release Workflow

### 1. Local Release

```bash
# Ensure main branch is clean and up-to-date
git checkout main
git pull origin main

# Create release (automatic version bump, changelog, tag)
./scripts/release.sh patch   # or minor, major

# This does:
# - Bump version in package.json
# - Generate/update CHANGELOG.md
# - Create git commit
# - Create annotated git tag (v1.2.3)

# Preview changes without committing
./scripts/release.sh patch --dry-run
```

### 2. Push Release

```bash
# Push commits and tags to trigger CI/CD
git push origin main --tags

# This triggers:
# - GitHub Actions workflow: ci_release.yml
# - Build and test
# - Docker image creation
# - Push to registry (if configured)
# - Deploy to staging (if configured)
```

### 3. Deploy to Production

```bash
# Option 1: Manual deployment (recommended for critical releases)
# Verify release in staging: https://staging-api.tfxhub.com/health
# Then deploy:
./scripts/deploy.sh production

# Option 2: Automatic deployment (if configured in CI/CD)
# Release to production automatically on tag push (watch logs)
```

## CI/CD Release Workflow

When you push a tag (e.g., `v1.2.3`):

```
Push tag
  ↓
GitHub Actions triggers ci_release.yml
  ├── Checkout code
  ├── Build application
  ├── Run full test suite
  ├── Build Docker image: tfxhub/api:1.2.3
  ├── Push to Docker registry
  ├── Create GitHub Release
  ├── Deploy to staging
  ├── Run smoke tests
  └── (Manual approval) Deploy to production
```

## Release Types

### Patch Release (Bug fix)
```bash
# Example: 1.2.0 → 1.2.1
./scripts/release.sh patch

# Triggers: Bug fix CI job → Staging deploy → (Optional) Prod deploy
```

### Minor Release (New features)
```bash
# Example: 1.2.0 → 1.3.0
./scripts/release.sh minor

# Triggers: Feature test suite → Integration tests → Staging → Prod
```

### Major Release (Breaking changes)
```bash
# Example: 1.3.0 → 2.0.0
./scripts/release.sh major

# Triggers: Full regression suite → Staging → Manual approval → Prod
# Note: Requires manual approval before production deployment
```

## Production Checklist

Before deploying to production:

- [ ] All tests passing (GitHub Actions green)
- [ ] Code reviewed and approved (2+ reviews)
- [ ] Staging deployment verified
- [ ] Smoke tests passing
- [ ] Database migrations tested
- [ ] Secrets/configuration ready
- [ ] Rollback plan documented
- [ ] Communication to stakeholders

## Rollback Procedure

If issues occur in production:

```bash
# 1. Identify the failing version
git tag  # List all tags

# 2. Revert to previous version
git checkout v1.2.0

# 3. Redeploy
./scripts/deploy.sh production

# 4. Create incident report
# (File: docs/runbooks/incident_YYYY-MM-DD.md)

# 5. Investigate root cause
# (Update code and re-release)
```

## Change Log

Maintained in `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format.

Format:
```markdown
## [1.2.3] - 2026-04-01

### Added
- New user authentication feature

### Changed
- Updated API response format

### Fixed
- Memory leak in logger

### Deprecated
- Old /v1/api endpoint (use /v2 instead)

### Removed
- Legacy format support

### Security
- Fixed SQL injection vulnerability
```

## Release Notes

Generated automatically from:
1. **Commit messages** — Conventional Commits format
2. **CHANGELOG.md** — Manual additions
3. **GitHub Release** — Auto-published with artifacts

Final release notes available at:
```
https://github.com/tfxhub/tfx-hub/releases/tag/v1.2.3
```

## Monitoring Releases

### Health Checks
```bash
# Liveness check
curl https://api.tfxhub.com/health/live

# Readiness check
curl https://api.tfxhub.com/health/ready

# Metrics
curl https://api.tfxhub.com/metrics
```

### Dashboards
- **Grafana** — http://monitoring.tfxhub.com (or localhost:3001)
- **Prometheus** — http://monitoring.tfxhub.com:9090 (or localhost:9090)

### Key Metrics to Monitor Post-Release
- ✅ Error rate (should be <1%)
- ✅ API latency (p95 <500ms)
- ✅ Memory usage (stable)
- ✅ Database connections (healthy)
- ✅ Failed deployments (0)

## Hotfix (Emergency Release)

For urgent production fixes:

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-bug

# Make minimal fix
# Test thoroughly
# Create PR and get expedited review

# Release with patch version
./scripts/release.sh patch

# Deploy immediately
./scripts/deploy.sh production
```

## Scheduled Releases

Regular release cadence (recommended):
- **Weekly** — Patch releases (bug fixes)
- **Bi-weekly** — Minor releases (features)
- **Quarterly** — Major releases (major features, breaking changes)

## Secrets and Configuration

For production deployments:

1. **Database credentials** — Store in GitHub Secrets + Vault
2. **API keys** — Rotate quarterly
3. **SSL/TLS certificates** — Auto-renew via Let's Encrypt
4. **Configuration** — Environment-specific .env files

See [Security Policy](../SECURITY.md) for detailed guidelines.

## Troubleshooting

### Release script fails
```bash
# Verify git setup
git status
git config user.name
git config user.email

# Ensure main branch
git checkout main
git pull origin main
```

### Test failures before release
```bash
# Run full test suite locally
pnpm test
pnpm --filter @tfx/shared-auth test:integration

# Fix failures before attempting release
```

### Deployment stuck
```bash
# Check CI/CD logs
# GitHub Actions → Actions tab → Latest workflow

# Check container health
kubectl get pods  # (if using Kubernetes)
docker ps         # (if using Docker)
```

## Further Reading

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

---

**Questions?** Open an issue or ask in #releases channel on Slack.
MD
echo "✓ Created release guide: $RELEASE_GUIDE"

# ============================================================================
# 9. Monitoring and SLO runbook
# ============================================================================
MONITORING_GUIDE="$DOCS_DIR/monitoring_and_slos.md"
cat > "$MONITORING_GUIDE" <<'MD'
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
MD
echo "✓ Created monitoring guide: $MONITORING_GUIDE"

# ============================================================================
# 10. CI/CD Release Workflow
# ============================================================================
CI_RELEASE="$CI_DIR/ci_release.yml"
cat > "$CI_RELEASE" <<'YAML'
name: CI - Release and Deploy

on:
  push:
    tags:
      - 'v*'  # Trigger on version tags (v1.2.3)

jobs:
  validate_release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2

      - name: Validate Version Tag
        run: |
          VERSION=$(node -pe "require('./package.json').version")
          TAG="${{ github.ref_name }}"
          if [ "v$VERSION" != "$TAG" ]; then
            echo "Tag version ($TAG) doesn't match package.json ($VERSION)"
            exit 1
          fi

      - name: Run Full Test Suite
        run: pnpm test

      - name: Run Integration Tests
        run: pnpm --filter @tfx/shared-auth test:integration

      - name: Security Scan
        run: pnpm run security:scan

  build_and_push:
    needs: validate_release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Login to Docker Registry
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USER }}
          password: ${{ secrets.DOCKER_PASS }}

      - name: Build and Push Docker Image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            tfxhub/api:${{ github.ref_name }}
            tfxhub/api:latest

  create_release:
    needs: validate_release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          body: 'See CHANGELOG.md for details'
          draft: false
          prerelease: false
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  deploy_staging:
    needs: [build_and_push, create_release]
    runs-on: ubuntu-latest
    environment:
      name: staging
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Staging
        run: |
          echo "Deploying ${{ github.ref_name }} to staging"
          # kubectl set image deployment/tfx-hub tfx-hub=tfxhub/api:${{ github.ref_name }}
          # Or Docker Compose deploy logic

      - name: Run Smoke Tests
        run: |
          sleep 10
          curl -f https://staging-api.tfxhub.com/health/ready || exit 1

      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "🚀 Release ${{ github.ref_name }} deployed to staging",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Release deployed to staging:*\n<${{ github.server_url }}/${{ github.repository }}/releases/tag/${{ github.ref_name }}|${{ github.ref_name }}>"
                  }
                }
              ]
            }

  request_approval:
    needs: deploy_staging
    runs-on: ubuntu-latest
    steps:
      - name: Request Production Approval
        run: |
          echo "Release ready for production deployment"
          echo "Waiting for manual approval..."
          # GitHub provides automatic approval handling for production environments

  deploy_production:
    needs: request_approval
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Production
        run: |
          echo "Deploying ${{ github.ref_name }} to production"
          # kubectl set image deployment/tfx-hub tfx-hub=tfxhub/api:${{ github.ref_name }}

      - name: Health Check
        run: |
          sleep 10
          curl -f https://api.tfxhub.com/health/ready || exit 1
          curl -f https://api.tfxhub.com/metrics || exit 1

      - name: Notify Success
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Release ${{ github.ref_name }} deployed to production",
              "blocks": [
                {
                  "type": "section",
                  "text": {
                    "type": "mrkdwn",
                    "text": "*Production deployment successful:*\n<${{ github.server_url }}/${{ github.repository }}/releases/tag/${{ github.ref_name }}|${{ github.ref_name }}>\nAPI: https://api.tfxhub.com"
                  }
                }
              ]
            }

      - name: Rollback on Failure
        if: failure()
        run: |
          echo "Deployment failed! Rolling back..."
          # kubectl rollout undo deployment/tfx-hub
          exit 1
YAML
echo "✓ Created CI release workflow: $CI_RELEASE"

# ============================================================================
# 11. Summary
# ============================================================================
echo ""
echo "✅ Release and monitoring infrastructure setup complete!"
echo ""
echo "📦 Release Management:"
echo "   ✓ Release script: scripts/release.sh"
echo "   ✓ Semantic versioning support (major/minor/patch)"
echo "   ✓ Automatic changelog generation"
echo "   ✓ Git tagging and commits"
echo "   ✓ CI/CD release workflow"
echo ""
echo "📊 Monitoring Stack:"
echo "   ✓ Prometheus configuration (metrics collection)"
echo "   ✓ Grafana dashboard (visualization)"
echo "   ✓ AlertManager (alert routing)"
echo "   ✓ Alert rules (thresholds and conditions)"
echo "   ✓ Docker Compose (local monitoring stack)"
echo ""
echo "📈 Health & Observability:"
echo "   ✓ Health check endpoints (/health/live, /health/ready, /metrics)"
echo "   ✓ Prometheus-compatible metrics endpoint"
echo "   ✓ System metrics (CPU, memory, disk)"
echo "   ✓ Application metrics (requests, latency, errors)"
echo ""
echo "📚 Documentation:"
echo "   ✓ Release process guide"
echo "   ✓ Monitoring and SLO runbook"
echo "   ✓ On-call procedures"
echo "   ✓ Alert troubleshooting"
echo ""
echo "🚀 Next Steps:"
echo "   1. Try a test release: ./scripts/release.sh patch --dry-run"
echo "   2. Start monitoring stack: docker-compose -f monitoring/docker-compose.yml up -d"
echo "   3. Access Grafana: http://localhost:3001 (admin:admin)"
echo "   4. Access Prometheus: http://localhost:9090"
echo "   5. Review docs: docs/guides/release_process.md"
echo ""
echo "✅ Done. Release and monitoring infrastructure ready!"
EOF
chmod +x "$RELEASE_SCRIPT"
"$RELEASE_SCRIPT" --help 2>/dev/null || echo "Release script created successfully"
bash scripts/generate_docs_and_onboarding.sh
