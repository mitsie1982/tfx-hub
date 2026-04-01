# Auto-generated wrapper: launch_members_wrapper.ps1
$env:PORT = '3003'
Set-Location "C:\Users\1hans\tfx-hub\packages\members-app"
# Ensure log dir
$logDir = Join-Path "C:\Users\1hans\tfx-hub" 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

# Prefer existing repo launcher if present
if (Test-Path "C:\Users\1hans\tfx-hub\scripts\launch_members_wrapper_presentation.ps1") {
  & "C:\Users\1hans\tfx-hub\scripts\launch_members_wrapper_presentation.ps1"
} elseif (Test-Path 'server.js') {
  $logFile = Join-Path $logDir ('{0}_server_{1}.log' -f (Split-Path "C:\Users\1hans\tfx-hub\packages\members-app" -Leaf, (Get-Date -Format yyyyMMddTHHmmss)))
  node server.js 2>&1 | Tee-Object -FilePath $logFile
} else {
  Write-Host 'No launcher or server.js found in' "C:\Users\1hans\tfx-hub\packages\members-app"
  Read-Host 'Press Enter to close'
}
