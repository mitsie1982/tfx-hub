#!/usr/bin/env bash
# verify_int07_superapp_integration.sh
# Single consolidated automated verifier for VS Code
# Verifies: Install Status, Compile Status, Test Status, Hardhat/Ethers versions (N/A for Node-only),
# Lockfile presence, Webhook endpoints, and collects Notes/Issues for int07-superapp-integration.
#
# Usage:
# 1. Save as verify_int07_superapp_integration.sh at workspace root
# 2. Make executable: chmod +x verify_int07_superapp_integration.sh
# 3. Run: ./verify_int07_superapp_integration.sh
#
# Outputs:
# - verification-report.md (Markdown table)
# - verification-logs/int07-*.log (detailed logs)
# - Exit code 0 if no critical failures; nonzero otherwise.

set -euo pipefail

ROOT_DIR="$(pwd)"
PROJECT="int07-superapp-integration"
PROJ_DIR="$ROOT_DIR/$PROJECT"
LOG_DIR="$ROOT_DIR/verification-logs"
REPORT="$ROOT_DIR/verification-report.md"
mkdir -p "$LOG_DIR"

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

# Start report
cat > "$REPORT" <<MD
# Verification Report: ${PROJECT}
Generated: $(timestamp)

| Project | Install Status | Compile Status | Test Status | Hardhat Version | Ethers Version | Lockfile Present | Webhook Endpoints | Notes / Issues |
|---|---:|---:|---:|---:|---:|---:|---:|---|
MD

LOG="$LOG_DIR/${PROJECT//\//_}.log"
echo "Verification started for $PROJECT at $(timestamp)" > "$LOG"

# Defaults
install_status="N/A"
compile_status="N/A"
test_status="N/A"
hardhat_version="N/A"
ethers_version="N/A"
lockfile_present="No"
webhook_endpoints="No"
notes=()

# Ensure project exists
if [ ! -d "$PROJ_DIR" ]; then
  notes+=("Project folder '$PROJECT' not found")
  echo "ERROR: $PROJECT folder not found at $PROJ_DIR" | tee -a "$LOG"
  printf "| %s | %s | %s | %s | %s | %s | %s | %s | %s |\n" \
    "$PROJECT" "$install_status" "$compile_status" "$test_status" "$hardhat_version" "$ethers_version" "$lockfile_present" "$webhook_endpoints" "$(IFS='; '; echo "${notes[*]}")" >> "$REPORT"
  echo "See $LOG for details."
  exit 2
fi

pushd "$PROJ_DIR" >/dev/null

# 0) Git cleanliness
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git_status=$(git status --porcelain)
  if [ -z "$git_status" ]; then
    echo "Git: clean" | tee -a "$LOG"
  else
    echo "Git: uncommitted changes detected" | tee -a "$LOG"
    notes+=("Uncommitted changes present")
  fi
else
  echo "Git: not a git repo" | tee -a "$LOG"
  notes+=("Not a git repository")
fi

# 1) Install (npm ci) if package.json exists
if [ -f "package.json" ]; then
  echo "Running npm ci..." | tee -a "$LOG"
  if npm ci --no-audit --no-fund >>"$LOG" 2>&1; then
    install_status="✅ Success"
    echo "npm ci succeeded" | tee -a "$LOG"
  else
    install_status="❌ Failed"
    echo "npm ci failed (see log)" | tee -a "$LOG"
    notes+=("npm install failed")
  fi
else
  install_status="N/A"
  notes+=("No package.json")
  echo "No package.json found; skipping npm install" | tee -a "$LOG"
fi

# 2) Compile (Node-only): run TypeScript check if tsconfig exists
if [ -f "tsconfig.json" ]; then
  echo "TypeScript project detected; running tsc --noEmit" | tee -a "$LOG"
  if npx tsc --noEmit >>"$LOG" 2>&1; then
    compile_status="✅ Success"
    echo "TypeScript compile check passed" | tee -a "$LOG"
  else
    compile_status="❌ Failed"
    echo "TypeScript compile check failed" | tee -a "$LOG"
    notes+=("TypeScript compile errors")
  fi
else
  compile_status="N/A (Node only)"
  echo "No tsconfig.json; skipping compile step" | tee -a "$LOG"
fi

# 3) Tests: look for test scripts or test folder
has_test_script=false
if [ -f "package.json" ]; then
  if grep -q "\"test\"" package.json; then
    has_test_script=true
  fi
fi

if [ -d "test" ] || [ -d "tests" ] || [ "$has_test_script" = true ]; then
  echo "Running tests (if configured)..." | tee -a "$LOG"
  if $has_test_script; then
    if npm test --silent >>"$LOG" 2>&1; then
      test_status="✅ All tests passed"
      echo "npm test passed" | tee -a "$LOG"
    else
      # Distinguish between no tests and failing tests
      if [ ! -d "test" ] && [ ! -d "tests" ]; then
        test_status="⚠️ Minimal/no tests"
        notes+=("Test script exists but no test files found")
        echo "Test script present but no test files detected" | tee -a "$LOG"
      else
        test_status="❌ Tests failed"
        notes+=("Tests failed")
        echo "Tests failed (see log)" | tee -a "$LOG"
      fi
    fi
  else
    # No test script but test folder exists
    if [ -d "test" ] || [ -d "tests" ]; then
      if npx mocha --version >/dev/null 2>&1; then
        if npx mocha --recursive >>"$LOG" 2>&1; then
          test_status="✅ All tests passed"
          echo "Mocha tests passed" | tee -a "$LOG"
        else
          test_status="❌ Tests failed"
          notes+=("Mocha tests failed")
          echo "Mocha tests failed" | tee -a "$LOG"
        fi
      else
        test_status="⚠️ Minimal/no tests"
        notes+=("Tests present but no test runner configured")
        echo "Tests present but no test runner configured" | tee -a "$LOG"
      fi
    else
      test_status="⚠️ Minimal/no tests"
      notes+=("No tests defined")
      echo "No tests found" | tee -a "$LOG"
    fi
  fi
else
  test_status="⚠️ Minimal/no tests"
  notes+=("No tests defined")
  echo "No tests defined; skipping test run" | tee -a "$LOG"
fi

# 4) Hardhat / Ethers versions (N/A for Node-only but attempt to read if present)
if [ -f "package.json" ]; then
  hardhat_version=$(node -e "try{const p=require('./package.json'); const v=(p.devDependencies&&p.devDependencies.hardhat)||(p.dependencies&&p.dependencies.hardhat); console.log(v||'N/A');}catch(e){console.log('N/A')}" 2>/dev/null || echo "N/A")
  ethers_version=$(node -e "try{const p=require('./package.json'); const v=(p.dependencies&&p.dependencies.ethers)||(p.devDependencies&&p.devDependencies.ethers); console.log(v||'N/A');}catch(e){console.log('N/A')}" 2>/dev/null || echo "N/A")
  if [ -z "$hardhat_version" ] || [ "$hardhat_version" = "N/A" ]; then hardhat_version="N/A"; fi
  if [ -z "$ethers_version" ] || [ "$ethers_version" = "N/A" ]; then ethers_version="N/A"; fi
else
  hardhat_version="N/A"
  ethers_version="N/A"
fi

# 5) Lockfile presence
if [ -f "package-lock.json" ] || [ -f "yarn.lock" ]; then
  lockfile_present="Yes"
else
  lockfile_present="No"
  notes+=("No lockfile present")
fi

# 6) Webhook endpoints detection (search for common webhook patterns)
webhook_patterns="webhook|/webhook|webhook/twilio|webhook/partner|/webhook/"
webhook_hits=$(grep -R --line-number -E "$webhook_patterns" . 2>/dev/null || true)
if [ -n "$webhook_hits" ]; then
  webhook_endpoints="Yes"
  echo "Webhook endpoints detected (sample):" | tee -a "$LOG"
  echo "$webhook_hits" | sed -n '1,20p' | tee -a "$LOG"
else
  webhook_endpoints="No"
  notes+=("No webhook endpoints detected")
fi

# 7) Connector checks: Twilio and Paytm adapters
twilio_adapter="No"
if [ -f "server/connectors/twilio.js" ] || grep -R --line-number -E "twilio" server 2>/dev/null | head -n 1; then
  twilio_adapter="Yes"
  echo "Twilio adapter detected" | tee -a "$LOG"
else
  notes+=("Twilio adapter not found")
fi

paytm_adapter="No"
if [ -f "server/connectors/paytm.js" ] || grep -R --line-number -E "paytm" server 2>/dev/null | head -n 1; then
  paytm_adapter="Yes"
  echo "Paytm adapter detected" | tee -a "$LOG"
else
  notes+=("Paytm adapter not found")
fi

# 8) Secrets management (Vault) and webhook signature verification presence
vault_present="No"
if [ -f ".env" ] && grep -q -E "VAULT_ADDR|VAULT_TOKEN" .env 2>/dev/null; then
  vault_present="Yes"
  echo "Vault env keys found in .env" | tee -a "$LOG"
elif grep -R --line-number -E "node-vault|VAULT_ADDR|VAULT_TOKEN" . 2>/dev/null | head -n 1; then
  vault_present="Yes"
  echo "Vault usage detected in code" | tee -a "$LOG"
else
  notes+=("Vault secrets management not configured")
fi

webhook_sig_verification="No"
if grep -R --line-number -E "validateRequest|x-twilio-signature|x-partner-signature|crypto.createHmac" . 2>/dev/null | head -n 1; then
  webhook_sig_verification="Yes"
  echo "Webhook signature verification code detected" | tee -a "$LOG"
else
  notes+=("Webhook signature verification not detected")
fi

# 9) Reconciliation worker and tests presence
recon_worker="No"
if [ -f "server/scripts/reconcile_worker.js" ] || [ -f "server/scripts/reconcile.js" ] || grep -R --line-number -E "reconcile|reconciliation" server 2>/dev/null | head -n 1; then
  recon_worker="Yes"
  echo "Reconciliation worker or scripts detected" | tee -a "$LOG"
else
  notes+=("Reconciliation worker not found")
fi

# 10) Lint / security hints
if grep -q -E "express-rate-limit|helmet|prom-client|node-vault|twilio" package.json 2>/dev/null; then
  echo "Security/monitoring dependencies present" | tee -a "$LOG"
else
  notes+=("Security/monitoring dependencies missing (rate limiting, helmet, metrics)")
fi

# 11) Finalize notes
notes_summary="$(IFS='; '; echo "${notes[*]}")"
if [ -z "$notes_summary" ]; then notes_summary="None"; fi

# Append row to report
printf "| %s | %s | %s | %s | %s | %s | %s | %s | %s |\n" \
  "$PROJECT" "${install_status:-N/A}" "${compile_status:-N/A}" "${test_status:-N/A}" "${hardhat_version:-N/A}" "${ethers_version:-N/A}" "${lockfile_present:-No}" "${webhook_endpoints:-No}" "$notes_summary" >> "$REPORT"

# Print summary
echo ""
echo "Verification complete for $PROJECT"
echo "Report: $REPORT"
echo "Log: $LOG"
echo ""
cat "$REPORT"

# Exit code: 0 if no critical failures (❌), 2 otherwise
if echo "$install_status $compile_status $test_status" | grep -q "❌"; then
  echo "Critical failures detected. See logs and report."
  popd >/dev/null
  exit 2
fi

# Guidance for warnings
if echo "$notes_summary" | grep -q -E "No tests|Vault|Webhook signature|Reconciliation|No lockfile|Uncommitted"; then
  echo "Warnings detected: $notes_summary"
  echo "Suggested next steps:"
  echo "- Add automated unit and integration tests (mocha/jest) and CI coverage for Twilio/Paytm flows."
  echo "- Configure Vault or a managed secrets store and remove secrets from .env in production."
  echo "- Implement and test webhook signature verification for Twilio and partner webhooks."
  echo "- Add reconciliation worker tests and end-to-end payout reconciliation tests."
  echo "- Commit any uncommitted changes and ensure lockfile is present."
fi

popd >/dev/null
exit 0
