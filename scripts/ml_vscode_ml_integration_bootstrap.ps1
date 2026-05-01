# ML VSCode Integration Bootstrap Script
# This script sets up a basic Python ML environment for VS Code
# - Installs Python packages (numpy, pandas, scikit-learn, jupyter)
# - Optionally installs VS Code extensions for Python and Jupyter
# - Creates a .venv if not present

param(
    [switch]$InstallExtensions = $false
)

Write-Host "[ML Bootstrap] Creating Python virtual environment (.venv) if needed..."
if (-not (Test-Path .venv)) {
    python -m venv .venv
    Write-Host "[ML Bootstrap] .venv created."
} else {
    Write-Host "[ML Bootstrap] .venv already exists."
}

Write-Host "[ML Bootstrap] Activating virtual environment and installing ML packages..."
$activateScript = Join-Path .venv 'Scripts' 'Activate.ps1'
. $activateScript
pip install --upgrade pip
pip install numpy pandas scikit-learn jupyter

if ($InstallExtensions) {
    Write-Host "[ML Bootstrap] Installing VS Code Python and Jupyter extensions..."
    code --install-extension ms-python.python
    code --install-extension ms-toolsai.jupyter
}

Write-Host "[ML Bootstrap] Setup complete."
