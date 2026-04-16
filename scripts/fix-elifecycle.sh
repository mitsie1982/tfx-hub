#!/usr/bin/env bash
set -euo pipefail

# scripts/fix-elifecycle.sh
# Consolidated remediation for ELIFECYCLE Test Failed
# Usage: ./scripts/fix-elifecycle.sh [--node <version>] [--yarn|--npm]
# Example: ./scripts/fix-elifecycle.sh --node 18 --npm

# Defaults
PACKAGE_MANAGER="npm"
NODE_VERSION=""
LOG_DIR="logs"
TEST_LOG="$LOG_DIR/test.log"
DIAG_LOG="$LOG_DIR/diagnostics.log"

mkdir -p "$LOG_DIR"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --yarn) PACKAGE_MANAGER="yarn"; shift ;;
    --npm) PACKAGE_MANAGER="npm"; shift ;;
    --node) NODE_VERSION="$2"; shift 2 ;;
    --help) echo "Usage: $0 [--node <version>] [--yarn|--npm]"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 2 ;;
  esac
done

echo "=== Fix ELIFECYCLE: Starting diagnostics and remediation ==="
echo "Package manager: $PACKAGE_MANAGER" | tee "$DIAG_LOG"
[ -n "$NODE_VERSION" ] && echo "Requested Node version: $NODE_VERSION" | tee -a "$DIAG_LOG"

# 1. Node version check (use nvm if available)
if [ -n "$NODE_VERSION" ] && command -v nvm >/dev/null 2>&1; then
  echo "Switching to Node $NODE_VERSION via nvm" | tee -a "$DIAG_LOG"
  # shellcheck disable=SC1091
  source ~/.nvm/nvm.sh
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
fi

echo "Node: $(node -v 2>/dev/null || echo 'node not found')" | tee -a "$DIAG_LOG"
echo "NPM: $(npm -v 2>/dev/null || echo 'npm not found')" | tee -a "$DIAG_LOG"
command -v yarn >/dev/null 2>&1 && echo "Yarn: $(yarn -v)" | tee -a "$DIAG_LOG" || true

# 2. Save current state for diagnostics
echo "Saving package manifests and lockfiles to diagnostics" | tee -a "$DIAG_LOG"
ls -la package.json package-lock.json yarn.lock 2>/dev/null | tee -a "$DIAG_LOG"

# 3. Clean caches and artifacts
echo "Cleaning node_modules, lockfiles, and caches" | tee -a "$DIAG_LOG"
rm -rf node_modules
if [ "$PACKAGE_MANAGER" = "npm" ]; then
  rm -f package-lock.json
  npm cache clean --force 2>&1 | tee -a "$DIAG_LOG"
else
  rm -f yarn.lock
  yarn cache clean 2>&1 | tee -a "$DIAG_LOG"
fi
