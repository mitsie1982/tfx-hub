@echo off
REM Orchestrator for reviewing and uninstalling VS Code extensions

REM 1. List all installed extensions and output to extensions-to-remove.txt
code --list-extensions > extensions-to-remove.txt

echo Review extensions-to-remove.txt and remove any extension names you want to keep.
echo After editing, run the uninstall helper below.
pause

REM 2. Uninstall extensions listed in extensions-to-remove.txt
for /f %%e in (extensions-to-remove.txt) do code --uninstall-extension %%e

echo Extension uninstall process complete.
pause
