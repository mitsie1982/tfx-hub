#!/bin/bash
# Automated playbook: revoke tokens and collect forensic artifacts
# Usage: ./incident_playbook.sh <user_or_agent_id>
set -euo pipefail
AGENT_ID=${1:-}
if [ -z "$AGENT_ID" ]; then echo "Usage: $0 <user_or_agent_id>"; exit 1; fi

echo "Revoking tokens for $AGENT_ID..."
# Example: revoke AWS IAM access keys
aws iam list-access-keys --user-name "$AGENT_ID" | jq -r '.AccessKeyMetadata[].AccessKeyId' | while read key; do
  aws iam update-access-key --user-name "$AGENT_ID" --access-key-id "$key" --status Inactive
done
# Example: revoke EKS service account tokens (Kubernetes)
kubectl delete secret -n kube-system $(kubectl get secrets -n kube-system | grep "$AGENT_ID" | awk '{print $1}') || true

echo "Collecting CloudTrail logs..."
aws cloudtrail lookup-events --lookup-attributes AttributeKey=Username,AttributeValue="$AGENT_ID" --max-results 50 > forensic_${AGENT_ID}_cloudtrail.json

echo "Collecting S3 access logs..."
# (Assumes S3 logging bucket is configured)
# aws s3 cp s3://<log-bucket>/access-logs/ ./ --recursive --exclude "*" --include "*${AGENT_ID}*"

echo "Done. Artifacts in forensic_${AGENT_ID}_cloudtrail.json and local logs."