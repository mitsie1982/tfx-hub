# scripts/create_demo_shortcuts.ps1
# Delegates to the canonical desktop shortcut cleanup/recreation script for the current Build shortcuts.
$ErrorActionPreference = 'Stop'

& (Join-Path $PSScriptRoot 'recreate_desktop_shortcuts_clean.ps1')
