$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'postgres_tools.ps1')

$repoRoot = Split-Path -Parent $PSScriptRoot
$artifactsDir = Join-Path $repoRoot 'artifacts'
$pgBin = Resolve-PostgresBin -AllowMissing
$pgCtl = Join-Path $pgBin 'pg_ctl.exe'
$dataDir = Join-Path $artifactsDir 'pg-local18'
$pgLog = Join-Path $artifactsDir 'pg-local18-server.log'

function Assert-Condition {
  param(
    [bool]$Condition,
    [string]$Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

Set-Location $repoRoot

if ($pgBin -and (Test-Path $pgCtl)) {
  & $pgCtl -D $dataDir status 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    & $pgCtl -D $dataDir -l $pgLog -o ' -p 5433 ' start | Out-Host
  }
}

$adminBody = @{ identifier = 'local-admin-secret'; password = 'change-this-admin-password' } | ConvertTo-Json
$adminLogin = Invoke-RestMethod -Uri 'http://localhost:5005/auth/login' -Method POST -ContentType 'application/json' -Body $adminBody
Assert-Condition ($adminLogin.user.username -eq 'local-admin-secret') 'API admin login failed.'

$membersPage = Invoke-WebRequest -Uri 'http://localhost:3003' -UseBasicParsing
Assert-Condition ($membersPage.Content -match 'Live members data connected') 'Members host is not connected to the live API.'

$amsSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$amsLogin = Invoke-WebRequest -Uri 'http://localhost:3000/actions/login' -Method POST -Body @{ identifier = 'local-admin-secret'; password = 'change-this-admin-password' } -WebSession $amsSession -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
$amsPage = Invoke-WebRequest -Uri ('http://localhost:3000' + $amsLogin.Headers.Location) -WebSession $amsSession -UseBasicParsing
Assert-Condition ($amsPage.Content -match 'Live admin data connected') 'AMS host did not switch to live mode after sign-in.'

$customerSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$customerLogin = Invoke-WebRequest -Uri 'http://localhost:3001/actions/login' -Method POST -Body @{ email = 'client@example.com'; password = 'password123' } -WebSession $customerSession -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
$customerPage = Invoke-WebRequest -Uri ('http://localhost:3001' + $customerLogin.Headers.Location) -WebSession $customerSession -UseBasicParsing
Assert-Condition (-not ($customerPage.Content -match 'Sample customer data mode')) 'Customer host did not switch away from sample mode after sign-in.'

$contractorSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$contractorLogin = Invoke-WebRequest -Uri 'http://localhost:3002/actions/login' -Method POST -Body @{ identifier = 'plumber@example.com'; password = 'password123' } -WebSession $contractorSession -MaximumRedirection 0 -UseBasicParsing -ErrorAction SilentlyContinue
$contractorPage = Invoke-WebRequest -Uri ('http://localhost:3002' + $contractorLogin.Headers.Location) -WebSession $contractorSession -UseBasicParsing
Assert-Condition ($contractorPage.Content -match 'Live contractor data connected') 'Contractor host did not switch to live mode after sign-in.'

Write-Output 'Local live stack smoke passed.'
Write-Output 'API: local-admin-secret authenticated on 5005'
Write-Output 'AMS: live mode after sign-in'
Write-Output 'Customer: live mode after sign-in'
Write-Output 'Contractor: live mode after sign-in'
Write-Output 'Members: live mode without fallback'