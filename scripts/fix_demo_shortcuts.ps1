# scripts/fix_demo_shortcuts.ps1
# Recreate reliable Desktop shortcuts for Demo Contractor, Customer, AMS, Members
param(
  [string]$RepoRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

# Map demo names to start scripts (adjust paths if your repo layout differs)
$shortcuts = @(
  @{ Name = 'Demo Contractor'; Script = Join-Path $RepoRoot 'scripts\start_contractor_demo.ps1' },
  @{ Name = 'Demo Customer';   Script = Join-Path $RepoRoot 'scripts\start_customer_demo.ps1' },
  @{ Name = 'Demo AMS';        Script = Join-Path $RepoRoot 'scripts\start_ams_demo.ps1' },
  @{ Name = 'Demo Members';    Script = Join-Path $RepoRoot 'scripts\start_members_demo.ps1' }
)

# Resolve Desktop path for current user
$desktop = [Environment]::GetFolderPath('Desktop')

# Ensure scripts exist and are unblocked
foreach ($s in $shortcuts) {
  if (-not (Test-Path $s.Script)) {
    Write-Warning "Script not found: $($s.Script). Create or update the path before running this script."
    continue
  }
  try {
    Unblock-File -Path $s.Script -ErrorAction SilentlyContinue
  } catch {
    # ignore if cannot unblock
  }
}

# Create shortcuts using WScript.Shell COM object
$shell = New-Object -ComObject WScript.Shell

foreach ($s in $shortcuts) {
  if (-not (Test-Path $s.Script)) { continue }

  $linkPath = Join-Path $desktop ("$($s.Name).lnk")
  $target = (Get-Command powershell.exe).Source
  $arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$($s.Script)`""
  $workingDir = Split-Path -Parent $s.Script

  # Create or overwrite shortcut
  $shortcut = $shell.CreateShortcut($linkPath)
  $shortcut.TargetPath = $target
  $shortcut.Arguments = $arguments
  $shortcut.WorkingDirectory = $workingDir
  $shortcut.WindowStyle = 1
  # Optional: set a generic icon from shell32 or a custom .ico path
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Description = "Launch $($s.Name) demo"
  $shortcut.Save()

  Write-Host "Created shortcut: $linkPath -> $target $arguments"
}

Write-Host "Shortcuts recreated. Test by double-clicking each Desktop icon."
