# scripts/fix_vscode_admin_shortcut.ps1

$desktop = [Environment]::GetFolderPath('Desktop')
$scriptPath = Join-Path (Get-Location) "scripts\launch_vscode_admin.ps1"

$shell = New-Object -ComObject WScript.Shell
$linkPath = Join-Path $desktop "VS Code (Admin).lnk"

if (Test-Path $linkPath) {
  Remove-Item $linkPath -Force
}

$sc = $shell.CreateShortcut($linkPath)
$sc.TargetPath = "powershell.exe"
$sc.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$sc.WorkingDirectory = (Get-Location)
$sc.IconLocation = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
$sc.Description = "Launch VS Code as Administrator"
$sc.Save()

Write-Host "VS Code Admin shortcut recreated successfully."
