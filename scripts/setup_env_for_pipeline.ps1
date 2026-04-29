# setup_env_for_pipeline.ps1
# Sets required environment variables for orchestrator/automation pipeline verification (Windows PowerShell)

$env:ALERTMANAGER_URL = "https://your-alertmanager-url"
$env:PUSHGATEWAY_URL = "https://your-pushgateway-url"
$env:LAUNCHDARKLY_API_TOKEN = "your-launchdarkly-token"
Write-Host "[INFO] Environment variables set for pipeline verification."

# Optionally, run the verification script immediately:
# bash ./scripts/verify_full_pipeline.sh
