# Auto-generated wrapper: launch_customer_wrapper.ps1
$env:PORT = '3001'
Set-Location "C:\Users\1hans\tfx-hub\apps\customer-app"
$logDir = Join-Path "C:\Users\1hans\tfx-hub" 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

if (Test-Path "C:\Users\1hans\tfx-hub\scripts\launch_customer_wrapper_presentation.ps1") {
  & "C:\Users\1hans\tfx-hub\scripts\launch_customer_wrapper_presentation.ps1"
} elseif (Test-Path 'server.js') {
  $logFile = Join-Path $logDir ('{0}_server_{1}.log' -f (Split-Path "C:\Users\1hans\tfx-hub\apps\customer-app" -Leaf, (Get-Date -Format yyyyMMddTHHmmss)))
  node server.js 2>&1 | Tee-Object -FilePath $logFile
} else {
  Write-Host 'No launcher or server.js found in' "C:\Users\1hans\tfx-hub\apps\customer-app"
}
try {
    # Main script logic
    if (Test-Path "C:\Users\1hans\tfx-hub\scripts\launch_customer_wrapper_presentation.ps1") {
      & "C:\Users\1hans\tfx-hub\scripts\launch_customer_wrapper_presentation.ps1"
    } elseif (Test-Path 'server.js') {
      $logFile = Join-Path $logDir ('{0}_server_{1}.log' -f (Split-Path "C:\Users\1hans\tfx-hub\apps\customer-app" -Leaf, (Get-Date -Format yyyyMMddTHHmmss)))
      node server.js 2>&1 | Tee-Object -FilePath $logFile
    } else {
      Write-Host 'No launcher or server.js found in' "C:\Users\1hans\tfx-hub\apps\customer-app"
    }
} catch {
    Write-Host "\n--- ERROR ---"
    Write-Error $_
}
Read-Host 'Press Enter to close'
Start-Sleep -Seconds 999
