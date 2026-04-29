param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('contractor', 'customer', 'ams', 'members')]
  [string]$App
)
  $wshell = New-Object -ComObject WScript.Shell
  $wshell.Popup("TFXHub demo shortcut activated: $App", 2, "TFXHub", 0x40)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $PSScriptRoot 'start_local_live_stack_windows.ps1'
$startupMutexName = 'Global\TFXHub.LocalLiveStack.Startup'

$targets = @{
  contractor = @{
    Name = 'Contractor Browser Build'
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
    Name = 'Customer Browser Build'
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
  ams = @{
    Name = 'AMS Browser Build'
    Url = 'http://localhost:3000'
    Port = 3000
    LoginPath = '/actions/login'
    LoginBody = {
      return @{
        identifier = if ($Env:TFX_ADMIN_USERNAME) { $Env:TFX_ADMIN_USERNAME } else { 'local-admin-secret' }
        password = if ($Env:TFX_ADMIN_PASSWORD) { $Env:TFX_ADMIN_PASSWORD } else { 'change-this-admin-password' }
      }
    }
  }
  members = @{
    Name = 'Members Browser Build'
    Url = 'http://localhost:3003'
    Port = 3003
  }
}

$apiTarget = @{
  Port = 5005
}

$target = $targets[$App]

function Resolve-PreferredBrowser {
  $candidates = @(
    'C:\Program Files\Google\Chrome Dev\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome Dev\Application\chrome.exe',
    'C:\Program Files\Google\Chrome\Application\chrome.exe',
    'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
    'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Get-BrowserProfileDirectory {
  param(
    [string]$AppName
  )

  $profileRoot = Join-Path $env:LOCALAPPDATA 'TFXHub\browser-profiles'
  New-Item -ItemType Directory -Force -Path $profileRoot | Out-Null

  $profileDirectory = Join-Path $profileRoot $AppName
  New-Item -ItemType Directory -Force -Path $profileDirectory | Out-Null
  return $profileDirectory
}

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

function Get-StackReadinessIssues {
  param(
    [hashtable]$Target,
    [hashtable]$ApiTarget
  )

  $issues = @()

  if (-not (Test-PortReady -Port $ApiTarget.Port)) {
    $issues += ('API not ready on port ' + $ApiTarget.Port)
  }

  $appPortReady = Test-PortReady -Port $Target.Port
  $appHttpReady = if ($appPortReady) { Test-HttpReady -Url $Target.Url } else { $false }

  if (-not $appPortReady) {
    $issues += ($Target.Name + ' host not ready on port ' + $Target.Port)
  } elseif (-not $appHttpReady) {
    $issues += ($Target.Name + ' HTTP endpoint not ready at ' + $Target.Url)
  }

  return $issues
}

function Test-DemoStackReady {
  param(
    [hashtable]$Target,
    [hashtable]$ApiTarget
  )

  return (
    (Test-PortReady -Port $ApiTarget.Port) -and
    (Test-PortReady -Port $Target.Port) -and
    (Test-HttpReady -Url $Target.Url)
  )
}

function Invoke-WithStartupMutex {
  param(
    [scriptblock]$Action,
    [scriptblock]$ReadyCheck,
    [int]$TimeoutSeconds = 90,
    [int]$PollMilliseconds = 1000
  )

  $createdNew = $false
  $mutex = New-Object System.Threading.Mutex($false, $startupMutexName, [ref]$createdNew)
  $hasHandle = $false
  $waitMessageShown = $false
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)

  try {
    while ((Get-Date) -lt $deadline) {
      $hasHandle = $mutex.WaitOne([TimeSpan]::FromMilliseconds($PollMilliseconds))
      if ($hasHandle) {
        & $Action
        return
      }

      if ($ReadyCheck) {
        if (& $ReadyCheck) {
          Write-Host 'Another shortcut launch already finished starting the local live stack. Reusing it.'
          return
        }

        if (-not $waitMessageShown) {
          Write-Host 'Another shortcut launch is already starting the local live stack. Waiting for it to finish...'
          $waitMessageShown = $true
        }
      }
    }

    if ($ReadyCheck -and (& $ReadyCheck)) {
      Write-Host 'Another shortcut launch already finished starting the local live stack. Reusing it.'
      return
    }

    throw 'Another shortcut launch is still holding the local live stack startup lock and the stack did not become ready in time.'
  } finally {
    if ($hasHandle) {
      $mutex.ReleaseMutex()
    }

    $mutex.Dispose()
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
  if (-not $target.LoginPath -or -not $target.LoginBody) {
    return
  }

  $loginUrl = "$($target.Url)$($target.LoginPath)"
  $loginBody = & $target.LoginBody

  Write-Host "Signing into live $($target.Name)..."
  $response = Invoke-WebRequest -Uri $loginUrl -Method Post -Body $loginBody -ContentType 'application/x-www-form-urlencoded' -UseBasicParsing -TimeoutSec 10
  $responseUri = Get-ResponseUri -Response $response

  if ($responseUri -and $responseUri -match 'warning=') {
    throw "$($target.Name) login completed with a warning. Check the browser host session and demo credentials."
  }
}

function Initialize-DemoStack {
  Invoke-WithStartupMutex -ReadyCheck {
    Test-DemoStackReady -Target $target -ApiTarget $apiTarget
  } -Action {
    $apiReady = Test-PortReady -Port $apiTarget.Port
    $appReady = (Test-PortReady -Port $target.Port) -and (Test-HttpReady -Url $target.Url)

    if (-not ($apiReady -and $appReady)) {
      $issues = Get-StackReadinessIssues -Target $target -ApiTarget $apiTarget
      if ($issues.Count -gt 0) {
        Write-Host ("Starting local live stack for {0} because: {1}" -f $target.Name, ($issues -join '; '))
      } else {
        Write-Host "Starting local live stack for $($target.Name)..."
      }
      & $startScript | Out-Host
    }

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
}

Set-Location $repoRoot
Write-Host "Waiting up to 10 seconds for stack readiness, but will open browser regardless."
$stackJob = Start-Job { Initialize-DemoStack; Invoke-DemoLogin }
$opened = $false
for ($i = 0; $i -lt 10; $i++) {
  Start-Sleep -Seconds 1
  if ($stackJob.State -eq 'Completed' -or $stackJob.State -eq 'Failed') {
    $opened = $true
    break
  }
}
if (-not $opened) {
  Write-Host "Timeout reached. Opening browser even if stack is not ready."
}
$browser = Resolve-PreferredBrowser
if ($browser) {
  $browserProfileDirectory = Get-BrowserProfileDirectory -AppName $App
  Start-Process -FilePath $browser -ArgumentList @(
    "--user-data-dir=$browserProfileDirectory",
    "--app=$($target.Url)"
  )
} else {
  Start-Process $target.Url
}
if (-not $opened) {
  # Wait for stack job to finish in background
  Wait-Job $stackJob | Out-Null
}
