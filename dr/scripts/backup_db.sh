#!/bin/bash
# Backup database (example for PostgreSQL, adapt for Azure/AWS)
set -e
DATE=$(date +%Y%m%d%H%M%S)
BACKUP_DIR="/backups/db"
mkdir -p $BACKUP_DIR
pg_dump $DB_URL > $BACKUP_DIR/db_backup_$DATE.sql
