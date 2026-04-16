$WshShell = New-Object -ComObject WScript.Shell
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcut = $WshShell.CreateShortcut("$desktopPath\TFX Hub Customer - Michelle Brummer.lnk")
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-ExecutionPolicy Bypass -NoExit -Command Set-Location -Path 'C:\\Users\\1hans\\tfx-hub\\apps\\customer-app'; node server.js"
$shortcut.WorkingDirectory = "C:\\Users\\1hans\\tfx-hub\\apps\\customer-app"
$shortcut.WindowStyle = 1
$shortcut.Description = "Launch full TFX Hub Customer App for Michelle Brummer"
$shortcut.Save()