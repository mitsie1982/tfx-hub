@echo off
REM Move experimental files to experiments/ directory
REM Edit the list below to include all files you consider experimental

setlocal
set EXPERIMENTS_DIR=experiments

REM Example: Add files or patterns to move below
move send_test_event_tmp.js %EXPERIMENTS_DIR%\
move artifacts\alerting_test_artifacts_*.txt %EXPERIMENTS_DIR%\
move artifacts\canary_integration_*.txt %EXPERIMENTS_DIR%\
move artifacts\windows_spike_log_*.txt %EXPERIMENTS_DIR%\

REM Add more move commands as needed

echo Experimental files moved to %EXPERIMENTS_DIR%\
pause
