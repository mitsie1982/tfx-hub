#!/bin/bash
# create_github_issues.sh
# This script uses the GitHub CLI (gh) to create issues for each TODO item.
# Prerequisites: GitHub CLI installed and authenticated (gh auth login)
# Usage: bash scripts/create_github_issues.sh

issues=(
  "Implement ratings and review submission/aggregation|Implement the ratings and review submission/aggregation feature."
  "Implement trust tier calculation and UI badges|Implement trust tier calculation logic and display UI badges."
  "Build admin console pages for manual verification and dispute triage|Build admin console pages for manual verification and dispute triage."
  "Add basic RBAC for admin functions|Add basic role-based access control (RBAC) for admin functions."
  "Verify ratings update contractor score/tier in real time|Verify that ratings update contractor score/tier in real time."
  "Verify admin can view/mark verifications|Verify that admin can view and mark verifications."
  "Verify RBAC prevents non-admin access|Verify that RBAC prevents non-admin access to admin functions."
  "Deliver ratings system, trust tier logic, admin console MVP|Deliver the ratings system, trust tier logic, and admin console MVP."
)

for issue in "${issues[@]}"; do
  title="${issue%%|*}"
  body="${issue#*|}"
  gh issue create --title "$title" --body "$body" --repo mitsie1982/tfx-hub
  echo "Created: $title"
done

echo "All issues created on GitHub."
