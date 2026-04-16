-- scripts/db_migration_map_legacy.sql
-- Maps legacy values to CCMS/AMMS and supports reversible migration
UPDATE professionals SET type = 'CCMS' WHERE type = 'Contractor';
UPDATE professionals SET type = 'AMMS' WHERE type = 'Association';
-- To reverse:
-- UPDATE professionals SET type = 'Contractor' WHERE type = 'CCMS';
-- UPDATE professionals SET type = 'Association' WHERE type = 'AMMS';
