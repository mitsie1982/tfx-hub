$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$logsDir = Join-Path $artifactsDir 'local-live-stack'
$pidFile = Join-Path $logsDir 'processes.json'
$pgBin = Resolve-PostgresBin -AllowMissing
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$knownProcesses = @(
  @{ name = 'api-server'; port = 5005 },
  @{ name = 'ams-app'; port = 3000 },
  @{ name = 'customer-app'; port = 3001 },
  @{ name = 'contractor-app'; port = 3002 },
  @{ name = 'members-app'; port = 3003 }
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

    try {
      Stop-Process -Id $connection.OwningProcess -Force -ErrorAction Stop
      Write-Output ('Stopped ' + $Entry.name + ' port-owner (' + $connection.OwningProcess + ')')
      return $true
    } catch {
      Write-Output ('Skipped ' + $Entry.name + ' port-owner (' + $connection.OwningProcess + ')')
      return $true
    }
  }

  try {
    Stop-Process -Id $ProcessEntry.pid -Force -ErrorAction Stop
    Write-Output ('Stopped ' + $ProcessEntry.name + ' wrapper (' + $ProcessEntry.pid + ')')
    Stop-PortOwnerIfPresent -Entry $ProcessEntry | Out-Null
  } catch {
    if (Stop-PortOwnerIfPresent -Entry $ProcessEntry) {
      return
    }

    if ($ProcessEntry.PSObject.Properties.Name -contains 'pid' -and $ProcessEntry.pid) {
      Write-Output ('Skipped ' + $ProcessEntry.name + ' wrapper (' + $ProcessEntry.pid + ')')
    }
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
  & $pgCtl -D $dataDir status 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    & $pgCtl -D $dataDir stop | Out-Host
  }
}

Write-Output 'Local live stack stopped.'