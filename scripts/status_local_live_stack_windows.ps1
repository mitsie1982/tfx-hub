$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$logsDir = Join-Path $artifactsDir 'local-live-stack'
$pidFile = Join-Path $logsDir 'processes.json'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$runnerScript = Join-Path $PSScriptRoot 'run_local_live_stack_process.ps1'
$pgBin = Resolve-PostgresBin -AllowMissing
$knownProcesses = @(
  @{ Name = 'api-server'; Port = 5005; WorkingDirectory = (Join-Path $repoRoot 'packages\api-server'); CommandFragment = 'src/server.js'; LogFile = (Join-Path $logsDir 'api-server.log') },
  @{ Name = 'ams-app'; Port = 3000; WorkingDirectory = (Join-Path $repoRoot 'apps\ams-app'); CommandFragment = 'server.js'; LogFile = (Join-Path $logsDir 'ams-app.log') },
  @{ Name = 'customer-app'; Port = 3001; WorkingDirectory = (Join-Path $repoRoot 'apps\customer-app'); CommandFragment = 'server.js'; LogFile = (Join-Path $logsDir 'customer-app.log') },
  @{ Name = 'contractor-app'; Port = 3002; WorkingDirectory = (Join-Path $repoRoot 'apps\contractor-app'); CommandFragment = 'server.js'; LogFile = (Join-Path $logsDir 'contractor-app.log') },
  @{ Name = 'members-app'; Port = 3003; WorkingDirectory = (Join-Path $repoRoot 'apps\members-app'); CommandFragment = 'server.js'; LogFile = (Join-Path $logsDir 'members-app.log') }
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

function Test-PortOwnerMatchesProcess {
  param(
    $ProcessDefinition,
    $PortOwner
  )

  if (-not $ProcessDefinition -or -not $PortOwner -or -not $PortOwner.pid) {
    return $false
  }

  return (Test-NodeProcessMatchesWorkingDirectory -ProcessId $PortOwner.pid -WorkingDirectory $ProcessDefinition.WorkingDirectory -ExpectedCommandFragment $ProcessDefinition.CommandFragment)
}

function Save-ValidProcessManifest {
  param(
    [array]$Processes
  )

  if ($Processes -and $Processes.Count -gt 0) {
    ($Processes | ConvertTo-Json -Depth 3) | Set-Content -Path $pidFile -Encoding ASCII
    return
  }

  if (Test-Path $pidFile) {
    Remove-Item -Path $pidFile -Force
  }
}

Write-Output 'Local live stack status'

if (Test-Path $pidFile) {
  Write-Output ('pidFile: ' + $pidFile)
  $processes = Get-Content -Path $pidFile -Raw | ConvertFrom-Json
  $validProcesses = @()
  foreach ($process in $processes) {
    $wrapperMatches = Test-StackWrapperProcessMatches -ProcessId $process.pid -WorkingDirectory $process.workingDirectory -RunnerScriptPath $runnerScript
    if ($wrapperMatches) {
      $validProcesses += $process
      Write-Output ('process ' + $process.name + ': running pid=' + $process.pid)
      continue
    }

    $portOwner = Get-PortOwner -Port $process.port
    $knownProcess = $knownProcesses | Where-Object { $_.Name -eq $process.name } | Select-Object -First 1
    if ($knownProcess -and (Test-PortOwnerMatchesProcess -ProcessDefinition $knownProcess -PortOwner $portOwner)) {
      Write-Output ('process ' + $process.name + ': wrapper-stale pid=' + $process.pid + ', active-port-owner pid=' + $portOwner.pid + ' name=' + $portOwner.name)
    } else {
      Write-Output ('process ' + $process.name + ': stopped pid=' + $process.pid)
    }
  }

  Save-ValidProcessManifest -Processes $validProcesses
} else {
  Write-Output 'pidFile: missing'
  foreach ($process in $knownProcesses) {
    if (Test-Path $process.LogFile) {
      $portOwner = Get-PortOwner -Port $process.Port
      if ($portOwner -and (Test-PortOwnerMatchesProcess -ProcessDefinition $process -PortOwner $portOwner)) {
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
  $psql = Join-Path $pgBin 'psql.exe'
  if (Test-Path $pgCtl) {
    if (Test-PostgresClusterReady -PgCtlPath $pgCtl -PsqlPath $psql -DataDir $dataDir -Port 5433) {
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
  if ($_.Exception.Response) {
    $statusCode = [int]$_.Exception.Response.StatusCode
    if ($statusCode -eq 403) {
      Write-Output 'api: reachable, admin access currently restricted'
    } else {
      Write-Output ('api: reachable, login check returned status=' + $statusCode)
    }
  } else {
    Write-Output 'api: down'
  }
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