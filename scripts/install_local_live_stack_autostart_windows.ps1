param(
  [int]$DelaySeconds = 20
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$launcherScript = Join-Path $PSScriptRoot 'run_local_live_stack_autostart_launcher_windows.ps1'
$taskName = 'Local Live Stack At Sign-In'
$taskPath = '\TFXHub\'
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$delay = [TimeSpan]::FromSeconds([Math]::Max($DelaySeconds, 0))
$delayIso = 'PT' + [int]$delay.TotalSeconds + 'S'

if (-not (Test-Path $launcherScript)) {
  throw ('Launcher script not found: ' + $launcherScript)
}

$taskArguments = @(
  '-NoLogo',
  '-NoProfile',
  '-WindowStyle',
  'Hidden',
  '-ExecutionPolicy',
  'Bypass',
  '-File',
  ('"' + $launcherScript + '"')
) -join ' '

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $taskArguments
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$trigger.Delay = $delayIso
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId $currentUser -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description 'Starts the TFX Hub local live stack after Windows sign-in for presentation readiness.' -Force | Out-Null

$task = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath
$taskInfo = Get-ScheduledTaskInfo -TaskName $taskName -TaskPath $taskPath

Write-Output 'Local live stack auto-start installed.'
Write-Output ('Task: ' + $taskPath + $taskName)
Write-Output ('User: ' + $currentUser)
Write-Output ('Delay seconds: ' + [int]$delay.TotalSeconds)
Write-Output ('State: ' + $task.State)
Write-Output ('Last run time: ' + $taskInfo.LastRunTime)
Write-Output ('Next run time: ' + $taskInfo.NextRunTime)
