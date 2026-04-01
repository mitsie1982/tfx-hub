#!/usr/bin/env bash
set -euo pipefail

# scripts/setup_security_and_hooks.sh
# Purpose:
#  - Add git-secrets helper and register common patterns
#  - Add Husky pre-commit and commit-msg hooks
#  - Add a lightweight local secret scanner (Node)
#  - Add CI workflow to run secret scan on PRs
#  - Add docs and helper scripts for onboarding
#
# Usage:
#   chmod +x scripts/setup_security_and_hooks.sh
#   ./scripts/setup_security_and_hooks.sh
#
# Notes:
#  - This script does not add any real secrets to the repo.
#  - It is idempotent and safe to re-run.

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

SCRIPTS_DIR="$ROOT/scripts"
HUSKY_DIR="$ROOT/.husky"
CI_DIR="$ROOT/.github/workflows"
DOCS_DIR="$ROOT/docs"
ARTIFACTS_DIR="$ROOT/artifacts"

mkdir -p "$SCRIPTS_DIR" "$HUSKY_DIR" "$CI_DIR" "$DOCS_DIR" "$ARTIFACTS_DIR"

echo "Setting up security and pre-commit enforcement ($TS)"

# -------------------------
# 1) Helper to install and configure git-secrets
# -------------------------
GIT_SECRETS_SETUP="$SCRIPTS_DIR/git-secrets-setup.sh"
cat > "$GIT_SECRETS_SETUP" <<'SH'
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
SH
chmod +x "$GIT_SECRETS_SETUP"
echo "Created git-secrets helper: $GIT_SECRETS_SETUP"

# -------------------------
# 2) Lightweight local secret scanner (Node)
# -------------------------
SCAN_SCRIPT="$SCRIPTS_DIR/scan_secrets.js"
cat > "$SCAN_SCRIPT" <<'JS'
/*
 scripts/scan_secrets.js
 Lightweight secret scanner for local pre-commit checks.
 Exits with code 1 if suspicious patterns are found.
*/
const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();
const ignoreDirs = ['.git', 'node_modules', 'artifacts', 'dist', 'build'];
const patterns = [
  /-----BEGIN PRIVATE KEY-----/i,
  /-----BEGIN RSA PRIVATE KEY-----/i,
  /AKIA[0-9A-Z]{16}/, // AWS access key id
  /AIza[0-9A-Za-z-_]{35}/, // Google API key
  /ssh-rsa AAAA[0-9A-Za-z+/]+/, // ssh public key pattern (catch accidental private)
  /-----BEGIN OPENSSH PRIVATE KEY-----/i,
  /password\s*[:=]\s*['"].{6,}['"]/i
];

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (ignoreDirs.includes(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

let findings = [];
walk(repoRoot, (file) => {
  try {
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.zip', '.jar', '.class', '.exe', '.dll'].includes(ext)) return;
    const content = fs.readFileSync(file, 'utf8');
    patterns.forEach((p) => {
      if (p.test(content)) {
        findings.push({ file, pattern: p.toString() });
      }
    });
  } catch (e) {
    // ignore binary or unreadable files
  }
});

if (findings.length > 0) {
  console.error('Potential secrets detected:');
  findings.slice(0, 50).forEach(f => console.error(` - ${f.file} matches ${f.pattern}`));
  console.error('Aborting commit. Review findings and remove secrets or add to .gitignore if false positive.');
  process.exit(1);
} else {
  console.log('No obvious secrets found by lightweight scanner.');
  process.exit(0);
}
JS
chmod +x "$SCAN_SCRIPT"
echo "Created lightweight secret scanner: $SCAN_SCRIPT"

# -------------------------
# 3) Husky hooks setup
# -------------------------
# Ensure package.json exists at root to configure Husky scripts
if [ -f "$ROOT/package.json" ]; then
  # Add npm scripts for security if missing
  node -e "
const fs=require('fs');
const p='$ROOT/package.json';
let pkg=JSON.parse(fs.readFileSync(p,'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts['security:scan'] = pkg.scripts['security:scan'] || 'node scripts/scan_secrets.js';
pkg.scripts['security:install-hooks'] = pkg.scripts['security:install-hooks'] || 'npx husky install';
fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('Updated root package.json scripts for security');
" || true
else
  # create minimal package.json to allow Husky install
  cat > "$ROOT/package.json" <<JSON
{
  "name": "tfx-hub-mobile",
  "private": true,
  "scripts": {
    "security:scan": "node scripts/scan_secrets.js",
    "security:install-hooks": "npx husky install"
  }
}
JSON
  echo "Created minimal root package.json with security scripts"
fi

# Install Husky and set up hooks if pnpm or npm available
if command -v pnpm >/dev/null 2>&1 || command -v npm >/dev/null 2>&1; then
  echo "Installing husky as dev dependency (best-effort)"
  if command -v pnpm >/dev/null 2>&1; then
    pnpm add -D husky@8 lint-staged commitlint @commitlint/config-conventional || true
  else
    npm install --no-audit --no-fund --save-dev husky@8 lint-staged commitlint @commitlint/config-conventional || true
  fi

  # Initialize husky
  if [ ! -d ".husky" ]; then
    npx husky install || true
  fi

  # Create pre-commit hook
  PRE_COMMIT="$HUSKY_DIR/pre-commit"
  cat > "$PRE_COMMIT" <<'SH'
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

# Run lint and tests and secret scan before commit
echo "Running pre-commit checks: lint, test (fast), secret scan"
# Run lint if available
if command -v pnpm >/dev/null 2>&1; then
  pnpm -w -r lint || true
else
  npm run -w -r lint || true
fi

# Run lightweight tests if present (fast)
if [ -f "package.json" ]; then
  if command -v pnpm >/dev/null 2>&1; then
    pnpm -w -r test --silent || true
  else
    npm test --silent || true
  fi
fi

# Run local secret scanner
node scripts/scan_secrets.js
SH
  chmod +x "$PRE_COMMIT"
  echo "Created Husky pre-commit hook"

  # Create commit-msg hook to enforce conventional commits
  COMMIT_MSG="$HUSKY_DIR/commit-msg"
  cat > "$COMMIT_MSG" <<'SH'
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"

MSG_FILE="$1"
# Use commitlint to validate commit message
npx --no-install commitlint --config node_modules/@commitlint/config-conventional/index.js --edit "$MSG_FILE" || {
  echo "Commit message does not follow Conventional Commits. See https://www.conventionalcommits.org/"
  exit 1
}
SH
  chmod +x "$COMMIT_MSG"
  echo "Created Husky commit-msg hook"
else
  echo "pnpm/npm not found; skipping automatic Husky install. You can run 'npx husky install' manually and add hooks."
fi

# -------------------------
# 4) Commitlint config
# -------------------------
if [ ! -f "commitlint.config.js" ]; then
  cat > "commitlint.config.js" <<JS
module.exports = { extends: ['@commitlint/config-conventional'] };
JS
  echo "Created commitlint.config.js"
fi

# -------------------------
# 5) lint-staged sample config in package.json (optional)
# -------------------------
# Add lint-staged config to package.json if not present
node -e "
const fs=require('fs');
const p='$ROOT/package.json';
let pkg=JSON.parse(fs.readFileSync(p,'utf8'));
pkg['lint-staged'] = pkg['lint-staged'] || { '*.{js,ts,tsx,jsx}': ['eslint --fix'] };
fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('Ensured lint-staged config in package.json');
" || true

# -------------------------
# 6) CI workflow for secret scanning
# -------------------------
CI_FILE="$CI_DIR/ci_secrets_scan.yml"
cat > "$CI_FILE" <<YAML
name: CI Secret Scan

on:
  pull_request:
    paths:
      - '**/*'

jobs:
  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install pnpm
        run: npm install -g pnpm
      - name: Install dependencies
        run: pnpm install
      - name: Run lightweight secret scan
        run: node scripts/scan_secrets.js
      - name: Run git-secrets scan if available
        run: |
          if command -v git-secrets >/dev/null 2>&1; then
            git secrets --scan -r .
          else
            echo "git-secrets not installed on runner; consider adding to CI image or use a dedicated secret scanner"
          fi
YAML
echo "Created CI secret scan workflow: $CI_FILE"

# -------------------------
# 7) .gitattributes and .gitignore updates
# -------------------------
# Ensure .gitattributes exists to avoid CRLF issues
if [ ! -f ".gitattributes" ]; then
  cat > .gitattributes <<TXT
* text=auto
*.sh text eol=lf
*.ps1 text eol=crlf
TXT
  echo "Created .gitattributes"
fi

# Ensure .gitignore contains common sensitive patterns
if [ ! -f ".gitignore" ]; then
  cat > .gitignore <<TXT
node_modules/
dist/
build/
artifacts/
*.keystore
*.p12
*.pfx
*.jks
.env
.env.local
.env.*.local
TXT
  echo "Created .gitignore"
else
  if ! grep -q "artifacts/" .gitignore 2>/dev/null; then
    echo "artifacts/" >> .gitignore
  fi
fi

# -------------------------
# 8) Security onboarding doc
# -------------------------
SEC_DOC="$DOCS_DIR/security_onboarding.md"
cat > "$SEC_DOC" <<MD
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

MD
echo "Created security onboarding doc: $SEC_DOC"

# -------------------------
# 9) Finalize and commit
# -------------------------
echo "Security and hooks scaffold complete."

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$SCRIPTS_DIR" ".husky" "$CI_FILE" "$SEC_DOC" ".gitattributes" 2>/dev/null || true
  git commit -m "chore(security): add git-secrets helper, husky hooks, secret scanner, CI secret-scan and docs ($TS)" 2>/dev/null || true
fi

echo ""
echo "Acceptance checklist:"
echo " 1) Run './scripts/git-secrets-setup.sh' locally to register patterns."
echo " 2) Run 'pnpm install' then 'pnpm run security:install-hooks' to enable Husky hooks."
echo " 3) Attempt to commit a file containing '-----BEGIN PRIVATE KEY-----' and confirm pre-commit blocks the commit."
echo " 4) Open PR and confirm CI job '.github/workflows/ci_secrets_scan.yml' runs and fails if scanner finds issues."
echo ""
echo "Notes and recommendations:"
echo "- Use a robust secret scanner in CI for production (truffleHog, detect-secrets, or commercial tools)."
echo "- Configure git-secrets on developer machines and CI images for consistent enforcement."
echo "- Rotate any leaked credentials immediately and follow the runbook in docs/security_onboarding.md."
echo ""
echo "Done."
