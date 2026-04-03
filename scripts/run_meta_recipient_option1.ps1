param(
  [Parameter(Mandatory = $true)]
  [string]$VerifyToken,

  [Parameter(Mandatory = $true)]
  [string]$AccessToken,

  [Parameter(Mandatory = $true)]
  [string]$PhoneNumberId,

  [string]$SenderNumber,

  [string]$Recipient = '082 345 3105',

  [switch]$StartApi
)

function Normalize-WhatsAppRecipient {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Value
  )

  $digits = ($Value -replace '\D', '')
  if (-not $digits) {
    throw 'Recipient number is empty after normalization.'
  }

  if ($digits.StartsWith('27')) {
    return $digits
  }

  if ($digits.StartsWith('0')) {
    return "27$($digits.Substring(1))"
  }

  return $digits
}

$normalizedRecipient = Normalize-WhatsAppRecipient -Value $Recipient

$env:WHATSAPP_WEBHOOK_TOKEN = $VerifyToken
$env:WHATSAPP_ACCESS_TOKEN = $AccessToken
$env:WHATSAPP_PHONE_NUMBER_ID = $PhoneNumberId
$env:WHATSAPP_TEST_RECIPIENT = $normalizedRecipient
if ($SenderNumber) {
  $env:WHATSAPP_SENDER_NUMBER = Normalize-WhatsAppRecipient -Value $SenderNumber
}

Write-Host "Configured Meta live smoke test for recipient $normalizedRecipient"
Write-Host 'Using a separate Meta sender via WHATSAPP_PHONE_NUMBER_ID.'

node .\scripts\meta_whatsapp_option1_preflight.js
if ($LASTEXITCODE -ne 0) {
  throw 'Meta Option 1 preflight failed. Fix the reported issues before running the live smoke test.'
}

if ($StartApi) {
  Start-Process powershell -ArgumentList '-NoExit', '-Command', 'Set-Location "c:\Users\1hans\tfx-hub"; pnpm.cmd run start:api'
  Start-Sleep -Seconds 3
}

pnpm.cmd run smoke:api:meta:whatsapp