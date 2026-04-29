# Automated playbook: revoke tokens and collect forensic artifacts
param(
  [Parameter(Mandatory)]
  [string]$UserOrAgentId
)
Write-Host "Revoking Azure tokens for $UserOrAgentId..."
# Example: revoke Azure AD tokens
az ad user revoke-sign-in-sessions --id $UserOrAgentId
# Example: revoke AKS service account tokens
# (Assumes kubectl context is set)
kubectl delete secret -n kube-system $(kubectl get secrets -n kube-system | Select-String $UserOrAgentId | ForEach-Object { $_.Line.Split()[0] })

Write-Host "Collecting Azure Activity Logs..."
az monitor activity-log list --caller $UserOrAgentId --max-events 50 | Out-File forensic_${UserOrAgentId}_activitylog.json

Write-Host "Collecting Storage access logs..."
# (Assumes storage logging is enabled)
# az storage logging show --account-name <storageAccount> | Out-File storage_logs.txt

Write-Host "Done. Artifacts in forensic_${UserOrAgentId}_activitylog.json and local logs."