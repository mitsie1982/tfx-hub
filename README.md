# TFX Hub

Welcome to TFX Hub! This is the main repository for the TFX Hub platform.

## Secret Management Upgrade

See [docs/secret_management_upgrade.md](docs/secret_management_upgrade.md) for the new Azure Key Vault-based secret management, rotation, and recovery process. All secrets must be managed via Key Vault and referenced in CI/CD workflows.

## Documentation

- See the [docs/README.md](docs/README.md) for full documentation and onboarding guides.

## Database Migration: Normalize Entity Names

A migration script is provided to normalize legacy entity names in the `users` table to the new codes:

- `Contractor` → `CCMS`
- `Association` → `AMMS`

To apply this migration, run the SQL in `migrations/20260409_normalize_entity_names.sql` against all relevant databases as part of your deployment pipeline.

Example (psql):

```sh
psql $DATABASE_URL -f migrations/20260409_normalize_entity_names.sql
```

Ensure this step is included in your automated deployment process.
