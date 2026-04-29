# Observability and Crash Reporting

This document describes the observability scaffold and how to configure Sentry, Crashlytics, and structured logging.

## Shared logger
- Package: packages/shared-logging
- Exports a factory: const logger = require('@tfx/shared-logging')('service-name')
- Produces structured JSON logs suitable for ingestion by log pipelines.

## Sentry and Crashlytics
- Placeholders exist in app entry points. Replace placeholders with real initialization:
  - Sentry: SENTRY_DSN in CI or secrets manager.
  - Crashlytics: configure via native SDK and provide API keys via CI secrets.
- Do not commit DSNs or keys to the repo.

## Correlation IDs
- Use logger.startRequest({ requestId }) to create a request-scoped logger and include requestId in all logs.
- Propagate requestId from mobile to backend via headers X-Request-Id.

## Local test
- Bash shells with native Node on PATH: ./scripts/send_test_event.sh
- Windows PowerShell: ./scripts/send_test_event.ps1
- Verify logs appear in console and that Sentry/Crashlytics receive events when configured.

## CI checks
- A CI workflow checks for the observability init marker in app entry points to avoid missing telemetry.
- Ensure the marker comment OBSERVABILITY INIT is present in App.tsx for each app.
