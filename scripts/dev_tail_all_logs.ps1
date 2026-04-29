Write-Host 'Tailing demo logs. Press Ctrl+C to stop.'
Get-ChildItem -Path 'C:\Users\1hans\tfx-hub\artifacts\demo-logs' -Filter '*_server_*.log' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime | ForEach-Object {
  Write-Host '--- Tailing' \.FullName
  Get-Content -Path \.FullName -Wait -Tail 200
}
