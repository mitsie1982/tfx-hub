const { spawnSync } = require('child_process');
const path = require('path');
const { createSharedLogicClient } = require('../packages/shared-logic/src/sharedLogicClient');
const { createApp, createPostgresRepository } = require('../packages/api-server/src');

const LOCAL_POSTGRES_DEFAULTS = {
  host: '127.0.0.1',
  port: '5433',
  user: 'postgres',
  password: '',
  database: 'tfx_hub'
};

const LOCAL_ADMIN_DEFAULTS = {
  username: 'local-admin-secret',
  email: 'admin@example.com',
  password: 'change-this-admin-password'
};

function hasDatabaseConfig() {
  return Boolean(
    process.env.DATABASE_URL
    || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME)
  );
}

function applyLocalDefaults() {
  process.env.DB_HOST = process.env.DB_HOST || LOCAL_POSTGRES_DEFAULTS.host;
  process.env.DB_PORT = process.env.DB_PORT || LOCAL_POSTGRES_DEFAULTS.port;
  process.env.DB_USER = process.env.DB_USER || LOCAL_POSTGRES_DEFAULTS.user;
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? LOCAL_POSTGRES_DEFAULTS.password;
  process.env.DB_NAME = process.env.DB_NAME || LOCAL_POSTGRES_DEFAULTS.database;
  process.env.TFX_ADMIN_USERNAME = process.env.TFX_ADMIN_USERNAME || LOCAL_ADMIN_DEFAULTS.username;
  process.env.TFX_ADMIN_EMAIL = process.env.TFX_ADMIN_EMAIL || LOCAL_ADMIN_DEFAULTS.email;
  process.env.TFX_ADMIN_PASSWORD = process.env.TFX_ADMIN_PASSWORD || LOCAL_ADMIN_DEFAULTS.password;
}

function ensureLocalWindowsPostgres() {
  const repoRoot = path.resolve(__dirname, '..');
  const bootstrapScript = [
    "$ErrorActionPreference = 'Stop'",
    `. '${path.join(repoRoot, 'scripts', 'postgres_tools.ps1').replace(/\\/g, '\\\\')}'`,
    `$repoRoot = '${repoRoot.replace(/\\/g, '\\\\')}'`,
    "$dataDir = Join-Path $repoRoot 'artifacts\\pg-local18'",
    "New-Item -ItemType Directory -Force -Path $dataDir | Out-Null",
    '$pgBin = Resolve-PostgresBin',
    "$pgCtl = Join-Path $pgBin 'pg_ctl.exe'",
    "$initdb = Join-Path $pgBin 'initdb.exe'",
    "$psql = Join-Path $pgBin 'psql.exe'",
    "if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) { & $initdb -D $dataDir -U postgres -A trust --encoding=UTF8 | Out-Host }",
    '& $pgCtl -D $dataDir status 2>$null | Out-Null',
    "if ($LASTEXITCODE -ne 0) { & $pgCtl -D $dataDir -l (Join-Path $repoRoot 'artifacts\\pg-local18-server.log') -o ' -p 5433 ' start | Out-Host }",
    "$databaseExists = & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='tfx_hub'\" 2>$null",
    "if (\"$databaseExists\".Trim() -ne '1') { & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -c 'CREATE DATABASE tfx_hub' | Out-Host }"
  ].join('; ');

  const result = spawnSync('powershell.exe', [
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-Command',
    bootstrapScript
  ], {
    stdio: 'inherit'
  });

  if (result.status !== 0) {
    throw new Error('Unable to start local Windows Postgres for smoke test.');
  }
}

async function main() {
  if (!hasDatabaseConfig()) {
    if (process.platform !== 'win32') {
      console.error('Postgres smoke test skipped: DATABASE_URL or DB_HOST/DB_USER/DB_NAME is not configured.');
      process.exit(2);
    }

    applyLocalDefaults();
    ensureLocalWindowsPostgres();
  }

  const repository = createPostgresRepository();
  await repository.initialize();

  const app = createApp({ repository });
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance));
  });

  const address = server.address();
  const baseURL = `http://127.0.0.1:${address.port}`;
  const client = createSharedLogicClient({
    baseURL,
    context: {
      associationId: 'assoc-contractor-demo',
      platform: 'node',
      appVersion: 'smoke-test'
    }
  });

  try {
    const login = await client.session.login({ email: 'contractor@example.com', password: 'password123' });
    const user = await client.session.getCurrentUser();
    const jobs = await client.jobs.listJobs({ status: 'OPEN' });
    const profile = await client.contractor.getProfile();

    console.log('login:', login.user.email);
    console.log('user:', user.id);
    console.log('jobs:', Array.isArray(jobs.items) ? jobs.items.length : 0);
    console.log('profile:', profile.item.professionalId);
  } finally {
    server.close();
  }
}

main().catch((error) => {
  console.error('Postgres smoke test failed:', error && error.message ? error.message : error);
  process.exit(1);
});
