# verify_vs_code_automation.ps1
Write-Output 'Verifying VS Code automation state...'
if (Get-Command code -ErrorAction SilentlyContinue) {
  Write-Output 'Installed VS Code extensions:'
  code --list-extensions
} else {
  Write-Warning 'code CLI not found; cannot list installed extensions.'
}
if (Test-Path 'scripts/policy_check.py') {
  Write-Output 'Running policy_check.py...'
  python .\scripts\policy_check.py
  if (0 -ne 0) { Write-Error 'policy_check failed.'; exit 2 }
} else {
  Write-Warning 'scripts/policy_check.py not found; run bootstrap first.'
}
Write-Output 'Verification complete.'
