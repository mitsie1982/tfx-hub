# File: apply_manual_ops_vs_code.ps1
# Purpose: Single consolidated script to perform the remaining manual operations in Elevated VS Code.
# Usage: Open an elevated VS Code terminal, cd to your project root, save this file, then run:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\apply_manual_ops_vs_code.ps1
#
# This script automates the manual steps you previously identified:
#  - Ensures 'code' CLI availability and installs recommended extensions (if available)
#  - Installs pre-commit and runs pre-commit install (or runs provided install_precommit.ps1)
#  - Runs the project bootstrap (scripts/make_bootstrap.ps1)
#  - Runs verification (scripts/verify_vs_code_automation.ps1)
#  - Summarizes remaining manual actions and writes a timestamped log
#
# MANUAL ITEMS (the script will remind you and attempt safe defaults):
#  - Confirm and edit slm/policy/policy.yaml to match your SLM rules
#  - Populate requirements.txt with pinned packages and install them in devcontainer/local env
#  - Replace placeholders in slm_dry_run, slm_resume_pipeline, slm_publish_release with real commands
#  - Add secrets (MLFLOW_TRACKING_URI, MLFLOW_ARTIFACT_ROOT, GITEA_TOKEN) to your vault/CI
#  - Approve devcontainer image and resource limits for team use
#
# Exit codes:
#   0 = success (bootstrap + verification completed)
#   1 = fatal error (missing project root or required files)
#   2 = pre-commit/install step failed
#   3 = bootstrap validation failed
#   4 = verification failed

# ---------------- CONFIG ----------------
$ProjectRoot = (Get-Location).Path
$ScriptsDir = Join-Path $ProjectRoot "scripts"
$RecommendedExtensions = @(
    "ms-python.python",
    "ms-python.vscode-pylance",
    "ms-toolsai.jupyter",
    "ms-azuretools.vscode-docker",
    "esbenp.prettier-vscode",
    "charliermarsh.ruff",
    "ms-vscode-remote.remote-containers",
    "eamodio.gitlens"
)
$LogDir = Join-Path $ProjectRoot "logs"
$Timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$LogFile = Join-Path $LogDir "apply_manual_ops_$Timestamp.log"
# ----------------------------------------

function Log([string]$msg) {
    $line = "$(Get-Date -Format o)  $msg"
    Write-Output $line
    Add-Content -Path $LogFile -Value $line
}

# Ensure log directory
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Force -Path $LogDir | Out-Null }

# Safety: ensure running from project root
if (-not (Test-Path $ProjectRoot)) {
    Write-Error "Project root not found. Run this script from your project root."
    exit 1
}

Log "Starting apply_manual_ops_vs_code.ps1 in elevated VS Code."
Log "Project root: $ProjectRoot"

# 1) Check for 'code' CLI and install recommended extensions
$codeCli = Get-Command code -ErrorAction SilentlyContinue
if ($null -ne $codeCli) {
    Log "'code' CLI found. Installing recommended extensions..."
    foreach ($ext in $RecommendedExtensions) {
        try {
            Log "Installing extension: $ext"
            & code --install-extension $ext --force 2>&1 | ForEach-Object { Log $_ }
        } catch {
            Log "Warning: failed to install extension $ext: $_"
        }
    }
    Log "Listing installed extensions (partial):"
    try {
        & code --list-extensions | ForEach-Object { Log "  ext: $_" }
    } catch {
        Log "Warning: could not list extensions via code CLI."
    }
} else {
    Log "'code' CLI not found on PATH. To auto-install extensions, open VS Code Command Palette and run 'Shell Command: Install 'code' command in PATH'."
}

# 2) Install pre-commit and run pre-commit install (or run provided installer)
$installPrecommitScript = Join-Path $ScriptsDir "install_precommit.ps1"
if (Test-Path $installPrecommitScript) {
    Log "Found scripts/install_precommit.ps1. Executing it."
    try {
        & powershell -ExecutionPolicy Bypass -File $installPrecommitScript 2>&1 | ForEach-Object { Log $_ }
    } catch {
        Log "Error: install_precommit.ps1 failed: $_"
        exit 2
    }
} else {
    Log "No scripts/install_precommit.ps1 found. Attempting to install pre-commit and tools via pip."
    try {
        python -m pip install --upgrade pip 2>&1 | ForEach-Object { Log $_ }
        pip install pre-commit ruff black isort pip-audit -q 2>&1 | ForEach-Object { Log $_ }
        if (Test-Path ".git") {
            Log "Running pre-commit install..."
            pre-commit install 2>&1 | ForEach-Object { Log $_ }
        } else {
            Log "No .git folder found. Initialize git repo and run 'pre-commit install' manually."
        }
    } catch {
        Log "Error: failed to install pre-commit or tools: $_"
        exit 2
    }
}

# 3) Run project bootstrap (scripts/make_bootstrap.ps1) if present
$makeBootstrap = Join-Path $ScriptsDir "make_bootstrap.ps1"
if (Test-Path $makeBootstrap) {
    Log "Running scripts/make_bootstrap.ps1 (bootstrap)..."
    try {
        & powershell -ExecutionPolicy Bypass -File $makeBootstrap 2>&1 | ForEach-Object { Log $_ }
        if ($LASTEXITCODE -ne 0) {
            Log "Bootstrap script returned non-zero exit code: $LASTEXITCODE"
            exit 3
        }
    } catch {
        Log "Error: make_bootstrap.ps1 failed: $_"
        exit 3
    }
} else {
    Log "No scripts/make_bootstrap.ps1 found. Skipping bootstrap step. Create and run it manually."
}

# 4) Run verification script (scripts/verify_vs_code_automation.ps1) if present
$verifyScript = Join-Path $ScriptsDir "verify_vs_code_automation.ps1"
if (Test-Path $verifyScript) {
    Log "Running verification script: scripts/verify_vs_code_automation.ps1"
    try {
        & powershell -ExecutionPolicy Bypass -File $verifyScript 2>&1 | ForEach-Object { Log $_ }
        if ($LASTEXITCODE -ne 0) {
            Log "Verification script returned non-zero exit code: $LASTEXITCODE"
            exit 4
        }
    } catch {
        Log "Error: verification script failed: $_"
        exit 4
    }
} else {
    Log "No verification script found at scripts/verify_vs_code_automation.ps1. Running fallback checks."
    # Fallback: run policy_check.py if present
    $policyCheck = Join-Path $ScriptsDir "policy_check.py"
    if (Test-Path $policyCheck) {
        try {
            Log "Running policy_check.py..."
            python $policyCheck 2>&1 | ForEach-Object { Log $_ }
            if ($LASTEXITCODE -ne 0) {
                Log "policy_check.py failed with exit code $LASTEXITCODE"
                exit 4
            }
        } catch {
            Log "Error running policy_check.py: $_"
            exit 4
        }
    } else {
        Log "No policy_check.py found. Please run your verification steps manually."
    }
}

# 5) Optional: run VS Code task SLM: Validate Baseline via code CLI (if available)
if ($null -ne $codeCli) {
    Log "Attempting to run VS Code task 'SLM: Validate Baseline' via code CLI (if supported)."
    try {
        # 'code' CLI does not provide a direct way to run tasks; attempt to open workspace and notify user
        Log "Opening workspace in VS Code so you can run the 'SLM: Validate Baseline' task from Terminal -> Run Task."
        & code $ProjectRoot
    } catch {
        Log "Warning: could not open VS Code via code CLI: $_"
    }
} else {
    Log "code CLI not available; open VS Code and run the 'SLM: Validate Baseline' task manually."
}

# 6) Summarize remaining manual actions and write a short runbook file
$runbookPath = Join-Path $ProjectRoot "SLM_MANUAL_ACTIONS_$Timestamp.md"
$runbookContent = @"
# SLM Manual Actions (generated $Timestamp)

The automated steps completed. Please perform the following manual actions to reach full production readiness:

1. Review and edit `slm/policy/policy.yaml` to reflect your exact SLM boundaries and forbidden patterns.
2. Populate `requirements.txt` with pinned versions (e.g., tfx, mlflow, prometheus-client, structlog, python-json-logger, ruff, black, isort, pre-commit) and install them in the devcontainer or local environment.
3. Replace placeholders in:
   - `scripts/slm_dry_run.ps1`
   - `scripts/slm_resume_pipeline.ps1`
   - `scripts/slm_publish_release.ps1`
   with your actual pipeline invocation, checkpoint resume logic, and release publish commands.
4. Provision MLflow server and Gitea tokens; add `MLFLOW_TRACKING_URI`, `MLFLOW_ARTIFACT_ROOT`, and `GITEA_TOKEN` to your secrets vault or CI secrets.
5. Approve devcontainer base image and resource limits for team use; ensure devcontainer postCreateCommand runs `scripts/make_bootstrap.ps1`.
6. Run `scripts/make_bootstrap.ps1` on each developer machine to install hooks and validate baseline.
7. Open VS Code with the `TFX-Hub-Prod` profile and run the 'SLM: Validate Baseline' task (Terminal -> Run Task -> SLM: Validate Baseline).
8. Test release and rollback flows in a staging environment before enabling in production.

Log file: $LogFile

"@
$runbookContent | Out-File -FilePath $runbookPath -Encoding UTF8
Log "Wrote manual actions runbook to $runbookPath"

# 7) Final status and exit
Log "apply_manual_ops_vs_code.ps1 completed successfully."
Log "Please follow the manual actions in $runbookPath to finalize SLM setup."

Write-Output ""
Write-Output "=== SUMMARY ==="
Write-Output "Log file: $LogFile"
Write-Output "Manual runbook: $runbookPath"
Write-Output ""
Write-Output "Open VS Code and run the 'SLM: Validate Baseline' task (Terminal -> Run Task) to complete validation."
Write-Output ""

exit 0
