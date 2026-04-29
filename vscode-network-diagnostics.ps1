<#
vscode-network-diagnostics.ps1
Usage:
  From PowerShell (in VS Code): .\vscode-network-diagnostics.ps1
  Optional: pass -HostName to target a specific host (default: api.openai.com)

What it does:
  - Runs connectivity and DNS resolution checks
  - Flushes DNS cache (Windows)
  - Restarts DNS client service (Windows) if possible
  - Shows proxy environment variables and VS Code network settings
  - Tests TCP connectivity to the host on port 443
  - Prints recommended non-invasive remediation commands
#>

param(
  [string]$HostName = "api.openai.com"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

function Info($m) { Write-Host "[INFO] $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "[WARN] $m" -ForegroundColor Yellow }
function Err($m)  { Write-Host "[ERROR] $m" -ForegroundColor Red }

Info "Target host: $HostName"
Write-Host ""

# --- Admin Elevation Check ---
function Ensure-Admin {
  $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal $currentIdentity
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Warn "Not running as Administrator. Relaunching with elevation..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = 'powershell.exe'
    $psi.Arguments = "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -HostName '$HostName'"
    $psi.Verb = 'runas'
    try {
      [System.Diagnostics.Process]::Start($psi) | Out-Null
    } catch {
      Err "Elevation cancelled or failed. Some fixes may not work."
      exit 1
    }
    exit 0
  }
}
Ensure-Admin

# --- UTF-8 Logging Setup ---
$logPath = "out/vscode_network_diagnostics.txt"
if (!(Test-Path out)) { New-Item -ItemType Directory -Path out | Out-Null }
function Log($msg) {
  $msg | Out-File -FilePath $logPath -Encoding utf8 -Append
}
Log "[INFO] Target host: $HostName"

# --- Diagnostics ---
function Run-Diagnostics {
  Info "Checking DNS resolution..."
  try {
    $dns = Resolve-DnsName $HostName -ErrorAction Stop
    Info "DNS resolved: $($dns.IPAddress)"
    Log "[INFO] DNS resolved: $($dns.IPAddress)"
    $dnsOk = $true
  } catch {
    Err "DNS resolution failed for $HostName"
    Log "[ERROR] DNS resolution failed for $HostName"
    $dnsOk = $false
  }

  Info "Testing TCP connectivity to $HostName:443..."
  try {
    $tcp = Test-NetConnection -ComputerName $HostName -Port 443 -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
      Info "TCP connection succeeded."
      Log "[INFO] TCP connection succeeded."
      $tcpOk = $true
    } else {
      Err "TCP connection failed."
      Log "[ERROR] TCP connection failed."
      $tcpOk = $false
    }
  } catch {
    Err "TCP test failed."
    Log "[ERROR] TCP test failed."
    $tcpOk = $false
  }

  Info "Proxy environment variables:"
  $proxyVars = @('HTTP_PROXY','HTTPS_PROXY','NO_PROXY','http_proxy','https_proxy','no_proxy')
  foreach ($v in $proxyVars) {
    $val = [Environment]::GetEnvironmentVariable($v)
    if ($val) { Info "$v=$val"; Log "[INFO] $v=$val" }
  }

  Info "VS Code proxy settings (if available):"
  $vscodeSettings = "$env:APPDATA\\Code\\User\\settings.json"
  if (Test-Path $vscodeSettings) {
    $settings = Get-Content $vscodeSettings | Out-String
    $lines = $settings -split "\n"
    foreach ($line in $lines) {
      if ($line -match 'proxy') { Info $line.Trim(); Log "[INFO] $line" }
    }
  }

  return @{ dnsOk = $dnsOk; tcpOk = $tcpOk }
}

# --- Automated Remediation ---
function Auto-Remediate($diag) {
  $fixes = @()
  if (-not $diag.dnsOk) {
    Info "Flushing DNS cache..."
    Log "[ACTION] ipconfig /flushdns"
    ipconfig /flushdns | Tee-Object -FilePath $logPath -Append
    Info "Restarting DNS Client service..."
    try {
      Restart-Service -Name 'Dnscache' -Force -ErrorAction Stop
      Info "DNS Client service restarted."
      Log "[ACTION] DNS Client service restarted."
    } catch {
      Warn "Could not restart DNS Client service. Try manually: Restart-Service -Name 'Dnscache' -Force"
      Log "[WARN] Could not restart DNS Client service."
    }
    $fixes += 'dns'
  }
  if (-not $diag.tcpOk) {
    Warn "TCP connectivity failed. Check firewall, VPN, or proxy settings."
    Log "[WARN] TCP connectivity failed. Check firewall, VPN, or proxy."
    $fixes += 'tcp'
  }
  if ($fixes.Count -eq 0) {
    Info "No automated fixes needed."
    Log "[INFO] No automated fixes needed."
  } else {
    Info "Automated remediation attempted for: $($fixes -join ', ')"
    Log "[INFO] Automated remediation attempted for: $($fixes -join ', ')"
  }
}

$diag = Run-Diagnostics
Auto-Remediate $diag

Info "Diagnostics complete. See $logPath for details."
Log "[INFO] Diagnostics complete."
