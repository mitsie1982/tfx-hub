# scripts/fix_and_seed_demo_environment.ps1
# Idempotent fixer and placeholder generator for Windows demo shortcuts and apps.
# - Creates minimal placeholder apps when package.json is missing
# - Creates launcher wrappers that log output and keep the window open
# - Recreates Desktop shortcuts pointing to the launcher wrappers
# - Updates VS Code tasks to run the launcher wrappers
# Run elevated: Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass; .\scripts\fix_and_seed_demo_environment.ps1

param(
  [string]$RepoRoot = (Get-Location).Path,
  [switch]$ForceRecreateShortcuts
)

$ErrorActionPreference = "Stop"
Write-Host "Fix and seed demo environment starting in $RepoRoot"

$scriptsDir   = Join-Path $RepoRoot "scripts"
$appsDir      = Join-Path $RepoRoot "apps"
$artifactsDir = Join-Path $RepoRoot "artifacts"
$logDir       = Join-Path $artifactsDir "demo-logs"
$vscodeDir    = Join-Path $RepoRoot ".vscode"
New-Item -ItemType Directory -Path $scriptsDir   -Force | Out-Null
New-Item -ItemType Directory -Path $appsDir       -Force | Out-Null
New-Item -ItemType Directory -Path $artifactsDir  -Force | Out-Null
New-Item -ItemType Directory -Path $logDir        -Force | Out-Null
New-Item -ItemType Directory -Path $vscodeDir     -Force | Out-Null

$demos = @(
  @{ Name = "Demo Contractor"; AppFolder = "contractor-app"; StartScript = (Join-Path $scriptsDir "start_contractor_demo.ps1") },
  @{ Name = "Demo Customer";   AppFolder = "customer-app";   StartScript = (Join-Path $scriptsDir "start_customer_demo.ps1")   },
  @{ Name = "Demo AMS";        AppFolder = "ams-app";        StartScript = (Join-Path $scriptsDir "start_ams_demo.ps1")        },
  @{ Name = "Demo Members";    AppFolder = "members-app";    StartScript = (Join-Path $scriptsDir "start_members_demo.ps1")    }
)

function Ensure-StartScript {
  param($StartScriptPath, $AppPath)
  if (-not (Test-Path $StartScriptPath)) {
    $c = "# Auto-generated start script`nparam([string]`$Mode = `"dev`")`n`$AppDir = `"$AppPath`"`nif (-not (Test-Path `$AppDir)) { Write-Host `"App directory missing: `$AppDir`"; exit 1 }`nSet-Location `$AppDir`nWrite-Host `"Starting demo in `$AppDir Mode=`$Mode`"`nif (Get-Command pnpm -ErrorAction SilentlyContinue) { pnpm start } elseif (Get-Command npm -ErrorAction SilentlyContinue) { npm run start } else { node server.js }"
    $c | Out-File -FilePath $StartScriptPath -Encoding UTF8 -Force
    Unblock-File -Path $StartScriptPath -ErrorAction SilentlyContinue
    Write-Host "  [CREATED] start script: $StartScriptPath"
  } else {
    Write-Host "  [OK]      start script: $StartScriptPath"
  }
}

function Ensure-PlaceholderApp {
  param($AppFolderName)
  $appPath = Join-Path $appsDir $AppFolderName
  if (-not (Test-Path $appPath)) { New-Item -ItemType Directory -Path $appPath -Force | Out-Null; Write-Host "  [CREATED] app folder: $appPath" }
  $pkg    = Join-Path $appPath "package.json"
  $server = Join-Path $appPath "server.js"
  if (-not (Test-Path $pkg)) {
    @{ name = $AppFolderName; version = "0.0.1"; private = $true; scripts = @{ start = "node server.js" } } | ConvertTo-Json -Depth 4 | Out-File -FilePath $pkg -Encoding UTF8 -Force
    Write-Host "  [CREATED] package.json: $pkg"
  } else { Write-Host "  [OK]      package.json: $pkg" }
  if (-not (Test-Path $server)) {
    "const http = require(`"http`"); const port = process.env.PORT || 3000; console.log(`"Placeholder $AppFolderName on port`", port); http.createServer((req,res)=>{ res.writeHead(200,{`"Content-Type`":`"text/plain`"}); res.end(`"Placeholder $AppFolderName\n`"); }).listen(port, ()=>console.log(`"Listening on`",port));" | Out-File -FilePath $server -Encoding UTF8 -Force
    Write-Host "  [CREATED] server.js: $server"
  } else { Write-Host "  [OK]      server.js: $server" }
  return $appPath
}

function New-Launcher {
  param($TargetScript, $LauncherPath)
  $ts       = (Get-Date).ToString("yyyyMMddTHHmmss")
  $base     = [IO.Path]::GetFileNameWithoutExtension($TargetScript)
  $logFile  = Join-Path $logDir ("${base}_launch_${ts}.log")
  $body  = "# Launcher wrapper for $base`nparam([string]`$Mode = `"dev`")`nWrite-Host `"Launcher starting: $TargetScript (Mode=`$Mode)`"`nWrite-Host `"Log: $logFile`"`ntry { & powershell -NoProfile -ExecutionPolicy Bypass -File `"$TargetScript`" -Mode `$Mode 2>&1 | Tee-Object -FilePath `"$logFile`" } catch { Write-Error `"Launcher failed: `$(`$_.Exception.Message)`" }`nWrite-Host `"Done. Press Enter to close.`"; Read-Host"
  $body | Out-File -FilePath $LauncherPath -Encoding UTF8 -Force
  Unblock-File -Path $LauncherPath -ErrorAction SilentlyContinue
  return $logFile
}

function Create-Shortcut {
  param($ShortcutName, $LauncherScriptPath, $WorkingDirectory)
  $desktop   = [Environment]::GetFolderPath("Desktop")
  $linkPath  = Join-Path $desktop "${ShortcutName}.lnk"
  $psExe     = (Get-Command powershell.exe).Source
  $arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Normal -File `"$LauncherScriptPath`""
  $sh        = New-Object -ComObject WScript.Shell
  $lnk       = $sh.CreateShortcut($linkPath)
  $lnk.TargetPath       = $psExe
  $lnk.Arguments        = $arguments
  $lnk.WorkingDirectory = $WorkingDirectory
  $lnk.WindowStyle      = 1
  $lnk.IconLocation     = "shell32.dll, 1"
  $lnk.Description      = "Launch $ShortcutName demo"
  $lnk.Save()
  Write-Host "  [SHORTCUT] $linkPath"
  Write-Host "    -> $psExe $arguments"
}

function Update-VSCodeTasks {
  param($LauncherEntries)
  $tasksPath = Join-Path $vscodeDir "tasks.windows-demo.json"
  $existing  = @{ version = "2.0.0"; tasks = @() }
  if (Test-Path $tasksPath) { try { $existing = Get-Content $tasksPath -Raw | ConvertFrom-Json } catch {} }
  $demoLabels = $LauncherEntries | ForEach-Object { $_.Label }
  $kept       = @($existing.tasks | Where-Object { $_.label -notin $demoLabels })
  $newTasks   = $LauncherEntries | ForEach-Object {
    [PSCustomObject]@{ label = $_.Label; type = "shell"; command = "powershell -NoProfile -ExecutionPolicy Bypass -File `"$($_.Launcher)`""; presentation = @{ reveal = "always"; panel = "new"; clear = $true; echo = $true }; group = @{ kind = "test"; isDefault = $false } }
  }
  @{ version = "2.0.0"; tasks = @($kept + $newTasks) } | ConvertTo-Json -Depth 6 | Out-File -FilePath $tasksPath -Encoding UTF8 -Force
  Write-Host "  [TASKS]   $tasksPath"
}

$launcherEntries = @()
foreach ($d in $demos) {
  $name        = $d.Name
  $appFolder   = $d.AppFolder
  $startScript = $d.StartScript
  $appPath     = Join-Path $appsDir $appFolder
  Write-Host ""
  Write-Host "Processing: $name"
  Ensure-StartScript -StartScriptPath $startScript -AppPath $appPath
  if (-not (Test-Path (Join-Path $appPath "package.json"))) {
    Write-Host "  No package.json -- creating placeholder."
    Ensure-PlaceholderApp -AppFolderName $appFolder | Out-Null
  } else { Write-Host "  [OK] App: $appPath" }
  $baseName     = [IO.Path]::GetFileNameWithoutExtension($startScript)
  $launcherPath = Join-Path $scriptsDir "${baseName}_launcher.ps1"
  $logFile      = New-Launcher -TargetScript $startScript -LauncherPath $launcherPath
  Write-Host "  [LAUNCHER] $launcherPath"
  $lnkFile = Join-Path ([Environment]::GetFolderPath("Desktop")) "${name}.lnk"
  if ($ForceRecreateShortcuts -or -not (Test-Path $lnkFile)) {
    Create-Shortcut -ShortcutName $name -LauncherScriptPath $launcherPath -WorkingDirectory $scriptsDir
  } else { Write-Host "  [OK] Shortcut exists (use -ForceRecreateShortcuts to rebuild)" }
  $launcherEntries += @{ Label = $name; Launcher = $launcherPath; Log = $logFile }
}

Write-Host ""
Update-VSCodeTasks -LauncherEntries $launcherEntries

Write-Host ""
Write-Host "========================================"
Write-Host "  fix_and_seed_demo_environment: DONE"
Write-Host "========================================"
Write-Host "Logs: $logDir"
Write-Host "Double-click a Desktop shortcut to launch. The launcher keeps the window open and writes a timestamped log."
Write-Host "To force-recreate all shortcuts: .\scripts\fix_and_seed_demo_environment.ps1 -ForceRecreateShortcuts"
