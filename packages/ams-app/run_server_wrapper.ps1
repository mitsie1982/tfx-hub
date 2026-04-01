# run_server_wrapper.ps1
param([int]$Port = 3002)
Set-Location $PSScriptRoot
$env:PORT = $Port
# optional: install deps if needed (uncomment if desired)
# if (Test-Path pnpm-lock.yaml) { pnpm install --silent }
# elseif (Test-Path package-lock.json) { npm install --silent }
node server.js 2>&1 | Tee-Object -FilePath "$PSScriptRoot\server.log"
