# Bootstrap Secure VS Code Setup
# This script installs a standard set of secure extensions and applies secure settings for VS Code.

$ErrorActionPreference = 'Stop'

Write-Host "[Bootstrap] Starting secure VS Code setup..." -ForegroundColor Cyan

# --- Install Recommended Extensions ---
$extensions = @(
    "ms-python.python",
    "ms-vscode.powershell",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "github.copilot",
    "ms-azuretools.vscode-docker",
    "ms-vscode-remote.remote-containers"
)

foreach ($ext in $extensions) {
    Write-Host "[Bootstrap] Installing extension: $ext" -ForegroundColor Yellow
    code --install-extension $ext --force
}

# --- Apply Secure Settings ---
$settingsPath = "$env:APPDATA\Code\User\settings.json"


if (-Not (Test-Path $settingsPath)) {
    Write-Host "[Bootstrap] VS Code settings.json not found, skipping settings update." -ForegroundColor Red
} else {
    $settings = Get-Content $settingsPath | ConvertFrom-Json
    # Convert to hashtable for safe editing
    $settingsHash = @{}
    foreach ($prop in $settings.PSObject.Properties) {
        $settingsHash[$prop.Name] = $prop.Value
    }
    $settingsHash["security.workspace.trust.enabled"] = $true
    $settingsHash["extensions.autoUpdate"] = $true
    $settingsHash["extensions.autoCheckUpdates"] = $true
    $settingsHash["telemetry.enableCrashReporter"] = $false
    $settingsHash["telemetry.enableTelemetry"] = $false
    $settingsHash | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
    Write-Host "[Bootstrap] Secure settings applied." -ForegroundColor Green
}

Write-Host "[Bootstrap] Secure VS Code setup complete." -ForegroundColor Cyan
