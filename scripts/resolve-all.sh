#!/usr/bin/env bash
set -euo pipefail

# scripts/resolve-all.sh
# Purpose: Consolidated remediation to resolve codemod, tests, infra, observability, and load test failures.
# Usage: ./scripts/resolve-all.sh --env dev --pm npm --node 18 --apply-codemod --deploy-canary --ci
# Defaults
ENV="dev"
PM="npm"
NODE_VER=""
APPLY_CODEMOD=false
CI=false
LOGDIR="logs/resolve-all-$(date +%Y%m%dT%H%M%S)"
ARTDIR="artifacts"
CODEMOD="scripts/codemods/rename-entities.js"
TF_DIR="infra"
DEPLOY_DIR="scripts/ci"
OBS_COMPOSE="infra/observability/docker-compose.yml"
K6_SCRIPT="tests/load/ccms-amms-load.js"
TEST_OPTS="--runInBand --detectOpenHandles"
mkdir -p "$LOGDIR" "$ARTDIR"

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV="$2"; shift 2 ;;
    --pm) PM="$2"; shift 2 ;;
    --node) NODE_VER="$2"; shift 2 ;;
    --apply-codemod) APPLY_CODEMOD=true; shift ;;
    --ci) CI=true; shift ;;
    --deploy-canary) DEPLOY_CANARY=true; shift ;;
    --help) echo "Usage: $0 [--env dev] [--pm npm|yarn] [--node 18] [--apply-codemod] [--ci]"; exit 0 ;;
    *) echo "Unknown arg $1"; exit 2 ;;
  esac
done

echo "Resolve All started" | tee "$LOGDIR/summary.log"
echo "Environment: $ENV, PM: $PM, Node: ${NODE_VER:-system}" | tee -a "$LOGDIR/summary.log"

# OPERATIONAL NOTES
#
# - Run this script in a clean environment matching CI (Node version, OS packages, etc.).
# - Keep server-side normalization for legacy tokens during the deprecation window; do not remove legacy acceptance until telemetry shows near-zero usage.
# - If any step fails in CI, attach the corresponding log file to the failing job for rapid triage.
#

# 1. Node version
if [ -n "$NODE_VER" ] && command -v nvm >/dev/null 2>&1; then
  # shellcheck disable=SC1091
  source ~/.nvm/nvm.sh
  nvm install "$NODE_VER"
  nvm use "$NODE_VER"
fi
echo "Node: $(node -v 2>/dev/null || echo 'node not found')" | tee -a "$LOGDIR/summary.log"

# 2. Codemod: dry-run then apply if requested
if [ -f "$CODEMOD" ]; then
  echo "Running codemod dry-run" | tee -a "$LOGDIR/summary.log"
  node "$CODEMOD" --dry 2>&1 | tee "$LOGDIR/codemod-dry.log" || true
  if grep -qE "\bContractor\b|\bAssociation\b" src i18n config || true; then
    echo "Legacy tokens detected" | tee -a "$LOGDIR/summary.log"
    if [ "$APPLY_CODEMOD" = true ]; then
      echo "Applying codemod" | tee -a "$LOGDIR/summary.log"
      node "$CODEMOD" --apply 2>&1 | tee "$LOGDIR/codemod-apply.log"
      # re-scan
      if grep -R --line-number -E "\bContractor\b|\bAssociation\b" src i18n config; then
        echo "ERROR: Legacy tokens remain after codemod" | tee -a "$LOGDIR/summary.log"
        exit 1
      fi
    else
      echo "Codemod not applied. Re-run with --apply-codemod to fix legacy tokens." | tee -a "$LOGDIR/summary.log"
      exit 1
    fi
  else
    echo "No legacy tokens found" | tee -a "$LOGDIR/summary.log"
  fi
else
  echo "Codemod script not found at $CODEMOD; skipping codemod step" | tee -a "$LOGDIR/summary.log"
fi

# 3. Clean and install dependencies
echo "Cleaning workspace" | tee -a "$LOGDIR/summary.log"
rm -rf node_modules
if [ "$PM" = "npm" ]; then
  rm -f package-lock.json || true
  npm cache clean --force 2>&1 | tee -a "$LOGDIR/npm-cache.log" || true
  echo "Installing npm dependencies" | tee -a "$LOGDIR/summary.log"
  npm ci 2>&1 | tee "$LOGDIR/npm-install.log" || { tail -n 200 "$LOGDIR/npm-install.log"; exit 1; }
else
  rm -f yarn.lock || true
  yarn cache clean 2>&1 | tee -a "$LOGDIR/yarn-cache.log" || true
  yarn install --frozen-lockfile 2>&1 | tee "$LOGDIR/yarn-install.log" || { tail -n 200 "$LOGDIR/yarn-install.log"; exit 1; }
fi

# 4. Run precommit checks locally
if [ -f "scripts/dev/precommit-check.sh" ]; then
  bash scripts/dev/precommit-check.sh 2>&1 | tee "$LOGDIR/precommit.log" || { tail -n 200 "$LOGDIR/precommit.log"; exit 1; }
else
  echo "No precommit script found; running lint and tests directly" | tee -a "$LOGDIR/summary.log"
  if npm run -s lint >/dev/null 2>&1; then npm run lint 2>&1 | tee "$LOGDIR/lint.log" || { tail -n 200 "$LOGDIR/lint.log"; exit 1; }; fi
fi

# 5. Fix ELIFECYCLE style issues and run unit tests
export NODE_OPTIONS="--max_old_space_size=4096"
echo "Running unit tests" | tee -a "$LOGDIR/summary.log"
if npm run -s test --silent >/dev/null 2>&1; then
  npm test -- $TEST_OPTS 2>&1 | tee "$LOGDIR/test.log" || {
    echo "Tests failed; collecting diagnostics" | tee -a "$LOGDIR/summary.log"
    grep -nE "ELIFECYCLE|FAIL|FATAL ERROR|heap out of memory" "$LOGDIR/test.log" || true
    tail -n 200 "$LOGDIR/test.log"
    exit 1
  }
else
  echo "No test script defined; skipping unit tests" | tee -a "$LOGDIR/summary.log"
fi

# 6. Build
if npm run -s build >/dev/null 2>&1; then
  npm run build 2>&1 | tee "$LOGDIR/build.log" || { tail -n 200 "$LOGDIR/build.log"; exit 1; }
  tar -czf "$ARTDIR/build-$(date +%Y%m%dT%H%M%S).tgz" dist || true
else
  echo "No build script defined; skipping build" | tee -a "$LOGDIR/summary.log"
fi

# 7. Terraform init/plan with explicit backend check
if [ -d "$TF_DIR" ]; then
  pushd "$TF_DIR" >/dev/null
  terraform init -input=false 2>&1 | tee "$LOGDIR/terraform-init.log" || { tail -n 200 "$LOGDIR/terraform-init.log"; popd >/dev/null; exit 1; }
  terraform validate 2>&1 | tee "$LOGDIR/terraform-validate.log" || { tail -n 200 "$LOGDIR/terraform-validate.log"; popd >/dev/null; exit 1; }
  terraform plan -input=false -out=tfplan 2>&1 | tee "$LOGDIR/terraform-plan.log" || { tail -n 200 "$LOGDIR/terraform-plan.log"; popd >/dev/null; exit 1; }
  popd >/dev/null
else
  echo "No infra directory found at $TF_DIR; skipping Terraform" | tee -a "$LOGDIR/summary.log"
fi

# 8. Observability stack: ensure Docker and start with retries
if [ -f "$OBS_COMPOSE" ]; then
  if ! docker info >/dev/null 2>&1; then
    echo "Docker not running or not accessible; start Docker and re-run" | tee -a "$LOGDIR/summary.log"
    exit 1
  fi
  echo "Starting observability stack" | tee -a "$LOGDIR/summary.log"
  docker-compose -f "$OBS_COMPOSE" up -d 2>&1 | tee "$LOGDIR/observability-up.log" || { tail -n 200 "$LOGDIR/observability-up.log"; exit 1; }
  # wait for Prometheus/Grafana health endpoints
  for i in {1..12}; do
    sleep 5
    if curl -sSf http://localhost:9090/-/ready >/dev/null 2>&1; then
      echo "Prometheus ready" | tee -a "$LOGDIR/summary.log"
      break
    fi
    echo "Waiting for observability stack..." | tee -a "$LOGDIR/summary.log"
    if [ $i -eq 12 ]; then
      echo "Observability stack did not become ready" | tee -a "$LOGDIR/summary.log"
      tail -n 200 "$LOGDIR/observability-up.log"
      exit 1
    fi
  done
else
  echo "Observability compose file not found; skipping observability start" | tee -a "$LOGDIR/summary.log"
fi

# 9. Run smoke tests
if npm run -s smoke >/dev/null 2>&1; then
  npm run smoke 2>&1 | tee "$LOGDIR/smoke.log" || { tail -n 200 "$LOGDIR/smoke.log"; exit 1; }
else
  echo "No smoke script defined; skipping smoke tests" | tee -a "$LOGDIR/summary.log"
fi

# 10. Run k6 load test if available and observability is up
if command -v k6 >/dev/null 2>&1 && [ -f "$K6_SCRIPT" ]; then
  echo "Running k6 lightweight load test" | tee -a "$LOGDIR/summary.log"
  k6 run --vus 10 --duration 30s "$K6_SCRIPT" 2>&1 | tee "$LOGDIR/k6.log" || { tail -n 200 "$LOGDIR/k6.log"; exit 1; }
else
  echo "k6 not installed or load script missing; skipping load test" | tee -a "$LOGDIR/summary.log"
fi

# 11. Generate TODO report from search hits
echo "Generating TODO report" | tee -a "$LOGDIR/summary.log"
grep -R --line-number -E "ratings review submission aggregation|trust tier calculation badge|admin console verification dispute triage|role-based access control|RBAC" -n src || true > "$LOGDIR/todo-search-results.txt"
echo "Found TODOs and search hits saved to $LOGDIR/todo-search-results.txt" | tee -a "$LOGDIR/summary.log"

# 12. Package logs and artifacts
tar -czf "$ARTDIR/logs-$(date +%Y%m%dT%H%M%S).tgz" "$LOGDIR" || true

echo "Resolve All completed successfully. Logs: $LOGDIR Artifacts: $ARTDIR" | tee -a "$LOGDIR/summary.log"
exit 0
