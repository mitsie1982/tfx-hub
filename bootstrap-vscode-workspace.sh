#!/usr/bin/env bash
set -euo pipefail

# bootstrap-vscode-workspace.sh
# Single consolidated automation for VS Code areas 1..10
# Usage: bash ./bootstrap-vscode-workspace.sh [--yes]
# If --yes is provided, the script will not prompt for confirmations.

AUTO_YES=false
if [ "${1:-}" = "--yes" ]; then AUTO_YES=true; fi

# ---------- Helpers ----------
timestamp() { date +%Y%m%d%H%M%S; }
bak() {
  local f="$1"
  if [ -f "$f" ]; then
    cp -a "$f" "${f}.bak.$(timestamp)"
    echo "Backed up $f -> ${f}.bak.$(timestamp)"
  fi
}
confirm() {
  if $AUTO_YES; then return 0; fi
  read -r -p "$1 [Y/n] " ans
  ans="${ans:-Y}"
  case "$ans" in [Yy]*) return 0 ;; *) return 1 ;; esac
}

# ---------- Detect platform ----------
OS="$(uname -s 2>/dev/null || echo Windows_NT)"
case "$OS" in
  Darwin*) PLATFORM="mac" ;;
  Linux*) PLATFORM="linux" ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT*) PLATFORM="windows" ;;
  *) PLATFORM="unknown" ;;
esac
echo "Platform detected: $PLATFORM"

WORKSPACE_ROOT="$(pwd)"
VSCODE_DIR="$WORKSPACE_ROOT/.vscode"
DEVCONTAINER_DIR="$WORKSPACE_ROOT/.devcontainer"
mkdir -p "$VSCODE_DIR" "$DEVCONTAINER_DIR"

# ---------- Ensure code CLI (best-effort) ----------
if ! command -v code >/dev/null 2>&1; then
  echo "Warning: 'code' CLI not found. Extension installs will be skipped unless you install 'code' on PATH."
fi

# ---------- 1. Tasks and Workflows (tasks.json composite) ----------
TASKS_FILE="$VSCODE_DIR/tasks.json"
bak "$TASKS_FILE"
cat > "$TASKS_FILE" <<'JSON'
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "ci:install",
      "type": "shell",
      "command": "npm ci",
      "problemMatcher": []
    },
    {
      "label": "ci:lint",
      "type": "shell",
      "command": "npm run lint",
      "problemMatcher": []
    },
    {
      "label": "ci:test",
      "type": "shell",
      "command": "npm test",
      "problemMatcher": []
    },
    {
      "label": "ci:build",
      "type": "shell",
      "command": "npm run build",
      "problemMatcher": []
    },
    {
      "label": "ci:local",
      "dependsOn": ["ci:install","ci:lint","ci:test","ci:build"],
      "dependsOrder": "sequence",
      "type": "shell",
      "problemMatcher": []
    }
  ]
}
JSON
echo "Wrote tasks.json with composite 'ci:local'"

# ---------- 2. Extensions and Marketplace (extensions.json + optional install) ----------
EXTENSIONS_FILE="$VSCODE_DIR/extensions.json"
bak "$EXTENSIONS_FILE"
cat > "$EXTENSIONS_FILE" <<'JSON'
{
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "eamodio.gitlens",
    "ms-python.python",
    "ms-vscode.cpptools"
  ],
  "unwantedRecommendations": []
}
JSON
echo "Wrote extensions.json with recommended extensions"

if command -v code >/dev/null 2>&1; then
  if confirm "Install recommended extensions now?"; then
    echo "Installing recommended extensions..."
    jq -r '.recommendations[]' "$EXTENSIONS_FILE" 2>/dev/null | while read -r ext; do
      [ -z "$ext" ] && continue
      echo "Installing $ext"
      code --install-extension "$ext" --force || echo "Failed to install $ext (continue)"
    done || true
  fi
fi

# ---------- 3. Settings and Keybindings (merge safely) ----------
SETTINGS_FILE="$VSCODE_DIR/settings.json"
KEYBINDINGS_FILE="$VSCODE_DIR/keybindings.json"

# Example workspace settings to merge
NEW_SETTINGS='{
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "files.exclude": { "**/.cache": true },
  "terminal.integrated.profiles.linux": {
    "bash-custom": { "path": "/bin/bash", "args": ["-l"] }
  }
}'

# Merge helper: prefer jq on Unix, PowerShell on Windows, fallback to backup+overwrite
merge_json() {
  local target="$1"; local incoming="$2"
  if command -v jq >/dev/null 2>&1; then
    if [ -f "$target" ]; then
      tmp="$(mktemp)"
      jq -s '.[0] * .[1]' "$target" <(printf '%s' "$incoming") > "$tmp" && mv "$tmp" "$target"
    else
      printf '%s\n' "$incoming" > "$target"
    fi
  elif [ "$PLATFORM" = "windows" ] && command -v pwsh >/dev/null 2>&1; then
    # Use PowerShell to merge JSON objects
    pwsh -NoProfile -Command "
      \$t = '$target';
      \$inc = '$incoming' | Out-String;
      if (Test-Path \$t) {
        \$old = Get-Content \$t -Raw | ConvertFrom-Json;
        \$new = \$inc | ConvertFrom-Json;
        \$merged = [ordered]@{};
        foreach (\$p in \$old.PSObject.Properties) { \$merged[\$p.Name] = \$p.Value }
        foreach (\$p in \$new.PSObject.Properties) { \$merged[\$p.Name] = \$p.Value }
        \$merged | ConvertTo-Json -Depth 10 | Set-Content -Path \$t -Encoding UTF8
      } else {
        \$inc | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Set-Content -Path \$t -Encoding UTF8
      }
    "
  else
    # fallback: backup and overwrite
    bak "$target"
    printf '%s\n' "$incoming" > "$target"
  fi
}

echo "Merging workspace settings..."
merge_json "$SETTINGS_FILE" "$NEW_SETTINGS"
echo "Settings merged into $SETTINGS_FILE"

# Keybindings example: add a shortcut for running ci:local
NEW_KEYB='[
  {
    "key": "ctrl+alt+c",
    "command": "workbench.action.tasks.runTask",
    "args": "ci:local",
    "when": "editorTextFocus"
  }
]'
bak "$KEYBINDINGS_FILE"
merge_keybindings() {
  local target="$1"; local incoming="$2"
  if command -v jq >/dev/null 2>&1; then
    if [ -f "$target" ]; then
      tmp="$(mktemp)"
      jq -s '.[0] + .[1] | unique_by(.key + "|" + (.command // ""))' "$target" <(printf '%s' "$incoming") > "$tmp" && mv "$tmp" "$target"
    else
      printf '%s\n' "$incoming" > "$target"
    fi
  elif [ "$PLATFORM" = "windows" ] && command -v pwsh >/dev/null 2>&1; then
    pwsh -NoProfile -Command "
      \$t = '$target';
      \$inc = '$incoming' | Out-String;
      if (Test-Path \$t) {
        \$old = Get-Content \$t -Raw | ConvertFrom-Json;
        \$new = \$inc | ConvertFrom-Json;
        \$combined = @(\$old + \$new) | Sort-Object -Unique;
        \$combined | ConvertTo-Json -Depth 10 | Set-Content -Path \$t -Encoding UTF8
      } else {
        \$inc | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Set-Content -Path \$t -Encoding UTF8
      }
    "
  else
    bak "$target"
    printf '%s\n' "$incoming" > "$target"
  fi
}
merge_keybindings "$KEYBINDINGS_FILE" "$NEW_KEYB"
echo "Keybindings merged into $KEYBINDINGS_FILE"

# ---------- 4. Dev Container (devcontainer.json + Dockerfile) ----------
DEVCONTAINER_JSON="$DEVCONTAINER_DIR/devcontainer.json"
bak "$DEVCONTAINER_JSON"
cat > "$DEVCONTAINER_JSON" <<'JSON'
{
  "name": "Workspace Dev Container",
  "image": "mcr.microsoft.com/vscode/devcontainers/base:ubuntu",
  "features": {},
  "postCreateCommand": "bash .devcontainer/post-create.sh || true",
  "customizations": {
    "vscode": {
      "extensions": [
        "esbenp.prettier-vscode",
        "dbaeumer.vscode-eslint"
      ]
    }
  }
}
JSON

cat > "$DEVCONTAINER_DIR/post-create.sh" <<'SH'
#!/usr/bin/env bash
set -e
# Example post-create: install node deps if package.json exists
if [ -f /workspaces/$(basename "$PWD")/package.json ]; then
  cd /workspaces/$(basename "$PWD")
  if command -v npm >/dev/null 2>&1; then
    npm ci || true
  fi
fi
SH
chmod +x "$DEVCONTAINER_DIR/post-create.sh"
echo "Wrote devcontainer.json and post-create script"

# ---------- 5. Snippets ----------
SNIPPETS_DIR="$VSCODE_DIR/snippets"
mkdir -p "$SNIPPETS_DIR"
bak "$SNIPPETS_DIR/global.code-snippets"
cat > "$SNIPPETS_DIR/global.code-snippets" <<'JSON'
{
  "log": {
    "prefix": "log",
    "body": ["console.log('$1', $2);"],
    "description": "console.log snippet"
  }
}
JSON
echo "Added global snippets"

# ---------- 6. Launch and Debug configs ----------
LAUNCH_FILE="$VSCODE_DIR/launch.json"
bak "$LAUNCH_FILE"
cat > "$LAUNCH_FILE" <<'JSON'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Node (with prelaunch CI)",
      "type": "pwa-node",
      "request": "launch",
      "program": "${workspaceFolder}/src/index.js",
      "preLaunchTask": "ci:local",
      "cwd": "${workspaceFolder}"
    }
  ],
  "compounds": []
}
JSON
echo "Wrote launch.json with preLaunchTask 'ci:local'"

# ---------- 7. Git hooks, linters, precommit automation ----------
# Create package.json if missing to support husky/lint-staged
PKG_FILE="$WORKSPACE_ROOT/package.json"
if [ ! -f "$PKG_FILE" ]; then
  if confirm "No package.json found. Create a minimal package.json to enable hooks and scripts?"; then
    cat > "$PKG_FILE" <<'JSON'
{
  "name": "workspace-bootstrap",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "lint": "eslint . --ext .js,.ts || true",
    "test": "echo 'no tests' && exit 0",
    "build": "echo 'no build step' && exit 0"
  }
}
JSON
    echo "Created minimal package.json"
  fi
fi

# If npm present, install husky and lint-staged and set up pre-commit
if command -v npm >/dev/null 2>&1 && [ -f "$PKG_FILE" ]; then
  if confirm "Install husky and lint-staged and configure pre-commit hook (requires npm)?"; then
    npm install --no-audit --no-fund husky lint-staged --save-dev || true
    npx husky install || true
    npx husky add .husky/pre-commit "npx lint-staged" || true
    # Add lint-staged config to package.json if missing
    node -e "let p=require('./package.json'); p['lint-staged']=p['lint-staged']||{'*.js':['eslint --fix','git add']}; require('fs').writeFileSync('package.json', JSON.stringify(p,null,2));" || true
    echo "Configured husky and lint-staged (if npm succeeded)"
  fi
fi

# ---------- 8. Formatting and Linting configs ----------
# Prettier and ESLint basic configs
if confirm "Add basic Prettier and ESLint configs?"; then
  cat > "$WORKSPACE_ROOT/.prettierrc" <<'JSON'
{
  "singleQuote": true,
  "trailingComma": "es5",
  "tabWidth": 2
}
JSON
  cat > "$WORKSPACE_ROOT/.eslintrc.json" <<'JSON'
{
  "env": { "es2021": true, "node": true },
  "extends": ["eslint:recommended"],
  "parserOptions": { "ecmaVersion": 12 },
  "rules": {}
}
JSON
  echo "Wrote .prettierrc and .eslintrc.json"
fi

# ---------- 9. Testing and CI template ----------
CI_DIR="$WORKSPACE_ROOT/.github/workflows"
mkdir -p "$CI_DIR"
bak "$CI_DIR/ci.yml"
cat > "$CI_DIR/ci.yml" <<'YAML'
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '18' }
      - run: npm ci
      - run: npm run lint || true
      - run: npm test
YAML
echo "Added GitHub Actions CI template"

# ---------- 10. Terminal profiles and workspace recommendations ----------
# Add terminal profile example to settings (merged earlier) and workspace README
README="$WORKSPACE_ROOT/README.md"
if [ ! -f "$README" ]; then
  cat > "$README" <<'MD'
# Workspace Bootstrap

This workspace was bootstrapped with automation for VS Code:
- Tasks: composite 'ci:local' (install, lint, test, build)
- Recommended extensions in .vscode/extensions.json
- Devcontainer in .devcontainer
- Prettier and ESLint configs
- Husky pre-commit hook (if npm available)
- CI template in .github/workflows/ci.yml

To use:
1. Open this folder in VS Code.
2. Press F5 to run extension dev host if developing extensions.
3. Run Tasks: Run Task -> ci:local to run the local CI flow.
MD
fi
echo "Wrote README.md"

# ---------- Final summary ----------
cat <<SUMMARY

Bootstrap complete.

What was created or updated:
 - .vscode/tasks.json (composite tasks)
 - .vscode/extensions.json (recommendations)
 - .vscode/settings.json (merged workspace settings)
 - .vscode/keybindings.json (merged keybinding)
 - .vscode/launch.json (debug config)
 - .vscode/snippets/global.code-snippets
 - .devcontainer/devcontainer.json and post-create script
 - package.json (optional minimal)
 - .prettierrc and .eslintrc.json (optional)
 - .husky/ and lint-staged (if npm available and user agreed)
 - .github/workflows/ci.yml
 - README.md

Notes and safety:
 - Backups were created for overwritten files where possible.
 - The script attempts safe merges using
SUMMARY
