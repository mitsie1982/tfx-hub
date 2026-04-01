$AppPath = Join-Path (Get-Location) 'packages\customer-app'
$env:PORT = '3004'
Set-Location $AppPath
# Start node server (visible window) and log to artifacts
$logDir = Join-Path (Get-Location) 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir ("customer_server_{0}.log" -f (Get-Date -Format yyyyMMddTHHmmss))
node server.js 2>&1 | Tee-Object -FilePath $logFile
