$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$logsDir = Join-Path $artifactsDir 'local-live-stack'
$pidFile = Join-Path $logsDir 'processes.json'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$pgBin = Resolve-PostgresBin -AllowMissing
$knownProcesses = @(
  @{ Name = 'api-server'; Port = 5005; LogFile = (Join-Path $logsDir 'api-server.log') },
  @{ Name = 'ams-app'; Port = 3000; LogFile = (Join-Path $logsDir 'ams-app.log') },
  @{ Name = 'customer-app'; Port = 3001; LogFile = (Join-Path $logsDir 'customer-app.log') },
  @{ Name = 'contractor-app'; Port = 3002; LogFile = (Join-Path $logsDir 'contractor-app.log') },
  @{ Name = 'members-app'; Port = 3003; LogFile = (Join-Path $logsDir 'members-app.log') }
)

function Get-PortOwner {
  param(
    [int]$Port
  )

  if (-not $Port) {
    return $null
  }

  $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $connection) {
    return $null
  }

  $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
  return [pscustomobject]@{
    pid = $connection.OwningProcess
    name = $process.ProcessName
  }
}

Write-Output 'Local live stack status'

if (Test-Path $pidFile) {
  Write-Output ('pidFile: ' + $pidFile)
  $processes = Get-Content -Path $pidFile -Raw | ConvertFrom-Json
  foreach ($process in $processes) {
    try {
      $liveProcess = Get-Process -Id $process.pid -ErrorAction Stop
      Write-Output ('process ' + $process.name + ': running pid=' + $liveProcess.Id)
    } catch {
      $portOwner = Get-PortOwner -Port $process.port
      if ($portOwner) {
        Write-Output ('process ' + $process.name + ': wrapper-stopped pid=' + $process.pid + ', active-port-owner pid=' + $portOwner.pid + ' name=' + $portOwner.name)
      } else {
        Write-Output ('process ' + $process.name + ': stopped pid=' + $process.pid)
      }
    }
  }
} else {
  Write-Output 'pidFile: missing'
  foreach ($process in $knownProcesses) {
    if (Test-Path $process.LogFile) {
      $portOwner = Get-PortOwner -Port $process.Port
      if ($portOwner) {
        Write-Output ('log ' + $process.Name + ': present, active-port-owner pid=' + $portOwner.pid + ' name=' + $portOwner.name)
      } else {
        Write-Output ('log ' + $process.Name + ': present')
      }
    } else {
      Write-Output ('log ' + $process.Name + ': missing')
    }
  }
}

if ($pgBin) {
  $pgCtl = Join-Path $pgBin 'pg_ctl.exe'
  if (Test-Path $pgCtl) {
    & $pgCtl -D $dataDir status 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Output 'postgres: running on local cluster'
    } else {
      Write-Output 'postgres: stopped'
    }
  }
} else {
  Write-Output 'postgres: tools not found'
}

try {
  $body = @{ identifier = 'local-admin-secret'; password = 'change-this-admin-password' } | ConvertTo-Json
  $login = Invoke-RestMethod -Uri 'http://localhost:5005/auth/login' -Method POST -ContentType 'application/json' -Body $body
  Write-Output ('api: running user=' + $login.user.username)
} catch {
  Write-Output 'api: down'
}

foreach ($target in @(
  @{ Name = 'ams'; Url = 'http://localhost:3000' },
  @{ Name = 'customer'; Url = 'http://localhost:3001' },
  @{ Name = 'contractor'; Url = 'http://localhost:3002' },
  @{ Name = 'members'; Url = 'http://localhost:3003' }
)) {
  try {
    $response = Invoke-WebRequest -Uri $target.Url -UseBasicParsing
    Write-Output ('host ' + $target.Name + ': ' + [int]$response.StatusCode)
  } catch {
    Write-Output ('host ' + $target.Name + ': down')
  }
}