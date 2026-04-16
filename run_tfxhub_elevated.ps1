# run_tfxhub_elevated.ps1
# Purpose: One-liner to bootstrap TFX Hub in elevated VS Code terminal

# Set execution policy for this session
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Run the accelerator script
.\vs_code_tfxhub_accelerator.ps1
