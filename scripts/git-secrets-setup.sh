#!/usr/bin/env bash
set -euo pipefail
# scripts/git-secrets-setup.sh
# Installs git-secrets (if not present) and registers common patterns.
# Run this locally once to configure git-secrets for the repo.

if ! command -v git-secrets >/dev/null 2>&1; then
  echo "git-secrets not found in PATH."
  echo "Install git-secrets manually: https://github.com/awslabs/git-secrets#installation"
  exit 0
fi

echo "Registering common secret patterns with git-secrets"
git secrets --register-aws --global || true

# Common private key patterns
git secrets --add '-----BEGIN PRIVATE KEY-----' || true
git secrets --add '-----BEGIN RSA PRIVATE KEY-----' || true
git secrets --add 'AKIA[0-9A-Z]{16}' || true
git secrets --add 'AIza[0-9A-Za-z-_]{35}' || true
git secrets --add 'ssh-rsa AAAA[0-9A-Za-z+/]+' || true

echo "git-secrets patterns registered. To test, run: git secrets --scan -r ."
