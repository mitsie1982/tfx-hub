# Disaster Recovery: Backup & Restore Guide

## Overview
This document describes the backup and restore strategy for TFX Hub production systems, covering databases, storage, and configuration.

## Backup Strategy
- **Databases**: Automated daily backups (full) and hourly incrementals. Use managed backup features (e.g., Azure SQL, AWS RDS snapshots).
- **Blob/File Storage**: Daily snapshots and versioning enabled.
- **Configuration/Secrets**: Exported to secure, encrypted storage (Key Vault/Secrets Manager) daily.
- **Terraform State**: Remote backend (Azure Storage/AWS S3) with versioning and lock.

## Restore Procedures
- **Database Restore**: Use cloud portal or CLI to restore to a point-in-time. Test restores monthly.
- **Storage Restore**: Restore from snapshot or previous version.
- **Config Restore**: Import secrets/configs from backup vault.
- **Terraform State**: Restore from previous version if corruption detected.

## Testing
- Perform quarterly DR drills: simulate region failure, restore to alternate region, validate RTO/RPO.

## Automation
- All backup/restore scripts are in `dr/scripts/` and can be run via CI/CD or manually.
