param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$CustomerPort = 3004
)

$ErrorActionPreference = 'Stop'

# Ensure folders
$scriptsDir = Join-Path $RepoRoot 'scripts'
New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
$logDir = Join-Path $RepoRoot 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

# Desktop and PowerShell exe
$desktop = [Environment]::GetFolderPath('Desktop')
$psExe = (Get-Command powershell.exe).Source
$shell = New-Object -ComObject WScript.Shell

# Shortcut definitions
$entries = @(
  @{ Name='Demo Contractor'; Wrapper='launch_contractor_wrapper.ps1'; AppRel='packages\contractor-app'; Port=3001 },
  @{ Name='Demo Customer';   Wrapper='launch_customer_wrapper.ps1';   AppRel='packages\customer-app';   Port=$CustomerPort },
  @{ Name='Demo AMS';        Wrapper='launch_ams_wrapper.ps1';        AppRel='packages\ams-app';        Port=3002 },
  @{ Name='Demo Members';    Wrapper='launch_members_wrapper.ps1';    AppRel='packages\members-app';    Port=3003 }
)

function Remove-ShortcutIfExists {
  param([string]$name)
  $link = Join-Path $desktop ("$name.lnk")
  if (Test-Path $link) {
    try { Remove-Item -Path $link -Force -ErrorAction Stop; Write-Host "Removed existing shortcut: $link" } catch { Write-Warning "Could not remove ${link}: $($_.Exception.Message)" }
  } else {
    Write-Host "No existing shortcut to remove: $name"
  }
}

function Ensure-WrapperScript {
  param([string]$wrapperName, [string]$appRel, [int]$port)
  $wrapperPath = Join-Path $scriptsDir $wrapperName
  $appPath = Join-Path $RepoRoot $appRel
  New-Item -ItemType Directory -Path $appPath -Force | Out-Null

  if (-not (Test-Path $wrapperPath)) {
    $launcherCandidate = Join-Path $scriptsDir ("launch_{0}_presentation.ps1" -f (($wrapperName -replace '\.ps1$','') -replace '^launch_',''))
    $content = @"
# Auto-generated wrapper: $wrapperName
`$env:PORT = '$port'
Set-Location `"$appPath`"
# Ensure log dir
`$logDir = Join-Path `"$RepoRoot`" 'artifacts\demo-logs'
New-Item -ItemType Directory -Path `$logDir -Force | Out-Null

# Prefer existing repo launcher if present
if (Test-Path `"$launcherCandidate`") {
  & `"$launcherCandidate`"
} elseif (Test-Path 'server.js') {
  `$logFile = Join-Path `$logDir ('{0}_server_{1}.log' -f (Split-Path `"$appPath`" -Leaf, (Get-Date -Format yyyyMMddTHHmmss)))
  node server.js 2>&1 | Tee-Object -FilePath `$logFile
} else {
  Write-Host 'No launcher or server.js found in' `"$appPath`"
  Read-Host 'Press Enter to close'
}
"@
    $content | Out-File -FilePath $wrapperPath -Encoding UTF8 -Force
    Unblock-File -Path $wrapperPath -ErrorAction SilentlyContinue
    Write-Host "WROTE wrapper: $wrapperPath"
  } else {
    Write-Host "Wrapper exists: $wrapperPath"
  }
  return $wrapperPath
}

function Create-DesktopShortcut {
  param([string]$name, [string]$wrapperPath)
  $link = Join-Path $desktop ("$name.lnk")
  $shortcut = $shell.CreateShortcut($link)
  $shortcut.TargetPath = $psExe
  $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$wrapperPath`""
  $shortcut.WorkingDirectory = Split-Path $wrapperPath -Parent
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Description = "Launch $name"
  $shortcut.Save()
  Write-Host "Created shortcut: $link"
}

# Main: remove old shortcuts, create wrappers, create shortcuts
foreach ($e in $entries) {
  Remove-ShortcutIfExists -name $e.Name
  $wrapper = Ensure-WrapperScript -wrapperName $e.Wrapper -appRel $e.AppRel -port $e.Port
  Create-DesktopShortcut -name $e.Name -wrapperPath $wrapper
}

Write-Host ""
Write-Host "All shortcuts recreated on Desktop:"
$entries | ForEach-Object { Write-Host " - $($_.Name) -> wrapper: $($_.Wrapper) (port $($_.Port))" }
Write-Host ""
Write-Host "Notes:"
Write-Host " - Customer wrapper sets PORT=$CustomerPort (default 3004)."
Write-Host " - Wrappers prefer existing repo launchers named launch_<app>_presentation.ps1 if present."
Write-Host " - Logs are written to artifacts\\demo-logs\\"