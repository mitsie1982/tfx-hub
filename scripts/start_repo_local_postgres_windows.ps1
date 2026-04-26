$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$pgLog = Join-Path $artifactsDir 'pg-local18-server.log'

New-Item -ItemType Directory -Force -Path $artifactsDir | Out-Null
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
if (-not (Test-Path $pgLog)) {
  New-Item -ItemType File -Force -Path $pgLog | Out-Null
}

$pgBin = Resolve-PostgresBin
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$initdb = Join-Path $pgBin 'initdb.exe'
$psql = Join-Path $pgBin 'psql.exe'

if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) {
  Write-Output ('Initializing repo-local PostgreSQL cluster at ' + $dataDir)
  & $initdb -D $dataDir -U postgres -A trust --encoding=UTF8 | Out-Host
}

if (Test-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433) {
  Write-Output 'Repo-local PostgreSQL already running on 127.0.0.1:5433.'
} elseif (Wait-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433 -TimeoutSeconds 20) {
  Write-Output 'Repo-local PostgreSQL is still starting on 127.0.0.1:5433. Reusing the existing cluster.'
} else {
  $listeningProcess = Get-ListeningProcessInfo -Port 5433
  if ($listeningProcess -and -not (Test-ProcessMatchesDataDir -ProcessId $listeningProcess.ProcessId -DataDir $dataDir)) {
    $processName = if ($listeningProcess.Name) { $listeningProcess.Name } else { 'unknown' }
    throw ('Port 5433 is already in use by pid=' + $listeningProcess.ProcessId + ' (' + $processName + ') and does not belong to the repo-local PostgreSQL cluster.')
  }

  Write-Output 'Starting repo-local PostgreSQL on 127.0.0.1:5433.'
  $pgCtlStart = Invoke-PgCtlStart -PgCtlPath $pgCtl -DataDir $dataDir -LogFile $pgLog -PortArgument ' -p 5433 '
  $pgCtlOutput = $pgCtlStart.Output
  $postgresStartExitCode = $pgCtlStart.ExitCode
  if (-not (Wait-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433 -TimeoutSeconds 30)) {
    if ($pgCtlOutput) {
      Write-Output (($pgCtlOutput | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ }) -join [Environment]::NewLine)
    }
    throw 'Unable to start repo-local PostgreSQL cluster on port 5433.'
  }

  if ($postgresStartExitCode -ne 0) {
    Write-Output ('PostgreSQL became reachable after non-zero pg_ctl exit=' + $postgresStartExitCode + '. Reusing the existing cluster state.')
  }
}

$databaseExists = & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tfx_hub'" 2>$null
if ("$databaseExists".Trim() -ne '1') {
  Write-Output 'Creating tfx_hub database.'
  & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -c 'CREATE DATABASE tfx_hub' | Out-Host
}

Write-Output 'Repo-local PostgreSQL ready.'
Write-Output ('Data directory: ' + $dataDir)
Write-Output ('Log file: ' + $pgLog)
Write-Output 'Database: tfx_hub'
Write-Output 'Endpoint: 127.0.0.1:5433'
