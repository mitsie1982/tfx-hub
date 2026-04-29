# Bootstrap VS Code Tasks for tfx-hub
# This script generates a basic tasks.json for common workflows in this repo.

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

$tasks = @"
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Install Dependencies",
      "type": "shell",
      "command": "pnpm install",
      "problemMatcher": []
    },
    {
      "label": "Run Unit Tests",
      "type": "shell",
      "command": "pnpm test",
      "problemMatcher": []
    },
    {
      "label": "Run Integration Tests",
      "type": "shell",
      "command": "pnpm run test:integration",
      "problemMatcher": []
    },
    {
      "label": "Run Demo Consumer",
      "type": "shell",
      "command": "node examples/shared_logic_demo.js",
      "problemMatcher": []
    },
    {
      "label": "Build Image",
      "type": "shell",
      "command": ".\\scripts\\build-and-push.sh gcr.io my-project tfx-model latest",
      "problemMatcher": []
    }
  ]
}
"@

Write-File -path ".vscode/tasks.json" -content $tasks -force:$Force
Write-Host "VS Code tasks.json bootstrapped. Edit .vscode/tasks.json to customize further."
