#!/usr/bin/env bash
# Bootstrap script (Bash)
# Creates: GIT_WORKFLOW.md, .github/PULL_REQUEST_TEMPLATE.md, .pre-commit-config.yaml
# Run from repository root:
#   chmod +x bootstrap-git-workflow.sh
#   ./bootstrap-git-workflow.sh

set -euo pipefail

write_file() {
  local path="$1"; shift
  local content="$*"
  mkdir -p "$(dirname "$path")" 2>/dev/null || true
  cat > "$path" <<'EOF'
'"$content"'
EOF
  echo "Wrote $path"
}

# GIT_WORKFLOW.md
cat > GIT_WORKFLOW.md <<'EOF'
# Git Workflow

**Purpose**
Standard, safe, and repeatable Git workflow for day‑to‑day development, task switching, and collaboration.

---

## Quick principles
- **Branch per task**: short‑lived feature/bugfix branches.
- **Small commits**: atomic, descriptive, testable.
- **Keep branches current**: rebase or merge frequently.
- **Protect main**: require CI and reviews before merge.
- **Avoid lost work**: stash or use worktrees when switching.

---

## Common commands

### Start a new task
```bash
git fetch origin
git switch -c feature/TFX-123-short-desc origin/main
```
