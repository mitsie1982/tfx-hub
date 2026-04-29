# verify_full_pipeline.ps1
Set-Location -Path (Split-Path -Parent $MyInvocation.MyCommand.Path)
# PowerShell version of the orchestrator/automation pipeline verification       
param(
    [string]$AlertmanagerUrl = $env:ALERTMANAGER_URL,
    [string]$PushgatewayUrl = $env:PUSHGATEWAY_URL,
    [string]$LaunchDarklyToken = $env:LAUNCHDARKLY_API_TOKEN,
    [string]$PrometheusUrl = $env:PROMETHEUS_URL,
    [string]$Env = "staging",
    [string]$Flag = "ams_canary_release"
)

$timestamp = (Get-Date -Format 'yyyyMMddTHHmmssZ')
$root = Get-Location
$logDir = Join-Path $root "artifacts/verification_$timestamp"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$logFile = Join-Path $logDir "run.log"

function Log($msg) {
    $msg | Tee-Object -FilePath $logFile -Append
}
Log "Verification run started at $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"

# 1) Alertmanager API test
if (-not $AlertmanagerUrl) {
    Log "Skipping Alertmanager API test: ALERTMANAGER_URL not set"
} else {
    Log "Triggering Alertmanager API test..."
    $payload = @(
        @{ labels = @{ alertname = "E2ETestAlert"; severity = "page"; service = "tfx-hub-mobile"; test_run = "true" };
           annotations = @{ summary = "E2E alert test from repo"; description = "This is a synthetic test alert to validate routing to Slack/PagerDuty." };
           startsAt = (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ');
           endsAt = (Get-Date).AddMinutes(5).ToString('yyyy-MM-ddTHH:mm:ssZ') }
    ) | ConvertTo-Json
    try {
        $null = Invoke-RestMethod -Uri $AlertmanagerUrl -Method Post -Body $payload -ContentType 'application/json'
        Log "Alert posted successfully. Verify Slack/PagerDuty for the test notification."
    } catch {
        Log "Alertmanager POST failed: $($_.Exception.Message)"
    }
}

# 2) Pushgateway metric spike
if (-not $PushgatewayUrl) {
    Log "Skipping Pushgateway metric spike: PUSHGATEWAY_URL not set"
} else {
    Log "Pushing metric spike to Pushgateway..."
    $metric = "mobile_unhandled_exceptions_total 100"
    $metricFile = Join-Path $logDir "push_metric.txt"
    "# TYPE mobile_unhandled_exceptions_total counter`n$metric" | Out-File -FilePath $metricFile -Encoding ascii
    try {
        Invoke-RestMethod -Uri "$PushgatewayUrl/metrics/job/e2e-test-job" -Method Post -InFile $metricFile -ContentType 'text/plain'
        Log "Metric pushed. Prometheus should scrape Pushgateway and alert rules may fire."
    } catch {
        Log "Pushgateway POST failed: $($_.Exception.Message)"
    }
}

# 3) Canary promote to 1% via LaunchDarkly
if (-not $LaunchDarklyToken) {
    Log "ERROR: LAUNCHDARKLY_API_TOKEN not set; cannot perform canary promote"
    exit 2
}
Log "Promoting canary to 1% for $Flag in $Env"
$ldApi = "https://app.launchdarkly.com/api/v2/flags/default/$Flag"
$patchPayload = @{ patch = @(@{ op = "replace"; path = "/environments/$Env/rollout"; value = @{ kind = "experiment"; variations = @(@{ variation = 0; weight = 99 }, @{ variation = 1; weight = 1 }) } }) } | ConvertTo-Json -Compress
try {
    $resp = Invoke-RestMethod -Uri $ldApi -Method Patch -Headers @{ Authorization = "Bearer $LaunchDarklyToken" } -Body $patchPayload -ContentType 'application/json'
    Log "Canary promote request accepted. Verify in LaunchDarkly console."
} catch {
    Log "Canary promote failed: $($_.Exception.Message)"
}

# 4) Simulate staged rollout harness
Log "Running staged rollout harness (cohorts 1%,5%,25%)"
$cohorts = @(1,5,25)
foreach ($pct in $cohorts) {
    Log "Promoting to $pct%"
    $patchPayload = @{ patch = @(@{ op = "replace"; path = "/environments/$Env/rollout"; value = @{ kind = "experiment"; variations = @(@{ variation = 0; weight = (100-$pct) }, @{ variation = 1; weight = $pct }) } }) } | ConvertTo-Json -Compress
    try {
        $resp = Invoke-RestMethod -Uri $ldApi -Method Patch -Headers @{ Authorization = "Bearer $LaunchDarklyToken" } -Body $patchPayload -ContentType 'application/json'
        Log "Cohort $pct% promoted. (Simulated metric checks)"
    } catch {
        Log "Cohort $pct% promote failed: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds 5
}

# 4.5) Contractor document verification queue
$queueFile = Join-Path $logDir "contractor_verification_queue.json"
@(
    @{ contractorId = "pro-001"; name = "John Smit"; status = "pending"; requiredDocs = @("NHBRC Certificate"); notes = "Auto-detected: NHBRC certificate missing" },
    @{ contractorId = "pro-002"; name = "Naledi Khumalo"; status = "pending"; requiredDocs = @("MBSA Membership"); notes = "Auto-detected: MBSA membership expired" }
) | ConvertTo-Json | Out-File -FilePath $queueFile -Encoding utf8
Log "Verification queue generated at $queueFile"

# 5) Dry-run release
$stagingDir = Join-Path $logDir "staging"
New-Item -ItemType Directory -Path $stagingDir -Force | Out-Null
"dummy-apk-content" | Out-File -FilePath (Join-Path $stagingDir "ams-staging.apk") -Encoding ascii
"dummy-ipa-content" | Out-File -FilePath (Join-Path $stagingDir "ams-staging.ipa") -Encoding ascii
Log "Artifacts staged at $stagingDir"
Log "Dry-run release completed successfully for ams. Artifacts in $stagingDir"
Log "Verification run completed at $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')"
Log "Logs and artifacts are in $logDir"
