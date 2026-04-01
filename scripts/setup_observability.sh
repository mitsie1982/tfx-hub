#!/usr/bin/env bash
set -euo pipefail

# scripts/setup_observability.sh
# Purpose:
#  - Scaffold packages/shared-logging with structured logger and adapters
#  - Add example initialization in both apps
#  - Create Sentry/Crashlytics placeholders and docs
#  - Add CI check to ensure telemetry initialization is present in app entry points
#  - Create VS Code tasks and a test event script
#
# Usage:
#   chmod +x scripts/setup_observability.sh
#   ./scripts/setup_observability.sh
#
# Notes:
#  - This script creates placeholders and wiring. Replace DSNs and keys with real secrets in CI or vault.
#  - Do not commit secrets. Use CI secrets or a secrets manager.

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

LOG_PKG="$ROOT/packages/shared-logging"
LOG_SRC="$LOG_PKG/src"
DOCS_DIR="$ROOT/docs"
CI_DIR="$ROOT/.github/workflows"
SCRIPTS_DIR="$ROOT/scripts"
VSCODE_DIR="$ROOT/.vscode"
ARTIFACTS_DIR="$ROOT/artifacts"

mkdir -p "$LOG_SRC" "$DOCS_DIR" "$CI_DIR" "$SCRIPTS_DIR" "$VSCODE_DIR" "$ARTIFACTS_DIR"

echo "Bootstrapping observability and crash reporting scaffold ($TS)"

# -------------------------
# 1) packages/shared-logging
# -------------------------
if [ ! -f "$LOG_PKG/package.json" ]; then
  mkdir -p "$LOG_PKG"
  cat > "$LOG_PKG/package.json" <<JSON
{
  "name": "@tfx/shared-logging",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.js",
  "types": "src/index.d.ts",
  "scripts": {
    "test": "node src/test_logger.js"
  },
  "dependencies": {
    "uuid": "^9.0.0"
  }
}
JSON
  echo "Created $LOG_PKG/package.json"
else
  echo "Shared logging package exists (skipped)"
fi

if [ ! -f "$LOG_SRC/index.d.ts" ]; then
  cat > "$LOG_SRC/index.d.ts" <<'TS'
type Meta = Record<string, unknown>;

type RequestLogger = {
  requestId: string;
  log: Logger;
  meta: Meta;
};

type Logger = {
  child(name: string): Logger;
  info(msg: string, meta?: Meta): void;
  warn(msg: string, meta?: Meta): void;
  error(msg: string, meta?: Meta): void;
  debug(msg: string, meta?: Meta): void;
  startRequest(meta?: Meta & { requestId?: string }): RequestLogger;
};

declare function createLogger(serviceName?: string): Logger;

export = createLogger;
TS
  echo "Created shared logger type definitions at $LOG_SRC/index.d.ts"
fi

# logger implementation
if [ ! -f "$LOG_SRC/index.js" ]; then
  cat > "$LOG_SRC/index.js" <<'JS'
/*
 packages/shared-logging/src/index.js
 Structured logger with adapters for console and external providers.
 Usage:
   const logger = require('@tfx/shared-logging')('service-name');
   logger.info('message', { requestId, userId });
*/
const { v4: uuidv4 } = require('uuid');

function createLogger(serviceName = 'app') {
  const level = process.env.LOG_LEVEL || 'info';

  function format(levelStr, msg, meta) {
    const ts = new Date().toISOString();
    const base = { ts, level: levelStr, service: serviceName };
    const payload = Object.assign({}, base, { message: msg }, meta || {});
    // Structured JSON output for ingestion
    return JSON.stringify(payload);
  }

  function sendToConsole(levelStr, msg, meta) {
    const out = format(levelStr, msg, meta);
    if (levelStr === 'error') console.error(out);
    else if (levelStr === 'warn') console.warn(out);
    else console.log(out);
  }

  // Placeholder adapter for Sentry
  function sendToSentry(levelStr, msg, meta) {
    // In production, call Sentry.captureException or captureMessage
    // Example: Sentry.captureMessage(msg, { level: levelStr, extra: meta })
  }

  // Placeholder adapter for Crashlytics
  function sendToCrashlytics(levelStr, msg, meta) {
    // In production, call Crashlytics logging APIs
  }

  return {
    child: (name) => createLogger(`${serviceName}:${name}`),
    info: (msg, meta) => { sendToConsole('info', msg, meta); },
    warn: (msg, meta) => { sendToConsole('warn', msg, meta); sendToSentry('warning', msg, meta); },
    error: (msg, meta) => { sendToConsole('error', msg, meta); sendToSentry('error', msg, meta); sendToCrashlytics('error', msg, meta); },
    debug: (msg, meta) => { if (process.env.LOG_LEVEL === 'debug') sendToConsole('debug', msg, meta); },
    startRequest: (reqMeta = {}) => {
      const requestId = reqMeta.requestId || uuidv4();
      return { requestId, log: createLogger(`${serviceName}:request`) , meta: Object.assign({ requestId }, reqMeta) };
    }
  };
}

module.exports = (serviceName) => createLogger(serviceName);
JS
  echo "Created shared logger implementation at $LOG_SRC/index.js"
fi

# test logger script
if [ ! -f "$LOG_SRC/test_logger.js" ]; then
  cat > "$LOG_SRC/test_logger.js" <<'JS'
const loggerFactory = require('./index');
const logger = loggerFactory('shared-logging-test');
logger.info('logger initialized', { env: process.env.NODE_ENV || 'dev' });
logger.error('test error', { code: 'TEST_ERR', detail: 'This is a test error' });
console.log('Shared logging test complete');
JS
  echo "Created logger test script"
fi

# -------------------------
# 2) Example Sentry and Crashlytics placeholders in apps
# -------------------------
for APP in "apps/ams-app" "apps/contractor-app"; do
  APP_ENTRY="$ROOT/$APP/App.tsx"
  INIT_SNIPPET="// OBSERVABILITY INIT - DO NOT REMOVE\nconst logger = require('@tfx/shared-logging')('$(basename $APP)');\n// Example: initialize Sentry here using process.env.SENTRY_DSN\n// if (process.env.SENTRY_DSN) { /* Sentry.init({ dsn: process.env.SENTRY_DSN }) */ }\nlogger.info('observability initialized', { env: process.env.NODE_ENV || 'dev' });\n"
  if [ -f "$APP_ENTRY" ]; then
    if ! grep -q "OBSERVABILITY INIT" "$APP_ENTRY"; then
      awk -v snippet="$INIT_SNIPPET" '
        BEGIN { inserted = 0 }
        /^import / { print; next }
        !inserted { print snippet; inserted = 1 }
        { print }
        END { if (!inserted) print snippet }
      ' "$APP_ENTRY" > "$APP_ENTRY.tmp" && mv "$APP_ENTRY.tmp" "$APP_ENTRY"
      echo "Inserted observability init into $APP_ENTRY"
    else
      echo "Observability init already present in $APP_ENTRY (skipped)"
    fi
  else
    # create minimal App.tsx with init
    mkdir -p "$(dirname "$APP_ENTRY")"
    cat > "$APP_ENTRY" <<TSX
import React from 'react';
import { SafeAreaView, Text } from 'react-native';
// OBSERVABILITY INIT - DO NOT REMOVE
const logger = require('@tfx/shared-logging')('$(basename $APP)');
logger.info('observability initialized', { env: process.env.NODE_ENV || 'dev' });

export default function App() {
  return (
    <SafeAreaView>
      <Text>$(basename $APP) - observability placeholder</Text>
    </SafeAreaView>
  );
}
TSX
    echo "Created $APP_ENTRY with observability init"
  fi
done

# -------------------------
# 3) scripts/send_test_event.sh
# -------------------------
TEST_SCRIPT="$SCRIPTS_DIR/send_test_event.sh"
cat > "$TEST_SCRIPT" <<'SH'
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
SH
chmod +x "$TEST_SCRIPT"
echo "Created test event script: $TEST_SCRIPT"

TEST_SCRIPT_PS1="$SCRIPTS_DIR/send_test_event.ps1"
cat > "$TEST_SCRIPT_PS1" <<'PS1'
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$artifactDir = Join-Path $root 'artifacts'
$tmpJs = Join-Path $artifactDir 'send_test_event_tmp.js'

New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null

@'
const logger = require('../packages/shared-logging/src')('observability-test');
logger.info('observability test event', { env: process.env.NODE_ENV || 'dev', ts: new Date().toISOString() });
logger.error('observability test error', { code: 'OBS_TEST', detail: 'Simulated error for testing' });
console.log('Test events emitted');
'@ | Set-Content -Path $tmpJs -Encoding utf8

if (-not $env:NODE_ENV) {
  $env:NODE_ENV = 'development'
}

Write-Host "Sending test events with NODE_ENV=$($env:NODE_ENV)"
node $tmpJs 2>&1 | ForEach-Object { $_ }
PS1
echo "Created PowerShell test event script: $TEST_SCRIPT_PS1"

# -------------------------
# 4) docs/observability.md
# -------------------------
OBS_DOC="$DOCS_DIR/observability.md"
cat > "$OBS_DOC" <<MD
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
- Run: ./scripts/send_test_event.sh
- Verify logs appear in console and that Sentry/Crashlytics receive events when configured.

## CI checks
- A CI workflow checks for the observability init marker in app entry points to avoid missing telemetry.
- Ensure the marker comment OBSERVABILITY INIT is present in App.tsx for each app.

MD
echo "Created observability docs: $OBS_DOC"

# -------------------------
# 5) CI workflow to check telemetry init presence
# -------------------------
CI_FILE="$CI_DIR/ci_observability.yml"
cat > "$CI_FILE" <<YAML
name: CI Observability Checks

on:
  pull_request:
    paths:
      - 'apps/**'
      - 'packages/shared-logging/**'

jobs:
  check-telemetry:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Check for observability init marker
        run: |
          set -e
          MISSING=0
          for APP in apps/ams-app apps/contractor-app; do
            FILE="\$APP/App.tsx"
            if [ ! -f "\$FILE" ]; then
              echo "Warning: \$FILE not found"
              MISSING=1
              continue
            fi
            if ! grep -q "OBSERVABILITY INIT" "\$FILE"; then
              echo "ERROR: Observability init marker missing in \$FILE"
              MISSING=1
            else
              echo "Found observability init in \$FILE"
            fi
          done
          if [ "\$MISSING" -ne 0 ]; then
            echo "Observability init checks failed"
            exit 1
          fi
YAML
echo "Created CI observability workflow: $CI_FILE"

# -------------------------
# 6) VS Code tasks for observability
# -------------------------
TASKS_FILE="$VSCODE_DIR/tasks.observability.json"
cat > "$TASKS_FILE" <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Observability: Send Test Event",
      "type": "shell",
      "command": "./scripts/send_test_event.sh",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Observability: Open Docs",
      "type": "shell",
      "command": "code -r docs/observability.md || true",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
echo "Created VS Code tasks at $TASKS_FILE"

# -------------------------
# 7) Add README note to branch protection checklist
# -------------------------
BP_FILE="$DOCS_DIR/branch_protection_checklist.md"
if [ -f "$BP_FILE" ]; then
  if ! grep -q "Observability" "$BP_FILE"; then
    cat >> "$BP_FILE" <<MD

## Observability Requirement
- Ensure each app initializes observability at startup.
- The CI observability check enforces presence of the OBSERVABILITY INIT marker in App.tsx.
MD
  fi
fi

# -------------------------
# 8) Install dependencies (best-effort)
# -------------------------
if command -v pnpm >/dev/null 2>&1; then
  echo "Installing workspace dependencies with pnpm..."
  pnpm install || true
else
  echo "pnpm not found. Run 'pnpm install' or use npm/yarn to install dependencies."
fi

# -------------------------
# 9) Commit created artifacts if inside git repo
# -------------------------
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$LOG_PKG" "$DOCS_DIR" "$CI_FILE" "$SCRIPTS_DIR" "$VSCODE_DIR" || true
  git commit -m "chore(observability): scaffold shared-logging, docs, CI checks and test scripts ($TS)" || true
fi

# -------------------------
# 10) Summary and acceptance criteria
# -------------------------
echo
echo "Observability scaffold complete."
echo " - Shared logging package: $LOG_PKG"
echo " - Docs: $OBS_DOC"
echo " - CI check: $CI_FILE"
echo " - Test event script: $TEST_SCRIPT"
echo " - VS Code tasks: $TASKS_FILE"
echo
echo "Acceptance checklist:"
echo " 1) Run './scripts/send_test_event.sh' and observe structured JSON logs in console."
echo " 2) Add real Sentry DSN and Crashlytics config in CI or secrets and verify events appear in your projects."
echo " 3) CI observability workflow fails PRs missing the OBSERVABILITY INIT marker in App.tsx."
echo " 4) Request correlation strategy documented in docs/observability.md."
echo
echo "Next recommended step: Step 10 Security and pre-commit enforcement. When ready, prompt 'Whats next' and I will render Step 10 script."
