@echo off
REM Automated backup confirmation for TFX Hub project and VS Code profiles

REM 1. Confirm project backup exists
if exist D:\backups\TFXHubBackup (
  echo Project backup found in D:\backups\TFXHubBackup
  dir /b D:\backups\TFXHubBackup
) else (
  echo WARNING: Project backup not found in D:\backups\TFXHubBackup
)

REM 2. Confirm VS Code .code-profile files exist
if exist D:\backups\TFXHubBackup\*.code-profile (
  echo VS Code profile backup(s) found:
  dir /b D:\backups\TFXHubBackup\*.code-profile
) else (
  echo WARNING: No .code-profile files found in D:\backups\TFXHubBackup
)

REM 3. Instructions for restoring profile
if exist D:\backups\TFXHubBackup\*.code-profile (
  echo To restore a VS Code profile, use: Profiles > Import Profile in VS Code and select the .code-profile file.
)

pause
