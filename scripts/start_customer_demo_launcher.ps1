# Launcher wrapper for start_customer_demo
param([string]$Mode = "dev")
Write-Host "Launcher starting: C:\Users\1hans\tfx-hub\scripts\start_customer_demo.ps1 (Mode=$Mode)"
Write-Host "Log: C:\Users\1hans\tfx-hub\artifacts\demo-logs\start_customer_demo_launch_20260401T131349.log"
try { & powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\1hans\tfx-hub\scripts\start_customer_demo.ps1" -Mode $Mode 2>&1 | Tee-Object -FilePath "C:\Users\1hans\tfx-hub\artifacts\demo-logs\start_customer_demo_launch_20260401T131349.log" } catch { Write-Error "Launcher failed: $($_.Exception.Message)" }
Write-Host "Done. Press Enter to close."; Read-Host
