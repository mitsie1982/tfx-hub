# install_precommit.ps1
Write-Output 'Installing pre-commit and running pre-commit install...'
python -m pip install --upgrade pip
pip install pre-commit ruff black isort pip-audit || true
if (Test-Path '.git') {
  pre-commit install || Write-Output 'pre-commit install failed; run pre-commit install manually.'
} else {
  Write-Output 'No .git folder found. Initialize git repo and run pre-commit install manually.'
}
