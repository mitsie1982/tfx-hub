param(
  [string]$CodePath = $null
)

$ErrorActionPreference = 'Stop'
$regPath = 'HKCU:\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers'

Write-Host "Locating VS Code executable..."
if (-not $CodePath) {
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe",
    "$env:ProgramFiles\Microsoft VS Code\Code.exe",
    "$env:ProgramFiles(x86)\Microsoft VS Code\Code.exe"
  )
  $CodePath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $CodePath) {
    Write-Error "VS Code executable not found in common locations. Provide -CodePath to the script."
    exit 1
  }
}

Write-Host "Using Code.exe at: $CodePath"

# Ensure elevated
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Script must be run elevated. The VS Code task will prompt UAC; run the task and approve the prompt."
  exit 2
}

# Backup existing value if present
New-Item -Path $regPath -Force | Out-Null
$existing = $null
try { $existing = Get-ItemProperty -Path $regPath -Name $CodePath -ErrorAction SilentlyContinue } catch {}
if ($existing) {
  $bakPath = Join-Path -Path (Split-Path -Parent $CodePath) -ChildPath ("Code.exe.compat.bak.$((Get-Date).ToString('yyyyMMddTHHmmss')).txt")
  $existingValue = (Get-ItemProperty -Path $regPath -Name $CodePath).$CodePath
  $existingValue | Out-File -FilePath $bakPath -Encoding UTF8
  Write-Host "Backed up existing compatibility value to $bakPath"
}

# Set RUNASADMIN flag for current user
Set-ItemProperty -Path $regPath -Name $CodePath -Value "~ RUNASADMIN" -Force
Write-Host "Set registry $regPath -> $CodePath = '~ RUNASADMIN'"

# Confirm
$confirm = (Get-ItemProperty -Path $regPath -Name $CodePath).$CodePath
Write-Host "Confirmed registry value: $confirm"
Write-Host "Done. Close and relaunch VS Code from your normal shortcut to run elevated."
