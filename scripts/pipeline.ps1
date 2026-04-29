Write-Host 'Running pipeline automation (PowerShell)'
Write-Host "🚀 Executing TFX Pipeline..."

python pipelines/run_pipeline.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Pipeline execution failed"
    exit 1
}

Write-Host "✅ Pipeline completed successfully."
