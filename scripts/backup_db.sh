#!/bin/bash
# Backup Postgres DB (example)
export PGPASSWORD="$DB_PASSWORD"
pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql
# Upload to Azure Blob (optional)
# az storage blob upload --account-name $STORAGE_ACCOUNT --container-name backups --file backup_$(date +%Y%m%d_%H%M%S).sql --name backup_$(date +%Y%m%d_%H%M%S).sql
