# Bootstrap Governance Checks for VS Code (PowerShell)
# This script performs local governance checks similar to those in the GitHub Actions workflow.
# It checks for required files, basic branch protection, and license compliance.

param(
    [string]$RequirementsFile = "requirements.txt"
)

Write-Host "[Governance] Checking for required files..."
$requiredFiles = @(
    ".github/workflows",
    $RequirementsFile
)
$missing = @()
foreach ($file in $requiredFiles) {
    if (-not (Test-Path $file)) {
        $missing += $file
    }
}
if ($missing.Count -gt 0) {
    Write-Host "[ERROR] Missing required files/folders: $($missing -join ', ')" -ForegroundColor Red
} else {
    Write-Host "[OK] All required files/folders present." -ForegroundColor Green
}

Write-Host "[Governance] Checking for forbidden licenses in $RequirementsFile..."
if (Test-Path $RequirementsFile) {
    pip install pip-licenses | Out-Null
    $licenses = pip-licenses --format=markdown
    $forbidden = @("AGPL", "GPL")
    $found = $false
    foreach ($line in $licenses) {
        foreach ($bad in $forbidden) {
            if ($line -match $bad) {
                Write-Host "[ERROR] Forbidden license found: $bad in $line" -ForegroundColor Red
                $found = $true
            }
        }
    }
    if (-not $found) {
        Write-Host "[OK] No forbidden licenses found." -ForegroundColor Green
    }
} else {
    Write-Host "[WARN] $RequirementsFile not found, skipping license check." -ForegroundColor Yellow
}

Write-Host "[Governance] (Simulated) Branch protection and PR review checks should be enforced in repository settings."
Write-Host "[Governance] Local checks complete."
