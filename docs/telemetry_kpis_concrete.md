# Telemetry KPIs and Metric Definitions

This file lists the concrete metric names used in monitoring and recommended alert thresholds.

## Mobile client metrics
- **mobile_active_users_total**
  Cumulative count of active users (incremented per unique active session). Used as denominator for rates.

- **mobile_crashes_total**
  Total number of crashes reported by the mobile SDK (Crashlytics/Sentry).
  **Alert**: MobileHighCrashRate — crash rate > 0.5% over 10 minutes.

- **mobile_unhandled_exceptions_total**
  Count of unhandled JS/native exceptions captured by the mobile SDK.
  **Alert**: MobileUnhandledExceptionsSpike — increase > 50 in 5 minutes.

## Backend metrics
- **api_responses_total{status=...}**
  Counter of API responses labeled by HTTP status. Use to compute 5xx rate.
  **Alert**: BackendHigh5xxRate — 5xx rate > 1% over 5 minutes.

- **http_request_duration_seconds_bucket**
  Histogram buckets for request latency. Use histogram_quantile to compute P95.
  **Alert**: BackendHighP95Latency — P95 > 2s over 10 minutes.

- **payment_attempts_total**, **payment_failures_total**
  Counters for payment attempts and failures.
  **Alert**: PaymentFailureRateHigh — failure rate > 2% over 15 minutes.

- **job_bid_submissions_total**
  Counter for job bid submissions (key business metric).
  **Alert**: KeyBusinessMetricDrop — drop > 5% vs 1h baseline.

## Notes
- Replace metric names above with the exact names emitted by your mobile SDK and backend exporters if they differ.
- Ensure mobile SDKs (Sentry/Crashlytics) are configured to export counts to your metrics pipeline or that you instrument a bridge to convert events into Prometheus metrics.
