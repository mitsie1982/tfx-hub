# scripts/audited_runner.ps1
param(
  [string]$TokenFile = \"out/agent-42.token\",
  [string]$ActionFile = \"demo/action.json\"
)
if (!(Test-Path $TokenFile)) {
  Write-Host \"Token missing\" -ForegroundColor Red
  exit 2
}
$action = Get-Content $ActionFile | ConvertFrom-Json
if (-not $action.approved) {
  Write-Host \"Action not approved\" -ForegroundColor Yellow
  exit 3
}
$token = Get-Content $TokenFile -Raw
Write-Host \"Simulating external call with token: $($token.Substring(0,8))...\"
$trace = @{ ts = [math]::Round((Get-Date -UFormat %s)); agent = 'agent-42'; action = 'export_customer_profile'; status = 'success' }
$traceJson = $trace | ConvertTo-Json -Compress
$outFile = \"out/traces.log\"
if (!(Test-Path \"out\")) { New-Item -ItemType Directory -Path \"out\" | Out-Null }
Add-Content -Path $outFile -Value $traceJson
Write-Host \"Trace written to $outFile\"
Write-Host \"Execution simulated and traced.\"
