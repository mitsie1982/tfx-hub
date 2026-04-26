$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$logsDir = Join-Path $artifactsDir 'local-live-stack'
$pidFile = Join-Path $logsDir 'processes.json'
$pgBin = Resolve-PostgresBin -AllowMissing
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$runnerScript = Join-Path $PSScriptRoot 'run_local_live_stack_process.ps1'
$knownProcesses = @(
  @{ name = 'api-server'; port = 5005; workingDirectory = (Join-Path $repoRoot 'packages\api-server'); commandFragment = 'src/server.js' },
  @{ name = 'ams-app'; port = 3000; workingDirectory = (Join-Path $repoRoot 'apps\ams-app'); commandFragment = 'server.js' },
  @{ name = 'customer-app'; port = 3001; workingDirectory = (Join-Path $repoRoot 'apps\customer-app'); commandFragment = 'server.js' },
  @{ name = 'contractor-app'; port = 3002; workingDirectory = (Join-Path $repoRoot 'apps\contractor-app'); commandFragment = 'server.js' },
  @{ name = 'members-app'; port = 3003; workingDirectory = (Join-Path $repoRoot 'apps\members-app'); commandFragment = 'server.js' }
)

function Stop-StackProcess {
  param(
    $ProcessEntry
  )

  function Stop-PortOwnerIfPresent {
    param(
      $Entry
    )

    if (-not $Entry.port) {
      return $false
    }

    $connection = Get-NetTCPConnection -LocalPort ([int]$Entry.port) -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $connection) {
      return $false
    }

    if (-not (Test-NodeProcessMatchesWorkingDirectory -ProcessId $connection.OwningProcess -WorkingDirectory $Entry.workingDirectory -ExpectedCommandFragment $Entry.commandFragment)) {
      Write-Output ('Skipped ' + $Entry.name + ' port-owner (' + $connection.OwningProcess + ') because it is not managed by the local live stack')
      return $false
    }

    try {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
      Write-Output ('Stopped ' + $Entry.name + ' port-owner (' + $connection.OwningProcess + ')')
      return $true
    } catch {
      Write-Output ('Skipped ' + $Entry.name + ' port-owner (' + $connection.OwningProcess + ')')
      return $true
    }
  }

  if ($ProcessEntry.PSObject.Properties.Name -contains 'pid' -and $ProcessEntry.pid) {
    if (Test-StackWrapperProcessMatches -ProcessId $ProcessEntry.pid -WorkingDirectory $ProcessEntry.workingDirectory -RunnerScriptPath $runnerScript) {
      try {
        Stop-Process -Id $ProcessEntry.pid -Force -ErrorAction Stop
        Write-Output ('Stopped ' + $ProcessEntry.name + ' wrapper (' + $ProcessEntry.pid + ')')
      } catch {
        Write-Output ('Skipped ' + $ProcessEntry.name + ' wrapper (' + $ProcessEntry.pid + ')')
      }
    } else {
      Write-Output ('Skipped ' + $ProcessEntry.name + ' wrapper (' + $ProcessEntry.pid + ') because it is stale or unmanaged')
    }
  }

  if (Stop-PortOwnerIfPresent -Entry $ProcessEntry) {
    return
  }
}

if (Test-Path $pidFile) {
  $processes = Get-Content -Path $pidFile -Raw | ConvertFrom-Json
  foreach ($process in $processes) {
    Stop-StackProcess -ProcessEntry $process
  }
  Remove-Item $pidFile -Force
}

foreach ($process in $knownProcesses) {
  Stop-StackProcess -ProcessEntry $process
}

if ($pgBin -and (Test-Path $pgCtl)) {
  if (Test-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath (Join-Path $pgBin 'psql.exe') -DataDir $dataDir -Port 5433) {
    & $pgCtl -D $dataDir stop | Out-Host
  }
}

Write-Output 'Local live stack stopped.'
