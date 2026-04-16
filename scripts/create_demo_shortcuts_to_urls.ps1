# create_demo_shortcuts_to_urls.ps1
$desktop = [Environment]::GetFolderPath('Desktop')
$edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
if (-not (Test-Path $edge)) { $edge = "$env:ProgramFiles (x86)\Microsoft\Edge\Application\msedge.exe" }
$browserExe = if (Test-Path $edge) { $edge } else { (Get-Command "start" -ErrorAction SilentlyContinue).Source }

$shortcuts = @(
  @{ Name='Build Contractor';      Url='http://localhost:3002' },
  @{ Name='Build Customer Client'; Url='http://localhost:3001' }
)

$shell = New-Object -ComObject WScript.Shell
foreach ($s in $shortcuts) {
  $link = Join-Path $desktop ("$($s.Name).lnk")
  $shortcut = $shell.CreateShortcut($link)
  if (Test-Path $browserExe) {
    $shortcut.TargetPath = $browserExe
    $shortcut.Arguments = "--app=`"$($s.Url)?kiosk=tv`""
  } else {
    $shortcut.TargetPath = "cmd.exe"
    $shortcut.Arguments = "/c start `"$($s.Url)?kiosk=tv`""
  }
  $shortcut.WorkingDirectory = $env:USERPROFILE
  $shortcut.IconLocation = "shell32.dll, 1"
  $shortcut.Save()
  Write-Host "Created: $link -> $($s.Url)"
}
