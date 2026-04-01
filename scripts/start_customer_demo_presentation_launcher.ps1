# Presentation launcher updated for kiosk app window
param([string]$Mode = 'dev', [int]$PollTimeout = 60, [int]$PollInterval = 2)
$ErrorActionPreference = 'Continue'
Write-Host "Launcher starting: C:\Users\1hans\tfx-hub\scripts\start_customer_demo.ps1 (Mode=$Mode)"
Write-Host "Log file: C:\Users\1hans\tfx-hub\artifacts\demo-logs\start_customer_demo_launch_20260401T133659.log"
Write-Host "Working directory: C:\Users\1hans\tfx-hub\scripts"

# Start the target start script in a new PowerShell window so it runs independently
try {
  Start-Process -FilePath powershell -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Normal','-Command', "& { & `"C:\Users\1hans\tfx-hub\scripts\start_customer_demo.ps1`" -Mode $Mode }" -WorkingDirectory 'C:\Users\1hans\tfx-hub\scripts' -WindowStyle Normal -PassThru | Out-Null
} catch {
  Write-Error "Failed to start target script: $($_.Exception.Message)"
}

# Poll for server on common ports
function Test-HttpUrl {
  param([string]$u)
  try {
    $null = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

$candidates = @('http://localhost:3000','http://localhost:8080','http://localhost:19006','http://localhost:8081','http://localhost:19000')
$deadline = (Get-Date).AddSeconds($PollTimeout)
$detectedUrl = $null
while ((Get-Date) -lt $deadline) {
  foreach ($u in $candidates) {
    if (Test-HttpUrl -u $u) {
      $detectedUrl = $u
      break
    }
  }
  if ($detectedUrl) { break }
  Start-Sleep -Seconds $PollInterval
}

if ($detectedUrl) {
  Write-Host "Detected server at $detectedUrl. Opening presentation window..."
  $url = $detectedUrl

  # Browser app mode if available
  $browserInfo = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
  if (-not $browserInfo) {
    try { $browserInfo = (Get-Command msedge.exe -ErrorAction SilentlyContinue).Source } catch {}
  }
  if (-not $browserInfo) {
    try { $browserInfo = (Get-Command chrome.exe -ErrorAction SilentlyContinue).Source } catch {}
  }

  if ($browserInfo) {
    Start-Process -FilePath $browserInfo -ArgumentList "--app=`"$url`"" -WindowStyle Normal
  } else {
    Start-Process $url
  }
} else {
  Write-Warning "No local HTTP server detected within $PollTimeout seconds. Opening local presentation page."
  $presentHtml = Join-Path 'C:\Users\1hans\tfx-hub\scripts' 'demo_presentation.html'
  $html = @'
<!doctype html>
<html>
<head><meta charset='utf-8'/><title>Demo Presentation</title></head>
<body style='font-family:Segoe UI,Arial;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f7f9fc'>
  <div style='padding:28px;border-radius:8px;background:white;box-shadow:0 6px 18px rgba(0,0,0,0.08);max-width:900px;text-align:center'>
    <h1>Demo Presentation</h1>
    <p>Application: start_customer_demo</p>
    <p>Status: Placeholder or no server detected</p>
    <p>Started at: __STARTED_AT__</p>
  </div>
</body>
</html>
'@
  $html = $html -replace '__STARTED_AT__', (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
  $html | Out-File -FilePath $presentHtml -Encoding UTF8 -Force
  Start-Process $presentHtml
}

Write-Host "Launcher will keep this console open for logs. Press Enter to close."
Read-Host
