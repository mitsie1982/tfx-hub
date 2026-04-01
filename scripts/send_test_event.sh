#!/usr/bin/env bash
set -euo pipefail
# scripts/send_test_event.sh
# Emits a structured log and a simulated error to test observability adapters.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NODE_ENV="${NODE_ENV:-development}"
TMP_JS="$ROOT/artifacts/send_test_event_tmp.js"
mkdir -p "$ROOT/artifacts"
cat > "$TMP_JS" <<'JS'
const logger = require('../packages/shared-logging/src')('observability-test');
logger.info('observability test event', { env: process.env.NODE_ENV || 'dev', ts: new Date().toISOString() });
logger.error('observability test error', { code: 'OBS_TEST', detail: 'Simulated error for testing' });
console.log('Test events emitted');
JS

echo "Sending test events with NODE_ENV=$NODE_ENV"
if command -v node >/dev/null 2>&1; then
  NODE_ENV="$NODE_ENV" node "$TMP_JS"
else
  echo "node is not available from this bash environment. Use PowerShell: ./scripts/send_test_event.ps1"
  exit 1
fi
