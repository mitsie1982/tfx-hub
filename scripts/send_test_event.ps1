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
