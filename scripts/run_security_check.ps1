# PowerShell script to run security checks on Windows
param(
    [Parameter(Mandatory=$false)]
    [string]$Check = "all"
)

$ErrorActionPreference = "Continue"
$ROOT = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

Set-Location $ROOT

Write-Host "🔐 Running security checks..." -ForegroundColor Cyan

switch ($Check) {
    "pre-commit" {
        Write-Host "Running pre-commit hooks..." -ForegroundColor Yellow
        pre-commit run --all-files
    }
    "audit" {
        Write-Host "Running npm audit..." -ForegroundColor Yellow
        pnpm.cmd audit
    }
    "secrets" {
        Write-Host "Scanning for secrets..." -ForegroundColor Yellow
        detect-secrets scan --baseline .secrets.baseline --all-files
    }
    "lint" {
        Write-Host "Running ESLint..." -ForegroundColor Yellow
        pnpm.cmd --filter @tfx/shared-auth run lint
    }
    "all" {
        Write-Host "Running all security checks..." -ForegroundColor Yellow
        Write-Host ""
        
        Write-Host "Step 1/4: Pre-commit hooks..." -ForegroundColor Cyan
        pre-commit run --all-files
        Write-Host ""
        
        Write-Host "Step 2/4: Dependency audit..." -ForegroundColor Cyan
        pnpm.cmd audit
        Write-Host ""
        
        Write-Host "Step 3/4: Secret scanning..." -ForegroundColor Cyan
        detect-secrets scan --baseline .secrets.baseline --all-files
        Write-Host ""
        
        Write-Host "Step 4/4: Linting..." -ForegroundColor Cyan
        pnpm.cmd --filter @tfx/shared-auth run lint
        Write-Host ""
        
        Write-Host "✅ All security checks completed" -ForegroundColor Green
    }
    default {
        Write-Host "Usage: .\scripts\run_security_check.ps1 -Check <all|pre-commit|audit|secrets|lint>" -ForegroundColor Yellow
    }
}
