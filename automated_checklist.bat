@echo off
REM Automated Checklist for TFX-Hub-Prod Environment

REM 1. Confirm backups exist
if exist D:\backups\TFXHubBackup (
  echo Backup found in D:\backups\TFXHubBackup
) else (
  echo WARNING: Backup not found in D:\backups\TFXHubBackup
)

REM 2. Confirm experiments/ contains moved experimental artifacts
if exist experiments\ (
  dir /b experiments\
) else (
  echo WARNING: experiments/ folder not found
)

REM 3. Confirm slm/ contains the new structure and README.md
if exist slm\README.md (
  echo slm/README.md found
) else (
  echo WARNING: slm/README.md not found
)

REM 4. Review extensions-to-remove.txt and run uninstall_extensions_from_list.ps1 if ready
if exist extensions-to-remove.txt (
  echo extensions-to-remove.txt found. Please review and run uninstall_extensions_from_list.ps1 if ready.
) else (
  echo extensions-to-remove.txt not found. Run review_and_uninstall_extensions.bat first.
)

REM 5. Open VS Code with the TFX-Hub-Prod profile
code --profile "TFX-Hub-Prod" .

REM 6. Prompt user to run tests and a sample TFX pipeline
set /p RUN_TESTS="Run tests and a sample TFX pipeline now? (y/n): "
if /i "%RUN_TESTS%"=="y" (
  echo Please run your test suite and a sample TFX pipeline in VS Code now.
) else (
  echo Skipping test and pipeline run.
)

pause
