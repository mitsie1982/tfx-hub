# scripts/fix_start_process_quoting.ps1
param([string]$RepoRoot = (Get-Location).Path)

$apps = @(
  @{ Name='Contractor'; Path = Join-Path $RepoRoot 'packages\contractor-app'; Port=3001 },
  @{ Name='Customer';   Path = Join-Path $RepoRoot 'packages\customer-app';   Port=3000 },
  @{ Name='AMS';        Path = Join-Path $RepoRoot 'packages\ams-app';        Port=3002 },
  @{ Name='Members';    Path = Join-Path $RepoRoot 'packages\members-app';    Port=3003 }
)

foreach ($a in $apps) {
  New-Item -ItemType Directory -Path $a.Path -Force | Out-Null

  $wrapper = Join-Path $a.Path 'run_server_wrapper.ps1'
  if (-not (Test-Path $wrapper)) {
    @"
param([int]`$Port = $($a.Port))
Set-Location `"$PSScriptRoot`"
`$env:PORT = `$Port
if (Test-Path pnpm-lock.yaml) { Write-Host 'pnpm lock found; skipping auto-install' }
# Start server and log output
node server.js 2>&1 | Tee-Object -FilePath `"$PSScriptRoot\server.log`"
"@ | Out-File -FilePath $wrapper -Encoding UTF8 -Force
    Unblock-File -Path $wrapper -ErrorAction SilentlyContinue
    Write-Host "WROTE wrapper: $wrapper"
  } else {
    Write-Host "Wrapper exists: $wrapper"
  }

  # Start wrapper in a new PowerShell window (keeps visible)
  $psExe = (Get-Command powershell.exe).Source
  $args = '-NoProfile','-ExecutionPolicy','Bypass','-NoExit','-File',$wrapper
  Start-Process -FilePath $psExe -ArgumentList $args -WorkingDirectory $a.Path | Out-Null
  Write-Host "Launched wrapper for $($a.Name) at $($a.Path)"
}
