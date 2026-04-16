param(
  [Parameter(Mandatory = $true)]
  [string]$WorkingDirectory,

  [Parameter(Mandatory = $true)]
  [string]$LogFile,

  [string]$Port,

  [switch]$ApiServer
)

$ErrorActionPreference = 'Stop'

Set-Location $WorkingDirectory

New-Item -ItemType File -Force -Path $LogFile | Out-Null
Add-Content -Path $LogFile -Value ("starting process at " + (Get-Date -Format o) + " in " + $WorkingDirectory)

if ($Port) {
  $env:PORT = $Port
} else {
  Remove-Item Env:PORT -ErrorAction SilentlyContinue
}

try {
  if ($ApiServer) {
    $env:TFX_ADMIN_USERNAME = 'local-admin-secret'
    $env:TFX_ADMIN_EMAIL = 'admin@example.com'
    $env:TFX_ADMIN_PASSWORD = 'change-this-admin-password'
    $env:TFX_ADMIN_ALLOW_AFTER_HOURS = 'true'
    $env:TFX_API_ENABLE_DEMO_SEED = 'true'
    $env:DB_HOST = '127.0.0.1'
    $env:DB_PORT = '5433'
    $env:DB_USER = 'postgres'
    $env:DB_PASSWORD = ''
    $env:DB_NAME = 'tfx_hub'
    Add-Content -Path $LogFile -Value ('starting api-server on port ' + $env:PORT)
    node src/server.js *>> $LogFile
    exit $LASTEXITCODE
  }

  Add-Content -Path $LogFile -Value ('starting browser host (server.js) on port ' + $env:PORT)
  node server.js *>> $LogFile
  exit $LASTEXITCODE
} catch {
  Add-Content -Path $LogFile -Value ('startup failed: ' + $_.Exception.Message)
  throw
}