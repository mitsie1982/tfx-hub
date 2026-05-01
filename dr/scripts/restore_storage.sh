#!/bin/bash
# Restore blob/file storage (example: Azure CLI, adapt for AWS)
set -e
if [ -z "$1" ]; then
  echo "Usage: $0 <snapshot_id>"
  exit 1
fi
az storage blob restore --account-name $AZURE_STORAGE_ACCOUNT --container-name $CONTAINER --ids $1
