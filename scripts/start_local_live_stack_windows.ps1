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
if (Test-Path $pidFile) {
  Remove-Item -Path $pidFile -Force
}

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

if (Test-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433) {
  Write-BootstrapLog 'postgres cluster already running'
} elseif (Wait-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433 -TimeoutSeconds 20) {
  Write-BootstrapLog 'postgres cluster already starting, reusing existing startup'
} else {
  $listeningProcess = Get-ListeningProcessInfo -Port 5433
  if ($listeningProcess -and -not (Test-ProcessMatchesDataDir -ProcessId $listeningProcess.ProcessId -DataDir $dataDir)) {
    $processName = if ($listeningProcess.Name) { $listeningProcess.Name } else { 'unknown' }
    Write-BootstrapLog ('postgres port conflict pid=' + $listeningProcess.ProcessId + ' name=' + $processName)
    throw ('Port 5433 is already in use by pid=' + $listeningProcess.ProcessId + ' (' + $processName + ') and does not belong to the repo-local PostgreSQL cluster.')
  }

  Write-BootstrapLog 'starting postgres cluster'
  $pgCtlStart = Invoke-PgCtlStart -PgCtlPath $pgCtl -DataDir $dataDir -LogFile $pgLog -PortArgument ' -p 5433 '
  $pgCtlOutput = $pgCtlStart.Output
  $postgresStartExitCode = $pgCtlStart.ExitCode
  if (-not (Wait-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433 -TimeoutSeconds 30)) {
    if ($pgCtlOutput) {
      Write-BootstrapLog ('pg_ctl output: ' + (($pgCtlOutput | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ }) -join ' | '))
    }
    Write-BootstrapLog ('postgres start failed exit=' + $postgresStartExitCode)
    throw 'Unable to start repo-local PostgreSQL cluster on port 5433.'
  }

  if ($postgresStartExitCode -ne 0) {
    $pgCtlSummary = if ($pgCtlOutput) {
      ($pgCtlOutput | ForEach-Object { $_.ToString().Trim() } | Where-Object { $_ }) -join ' | '
    } else {
      'no output'
    }
    Write-BootstrapLog ('postgres cluster became reachable after non-zero pg_ctl start exit=' + $postgresStartExitCode + ' output=' + $pgCtlSummary)
  }
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

function Get-ListeningProcess {
  param(
    [int]$Port
  )

  if (-not $Port) {
    return $null
  }

  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
    if (-not $connection) {
      return $null
    }

    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    $details = Get-CimInstance Win32_Process -Filter ("ProcessId = " + $connection.OwningProcess) -ErrorAction SilentlyContinue

    return [pscustomobject]@{
      pid = $connection.OwningProcess
      name = if ($process) { $process.ProcessName } else { $null }
      commandLine = if ($details) { $details.CommandLine } else { $null }
    }
  } catch {
    return $null
  }
}

function Register-ExistingProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Port,
    $ExistingProcess
  )

  $logFile = Join-Path $logsDir ($Name + '.log')
  $script:processes += [pscustomobject]@{
    name = $Name
    pid = $ExistingProcess.pid
    port = $Port
    workingDirectory = $WorkingDirectory
    logFile = $logFile
  }
  Save-ProcessManifest
  Write-BootstrapLog ('reusing existing process ' + $Name + ' pid=' + $ExistingProcess.pid + ' port=' + $Port)
}

function Start-StackProcess {
  param(
    [string]$Name,
    [string]$WorkingDirectory,
    [string]$Port,
    [switch]$IsApiServer
  )

  $logFile = Join-Path $logsDir ($Name + '.log')
  if ($Port) {
    $existingProcess = Get-ListeningProcess -Port ([int]$Port)
    if ($existingProcess) {
      $commandLine = [string]$existingProcess.commandLine
      $expectedCommandFragment = if ($IsApiServer) { 'src/server.js' } else { 'server.js' }
      $isManagedPortOwner = (
        $commandLine.IndexOf($WorkingDirectory, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
      ) -or (
        $existingProcess.name -eq 'node' -and $commandLine.IndexOf($expectedCommandFragment, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
      )

      if ($isManagedPortOwner) {
        Register-ExistingProcess -Name $Name -WorkingDirectory $WorkingDirectory -Port $Port -ExistingProcess $existingProcess
        return
      }

      $existingName = if ($existingProcess.name) { $existingProcess.name } else { 'unknown' }
      throw ('Port ' + $Port + ' is already in use by pid=' + $existingProcess.pid + ' (' + $existingName + ') and is not a managed stack process.')
    }
  }

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
