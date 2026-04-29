$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$psExe = (Get-Command powershell.exe).Source

$launcherScript = Join-Path $repoRoot 'scripts\launch_browser_demo.ps1'

$shortcuts = @(
  @{
    Name = 'Theuns - Contactor.lnk'
    Script = $launcherScript
    Arguments = '-App contractor'
    Description = 'Launch Theuns contractor browser demo in Google Chrome Dev'
  },
  @{
    Name = 'Michelle - Customer.lnk'
    Script = $launcherScript
    Arguments = '-App customer'
    Description = 'Launch Michelle customer browser demo in Google Chrome Dev'
  }
)

$staleShortcutNames = @(
  'Build AMS.lnk',
  'Build Contractor.lnk',
  'Build Customer Client.lnk',
  'Build Members.lnk',
  'Build Customer.lnk',
  'Demo AMS.lnk',
  'Demo Contractor.lnk',
  'Demo Customer Client.lnk',
  'Demo Customer.lnk',
  'Demo Members.lnk',
  'Demo Client.lnk',
  'TFSSA Demo - Contractor Browser.lnk',
  'TFSSA Demo - Customer Browser.lnk',
  'TFSSA Demo - Client Browser.lnk',
  'TFSSA Demo - AMS Browser.lnk',
  'TFSSA Demo - Members Browser.lnk',
  'Theuns - Contactor.lnk',
  'Michelle - Customer.lnk'
)

foreach ($staleShortcutName in $staleShortcutNames) {
  $staleShortcutPath = Join-Path $desktop $staleShortcutName
  if (Test-Path $staleShortcutPath) {
    Remove-Item -Path $staleShortcutPath -Force
    Write-Host "Removed stale shortcut: $staleShortcutPath"
  }
}

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
  $scriptArguments = if ($item.Arguments) { ' ' + $item.Arguments } else { '' }
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$($item.Script)`"$scriptArguments"
  $shortcut.WorkingDirectory = Split-Path -Parent $item.Script
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Description = $item.Description
  $shortcut.Save()

  Write-Host "Created shortcut: $linkPath"
}

Write-Host "Clean desktop shortcut recreation completed."
