#!/usr/bin/env bash
# run-workflow.sh - naive local workflow runner
# Usage: ./run-workflow.sh workflows/build-and-deploy.yml
set -euo pipefail
wf="${1:-}"
if [ -z "$wf" ] || [ ! -f "$wf" ]; then
  echo "Usage: $0 path/to/workflow.yml"
  exit 2
fi
echo "Running workflow: $wf"
# Very small parser: execute lines that start with "run: "
grep -E "^[[:space:]]*- run:" -A0 "$wf" | sed -E "s/^[[:space:]]*- run:[[:space:]]*//" | while IFS= read -r cmd; do
  echo ">>> $cmd"
  bash -lc "$cmd"
done

