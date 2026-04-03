$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$logsDir = Join-Path $artifactsDir 'local-live-stack'
$pidFile = Join-Path $logsDir 'processes.json'
$bootstrapLog = Join-Path $logsDir 'bootstrap.log'
$runnerScript = Join-Path $PSScriptRoot 'run_local_live_stack_process.ps1'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$pgLog = Join-Path $artifactsDir 'pg-local18-server.log'

New-Item -ItemType Directory -Force -Path $logsDir | Out-Null
New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
New-Item -ItemType File -Force -Path $bootstrapLog | Out-Null

function Write-BootstrapLog {
  param([string]$Message)

  Add-Content -Path $bootstrapLog -Value ((Get-Date -Format o) + ' ' + $Message)
}

Write-BootstrapLog 'start script entered'

try {
  $pgBin = Resolve-PostgresBin
  $pgCtl = Join-Path $pgBin 'pg_ctl.exe'
  $initdb = Join-Path $pgBin 'initdb.exe'
  $psql = Join-Path $pgBin 'psql.exe'
  Write-BootstrapLog ('postgres bin: ' + $pgBin)
} catch {
  Write-BootstrapLog ('postgres discovery failed: ' + $_.Exception.Message)
  throw
}

if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) {
  Write-BootstrapLog 'initializing postgres cluster'
  & $initdb -D $dataDir -U postgres -A trust --encoding=UTF8 | Out-Host
}

& $pgCtl -D $dataDir status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-BootstrapLog 'starting postgres cluster'
  & $pgCtl -D $dataDir -l $pgLog -o ' -p 5433 ' start | Out-Host
}

$databaseExists = & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='tfx_hub'" 2>$null
if ("$databaseExists".Trim() -ne '1') {
  Write-BootstrapLog 'creating tfx_hub database'
  & $psql -w -h 127.0.0.1 -p 5433 -U postgres -d postgres -c 'CREATE DATABASE tfx_hub' | Out-Host
}

$processes = @()

function Save-ProcessManifest {
  ($processes | ConvertTo-Json -Depth 3) | Set-Content -Path $pidFile -Encoding ASCII
}

function Start-StackProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Port,
    [switch]$IsApiServer
  )

  $logFile = Join-Path $logsDir ($Name + '.log')
  $arguments = @(
    '-NoLogo',
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    $runnerScript,
    '-WorkingDirectory',
    $WorkingDirectory,
    '-LogFile',
    $logFile
  )
  if ($Port) {
    $arguments += @('-Port', $Port)
  }
  if ($IsApiServer) {
    $arguments += '-ApiServer'
  }
  Write-BootstrapLog ('starting process ' + $Name + ' in ' + $WorkingDirectory)
  $process = Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -PassThru -WindowStyle Hidden
  $script:processes += [pscustomobject]@{
    name = $Name
    pid = $process.Id
    port = $Port
    workingDirectory = $WorkingDirectory
    logFile = $logFile
  }
  Save-ProcessManifest
  Write-BootstrapLog ('started process ' + $Name + ' pid=' + $process.Id)
}

Start-StackProcess -Name 'api-server' -WorkingDirectory (Join-Path $repoRoot 'packages\api-server') -Port '5005' -IsApiServer
Start-StackProcess -Name 'ams-app' -WorkingDirectory (Join-Path $repoRoot 'apps\ams-app') -Port '3000'
Start-StackProcess -Name 'customer-app' -WorkingDirectory (Join-Path $repoRoot 'apps\customer-app') -Port '3001'
Start-StackProcess -Name 'contractor-app' -WorkingDirectory (Join-Path $repoRoot 'apps\contractor-app') -Port '3002'
Start-StackProcess -Name 'members-app' -WorkingDirectory (Join-Path $repoRoot 'apps\members-app') -Port '3003'

Write-BootstrapLog ('writing pid file to ' + $pidFile)
Save-ProcessManifest
Write-BootstrapLog 'pid file written'

Write-Output 'Local live stack started.'
Write-Output ('PID file: ' + $pidFile)
Write-Output ('Logs: ' + $logsDir)
Write-Output ('Processes: ' + (($processes | ForEach-Object { $_.name + ':' + $_.pid }) -join ', '))
Write-Output 'Ports: 3000, 3001, 3002, 3003, 5005, 5433'