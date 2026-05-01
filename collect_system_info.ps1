# Automated System Info Collection Script (Run as Administrator)

# Create output directory if it doesn't exist
$outDir = Join-Path $PSScriptRoot 'out'
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

# Basic system summary
systeminfo | Out-File -FilePath (Join-Path $outDir 'systeminfo.txt') -Encoding utf8

# CPU details
Get-CimInstance -ClassName Win32_Processor |
    Select-Object Name, MaxClockSpeed, NumberOfCores, NumberOfLogicalProcessors |
    Format-Table -AutoSize |
    Out-File (Join-Path $outDir 'cpu.txt') -Encoding utf8

# Memory details
Get-CimInstance -ClassName Win32_PhysicalMemory |
    Select-Object BankLabel, Capacity, Speed, DeviceLocator, Manufacturer |
    Format-Table -AutoSize |
    Out-File (Join-Path $outDir 'memory.txt') -Encoding utf8

# Storage devices
Get-PhysicalDisk |
    Format-Table -AutoSize |
    Out-File (Join-Path $outDir 'physicaldisks.txt') -Encoding utf8

Get-Volume |
    Format-Table -AutoSize |
    Out-File (Join-Path $outDir 'volumes.txt') -Encoding utf8

Write-Host "System information collection complete. Output saved to $outDir."
