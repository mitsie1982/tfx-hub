param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('contractor', 'customer')]
  [string]$App
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot 'start_local_live_stack_windows.ps1'

$targets = @{
  contractor = @{
    Name = 'Contractor Browser Demo'
    Url = 'http://localhost:3002'
    Port = 3002
    LoginPath = '/actions/login'
    LoginBody = {
      return @{
        identifier = if ($Env:TFX_DEMO_CONTRACTOR_IDENTIFIER) { $Env:TFX_DEMO_CONTRACTOR_IDENTIFIER } else { 'contractor@example.com' }
        password = if ($Env:TFX_DEMO_CONTRACTOR_PASSWORD) { $Env:TFX_DEMO_CONTRACTOR_PASSWORD } else { 'password123' }
      }
    }
  }
  customer = @{
    Name = 'Customer Browser Demo'
    Url = 'http://localhost:3001'
    Port = 3001
    LoginPath = '/actions/login'
    LoginBody = {
      return @{
        email = if ($Env:TFX_DEMO_CUSTOMER_EMAIL) { $Env:TFX_DEMO_CUSTOMER_EMAIL } else { 'client@example.com' }
        password = if ($Env:TFX_DEMO_CUSTOMER_PASSWORD) { $Env:TFX_DEMO_CUSTOMER_PASSWORD } else { 'password123' }
      }
    }
  }
}

$apiTarget = @{
  Port = 5005
}

$target = $targets[$App]

function Test-PortReady {
  param([int]$Port)

  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
    return $null -ne $connection
  } catch {
    return $false
  }
}

function Test-HttpReady {
  param([string]$Url)

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Wait-ForDemoTarget {
  param(
    [string]$Url,
    [int]$Port,
    [string]$Name,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if ((Test-PortReady -Port $Port) -and (Test-HttpReady -Url $Url)) {
      return
    }

    Start-Sleep -Milliseconds 500
  }

  throw "$Name did not become ready within $TimeoutSeconds seconds."
}

function Get-ResponseUri {
  param($Response)

  if ($Response -and $Response.BaseResponse -and $Response.BaseResponse.ResponseUri) {
    return [string]$Response.BaseResponse.ResponseUri
  }

  return $null
}

function Invoke-DemoLogin {
  $loginUrl = "$($target.Url)$($target.LoginPath)"
  $loginBody = & $target.LoginBody

  Write-Host "Signing into live $($target.Name)..."
  $response = Invoke-WebRequest -Uri $loginUrl -Method Post -Body $loginBody -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing -TimeoutSec 10
  $responseUri = Get-ResponseUri -Response $response

  if ($responseUri -and $responseUri -match 'warning=') {
    throw "$($target.Name) login completed with a warning. Check the browser host session and demo credentials."
  }
}

function Ensure-DemoStack {
  $apiReady = Test-PortReady -Port $apiTarget.Port
  $appReady = (Test-PortReady -Port $target.Port) -and (Test-HttpReady -Url $target.Url)

  if ($apiReady -and $appReady) {
    return
  }

  Write-Host "Starting local live stack for $($target.Name)..."
  & $startScript | Out-Host

  $apiDeadline = (Get-Date).AddSeconds(60)
  while ((Get-Date) -lt $apiDeadline) {
    if (Test-PortReady -Port $apiTarget.Port) {
      break
    }

    Start-Sleep -Milliseconds 500
  }

  if (-not (Test-PortReady -Port $apiTarget.Port)) {
    throw 'API server did not become ready within 60 seconds.'
  }

  Wait-ForDemoTarget -Url $target.Url -Port $target.Port -Name $target.Name
}

Set-Location $repoRoot
Ensure-DemoStack
Invoke-DemoLogin

Write-Host "Opening $($target.Name) at $($target.Url)"
Start-Process $target.Url