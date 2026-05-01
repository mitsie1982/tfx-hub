#!/usr/bin/env pwsh
# scripts/orchestrator_runner.ps1
param(
  [string]$Profile = 'dev',
  [string]$Workflow = 'workflows/example.yaml',
  [switch]$DryRun,
  [int]$GlobalRetry = 2
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Log($m) { $ts = (Get-Date).ToString('s'); "$ts`t$m" | Out-File -FilePath out/orchestrator.log -Append -Encoding utf8; Write-Host $m }

# Load profile config and secrets helper
. ./configs/profile_loader.ps1
. ./scripts/secrets_helper.ps1

$profile = Get-ProfileConfig -Name $Profile
if (-not $profile) { Log "Profile $Profile not found"; exit 2 }

# Fetch runtime secrets for profile (Azure Key Vault or AWS Secrets Manager)
function Resolve-SecretsForProfile($profile) {
  if ($profile.secrets.vault -eq 'azure') {
    return Get-SecretFromAzureKeyVault -VaultName $profile.secrets.vaultName -SecretNames $profile.secrets.names
  } elseif ($profile.secrets.vault -eq 'aws') {
    return Get-SecretFromAWSSecretsManager -SecretNames $profile.secrets.names
  } else {
    return @{}
  }
}

$secrets = Resolve-SecretsForProfile $profile

# Simple YAML parser via python
function Parse-Workflow($path) {
  if (-not (Test-Path $path)) { throw "Workflow not found: $path" }
  if (Get-Command python3 -ErrorAction SilentlyContinue) {
    $py = @'
import sys, yaml, json
p=sys.argv[1]
with open(p) as f:
  wf=yaml.safe_load(f)
print(json.dumps(wf))
'@
    $tmp = [System.IO.Path]::GetTempFileName()
    $py | Out-File -FilePath $tmp -Encoding utf8
    $out = & python3 $tmp $path
    Remove-Item $tmp -Force
    return ConvertFrom-Json $out
  } else {
    throw 'Python3 required to parse YAML workflows'
  }
}

# Retry/backoff helper
function Invoke-WithRetry([ScriptBlock]$sb, [int]$retries=2, [int]$baseDelay=2) {
  for ($i=0; $i -le $retries; $i++) {
    try {
      return & $sb
    } catch {
      if ($i -lt $retries) {
        $delay = [math]::Pow(2, $i) * $baseDelay
        Log "Retry $i failed; sleeping $delay seconds"
        Start-Sleep -Seconds $delay
      } else {
        throw
      }
    }
  }
}

# Rollback helper
function Trigger-Rollback([string]$profileName, [string]$reason) {
  Log "Triggering rollback for $profileName due to: $reason"
  # Run rollback steps defined in profile or workflow
  if ($profile.rollbackSteps) {
    foreach ($step in $profile.rollbackSteps) {
      try {
        Log "Rollback step: $step"
        Invoke-Expression $step
      } catch {
        Log "Rollback step failed: $($_.Exception.Message)"
      }
    }
  }
  # Notify
  & python3 scripts/notifier.py --channel failure --profile $profileName --message "Rollback executed for $profileName: $reason"
}

# Execute step with failure handling and optional rollback
function Execute-Step($step) {
  $name = $step.name
  Log "Executing step: $name target=$($step.target)"
  try {
    switch ($step.target) {
      'kubernetes' { Invoke-WithRetry { if ($DryRun) { Log "DRYRUN kubectl: $($step.command)" } else { & kubectl $step.command } } -retries ($step.retries ?? $GlobalRetry) }
      'docker-compose' { Invoke-WithRetry { if ($DryRun) { Log "DRYRUN docker-compose: $($step.command)" } else { & docker-compose $step.command } } -retries ($step.retries ?? $GlobalRetry) }
      'azure-cli' { Invoke-WithRetry { if ($DryRun) { Log "DRYRUN az: $($step.command)" } else { & az $step.command } } -retries ($step.retries ?? $GlobalRetry) }
      'aws-cli' { Invoke-WithRetry { if ($DryRun) { Log "DRYRUN aws: $($step.command)" } else { & aws $step.command } } -retries ($step.retries ?? $GlobalRetry) }
      default { Invoke-WithRetry { if ($DryRun) { Log "DRYRUN shell: $($step.command)" } else { Invoke-Expression $step.command } } -retries ($step.retries ?? $GlobalRetry) }
    }
  } catch {
    Log "Step failed: $($_.Exception.Message)"
    # Attempt fallback if defined
    if ($step.fallback) {
      try {
        Log "Running fallback for $name"
        Execute-Step $step.fallback
      } catch {
        Log "Fallback failed: $($_.Exception.Message)"
      }
    }
    # Trigger rollback and rethrow
    Trigger-Rollback $Profile "Step $name failed: $($_.Exception.Message)"
    throw
  }
}

# Main
$wf = Parse-Workflow $Workflow
$steps = $wf.steps
$executed = @{}
while ($executed.Count -lt $steps.Count) {
  $progress = $false
  foreach ($s in $steps) {
    if ($executed.ContainsKey($s.name)) { continue }
    $deps = $s.depends_on
    if (-not $deps -or ($deps | ForEach-Object { $executed.ContainsKey($_) } | Where-Object { $_ -eq $false } | Measure-Object).Count -eq 0) {
      Execute-Step $s
      $executed[$s.name] = $true
      $progress = $true
    }
  }
  if (-not $progress) { throw 'Dependency resolution stalled; possible circular dependency' }
}

Log 'Orchestrator run complete'
& python3 scripts/notifier.py --channel success --profile $Profile --message "Orchestrator run completed for $Profile"
