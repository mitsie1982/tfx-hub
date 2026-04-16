$ErrorActionPreference = 'Stop'

$taskName = 'Local Live Stack At Sign-In'
$taskPath = '\TFXHub\'

try {
  $task = Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction Stop
  $taskInfo = Get-ScheduledTaskInfo -TaskName $taskName -TaskPath $taskPath -ErrorAction Stop

  Write-Output 'Local live stack auto-start status'
  Write-Output ('Task: ' + $taskPath + $taskName)
  Write-Output ('State: ' + $task.State)
  Write-Output ('Enabled: ' + $task.Settings.Enabled)
  Write-Output ('Last run time: ' + $taskInfo.LastRunTime)
  Write-Output ('Last task result: ' + $taskInfo.LastTaskResult)
  Write-Output ('Next run time: ' + $taskInfo.NextRunTime)
  Write-Output ('Author: ' + $task.Principal.UserId)
  exit 0
} catch {
  Write-Output 'Local live stack auto-start status'
  Write-Output 'Task: missing'
  exit 0
}