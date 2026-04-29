$ErrorActionPreference = 'Stop'

$containerName = 'tfxhub-mailpit-smoke'

function Remove-MailpitContainerIfExists {
  $existing = docker ps -aq -f "name=^${containerName}$" 2>$null
  if ($existing) {
    docker rm -f $containerName 2>$null | Out-Null
  }
}

try {
  Remove-MailpitContainerIfExists

  Write-Host 'Starting Mailpit container...'
  docker run --name $containerName -p 1025:1025 -p 8025:8025 -d axllent/mailpit | Out-Null

  $ready = $false
  for ($i = 0; $i -lt 30; $i++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8025/api/v1/info' -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        $ready = $true
        break
      }
    } catch {
    }

    Start-Sleep -Seconds 1
  }

  if (-not $ready) {
    docker logs $containerName
    throw 'Mailpit did not become ready in time.'
  }

  Write-Host 'Running password reset SMTP smoke test...'
  node "$PSScriptRoot/smoke_password_reset_smtp.js"
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Remove-MailpitContainerIfExists
}
