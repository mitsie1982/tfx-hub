#!/usr/bin/env bash
set -euo pipefail

# vscode-automation-tool.sh
# Usage:
#   ./vscode-automation-tool.sh patch    # create repo-patch.tar.gz
#   ./vscode-automation-tool.sh ci       # apply Dependabot, nightly CI, Reviewdog, local runner to cwd
#   ./vscode-automation-tool.sh extension# scaffold a small VS Code Orchestrator extension
#   ./vscode-automation-tool.sh all      # do all three (patch + apply + extension scaffold)
#
# Optional: pass --yes to skip confirmations.

AUTO_YES=false
if [ "${1:-}" = "--yes" ]; then AUTO_YES=true; shift || true; fi

ACTION="${1:-help}"

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

WORKDIR="$(pwd)"
TMPDIR="$(mktemp -d)"
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

# ---------- Common file contents ----------
DEPENDABOT_YML='version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "daily"
    open-pull-requests-limit: 5
    commit-message:
      prefix: "deps"
'

NIGHTLY_YML='name: Nightly CI
on:
  schedule:
    - cron: "0 2 * * *"
jobs:
  nightly:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
      - run: npm ci
      - run: npm run lint || true
      - run: npm test
      - run: npm run build || true
'

REVIEWDOG_YML='name: reviewdog
on: [pull_request]
jobs:
  reviewdog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "18"
      - run: npm ci
      - name: Run ESLint
        run: npm run lint || true
      - name: Run reviewdog
        uses: reviewdog/action-eslint@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
'

LOCAL_RUNNER_SH='#!/usr/bin/env bash
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
'

# ---------- Helper to write files into a target dir ----------
write_file() {
  local target="$1"; shift
  local content="$1"
  mkdir -p "$(dirname "$target")"
  printf '%s\n' "$content" > "$target"
  echo "Wrote $target"
}

# ---------- Create repo patch archive ----------
do_patch() {
  echo "Creating repo patch archive..."
  local patchdir="$TMPDIR/patch"
  mkdir -p "$patchdir/.github/workflows" "$patchdir/scripts"
  write_file "$patchdir/.github/dependabot.yml" "$DEPENDABOT_YML"
  write_file "$patchdir/.github/workflows/nightly.yml" "$NIGHTLY_YML"
  write_file "$patchdir/.github/workflows/reviewdog.yml" "$REVIEWDOG_YML"
  write_file "$patchdir/scripts/run-workflow.sh" "$LOCAL_RUNNER_SH"
  chmod +x "$patchdir/scripts/run-workflow.sh"
  (cd "$patchdir" && tar -czf "$WORKDIR/repo-patch.tar.gz" .)
  echo "Created $WORKDIR/repo-patch.tar.gz"
}

# ---------- Apply CI files into current workspace ----------
do_ci() {
  echo "Applying CI and automation files into workspace: $WORKDIR"
  if ! confirm "This will create or overwrite files in $WORKDIR. Continue?"; then
    echo "Aborted by user."
    return 1
  fi

  # Dependabot
  bak "$WORKDIR/.github/dependabot.yml"
  mkdir -p "$WORKDIR/.github/workflows"
  write_file "$WORKDIR/.github/dependabot.yml" "$DEPENDABOT_YML"

  # Nightly CI
  bak "$WORKDIR/.github/workflows/nightly.yml"
  write_file "$WORKDIR/.github/workflows/nightly.yml" "$NIGHTLY_YML"

  # Reviewdog workflow
  bak "$WORKDIR/.github/workflows/reviewdog.yml"
  write_file "$WORKDIR/.github/workflows/reviewdog.yml" "$REVIEWDOG_YML"

  # Local runner
  mkdir -p "$WORKDIR/scripts"
  bak "$WORKDIR/scripts/run-workflow.sh"
  write_file "$WORKDIR/scripts/run-workflow.sh" "$LOCAL_RUNNER_SH"
  chmod +x "$WORKDIR/scripts/run-workflow.sh"

  echo "CI and automation files applied. Backups created where files existed."
}

# ---------- Scaffold a minimal VS Code Orchestrator extension ----------
do_extension() {
  local extdir="$WORKDIR/vscode-orchestrator"
  echo "Scaffolding Orchestrator extension at $extdir"
  if [ -d "$extdir" ]; then
    if ! confirm "Directory $extdir exists. Overwrite scaffold files inside it?"; then
      echo "Skipping extension scaffold."
      return 0
    fi
  fi
  mkdir -p "$extdir/src" "$extdir/.vscode"
  # package.json
  cat > "$extdir/package.json" <<'JSON'
{
  "name": "vscode-orchestrator",
  "displayName": "Orchestrator",
  "publisher": "local",
  "version": "0.0.1",
  "engines": { "vscode": "^1.80.0" },
  "activationEvents": ["onCommand:orchestrator.open"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "orchestrator.open", "title": "Orchestrator: Open" }
    ]
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -w -p ./"
  },
  "devDependencies": {
    "typescript": "^5.1.6",
    "@types/node": "^18.0.0",
    "@types/vscode": "^1.80.0"
  }
}
JSON

  # src/extension.ts
  cat > "$extdir/src/extension.ts" <<'TS'
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const out = vscode.window.createOutputChannel('Orchestrator');
  context.subscriptions.push(out);

  context.subscriptions.push(vscode.commands.registerCommand('orchestrator.open', async () => {
    const panel = vscode.window.createWebviewPanel('orchestrator', 'Orchestrator', vscode.ViewColumn.One, { enableScripts: true });
    panel.webview.html = getHtml();
    panel.webview.onDidReceiveMessage(async msg => {
      if (msg.command === 'run') {
        const cmd = msg.cmd;
        out.appendLine(`[${new Date().toISOString()}] Running: ${cmd}`);
        const terminal = vscode.window.createTerminal({ name: 'Orchestrator' });
        terminal.show();
        terminal.sendText(cmd);
        // log to .logs/orchestrator.log in workspace
        const ws = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders[0];
        if (ws) {
          const logDir = path.join(ws.uri.fsPath, '.logs');
          try { fs.mkdirSync(logDir, { recursive: true }); } catch {}
          const logFile = path.join(logDir, 'orchestrator.log');
          fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${cmd}\n`);
        }
      }
    });
  }));
}

export function deactivate() {}

function getHtml(): string {
  return `<!doctype html><html><body>
  <h3>Orchestrator</h3>
  <input id="cmd" style="width:100%" placeholder="Command to run"/>
  <button onclick="run()">Run</button>
  <script>
    const vscode = acquireVsCodeApi();
    function run(){ const cmd=document.getElementById('cmd').value; vscode.postMessage({command:'run', cmd}); }
  </script>
</body></html>`;
}
TS

  # .vscode/launch.json
  cat > "$extdir/.vscode/launch.json" <<'LAUNCH'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Orchestrator Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": ["${workspaceFolder}/out/**/*.js"]
    }
  ]
}
LAUNCH

  echo "Extension scaffold created at $extdir"
  echo "To develop: open $extdir in VS Code and press F5. The Orchestrator webview exposes a simple Run UI and logs to .logs/orchestrator.log"
}

# ---------- Main dispatch ----------
case "$ACTION" in
  patch)
    do_patch
    ;;
  ci)
    do_ci
    ;;
  extension)
    do_extension
    ;;
  all)
    do_patch
    do_ci
    do_extension
    ;;
  help|""|*)
    cat <<USAGE
Usage: $0 [--yes] <action>

Actions:
  patch       Create repo-patch.tar.gz containing Dependabot, nightly CI, Reviewdog, and local runner
  ci          Apply Dependabot, nightly CI, Reviewdog, and local runner into current workspace (backups made)
  extension   Scaffold a minimal VS Code Orchestrator extension in ./vscode-orchestrator
  all         Do patch + ci + extension
  --yes       Skip confirmations

Examples:
  $0 patch
  $0 --yes ci
  $0 extension

USAGE
    ;;
esac

exit 0
