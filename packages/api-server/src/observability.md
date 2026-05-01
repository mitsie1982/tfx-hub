# Observability Guide

## Metrics & Monitoring
- Integrated with Sentry (error tracking) and New Relic (APM/metrics).
- All errors are captured and reported if configured.

## Setup
- Set `SENTRY_DSN` in environment for Sentry.
- Install and configure New Relic agent (`NEW_RELIC_LICENSE_KEY`, `NEW_RELIC_APP_NAME`).

## Usage
- All API errors are automatically tracked.
- For custom events, use `captureError(error, req)` from `observability.js`.
