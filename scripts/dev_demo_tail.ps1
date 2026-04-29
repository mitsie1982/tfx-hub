# dev_demo_tail.ps1 - tails demo logs for developer
Write-Host 'Developer log tail started. Press Ctrl+C to stop.'
Get-ChildItem -Path 'C:\Users\1hans\tfx-hub\artifacts\demo-logs' -Filter '*_launch_*.log' | Sort-Object LastWriteTime | ForEach-Object {
  Write-Host '--- Tailing' $_.FullName
  Get-Content -Path $_.FullName -Wait -Tail 200
}
