# PowerShell script to automate Dispute Center DB setup
# 1. Installs PostgreSQL if missing (choco), 2. Sets DATABASE_URL, 3. Runs migration

param(
    [string]$DbUrl = "postgres://user:password@localhost:5432/tfxhub",
    [string]$AdminToken = "letmein"
)

Write-Host "[1/3] Checking for psql..."
if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "psql not found. Installing PostgreSQL via Chocolatey..."
    if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
        Write-Error "Chocolatey is required. Please install Chocolatey first: https://chocolatey.org/install"
        exit 1
    }
    choco install postgresql -y
    $env:Path += ";C:\Program Files\PostgreSQL\15\bin"  # Adjust version if needed
    Write-Host "PostgreSQL installed."
}
else {
    Write-Host "psql found."
}

Write-Host "[2/3] Setting environment variables..."
$env:DATABASE_URL = $DbUrl
$env:ADMIN_TOKEN = $AdminToken
Write-Host "DATABASE_URL set to: $DbUrl"
Write-Host "ADMIN_TOKEN set to: $AdminToken"

Write-Host "[3/3] Running migration..."
psql $env:DATABASE_URL -f prisma/migrations/20260411_add_dispute_model.sql
if ($LASTEXITCODE -eq 0) {
    Write-Host "Migration complete. Dispute Center is ready."
}
else {
    Write-Error "Migration failed. Check your DATABASE_URL and Postgres setup."
}
