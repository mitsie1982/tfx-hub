# scripts/start_ams_demo.ps1
param(
  [string]$Mode = 'dev'  # dev or release
)
$RepoRoot = 'C:\Users\1hans\tfx-hub'
$AppDir = Join-Path $RepoRoot 'packages/ams-app'
if (-not (Test-Path $AppDir)) {
  Write-Host "Warning: app directory not found: $AppDir"
  Write-Host "Adjust path in scripts/start_ams_demo.ps1"
  exit 1
}
Write-Host "Starting demo for ams from $AppDir (Mode=$Mode)"
# Ensure the app is a real project (has package.json)
if (-not (Test-Path (Join-Path $AppDir 'package.json'))) {
  Write-Warning "No package.json found in $AppDir."
  Write-Host "The ams-app is a placeholder. Initialize it first:"
  Write-Host "  cd $AppDir && npx react-native init AmsApp (or your setup command)"
  exit 1
}
# Install dependencies if node_modules missing
if (-not (Test-Path (Join-Path $AppDir 'node_modules'))) {
  Write-Host "Installing dependencies in $AppDir"
  Push-Location $AppDir
  if (Test-Path (Join-Path $RepoRoot 'pnpm-lock.yaml')) {
    pnpm install
  } else {
    npm install
  }
  Pop-Location
}

# Start Metro bundler
Write-Host "Starting Metro bundler..."
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location '$AppDir'; pnpm start"

# Platform-specific run for Windows (React Native Windows) or fallback to web
Start-Sleep -Seconds 2
Write-Host "Launching app (platform-specific command follows)"
Push-Location $AppDir
# Try RNW run-windows if available
if (Test-Path ".\windows") {
  Write-Host "Detected RNW windows folder; running run-windows"
  npx react-native run-windows
} else {
  Write-Host "No RNW windows project detected. If this is a React Native app, add RNW support or run the web/demo entry."
  # Fallback: try common React Native start scripts
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm run start
    if ($LASTEXITCODE -ne 0) { pnpm run dev }
  } else {
    npm run start
    if ($LASTEXITCODE -ne 0) { npm run dev }
  }
}
Pop-Location
