# Automated AWS CLI Installer for Windows (Admin Required)
# Downloads and installs AWS CLI v2, adds to PATH if needed

$ErrorActionPreference = 'Stop'

# Download URL for AWS CLI v2 (64-bit)
$awscliUrl = "https://awscli.amazonaws.com/AWSCLIV2.msi"
$installer = "$env:TEMP\AWSCLIV2.msi"

Write-Host "Downloading AWS CLI installer..."
Invoke-WebRequest -Uri $awscliUrl -OutFile $installer

# Run installer as admin
Write-Host "Running AWS CLI installer as Administrator..."
Start-Process msiexec.exe -ArgumentList "/i `"$installer`" /qn" -Verb RunAs -Wait

# Default install path
$awscliPath = "C:\Program Files\Amazon\AWSCLIV2"
$binPath = "$awscliPath"

# Add to system PATH if not already present
$envPath = [Environment]::GetEnvironmentVariable("Path", [EnvironmentVariableTarget]::Machine)
if (-not $envPath.Split(';') -contains $binPath) {
    Write-Host "Adding AWS CLI to system PATH..."
    [Environment]::SetEnvironmentVariable("Path", "$envPath;$binPath", [EnvironmentVariableTarget]::Machine)
    Write-Host "You may need to restart your terminal for PATH changes to take effect."
} else {
    Write-Host "AWS CLI path already present in system PATH."
}

Write-Host "AWS CLI installation complete."
