$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcut = $WshShell.CreateShortcut("$desktopPath\TFX Hub Contractor - Theuns Fraser.lnk")
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -Command Set-Location -Path 'C:\\Users\\1hans\\tfx-hub\\apps\\contractor-app'; node server.js"
$shortcut.WorkingDirectory = "C:\\Users\\1hans\\tfx-hub\\apps\\contractor-app"
$shortcut.WindowStyle = 1
$shortcut.Description = "Launch full TFX Hub Contractor App for Theuns Fraser"
$shortcut.Save()