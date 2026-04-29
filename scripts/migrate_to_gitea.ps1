param(
    [string]$GiteaRepoUrl = "http://localhost:3000/youruser/tfx-hub.git"
)

Write-Host "🔄 Migrating repository to Gitea..."

# Add Gitea remote
Write-Host "Adding Gitea remote..."
git remote add gitea $GiteaRepoUrl

# Push all branches
Write-Host "Pushing all branches to Gitea..."
git push gitea --all

# Push all tags
Write-Host "Pushing all tags to Gitea..."
git push gitea --tags

Write-Host "✅ Migration complete. Verify your repository at $GiteaRepoUrl."
Write-Host "You can now use 'git push gitea' for future backups."
