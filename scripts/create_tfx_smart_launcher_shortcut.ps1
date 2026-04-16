$desktop = [Environment]::GetFolderPath('Desktop')
$script = "$PWD\scripts\tfx_control_panel.ps1"

$shell = New-Object -ComObject WScript.Shell
$link = $shell.CreateShortcut("$desktop\TFX Smart Launcher.lnk")

$link.TargetPath = "powershell.exe"
$link.Arguments = "-ExecutionPolicy Bypass -File `"$script`" -Mode auto"
$link.WorkingDirectory = $PWD
$link.IconLocation = "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe"
$link.Save()
