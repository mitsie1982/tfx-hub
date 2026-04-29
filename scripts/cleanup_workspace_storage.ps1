# PowerShell script to delete selected VS Code workspace storage folders
# Edit the $folders array to include the full paths of the folders you want to delete

$folders = @(
    # Example:
    # "C:\Users\1hans\AppData\Roaming\Code\User\workspaceStorage\b3cc129791569f2a95b812c89543156b"
)

foreach ($folder in $folders) {
    if (Test-Path $folder) {
        Remove-Item -Path $folder -Recurse -Force
        Write-Host "Deleted: $folder"
    } else {
        Write-Host "Not found: $folder"
    }
}
