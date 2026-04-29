# hybrid_verify_full_pipeline.ps1
# Sets env vars and launches Bash verification for cross-shell compatibility

$env:ALERTMANAGER_URL = "https://your-alertmanager-url"
$env:PUSHGATEWAY_URL = "https://your-pushgateway-url"
$env:LAUNCHDARKLY_API_TOKEN = "your-launchdarkly-token"
$env:PROMETHEUS_URL = "http://localhost:9090"

# Launch Bash verification script with env vars
Write-Host "[INFO] Running Bash verification with env vars..."
$bashCmd = "ALERTMANAGER_URL='$env:ALERTMANAGER_URL' PUSHGATEWAY_URL='$env:PUSHGATEWAY_URL' LAUNCHDARKLY_API_TOKEN='$env:LAUNCHDARKLY_API_TOKEN' PROMETHEUS_URL='$env:PROMETHEUS_URL' bash ./scripts/verify_full_pipeline.sh"
Invoke-Expression $bashCmd
