
#!/usr/bin/env bash
set -euo pipefail

# scripts/pilot-ready.sh
# Single consolidated automation to ensure TFX Hub is Pilot ready
# Usage: ./scripts/pilot-ready.sh --env <dev|staging|prod> [--apply-codemod] [--deploy-canary] [--ci] [--pm npm|yarn] [--node <version>]

# Defaults
ENVIRONMENT="dev"
APPLY_CODEMOD=false
DEPLOY_CANARY=false
CI_MODE=false
PACKAGE_MANAGER="npm"
NODE_VERSION=""
LOG_DIR="logs/pilot-ready"
ARTIFACTS_DIR="artifacts"
CODemod_SCRIPT="scripts/codemods/rename-entities.js"
TF_DIR="infra"
DEPLOY_SCRIPTS_DIR="scripts/ci"
TEST_RUNNER_OPTS="--runInBand --detectOpenHandles"
EXIT_ON_FAILURE=true

mkdir -p "$LOG_DIR" "$ARTIFACTS_DIR"


# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENVIRONMENT="$2"; shift 2 ;;
    --apply-codemod) APPLY_CODEMOD=true; shift ;;
    --deploy-canary) DEPLOY_CANARY=true; shift ;;
    --ci) CI_MODE=true; shift ;;
    --pm) PACKAGE_MANAGER="$2"; shift 2 ;;
    --node) NODE_VERSION="$2"; shift 2 ;;
    --help) echo "Usage: $0 --env <dev|staging|prod> [--apply-codemod] [--deploy-canary] [--ci] [--pm npm|yarn] [--node <version>]"; exit 0 ;;
    *) echo "Unknown arg: $1"; exit 2 ;;
  esac
done

LOG_PREFIX="$LOG_DIR/pilot-ready-$(date +%Y%m%dT%H%M%S)"
DIAG_LOG="$LOG_PREFIX.diagnostics.log"
TEST_LOG="$LOG_PREFIX.test.log"
BUILD_LOG="$LOG_PREFIX.build.log"
TF_LOG="$LOG_PREFIX.terraform.log"
DEPLOY_LOG="$LOG_PREFIX.deploy.log"

echo "Pilot Ready Automation Starting" | tee "$DIAG_LOG"
echo "Environment: $ENVIRONMENT" | tee -a "$DIAG_LOG"
echo "Package manager: $PACKAGE_MANAGER" | tee -a "$DIAG_LOG"
[ -n "$NODE_VERSION" ] && echo "Requested Node version: $NODE_VERSION" | tee -a "$DIAG_LOG"

# Helper: fail handler
fail() {
  echo "ERROR: $1" | tee -a "$DIAG_LOG"
  if [ "$CI_MODE" = true ]; then
    echo "CI mode enabled. Exiting with failure." | tee -a "$DIAG_LOG"
    exit 1
  fi
  if [ "$EXIT_ON_FAILURE" = true ]; then
    exit 1
  fi
}

# 1. Node version switch if requested
if [ -n "$NODE_VERSION" ] && command -v nvm >/dev/null 2>&1; then
  echo "Switching to Node $NODE_VERSION via nvm" | tee -a "$DIAG_LOG"
  # shellcheck disable=SC1091
  source ~/.nvm/nvm.sh
  nvm install "$NODE_VERSION"
  nvm use "$NODE_VERSION"
fi

echo "Node: $(node -v 2>/dev/null || echo 'node not found')" | tee -a "$DIAG_LOG"
echo "NPM: $(npm -v 2>/dev/null || echo 'npm not found')" | tee -a "$DIAG_LOG"

# 2. Ensure clean workspace
echo "Cleaning workspace artifacts" | tee -a "$DIAG_LOG"
rm -rf node_modules
if [ "$PACKAGE_MANAGER" = "npm" ]; then
  rm -f package-lock.json
  npm cache clean --force 2>&1 | tee -a "$DIAG_LOG" || true
elif [ "$PACKAGE_MANAGER" = "pnpm" ]; then
  rm -f pnpm-lock.yaml
  pnpm store prune 2>&1 | tee -a "$DIAG_LOG" || true
else
  rm -f yarn.lock
  yarn cache clean 2>&1 | tee -a "$DIAG_LOG" || true
fi

# 3. Install dependencies
echo "Installing dependencies" | tee -a "$DIAG_LOG"
if [ "$PACKAGE_MANAGER" = "npm" ]; then
  npm ci 2>&1 | tee -a "$DIAG_LOG" || fail "npm ci failed"
elif [ "$PACKAGE_MANAGER" = "pnpm" ]; then
  pnpm install 2>&1 | tee -a "$DIAG_LOG" || fail "pnpm install failed"
else
  yarn install --frozen-lockfile 2>&1 | tee -a "$DIAG_LOG" || fail "yarn install failed"
fi
