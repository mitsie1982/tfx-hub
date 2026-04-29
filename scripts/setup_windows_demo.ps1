# scripts/setup_windows_demo.ps1
# Idempotent setup for Windows demo environment and scaffolding demo scripts and shortcuts.
param(
  [string]$RepoRoot = (Get-Location).Path
)

Write-Host "Starting Windows demo setup at $RepoRoot"

# Ensure scripts directory exists
$ScriptsDir = Join-Path $RepoRoot "scripts"
$VscodeDir = Join-Path $RepoRoot ".vscode"
$DocsDir = Join-Path $RepoRoot "docs"
New-Item -ItemType Directory -Path $ScriptsDir -Force | Out-Null
New-Item -ItemType Directory -Path $VscodeDir -Force | Out-Null
New-Item -ItemType Directory -Path $DocsDir -Force | Out-Null

# Helper to write file if missing or placeholder
function Write-IfMissing($Path, $Content) {
  if (-not (Test-Path $Path)) {
    $Content | Out-File -FilePath $Path -Encoding UTF8
    Write-Host "WROTE: $Path"
  } else {
    Write-Host "SKIP (exists): $Path"
  }
}

# 1) Prerequisite checks and guidance (do not auto-install Visual Studio)
$PrereqDoc = @"
# Windows Demo Prerequisites

- Windows 10/11 Pro or Windows Server
- Visual Studio 2022 with "Desktop development with C++" workload
- Node 18+ installed and on PATH
- pnpm installed globally (recommended)
- Git and Python 3
- React Native Windows prerequisites if running RNW demos

If you need to install Node and pnpm quickly:
  choco install nodejs-lts -y
  npm install -g pnpm

Run the rest of the setup from an elevated PowerShell session.
"@
Write-IfMissing (Join-Path $DocsDir "windows_demo_readme.md") $PrereqDoc

# 2) Per-demo start scripts (assumes apps located under apps/<app>-app)
$apps = @{
  "contractor" = "apps/contractor-app"
  "customer"   = "apps/customer-app"
  "ams"        = "apps/ams-app"
  "members"    = "apps/members-app"
}

foreach ($key in $apps.Keys) {
  $appPath = $apps[$key]
  $scriptPath = Join-Path $ScriptsDir "start_${key}_demo.ps1"
  $content = @"
# scripts/start_${key}_demo.ps1
param(
  [string]`$Mode = 'dev'  # dev or release
)
`$RepoRoot = '$RepoRoot'
`$AppDir = Join-Path `$RepoRoot '$appPath'
if (-not (Test-Path `$AppDir)) {
  Write-Host "Warning: app directory not found: `$AppDir"
  Write-Host "Adjust path in scripts/start_${key}_demo.ps1"
  exit 1
}
Write-Host "Starting demo for ${key} from `$AppDir (Mode=`$Mode)"

# Install dependencies if node_modules missing
if (-not (Test-Path (Join-Path `$AppDir 'node_modules'))) {
  Write-Host "Installing dependencies in `$AppDir"
  Push-Location `$AppDir
  if (Test-Path (Join-Path `$RepoRoot 'pnpm-lock.yaml')) {
    pnpm install
  } else {
    npm install
  }
  Pop-Location
}

# Start Metro bundler
Write-Host "Starting Metro bundler..."
Start-Process -NoNewWindow -FilePath "powershell" -ArgumentList "-NoExit","-Command","cd `"`$AppDir`"; pnpm start"

# Platform-specific run for Windows (React Native Windows) or fallback to web
Start-Sleep -Seconds 2
Write-Host "Launching app (platform-specific command follows)"
Push-Location `$AppDir
# Try RNW run-windows if available
if (Test-Path ".\windows") {
  Write-Host "Detected RNW windows folder; running run-windows"
  npx react-native run-windows
} else {
  Write-Host "No RNW windows project detected. If this is a React Native app, add RNW support or run the web/demo entry."
  # Fallback: try npm run dev or start script
  if (Get-Command pnpm -ErrorAction SilentlyContinue) {
    pnpm run dev -ErrorAction SilentlyContinue
  } else {
    npm run dev -ErrorAction SilentlyContinue
  }
}
Pop-Location
"@
  Write-IfMissing $scriptPath $content
  # Make executable (PowerShell scripts are executable by policy when run)
}

# 3) Shortcut creator script
$shortcutScript = @"
# scripts/create_demo_shortcuts.ps1
param(
  [string]`$RepoRoot = '$RepoRoot'
)
`$Desktop = [Environment]::GetFolderPath('Desktop')
`$ScriptsDir = Join-Path `$RepoRoot 'scripts'

`$shortcuts = @(
  @{ Name = 'Demo Contractor'; Script = 'start_contractor_demo.ps1' },
  @{ Name = 'Demo Customer';   Script = 'start_customer_demo.ps1' },
  @{ Name = 'Demo AMS';        Script = 'start_ams_demo.ps1' },
  @{ Name = 'Demo Members';    Script = 'start_members_demo.ps1' }
)

Add-Type -AssemblyName WindowsBase
foreach (`$s in `$shortcuts) {
  `$linkPath = Join-Path `$Desktop ("`$(`$s.Name).lnk")
  `$target = Join-Path `$ScriptsDir `$s.Script
  if (-not (Test-Path `$target)) {
    Write-Host "Skipping shortcut for `$(`$s.Name): script not found `$target"
    continue
  }
  # Create a small wrapper batch to launch PowerShell with the script
  `$wrapper = Join-Path `$ScriptsDir ("`$(`$s.Script).launcher.bat")
  `$psCmd = "powershell -NoProfile -ExecutionPolicy Bypass -File `"`$target`""
  Set-Content -Path `$wrapper -Value `$psCmd -Encoding ASCII

  # Create COM object for shortcut
  `$shell = New-Object -ComObject WScript.Shell
  `$shortcut = `$shell.CreateShortcut(`$linkPath)
  `$shortcut.TargetPath = `$wrapper
  `$shortcut.WorkingDirectory = `$ScriptsDir
  `$shortcut.WindowStyle = 1
  `$shortcut.IconLocation = "shell32.dll, 1"
  `$shortcut.Save()
  Write-Host "Created shortcut: `$linkPath -> `$target"
}
"@
$createShortcutsPath = Join-Path $ScriptsDir "create_demo_shortcuts.ps1"
Write-IfMissing $createShortcutsPath $shortcutScript

# 4) VS Code tasks
$tasksJson = @"
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Demo: Contractor",
      "type": "shell",
      "command": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_contractor_demo.ps1",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Demo: Customer",
      "type": "shell",
      "command": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_customer_demo.ps1",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Demo: AMS",
      "type": "shell",
      "command": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_ams_demo.ps1",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Demo: Members",
      "type": "shell",
      "command": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_members_demo.ps1",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Create Desktop Shortcuts",
      "type": "shell",
      "command": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/create_demo_shortcuts.ps1",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "Open Demo Readme",
      "type": "shell",
      "command": "code -r docs/windows_demo_readme.md || true",
      "presentation": { "reveal": "always" }
    }
  ]
}
"@
$tasksPath = Join-Path $VscodeDir "tasks.windows-demo.json"
Write-IfMissing $tasksPath $tasksJson

# 5) Unblock all PowerShell scripts
Get-ChildItem -Path $ScriptsDir -Filter "*.ps1" | ForEach-Object {
  Unblock-File -Path $_.FullName -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "Setup complete. Next steps:"
Write-Host "  1. Review docs/windows_demo_readme.md for prerequisites."
Write-Host "  2. From an elevated PowerShell, run: scripts/create_demo_shortcuts.ps1"
Write-Host "  3. Open VS Code and run tasks: Terminal > Run Task > Demo: Contractor (or others)"
Write-Host ""
