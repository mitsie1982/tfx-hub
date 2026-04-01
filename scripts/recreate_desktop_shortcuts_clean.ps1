$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$psExe = (Get-Command powershell.exe).Source

$shortcuts = @(
  @{
    Name = 'Demo Contractor.lnk'
    Script = Join-Path $repoRoot 'scripts\launch_contractor_presentation.ps1'
    Description = 'Launch Contractor demo on port 3001'
  },
  @{
    Name = 'Demo Customer.lnk'
    Script = Join-Path $repoRoot 'scripts\launch_customer_with_port.ps1'
    Description = 'Launch Customer demo on port 3004'
  },
  @{
    Name = 'Demo AMS.lnk'
    Script = Join-Path $repoRoot 'scripts\launch_ams_presentation.ps1'
    Description = 'Launch AMS demo on port 3002'
  },
  @{
    Name = 'Demo Members.lnk'
    Script = Join-Path $repoRoot 'scripts\launch_members_presentation.ps1'
    Description = 'Launch Members demo on port 3003'
  }
)

foreach ($item in $shortcuts) {
  $linkPath = Join-Path $desktop $item.Name

  if (Test-Path $linkPath) {
    Remove-Item -Path $linkPath -Force
    Write-Host "Removed existing shortcut: $linkPath"
  }

  if (-not (Test-Path $item.Script)) {
    Write-Warning "Target script not found, skipping shortcut: $($item.Script)"
    continue
  }

  $shortcut = $shell.CreateShortcut($linkPath)
  $shortcut.TargetPath = $psExe
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$($item.Script)`""
  $shortcut.WorkingDirectory = Split-Path -Parent $item.Script
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Description = $item.Description
  $shortcut.Save()

  Write-Host "Created shortcut: $linkPath"
}

Write-Host "Clean desktop shortcut recreation completed."
