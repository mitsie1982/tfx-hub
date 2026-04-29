param(
    [string]$Message = "Automated commit from VS Code task",
    [switch]$Push = $false,
    [switch]$Force = $false
)

Write-Host "[INFO] Adding all changes to git..."
git add -A

if ($Force) {
    Write-Host "[INFO] Committing with --no-verify (force)..."
    git commit -m $Message --no-verify
} else {
    Write-Host "[INFO] Committing with verification..."
    git commit -m $Message
}

if ($Push) {
    Write-Host "[INFO] Pushing to remote..."
    git push
}

Write-Host "[INFO] Commit script completed."
