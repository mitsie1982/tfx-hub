$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$pgLog = Join-Path $artifactsDir 'pg-local18-server.log'
$pgBin = Resolve-PostgresBin -AllowMissing

Write-Output 'Repo-local PostgreSQL status'
Write-Output ('Data directory: ' + $dataDir)

if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) {
  Write-Output 'cluster: not initialized'
  if ($pgBin) {
    Write-Output ('postgres bin: ' + $pgBin)
  } else {
    Write-Output 'postgres bin: not found'
  }
  exit 0
}

if (-not $pgBin) {
  Write-Output 'postgres bin: not found'
  Write-Output 'cluster: initialized, status unavailable until PostgreSQL tools are installed or TFX_PG_BIN is set'
  exit 0
}

$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$psql = Join-Path $pgBin 'psql.exe'

Write-Output ('postgres bin: ' + $pgBin)

if (Test-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433) {
  Write-Output 'cluster: running'
  $databaseExists = & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tfx_hub'" 2>$null
  if ("$databaseExists".Trim() -eq '1') {
    Write-Output 'database tfx_hub: present'
  } else {
    Write-Output 'database tfx_hub: missing'
  }
  if (Test-Path $pgLog) {
    Write-Output ('log file: ' + $pgLog)
  }
} else {
  Write-Output 'cluster: stopped'
  if (Test-Path $pgLog) {
    Write-Output ('log file: ' + $pgLog)
  }
}