$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$pgBin = Resolve-PostgresBin -AllowMissing

if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) {
  Write-Output 'Repo-local PostgreSQL cluster is not initialized.'
  exit 0
}

if (-not $pgBin) {
  throw 'PostgreSQL tools not found. Install PostgreSQL or set TFX_PG_BIN to the bin directory.'
}

$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$psql = Join-Path $pgBin 'psql.exe'

if (Test-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433) {
  Write-Output 'Stopping repo-local PostgreSQL on 127.0.0.1:5433.'
  & $pgCtl -D $dataDir stop | Out-Host
  Write-Output 'Repo-local PostgreSQL stopped.'
} else {
  Write-Output 'Repo-local PostgreSQL is already stopped.'
}