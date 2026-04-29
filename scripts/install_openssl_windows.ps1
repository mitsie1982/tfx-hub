# Automated OpenSSL Installer for Windows (Admin Required)
# Downloads and installs OpenSSL, adds to PATH

$ErrorActionPreference = 'Stop'

# Download URL for OpenSSL (64-bit Light version)
$opensslUrl = "https://slproweb.com/download/Win64OpenSSL_Light-3_3_0.exe"
$installer = "$env:TEMP\Win64OpenSSL_Light.exe"

Write-Host "Downloading OpenSSL installer..."
Invoke-WebRequest -Uri $opensslUrl -OutFile $installer

# Run installer as admin, silent mode
Write-Host "Running OpenSSL installer as Administrator..."
Start-Process -FilePath $installer -ArgumentList "/silent" -Verb RunAs -Wait

# Default install path
$opensslPath = "C:\Program Files\OpenSSL-Win64\bin"

# Add to system PATH if not already present
$envPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
if (-not $envPath.Split(';') -contains $opensslPath) {
    Write-Host "Adding OpenSSL to system PATH..."
    [Environment]::SetEnvironmentVariable("Path", "$envPath;$opensslPath", [EnvironmentVariableTarget]::Machine)
    Write-Host "You may need to restart your terminal for PATH changes to take effect."
} else {
    Write-Host "OpenSSL path already present in system PATH."
}

Write-Host "OpenSSL installation complete."
