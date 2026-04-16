$desktop = [Environment]::GetFolderPath('Desktop')
$scriptPath = "$PWD\scripts\vscode_smart_launcher.ps1"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("$desktop\VS Code (Smart).lnk")

$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""
$shortcut.WorkingDirectory = $PWD
$shortcut.IconLocation = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
$shortcut.Description = "Smart VS Code Launcher (Auto Admin Detection)"
$shortcut.Save()
