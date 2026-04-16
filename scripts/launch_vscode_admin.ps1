param(
    [string]$WorkspacePath = (Get-Location).Path
)

function Log($m) { Write-Host "[VSCode-Launcher] $m" }

# Detect VS Code path
$codeCmd = Get-Command code -ErrorAction SilentlyContinue

if (-not $codeCmd) {
    Log "VS Code CLI (code) not found in PATH."
  
    $fallbackPaths = @(
        "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe",
        "C:\Program Files\Microsoft VS Code\Code.exe"
    )

    $codeExe = $fallbackPaths | Where-Object { Test-Path $_ } | Select-Object -First 1

    if (-not $codeExe) {
        Log "VS Code executable not found."
        exit 1
    }
} else {
    $codeExe = $codeCmd.Source
}

Log "Launching VS Code as Administrator..."

Start-Process -FilePath $codeExe `
    -ArgumentList "`"$WorkspacePath`"" `
    -Verb RunAs
