-- Normalize legacy entity names to new codes
UPDATE users SET entity_type = 'CCMS' WHERE entity_type = 'Contractor';
UPDATE users SET entity_type = 'AMMS' WHERE entity_type = 'Association';
