# GitHub Issue Creation Script for VS Code
# This script uses the GitHub CLI (gh) to create issues for each TODO item.
# Prerequisites: GitHub CLI installed and authenticated (gh auth login)
# Usage: Run in the VS Code terminal (PowerShell or Bash)

# TODOs to be created as issues
$issues = @(
    @{ title = "Implement ratings and review submission/aggregation"; body = "Implement the ratings and review submission/aggregation feature." },
    @{ title = "Implement trust tier calculation and UI badges"; body = "Implement trust tier calculation logic and display UI badges." },
    @{ title = "Build admin console pages for manual verification and dispute triage"; body = "Build admin console pages for manual verification and dispute triage." },
    @{ title = "Add basic RBAC for admin functions"; body = "Add basic role-based access control (RBAC) for admin functions." },
    @{ title = "Verify ratings update contractor score/tier in real time"; body = "Verify that ratings update contractor score/tier in real time." },
    @{ title = "Verify admin can view/mark verifications"; body = "Verify that admin can view and mark verifications." },
    @{ title = "Verify RBAC prevents non-admin access"; body = "Verify that RBAC prevents non-admin access to admin functions." },
    @{ title = "Deliver ratings system, trust tier logic, admin console MVP"; body = "Deliver the ratings system, trust tier logic, and admin console MVP." }
)

# Loop through each issue and create it using gh CLI
foreach ($issue in $issues) {
    gh issue create --title $issue.title --body $issue.body --repo mitsie1982/tfx-hub
}

Write-Host "All issues created on GitHub."
