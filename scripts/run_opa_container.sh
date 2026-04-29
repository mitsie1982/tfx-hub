#!/usr/bin/env bash
# scripts/run_opa_container.sh - runs OPA locally for policy evaluation (requires docker)
set -euo pipefail
docker run --rm -p 8181:8181 -v $(pwd)/policies:/policies openpolicyagent/opa:latest run --server --set=decision_logs.console=true /policies
