@echo off
REM .env validation script for TFX Hub
setlocal EnableDelayedExpansion
set ENV_FILE=.env

REM List required variables here
set REQUIRED_VARS=DB_HOST DB_PORT DB_USER DB_PASSWORD SECRET_KEY

if not exist %ENV_FILE% (
  echo ERROR: .env file not found!
  exit /b 1
)

for %%V in (%REQUIRED_VARS%) do (
  findstr /r /c:"^%%V=" %ENV_FILE% >nul
  if errorlevel 1 (
    echo ERROR: Required variable %%V missing from .env
    set ERR=1
  )
)

if defined ERR exit /b 1

echo .env validation passed.
exit /b 0
