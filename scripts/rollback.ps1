param(
    [string]$MODEL_VERSION = "latest"
)

Write-Host "⏪ Rolling back model to version: $MODEL_VERSION"

# Example placeholder logic
Copy-Item "models/$MODEL_VERSION" "models/active" -Recurse -Force

Write-Host "✅ Rollback complete."