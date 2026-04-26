# Backend Metrics Instrumentation Guide

## Overview
This guide shows how to emit metrics from Express.js backend to Prometheus.

## Setup

Install Prometheus client:
```bash
npm install prom-client
```

Import and use metrics:
```javascript
const { metrics, instrumentRequest } = require('../src/health_endpoints');

// Add request instrumentation middleware
app.use(instrumentRequest);

// In your route handlers:
app.post('/checkout', async (req, res) => {
  metrics.checkoutStarted.labels('web').inc();

  try {
    // Process checkout
    const result = await processCheckout(req.body);
    metrics.checkoutCompleted.labels('web').inc();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

## Common Patterns

### Database Query Instrumentation
```javascript
const start = Date.now();
const result = await db.query(sql, params);
const duration = (Date.now() - start) / 1000;
metrics.dbQueryDuration.labels('select').observe(duration);
```

### Error Tracking
```javascript
if (error) {
  metrics.mobileUnhandledExceptions
    .labels('ams-app', 'ios')
    .inc();
}
```

### Business Metrics
```javascript
// Job submission
metrics.jobSubmitted.labels('mobile').inc();

// Feature flag cohort tracking
const isCanaary = featureFlags.get('canary_release') === true;
metrics.mobileActiveSessions.labels('ams', 'ios', isCanaary ? 'true' : 'false').inc();
```

## Metrics Emitted

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| http_request_duration_seconds | Histogram | method, route, status_code | API endpoint latencies |
| http_requests_total | Counter | method, route, status_code | Total API requests |
| db_query_duration_seconds | Histogram | query_type | Database query latencies |
| mobile_unhandled_exceptions_total | Counter | app, platform | Mobile exceptions |
| mobile_crashes_total | Counter | app, platform, canary | Mobile crashes |
| mobile_active_sessions_total | Counter | app, platform, canary | Active user sessions |
| checkout_started_total | Counter | app | Checkout flow initiations |
| checkout_completed_total | Counter | app | Completed checkouts |
| job_submitted_total | Counter | app | Job submissions |

## Prometheus Scrape Configuration

Add to `monitoring/prometheus.yml`:
```yaml
scrape_configs:
  - job_name: 'tfxhub-api'
    scrape_interval: 15s
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:3000']
```

## Testing

Hit the endpoints:
```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
curl http://localhost:3000/metrics
```
