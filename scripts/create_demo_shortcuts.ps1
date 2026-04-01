# scripts/create_demo_shortcuts.ps1
# Creates Desktop shortcuts for the four launchers
$ErrorActionPreference = 'Stop'
$RepoRoot = Get-Location
$ScriptsDir = Join-Path $RepoRoot 'scripts'
$desktop = [Environment]::GetFolderPath('Desktop')

$entries = @(
  @{ Name='Demo Contractor'; Launcher='launch_contractor_presentation.ps1' },
  @{ Name='Demo Customer';   Launcher='launch_customer_presentation.ps1' },
  @{ Name='Demo AMS';        Launcher='launch_ams_presentation.ps1' },
  @{ Name='Demo Members';    Launcher='launch_members_presentation.ps1' }
)

$shell = New-Object -ComObject WScript.Shell
$psExe = (Get-Command powershell.exe).Source

foreach ($e in $entries) {
  $launcherPath = Join-Path $ScriptsDir $e.Launcher
  if (-not (Test-Path $launcherPath)) { Write-Warning "Launcher missing: $launcherPath"; continue }
  $link = Join-Path $desktop ("$($e.Name).lnk")
  $args = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$launcherPath`""
  $shortcut = $shell.CreateShortcut($link)
  $shortcut.TargetPath = $psExe
  $shortcut.Arguments = $args
  $shortcut.WorkingDirectory = Split-Path $launcherPath -Parent
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Description = "Launch $($e.Name)"
  $shortcut.Save()
  Write-Host "Created shortcut: $link"
}
