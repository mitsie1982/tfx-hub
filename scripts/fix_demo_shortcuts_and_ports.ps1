param(
  [string]$RepoRoot = (Get-Location).Path,
  [int]$ContractorPort = 3002,
  [int]$CustomerPort = 3001,
  [int]$AmsPort = 3000,
  [int]$MembersPort = 3003
)

$ErrorActionPreference = 'Stop'
$scriptsDir = Join-Path $RepoRoot 'scripts'
New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
$logDir = Join-Path $RepoRoot 'artifacts\demo-logs'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$desktop = [Environment]::GetFolderPath('Desktop')
$psExe = (Get-Command powershell.exe).Source
$shell = New-Object -ComObject WScript.Shell

$entries = @(
  @{ Name='Theuns - Contractor'; Wrapper='launch_contractor_wrapper.ps1'; AppRel='apps\contractor-app'; Port=$ContractorPort },
  @{ Name='Michelle - Customer';   Wrapper='launch_customer_wrapper.ps1';   AppRel='apps\customer-app';   Port=$CustomerPort },
  @{ Name='Demo AMS';        Wrapper='launch_ams_wrapper.ps1';        AppRel='apps\ams-app';        Port=$AmsPort },
  @{ Name='Demo Members';    Wrapper='launch_members_wrapper.ps1';    AppRel='apps\members-app';    Port=$MembersPort }
)

function Ensure-Wrapper {
  param($wrapperName,$appRel,$port)
  $wrapperPath = Join-Path $scriptsDir $wrapperName
  $appPath = Join-Path $RepoRoot $appRel
  New-Item -ItemType Directory -Path $appPath -Force | Out-Null

  $launcherCandidate = Join-Path $scriptsDir ("launch_{0}_presentation.ps1" -f (($wrapperName -replace '\.ps1$','') -replace '^launch_',''))
  $content = @"
# Auto-generated wrapper: $wrapperName
`$env:PORT = '$port'
Set-Location `"$appPath`"
`$logDir = Join-Path `"$RepoRoot`" 'artifacts\demo-logs'
New-Item -ItemType Directory -Path `$logDir -Force | Out-Null

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

  # Write or overwrite wrapper with correct port
  $content | Out-File -FilePath $wrapperPath -Encoding UTF8 -Force
  Unblock-File -Path $wrapperPath -ErrorAction SilentlyContinue
  return $wrapperPath
}

function Create-Shortcut {
  param($name,$wrapperPath)
  $link = Join-Path $desktop ("$name.lnk")
  if (Test-Path $link) { Remove-Item -Path $link -Force }
  $sc = $shell.CreateShortcut($link)
  $sc.TargetPath = $psExe
  $sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$wrapperPath`""
  $sc.WorkingDirectory = Split-Path $wrapperPath -Parent
  $sc.IconLocation = "shell32.dll, 1"
  $sc.Description = "Launch $name"
  $sc.Save()
  Write-Host "Created shortcut: $link"
}

# Ensure wrappers and shortcuts
$created = @()
foreach ($e in $entries) {
  $wrapper = Ensure-Wrapper -wrapperName $e.Wrapper -appRel $e.AppRel -port $e.Port
  Create-Shortcut -name $e.Name -wrapperPath $wrapper
  $created += @{ Name=$e.Name; Wrapper=$wrapper; Port=$e.Port }
}

# Patch orchestrator ports if present
$orch = Join-Path $scriptsDir 'present_all_demos_and_arrange.ps1'
if (Test-Path $orch) {
  $text = Get-Content -Path $orch -Raw
  # Replace the demos array block ports robustly
  $text = $text -replace "Port\\s*=\\s*\\d+\\s*\\)\\s*,\\s*#\\s*<-.*?Contractor", "Port = $ContractorPort ) , # <- Contractor" -replace "Port\\s*=\\s*\\d+\\s*\\)\\s*,\\s*#\\s*<-.*?Customer", "Port = $CustomerPort ) , # <- Customer"
  # Simpler approach: replace known lines if present
  $text = $text -replace "Contractor'.*?Port=\\s*\\d+", "Contractor'; Path = Join-Path \$RepoRoot 'apps\\contractor-app'; Port=$ContractorPort"
  $text = $text -replace "Customer'.*?Port=\\s*\\d+", "Customer'; Path = Join-Path \$RepoRoot 'apps\\customer-app'; Port=$CustomerPort"
  $text = $text -replace "AMS'.*?Port=\\s*\\d+", "AMS'; Path = Join-Path \$RepoRoot 'apps\\ams-app'; Port=$AmsPort"
  $text = $text -replace "Members'.*?Port=\\s*\\d+", "Members'; Path = Join-Path \$RepoRoot 'apps\\members-app'; Port=$MembersPort"
  # Write back
  $text | Out-File -FilePath $orch -Encoding UTF8 -Force
  Write-Host "Patched orchestrator ports in $orch"
} else {
  Write-Host "Orchestrator not found at $orch; skipping patch."
}

# Verification: show wrapper heads and shortcut targets
Write-Host "`nVerification summary:"
foreach ($c in $created) {
  Write-Host " - $($c.Name): wrapper=$($c.Wrapper) port=$($c.Port)"
  Write-Host "   wrapper head:"
  Get-Content $c.Wrapper -TotalCount 20 | ForEach-Object { Write-Host "     $_" }
  $lnk = Join-Path $desktop ("$($c.Name).lnk")
  if (Test-Path $lnk) {
    $sc = $shell.CreateShortcut($lnk)
    Write-Host "   shortcut target: $($sc.TargetPath) $($sc.Arguments)"
  } else {
    Write-Host "   shortcut missing: $lnk"
  }
}

Write-Host "`nDone. If a browser still shows the wrong port, close the browser window and re-open via the Desktop shortcut."
