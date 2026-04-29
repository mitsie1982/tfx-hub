Write-Host "🔐 Running security checks..."

# Static security scan
bandit -r .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Security vulnerabilities detected"
    exit 1
}

# Secret detection
detect-secrets scan > .secrets.baseline

Write-Host "✅ Security checks complete."
