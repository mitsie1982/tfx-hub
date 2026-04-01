# Security Onboarding and Pre-commit Enforcement

This document explains how to use the repository security helpers.

## Local setup
1. Install git-secrets:
   - macOS: brew install git-secrets
   - Linux: follow https://github.com/awslabs/git-secrets#installation
2. Run the helper to register patterns:
   ./scripts/git-secrets-setup.sh
3. Install Husky hooks:
   pnpm install
   pnpm run security:install-hooks
4. Verify pre-commit:
   Try a commit that contains a test secret to confirm the hook blocks it.

## Secrets management
- Do not store secrets in the repo.
- Use GitHub Secrets, Azure Key Vault, or AWS Secrets Manager.
- CI workflows should read secrets from the repository or organization secrets.

## If a secret is accidentally committed
1. Revoke the secret immediately.
2. Remove the secret from git history using BFG or git filter-repo.
3. Rotate credentials and update systems.

