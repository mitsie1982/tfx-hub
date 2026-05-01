#!/bin/bash
# Restore database (example for PostgreSQL, adapt for Azure/AWS)
set -e
if [ -z "$1" ]; then
  echo "Usage: $0 <backup_file.sql>"
  exit 1
fi
psql $DB_URL < $1
