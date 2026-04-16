$ErrorActionPreference = 'Stop'

$taskName = 'Local Live Stack At Sign-In'
$taskPath = '\TFXHub\'

try {
  Get-ScheduledTask -TaskName $taskName -TaskPath $taskPath -ErrorAction Stop | Out-Null
} catch {
  Write-Output 'Local live stack auto-start is already absent.'
  exit 0
}

Unregister-ScheduledTask -TaskName $taskName -TaskPath $taskPath -Confirm:$false
Write-Output 'Local live stack auto-start removed.'