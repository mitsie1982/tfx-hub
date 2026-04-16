$desktop = [Environment]::GetFolderPath('Desktop')
$scriptPath = "$PWD\scripts\launch_vscode_admin.ps1"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("$desktop\VS Code (Admin).lnk")

$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$shortcut.WorkingDirectory = $PWD
$shortcut.IconLocation = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
$shortcut.Save()
