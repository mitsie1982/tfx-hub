# Install pre-commit hooks if not already installed
pre-commit install --install-hooks

Write-Host "🚦 Running full validation..."

# Lint
Write-Host "🔍 Linting..."
black --check .
flake8 .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lint failed"
    exit 1
}

# Tests
Write-Host "🧪 Running tests..."
pytest tests/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed"
    exit 1
}

# Secret scan
Write-Host "🔑 Scanning for secrets..."
detect-secrets scan > .secrets.baseline
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Secrets detected"
    exit 1
}

# Pipeline dry-run
Write-Host "🔄 Running pipeline dry-run..."
python pipelines/run_pipeline.py --dry-run

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pipeline failed"
    exit 1
}

Write-Host "✅ Validation passed."
