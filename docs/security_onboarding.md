# Security Onboarding and Pre-commit Enforcement

This document explains how to use the repository security helpers.

## Local setup

1. Install git-secrets:
   - macOS: brew install git-secrets
   - Linux: follow <https://github.com/awslabs/git-secrets#installation>
2. Run the helper to register patterns:
   `./scripts/git-secrets-setup.sh`
3. Install Husky hooks:
   `pnpm install`
   `pnpm run security:install-hooks`
4. Verify pre-commit:
   Try a commit that contains a test secret to confirm the hook blocks it.

## Secrets management

- Do not store secrets in the repo.
- Use GitHub Secrets, Azure Key Vault, or AWS Secrets Manager.
- CI workflows should read secrets from the repository or organization secrets.
- Configure admin bootstrap access with `TFX_ADMIN_USERNAME`, `TFX_ADMIN_EMAIL`, and `TFX_ADMIN_PASSWORD`; do not hardcode live admin credentials in source files or docs.

## Admin access

- Admin browser and mobile sign-in use `TFX_ADMIN_USERNAME` as the username.
- The admin password comes from `TFX_ADMIN_PASSWORD`.
- The API server fails fast on startup if `TFX_ADMIN_USERNAME`, `TFX_ADMIN_EMAIL`, or `TFX_ADMIN_PASSWORD` are missing.
- Admin WhatsApp access is disabled.
- Use the browser or mobile admin workspace during business hours, 08:00 to 17:00.

## If a secret is accidentally committed

1. Revoke the secret immediately.
2. Remove the secret from git history using BFG or git filter-repo.
3. Rotate credentials and update systems.
