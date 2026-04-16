#!/usr/bin/env bash
set -e
# Example post-create: install node deps if package.json exists
if [ -f /workspaces/$(basename "$PWD")/package.json ]; then
  cd /workspaces/$(basename "$PWD")
  if command -v npm >/dev/null 2>&1; then
    npm ci || true
  fi
fi
