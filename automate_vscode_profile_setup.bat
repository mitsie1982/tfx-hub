@echo off
REM 1. Launch VS Code with the TFX-Hub-Prod profile
code --profile "TFX-Hub-Prod" "C:\Users\1hans\tfx-hub"

REM 2. (Manual) Confirm all required extensions are installed and enabled in this profile
REM 3. (Manual) Adjust any VS Code settings specific to your production workflow

REM 4. Export the profile settings for backup
code --export-profile "C:\Users\1hans\tfx-hub\TFX-Hub-Prod.code-profile"

REM 5. (Manual) Test your environment by running development or deployment tasks

REM Note: Steps 2, 3, and 5 require manual review and confirmation in VS Code.
