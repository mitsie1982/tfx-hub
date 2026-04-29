# scripts/set_env_vars_example.ps1
# Example: Set environment variables for notifications and cloud CLIs

$env:SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/REPLACE_ME"
$env:TEAMS_WEBHOOK_URL = "https://outlook.office.com/webhook/REPLACE_ME"
$env:AZURE_SUBSCRIPTION = "your-azure-subscription-id"
$env:AWS_PROFILE = "your-aws-profile-name"

Write-Host "Environment variables set for notifications and cloud CLIs."
Write-Host "SLACK_WEBHOOK_URL: $env:SLACK_WEBHOOK_URL"
Write-Host "TEAMS_WEBHOOK_URL: $env:TEAMS_WEBHOOK_URL"
Write-Host "AZURE_SUBSCRIPTION: $env:AZURE_SUBSCRIPTION"
Write-Host "AWS_PROFILE: $env:AWS_PROFILE"
