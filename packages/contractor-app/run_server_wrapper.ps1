param([int]$Port = 3001)
Set-Location "C:\Users\1hans\tfx-hub\scripts"
$env:PORT = $Port
if (Test-Path pnpm-lock.yaml) { Write-Host 'pnpm lock found; skipping auto-install' }
# Start server and log output
node server.js 2>&1 | Tee-Object -FilePath "C:\Users\1hans\tfx-hub\scripts\server.log"
