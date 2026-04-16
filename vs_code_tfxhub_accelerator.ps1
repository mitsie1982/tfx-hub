<#
File: vs_code_tfxhub_accelerator.ps1
Purpose: Single consolidated accelerator to implement priority hardening and developer speedups for TFX Hub.
Run from project root in elevated VS Code:
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  .\vs_code_tfxhub_accelerator.ps1

WARNING: This script creates templates and helpers only. It does NOT create or store secrets.
Manual steps are noted in comments and final output.
Exit codes: 0 success, 1 fatal error, 2 partial failures.
#>

# ---------------- CONFIGURE ----------------
$ProjectRoot = (Get-Location).Path
$ScriptsDir = Join-Path $ProjectRoot "scripts"
$DevcontainerDir = Join-Path $ProjectRoot ".devcontainer"
$DockerDir = Join-Path $ProjectRoot "docker"
$TasksFile = Join-Path $ProjectRoot ".vscode\tasks.json"
$SampleDataDir = Join-Path $ProjectRoot "tests\sample_data"
$ScaffoldDir = Join-Path $ProjectRoot "scaffolds"
$LocalCIImage = "tfxhub-ci:local"
$LogDir = Join-Path $ProjectRoot "logs"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$LogFile = Join-Path $LogDir "accelerator_$Timestamp.log"
# -------------------------------------------

function Log([string]$m) {
    $line = "$(Get-Date -Format o)  $m"
    Write-Output $line
    Add-Content -Path $LogFile -Value $line
}

# Ensure required directories
if (-not (Test-Path $ProjectRoot)) { Write-Error "Run from project root."; exit 1 }
New-Item -ItemType Directory -Force -Path $ScriptsDir | Out-Null
New-Item -ItemType Directory -Force -Path $DevcontainerDir | Out-Null
New-Item -ItemType Directory -Force -Path $DockerDir | Out-Null
New-Item -ItemType Directory -Force -Path $SampleDataDir | Out-Null
New-Item -ItemType Directory -Force -Path $ScaffoldDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

Log "Starting VS Code TFX Hub Accelerator"

# ---------------- 1) Secrets loader (PowerShell) ----------------
$secretsLoaderPath = Join-Path $ScriptsDir "secrets_loader.ps1"
$secretsLoader = @"
# scripts/secrets_loader.ps1
# Unified secrets loader: env -> Vault -> Azure Key Vault -> Gitea API
function Get-SecretValue {
    param([string]\$Name)
    if (\$env:\$Name) { return \$env:\$Name }
    if (\$env:VAULT_ADDR -and \$env:VAULT_TOKEN) {
        try {
            \$out = & vault kv get -format=json secret/data/tfxhub/\$Name 2>$null
            if (\$LASTEXITCODE -eq 0 -and \$out) {
                \$j = ConvertFrom-Json \$out
                if (\$j.data -and \$j.data.data) {
                    if (\$j.data.data.value) { return \$j.data.data.value }
                    if (\$j.data.data.\$Name) { return \$j.data.data.\$Name }
                }
            }
        } catch {}
    }
    if (\$env:AZURE_KEYVAULT_NAME) {
        try {
            \$val = & az keyvault secret show --vault-name \$env:AZURE_KEYVAULT_NAME --name \$Name --query value -o tsv 2>$null
            if (\$LASTEXITCODE -eq 0 -and \$val) { return \$val.Trim() }
        } catch {}
    }
    if (\$env:GITEA_TOKEN -and \$env:GITEA_API_URL -and \$env:GITEA_REPO) {
        try {
            \$url = "\$env:GITEA_API_URL/repos/\$env:GITEA_REPO/actions/secrets/\$Name"
            \$resp = Invoke-RestMethod -Uri \$url -Headers @{ Authorization = "token \$env:GITEA_TOKEN" } -Method Get -ErrorAction SilentlyContinue
            if (\$resp -and \$resp.value) { return \$resp.value }
        } catch {}
    }
    Write-Error "Secret '\$Name' not found."
    return \$null
}
Export-ModuleMember -Function Get-SecretValue
"@
$secretsLoader | Out-File -FilePath $secretsLoaderPath -Encoding UTF8
Log "Wrote $secretsLoaderPath"

# ---------------- 2) Devcontainer manifest signing + approval PR helper ----------------
$devSignPath = Join-Path $ScriptsDir "devcontainer_sign.ps1"
$devSign = @"
# scripts/devcontainer_sign.ps1
param([string]\$PrivateKeyPath = './keys/devcontainer_sign_key.pem', [string]\$DevcontainerPath = '.devcontainer/devcontainer.json')
if (-not (Test-Path \$DevcontainerPath)) { Write-Error 'devcontainer.json not found'; exit 1 }
\$content = Get-Content -Raw -Path \$DevcontainerPath
\$sha = (New-Object -TypeName System.Security.Cryptography.SHA256Managed).ComputeHash([System.Text.Encoding]::UTF8.GetBytes(\$content))
\$shaHex = ([BitConverter]::ToString(\$sha)).Replace('-', '').ToLower()
\$manifest = @{ path = \$DevcontainerPath; sha256 = \$shaHex; timestamp = (Get-Date).ToString('o') } | ConvertTo-Json
\$manifestPath = '.devcontainer/devcontainer.manifest.json'
\$manifest | Out-File -FilePath \$manifestPath -Encoding UTF8
if (Test-Path \$PrivateKeyPath) {
  if (Get-Command openssl -ErrorAction SilentlyContinue) {
    & openssl dgst -sha256 -sign \$PrivateKeyPath -out \$manifestPath.sig \$manifestPath
    if (\$LASTEXITCODE -eq 0) { Write-Output 'Signed manifest created: ' + \$manifestPath + '.sig' }
  } else { Write-Warning 'OpenSSL not found; manifest created but not signed.' }
} else { Write-Warning 'Private key not found; manifest created but not signed.' }
"@
$devSign | Out-File -FilePath $devSignPath -Encoding UTF8
Log "Wrote $devSignPath"

$reqApprovalPath = Join-Path $ScriptsDir "request_devcontainer_approval.ps1"
$reqApproval = @"
# scripts/request_devcontainer_approval.ps1
param([string]\$Branch = 'devcontainer/approval-' + (Get-Date -Format yyyyMMddHHmmss))
if (-not \$env:GITEA_API_URL -or -not \$env:GITEA_TOKEN -or -not \$env:GITEA_REPO) { Write-Error 'Set GITEA_API_URL, GITEA_TOKEN, GITEA_REPO'; exit 1 }
git checkout -b \$Branch
git add .devcontainer/devcontainer.manifest.json
git commit -m 'chore(devcontainer): add manifest for approval' || Write-Output 'No changes to commit'
git push origin \$Branch
\$url = "\$env:GITEA_API_URL/repos/\$env:GITEA_REPO/pulls"
\$body = @{ title='Request: Devcontainer approval'; head=\$Branch; base='main'; body='Please review devcontainer manifest and resource limits.' } | ConvertTo-Json
Invoke-RestMethod -Uri \$url -Method Post -Headers @{ Authorization = "token \$env:GITEA_TOKEN" } -Body \$body -ContentType 'application/json'
Write-Output 'PR created for devcontainer approval.'
"@
$reqApproval | Out-File -FilePath $reqApprovalPath -Encoding UTF8
Log "Wrote $reqApprovalPath"

# ...existing code for the rest of the script...
