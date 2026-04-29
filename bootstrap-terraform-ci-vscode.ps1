<#
bootstrap-terraform-ci-vscode.ps1
Creates a minimal VS Code tasks.json and GitHub Actions workflow for Terraform CI/CD, cross-platform.

Usage:
  Save to repo root and run in PowerShell:
    .\bootstrap-terraform-ci-vscode.ps1
  To overwrite existing files:
    .\bootstrap-terraform-ci-vscode.ps1 --Force
#>

param([switch]$Force)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-File($path, $content, $force=$false) {
  $dir = Split-Path -Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -Path $dir -ItemType Directory -Force | Out-Null }
  if ((Test-Path $path) -and -not $force) {
    Write-Host "Skipped $path (exists). Use --Force to overwrite." -ForegroundColor Yellow
    return
  }
  $content | Out-File -FilePath $path -Encoding UTF8 -Force
  Write-Host "Wrote $path"
}

# 1) .vscode/tasks.json (Terraform tasks)
$tasksJson = @"
{
  "version": "2.0.0",
  "tasks": [
    { "label": "Terraform Init", "type": "shell", "command": "terraform -chdir=infra/terraform init", "presentation": { "reveal": "always" } },
    { "label": "Terraform Plan", "type": "shell", "command": "terraform -chdir=infra/terraform plan", "presentation": { "reveal": "always" } },
    { "label": "Terraform Apply", "type": "shell", "command": "terraform -chdir=infra/terraform apply -auto-approve", "presentation": { "reveal": "always" } }
  ]
}
"@
Write-File -path ".\.vscode\tasks.json" -content $tasksJson -force:$Force

# 2) GitHub Actions workflow for Terraform
$workflow = @"
name: Terraform CI
on:
  push:
    paths:
      - 'infra/terraform/**'
      - '.github/workflows/terraform.yml'
  pull_request:
    paths:
      - 'infra/terraform/**'
      - '.github/workflows/terraform.yml'
jobs:
  terraform:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: infra/terraform
    steps:
      - uses: actions/checkout@v4
      - name: Set up Terraform
        uses: hashicorp/setup-terraform@v3
      - name: Terraform Init
        run: terraform init
      - name: Terraform Validate
        run: terraform validate
      - name: Terraform Plan
        run: terraform plan
"@
Write-File -path ".github\workflows\terraform.yml" -content $workflow -force:$Force

Write-Host "Terraform VS Code tasks and CI workflow bootstrapped."
Write-Host "Next steps:"
Write-Host "  1) Add your Terraform code to infra/terraform."
Write-Host "  2) Use VS Code tasks for local workflow."
Write-Host "  3) Push to GitHub to trigger CI."
