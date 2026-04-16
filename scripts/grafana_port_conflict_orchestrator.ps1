<#
  Orchestrator for diagnosing port 3000 conflicts and applying fixes.
  Implements steps 1-6:
    1) Diagnose process on port 3000
    2) Stop Grafana temporarily (if detected)
    3) Move Grafana to another port by editing grafana.ini or env var
    4) Change Customer demo port as fallback
    5) Create Grafana snapshot (optional)
    6) Verify and optionally start presentation orchestrator

  Usage examples:
    # Diagnose and fallback to changing Customer port to 3004
    .\grafana_port_conflict_orchestrator.ps1

    # Move Grafana to port 3005 (requires admin and grafana.ini path)
    .\grafana_port_conflict_orchestrator.ps1 -GrafanaIniPath 'C:\Program Files\GrafanaLabs\grafana\conf\grafana.ini' -GrafanaNewPort 3005

    # Create snapshot and update Customer shortcut
    .\grafana_port_conflict_orchestrator.ps1 -CreateSnapshot -GrafanaApiUrl 'http://grafana.local:3000' -GrafanaApiKey 'xxxx' -GrafanaDashboardUrl 'http://grafana.local:3000/d/UID/dashboard-name'
#>

param(
  [int]$TargetPort = 3000,
  [int]$CustomerFallbackPort = 3004,
  [string]$GrafanaIniPath = '',
  [int]$GrafanaNewPort = 3005,
  [switch]$StopGrafanaIfFound,
  [switch]$MoveGrafanaIfFound,
  [switch]$ChangeCustomerPortIfBlocked = $true,
  [switch]$CreateSnapshot,
  [string]$GrafanaApiUrl = '',
  [string]$GrafanaApiKey = '',
  [string]$GrafanaDashboardUrl = '',
  [switch]$StartPresentationOrchestrator
)

$ErrorActionPreference = 'Stop'
$logDir = Join-Path (Get-Location) 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir "grafana_port_fix_$(Get-Date -Format yyyyMMddTHHmmss).log"

function Log {
  param([string]$msg)
  $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') - $msg"
  Write-Host $line
  $line | Out-File -FilePath $logFile -Append -Encoding UTF8
}

Log "Starting orchestrator. TargetPort=$TargetPort CustomerFallbackPort=$CustomerFallbackPort"

# Step 1: Diagnose process using TargetPort
Log "Diagnosing process listening on port $TargetPort"
$net = Get-NetTCPConnection -LocalPort $TargetPort -ErrorAction SilentlyContinue
if (-not $net) {
  Log "No process listening on port $TargetPort. Nothing to fix."
  $listenerPid = $null
} else {
  $listenerPid = $net.OwningProcess
  Log "Found listener PID $listenerPid on port $TargetPort"
  try {
    $proc = Get-Process -Id $listenerPid -ErrorAction Stop
    Log "Process: Id=$($proc.Id) Name=$($proc.ProcessName) Path=$($proc.Path)"
  } catch {
    Log ("Could not retrieve process details for PID {0}: {1}" -f $listenerPid, $_.Exception.Message)
    $proc = $null
  }
}

# Helper to stop a service by name if present
function Stop-ServiceIfExists {
  param([string]$svcName)
  try {
    $svc = Get-Service -Name $svcName -ErrorAction SilentlyContinue
    if ($svc) {
      if ($svc.Status -ne 'Stopped') {
        Log "Stopping service $svcName"
        Stop-Service -Name $svcName -Force -ErrorAction Stop
        Start-Sleep -Seconds 2
        Log "Service $svcName stopped"
        return $true
      } else {
        Log "Service $svcName already stopped"
        return $true
      }
    } else {
      Log "Service $svcName not found"
      return $false
    }
  } catch {
    Log ("Failed to stop service {0}: {1}" -f $svcName, $_.Exception.Message)
    return $false
  }
}

# Step 2: If Grafana is the culprit, optionally stop it
$grafanaDetected = $false
if ($proc) {
  $procName = $proc.ProcessName.ToLower()
  if ($procName -like '*grafana*' -or ($proc.Path -and $proc.Path.ToLower() -like '*grafana*')) {
    $grafanaDetected = $true
    Log "Grafana process detected on port $TargetPort"
    if ($StopGrafanaIfFound) {
      # Try common service name 'grafana'
      $stopped = Stop-ServiceIfExists -svcName 'grafana'
      if (-not $stopped) {
        Log "Attempting to Stop-Process PID $listenerPid"
        try { Stop-Process -Id $listenerPid -Force -ErrorAction Stop; Log "Killed PID $listenerPid" } catch { Log ("Failed to kill PID {0}: {1}" -f $listenerPid, $_.Exception.Message) }
      }
    } else {
      Log "StopGrafanaIfFound not set. Not stopping Grafana automatically."
    }
  } else {
    Log "Process on port $TargetPort is not Grafana (ProcessName=$($proc.ProcessName))"
  }
}

# Step 3: Move Grafana to another port by editing grafana.ini or setting env var
function Update-GrafanaPortInIni {
  param([string]$iniPath, [int]$newPort)
  if (-not (Test-Path $iniPath)) { Log "grafana.ini not found at $iniPath"; return $false }
  try {
    $content = Get-Content -Path $iniPath -Raw -ErrorAction Stop
    if ($content -notmatch '`n\[server\]') {
      # append section
      $content += "`n[server]`nhttp_port = $newPort`n"
    } else {
      # replace or add http_port under [server]
      $content = [regex]::Replace($content, '(?ms)(`n\[server\]`n.*?)(`r?`nhttp_port\s*=\s*\d+)?', { param($m) 
        $block = $m.Groups[1].Value
        if ($m.Groups[2].Success) {
          return $block -replace 'http_port\s*=\s*\d+', "http_port = $newPort"
        } else {
          return $block + "`nhttp_port = $newPort"
        }
      })
    }
    $backup = "$iniPath.bak.$(Get-Date -Format yyyyMMddTHHmmss)"
    Copy-Item -Path $iniPath -Destination $backup -Force
    $content | Out-File -FilePath $iniPath -Encoding UTF8 -Force
    Log "Updated grafana.ini at $iniPath and backed up original to $backup"
    return $true
  } catch {
    Log "Failed to update grafana.ini: $($_.Exception.Message)"
    return $false
  }
}

if ($grafanaDetected -and $MoveGrafanaIfFound -and $GrafanaIniPath) {
  Log "Attempting to move Grafana to port $GrafanaNewPort by editing $GrafanaIniPath"
  $ok = Update-GrafanaPortInIni -iniPath $GrafanaIniPath -newPort $GrafanaNewPort
  if ($ok) {
    Log "Restarting Grafana service"
    try { Restart-Service -Name grafana -Force -ErrorAction Stop; Log "Grafana service restarted" } catch { Log "Restart failed: $($_.Exception.Message)" }
  } else {
    Log "Could not update grafana.ini; skipping restart"
  }
} elseif ($grafanaDetected -and $MoveGrafanaIfFound -and -not $GrafanaIniPath) {
  Log "MoveGrafanaIfFound requested but GrafanaIniPath not provided. Skipping ini edit."
}

# Step 4: If Grafana still blocks TargetPort and ChangeCustomerPortIfBlocked is true, change Customer demo port
function IsPortInUse {
  param([int]$port)
  return [bool](Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue)
}

if (IsPortInUse -port $TargetPort) {
  Log "Port $TargetPort still in use after attempted fixes"
  if ($ChangeCustomerPortIfBlocked) {
    Log "Applying fallback: change Customer demo to port $CustomerFallbackPort"
    # Update packages/customer-app/server.js to use fallback port if present
    $custServer = Join-Path (Join-Path (Get-Location) 'packages\customer-app') 'server.js'
    if (Test-Path $custServer) {
      try {
        $content = Get-Content -Path $custServer -Raw -ErrorAction Stop
        # Replace default port expression process.env.PORT || 3000 with fallback
        $newContent = $content -replace 'process.env.PORT \|\| \d+', "process.env.PORT || $CustomerFallbackPort"
        if ($newContent -ne $content) {
          Copy-Item -Path $custServer -Destination "$custServer.bak.$(Get-Date -Format yyyyMMddTHHmmss)" -Force
          $newContent | Out-File -FilePath $custServer -Encoding UTF8 -Force
          Log "Patched $custServer to use fallback port $CustomerFallbackPort"
        } else {
          Log "No port pattern found in $custServer; will rely on setting PORT env var when launching"
        }
      } catch {
        Log ("Failed to patch {0}: {1}" -f $custServer, $_.Exception.Message)
      }
    } else {
      Log "Customer server.js not found at $custServer; will rely on launching with PORT env var"
    }

    # Update the current customer build shortcut if it exists; fall back to legacy shortcut names.
    try {
      $desktop = [Environment]::GetFolderPath('Desktop')
      $linkCandidates = @(
        (Join-Path $desktop 'Build Customer Client.lnk'),
        (Join-Path $desktop 'Build Customer.lnk'),
        (Join-Path $desktop 'Demo Customer Client.lnk'),
        (Join-Path $desktop 'Demo Customer.lnk')
      )
      $link = $linkCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
      if (Test-Path $link) {
        $shell = New-Object -ComObject WScript.Shell
        $sc = $shell.CreateShortcut($link)
        # Append environment variable to arguments so launcher uses new port
        if ($sc.Arguments -notmatch 'PORT=') {
          $sc.Arguments = " -NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$($sc.TargetPath)`""
        }
        # We cannot set env var inside .lnk reliably; instead create a small wrapper script
        $wrapper = Join-Path (Join-Path (Get-Location) 'scripts') 'launch_customer_with_port.ps1'
        $wrapperContent = @"
`$env:PORT = '$CustomerFallbackPort'
& `"$((Join-Path (Get-Location) 'scripts\launch_customer_presentation.ps1'))`"
"@
        $wrapperContent | Out-File -FilePath $wrapper -Encoding UTF8 -Force
        $sc.TargetPath = (Get-Command powershell.exe).Source
        $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$wrapper`""
        $sc.Save()
        Log "Updated customer browser shortcut to launch wrapper that sets PORT=$CustomerFallbackPort"
      } else {
        Log "Customer browser shortcut not found on Desktop; skipping shortcut update"
      }
    } catch {
      Log "Failed to update Desktop shortcut: $($_.Exception.Message)"
    }
  } else {
    Log "ChangeCustomerPortIfBlocked not enabled; leaving port conflict as-is"
  }
} else {
  Log "Port $TargetPort is free"
}

# Step 5: Create Grafana snapshot if requested
if ($CreateSnapshot) {
  if (-not $GrafanaApiUrl -or -not $GrafanaApiKey -or -not $GrafanaDashboardUrl) {
    Log "CreateSnapshot requested but GrafanaApiUrl, GrafanaApiKey, or GrafanaDashboardUrl missing. Skipping snapshot."
  } else {
    try {
      Log "Attempting to create Grafana snapshot for $GrafanaDashboardUrl"
      # Extract UID from dashboard URL /d/:uid/...
      $uid = ($GrafanaDashboardUrl -split '/d/')[1] -split '/' | Select-Object -First 1
      if (-not $uid) { throw "Cannot extract dashboard UID from $GrafanaDashboardUrl" }
      $dashResp = Invoke-RestMethod -Uri "$GrafanaApiUrl/api/dashboards/uid/$uid" -Headers @{ Authorization = "Bearer $GrafanaApiKey" } -Method Get -ErrorAction Stop
      $dashboardJson = $dashResp.dashboard
      $payload = @{ dashboard = $dashboardJson; name = "Build snapshot $(Get-Date -Format yyyyMMddTHHmmss)"; expires = 3600 } | ConvertTo-Json -Depth 20
      $snapResp = Invoke-RestMethod -Uri "$GrafanaApiUrl/api/snapshots" -Headers @{ Authorization = "Bearer $GrafanaApiKey"; 'Content-Type' = 'application/json' } -Method Post -Body $payload -ErrorAction Stop
      if ($snapResp.url) {
        Log "Snapshot created: $($snapResp.url)"
        # Optionally update the customer browser shortcut to open the snapshot.
        try {
          $desktop = [Environment]::GetFolderPath('Desktop')
          $linkCandidates = @(
            (Join-Path $desktop 'Build Customer Client.lnk'),
            (Join-Path $desktop 'Build Customer.lnk'),
            (Join-Path $desktop 'Demo Customer Client.lnk'),
            (Join-Path $desktop 'Demo Customer.lnk')
          )
          $link = $linkCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
          if (Test-Path $link) {
            $shell = New-Object -ComObject WScript.Shell
            $sc = $shell.CreateShortcut($link)
            $sc.TargetPath = (Get-Command powershell.exe).Source
            $wrapper = Join-Path (Join-Path (Get-Location) 'scripts') 'launch_customer_snapshot.ps1'
            $wrapperContent = @"
Start-Process `"$($snapResp.url)`"
"@
            $wrapperContent | Out-File -FilePath $wrapper -Encoding UTF8 -Force
            $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$wrapper`""
            $sc.Save()
            Log "Updated customer browser shortcut to open snapshot URL"
          } else {
            Log "Customer browser shortcut not found; snapshot URL: $($snapResp.url)"
          }
        } catch {
          Log "Failed to update shortcut with snapshot: $($_.Exception.Message)"
        }
      } else {
        Log "Snapshot API returned unexpected response: $($snapResp | ConvertTo-Json -Depth 3)"
      }
    } catch {
      Log "Snapshot creation failed: $($_.Exception.Message)"
    }
  }
}

# Step 6: Verification and optional presentation orchestrator start
Log "Verifying Customer demo availability"
$customerPortToTest = if (IsPortInUse -port $TargetPort) { $CustomerFallbackPort } else { $TargetPort }
try {
  $url = "http://localhost:$customerPortToTest/api/status"
  $ok = $false
  try {
    $resp = Invoke-RestMethod -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    $ok = $true
    Log ("Customer API responded on port {0}: {1}" -f $customerPortToTest, ($resp | ConvertTo-Json -Depth 2))
  } catch {
    Log ("Customer API did not respond on port {0}: {1}" -f $customerPortToTest, $_.Exception.Message)
  }
} catch {
  Log "Verification error: $($_.Exception.Message)"
}

if ($StartPresentationOrchestrator) {
  $orchestrator = Join-Path (Join-Path (Get-Location) 'scripts') 'present_all_demos_and_arrange.ps1'
  if (Test-Path $orchestrator) {
    Log "Starting presentation orchestrator: $orchestrator"
    Start-Process -FilePath (Get-Command powershell.exe).Source -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$orchestrator`"" -WindowStyle Normal
  } else {
    Log "Presentation orchestrator not found at $orchestrator"
  }
}

Log "Orchestrator finished. Log file: $logFile"