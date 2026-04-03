# Local Live Stack Runbook

This runbook starts the browser hosts against a real PostgreSQL-backed API on a Windows machine without changing the existing system PostgreSQL service on `5432`.

## Ports

- `3000` AMS browser host
- `3001` Customer browser host
- `3002` Contractor browser host
- `3003` Members browser host
- `5005` Real API server
- `5433` Isolated PostgreSQL cluster for this repo session

## Prerequisites

- `pnpm.cmd` available
- PostgreSQL installed locally, or `TFX_PG_BIN` set to the PostgreSQL `bin` directory
- Repo cloned at `C:\Users\1hans\tfx-hub`

## Bootstrap

Install workspace dependencies:

```powershell
Set-Location "C:\Users\1hans\tfx-hub"
pnpm.cmd install
```

Optional verification:

```powershell
pnpm.cmd test
```

## One-Command Wrapper

Start the full stack:

```powershell
Set-Location "C:\Users\1hans\tfx-hub"
pnpm.cmd run stack:local:windows:start
```

Stop the full stack:

```powershell
Set-Location "C:\Users\1hans\tfx-hub"
pnpm.cmd run stack:local:windows:stop
```

Run the smoke verification:

```powershell
Set-Location "C:\Users\1hans\tfx-hub"
pnpm.cmd run stack:local:windows:smoke
```

Check wrapper-managed status:

```powershell
Set-Location "C:\Users\1hans\tfx-hub"
pnpm.cmd run stack:local:windows:status
```

The wrapper writes process metadata and logs under `artifacts/local-live-stack/`.

Key files:

- `processes.json` records child process IDs as each service starts
- `bootstrap.log` records parent wrapper progress
- `*.log` files capture per-service startup and runtime output

If `processes.json` is missing, the status command still reports which known service logs exist and whether the API, browser hosts, and local PostgreSQL cluster are reachable.

## Start Isolated PostgreSQL

Create the local data directory once:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$dataDir = 'C:\Users\1hans\tfx-hub\artifacts\pg-local18'
if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) {
  & (Join-Path $pgBin 'initdb.exe') -D $dataDir -U postgres -A trust --encoding=UTF8
}
```

Start PostgreSQL on `5433` and create the app database:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$dataDir = 'C:\Users\1hans\tfx-hub\artifacts\pg-local18'
$logFile = 'C:\Users\1hans\tfx-hub\artifacts\pg-local18-server.log'
& (Join-Path $pgBin 'pg_ctl.exe') -D $dataDir -l $logFile -o ' -p 5433 ' start
$psql = Join-Path $pgBin 'psql.exe'
$databaseExists = & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tfx_hub'"
if ("$databaseExists".Trim() -ne '1') {
  & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -c 'CREATE DATABASE tfx_hub'
}
```

## Start Real API

Run the API against the isolated database on `5005`:

```powershell
Set-Location "C:\Users\1hans\tfx-hub\packages\api-server"
$env:TFX_ADMIN_USERNAME='local-admin-secret'
$env:TFX_ADMIN_EMAIL='admin@example.com'
$env:TFX_ADMIN_PASSWORD='change-this-admin-password'
$env:TFX_API_ENABLE_DEMO_SEED='true'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5433'
$env:DB_USER='postgres'
$env:DB_PASSWORD=''
$env:DB_NAME='tfx_hub'
$env:PORT='5005'
node src/server.js
```

## Start Browser Hosts

AMS:

```powershell
Set-Location "C:\Users\1hans\tfx-hub\apps\ams-app"
node server.js
```

Customer:

```powershell
Set-Location "C:\Users\1hans\tfx-hub\apps\customer-app"
$env:PORT='3001'
node server.js
```

Contractor:

```powershell
Set-Location "C:\Users\1hans\tfx-hub\apps\contractor-app"
$env:PORT='3002'
node server.js
```

Members:

```powershell
Set-Location "C:\Users\1hans\tfx-hub\apps\members-app"
$env:PORT='3003'
node server.js
```

## Quick Verification

Verify browser hosts:

```powershell
$checks = @(
  @{ Name='AMS'; Url='http://localhost:3000' },
  @{ Name='Customer'; Url='http://localhost:3001' },
  @{ Name='Contractor'; Url='http://localhost:3002' },
  @{ Name='Members'; Url='http://localhost:3003' }
)
foreach ($check in $checks) {
  $response = Invoke-WebRequest -Uri $check.Url -UseBasicParsing
  Write-Output ($check.Name + ' ' + [int]$response.StatusCode)
}
```

Verify API login:

```powershell
$body = @{ identifier = 'local-admin-secret'; password = 'change-this-admin-password' } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://localhost:5005/auth/login' -Method POST -ContentType 'application/json' -Body $body
```

The browser hosts default to a sample-mode page until a session is established. The local live stack enables demo seeding so the standard browser-host sign-ins are always available on the repo-local PostgreSQL instance:

- Contractor: `contractor@example.com` / `password123`
- Customer: `client@example.com` / `password123`
- Admin: `local-admin-secret` / `change-this-admin-password`

The smoke script verifies the live path by signing into AMS, Customer, and Contractor, and by checking the Members host against the live API.

## Known Auth Constraint

Browser-host or server-side generated bearer tokens that call the API must be signed with `packages/shared-auth`, not `packages/shared-logic` auth helpers. The two packages use different default secrets, which causes `invalid_token` failures and browser-host fallback into sample mode.

## Shutdown

Stop the isolated PostgreSQL cluster:

```powershell
$pgBin = 'C:\Program Files\PostgreSQL\18\bin'
$dataDir = 'C:\Users\1hans\tfx-hub\artifacts\pg-local18'
& (Join-Path $pgBin 'pg_ctl.exe') -D $dataDir stop
```

Stop the Node browser hosts and API by terminating their terminals or processes.
