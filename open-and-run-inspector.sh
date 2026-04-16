#!/usr/bin/env bash
set -euo pipefail

# open-and-run-inspector.sh
# Usage:
#   ./open-and-run-inspector.sh [PATH_TO_INSPECTOR_FOLDER]
# Default: ./task-automation-inspector
#
# What it does:
#  - Verifies the folder exists (or offers to create the scaffold if missing)
#  - Ensures 'code' CLI is available (best-effort)
#  - Opens VS Code in Extension Development Host mode for that folder
#  - Prints the exact steps to run the "Task Automation: Compute Percentage" command
#
# Note: This script intentionally does not automate UI clicks or bypass prompts.
#       You must press F5 and run the command in the Extension Development Host.

INSPECTOR_DIR="${1:-./task-automation-inspector}"

# Resolve to absolute path
resolve_abs() {
  if command -v realpath >/dev/null 2>&1; then
    realpath "$1"
  else
    # portable fallback
    (cd "$1" 2>/dev/null && pwd) || printf '%s\n' "$1"
  fi
}

echo "Target folder: $INSPECTOR_DIR"

# If folder doesn't exist, offer to create a minimal scaffold so F5 will work
if [ ! -d "$INSPECTOR_DIR" ]; then
  echo "Folder '$INSPECTOR_DIR' not found."
  read -r -p "Create a minimal task-automation-inspector scaffold here? [Y/n] " create_choice
  create_choice="${create_choice:-Y}"
  if [[ "$create_choice" =~ ^[Yy] ]]; then
    mkdir -p "$INSPECTOR_DIR/src" "$INSPECTOR_DIR/.vscode"
    cat > "$INSPECTOR_DIR/package.json" <<'JSON'
{
  "name": "task-automation-inspector",
  "displayName": "Task Automation Inspector",
  "publisher": "local",
  "version": "0.0.1",
  "engines": { "vscode": "^1.80.0" },
  "activationEvents": ["onCommand:taskAutomation.compute"],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      { "command": "taskAutomation.compute", "title": "Task Automation: Compute Percentage" }
    ]
  },
  "scripts": { "compile": "echo 'compile step placeholder'" }
}
JSON
    cat > "$INSPECTOR_DIR/src/extension.ts" <<'TS'
import * as vscode from 'vscode';
export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(vscode.commands.registerCommand('taskAutomation.compute', () => {
    vscode.window.showInformationMessage('Task Automation: Compute Percentage (scaffold placeholder)');
  }));
}
export function deactivate() {}
TS
    cat > "$INSPECTOR_DIR/.vscode/launch.json" <<'LAUNCH'
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Task Automation Inspector",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "${execPath}",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"],
      "outFiles": []
    }
  ]
}
LAUNCH
    echo "Minimal scaffold created at '$INSPECTOR_DIR'."
  else
    echo "Aborting. Create or point to an existing task-automation-inspector folder and re-run."
    exit 1
  fi
fi

ABS_DIR="$(resolve_abs "$INSPECTOR_DIR")"
echo "Resolved path: $ABS_DIR"

# Check for 'code' CLI
if ! command -v code >/dev/null 2>&1; then
  echo
  echo "Warning: 'code' CLI not found on PATH."
  echo " - On Windows, ensure 'Install 'code' command in PATH' is enabled (Command Palette: Shell Command: Install 'code' command)."
  echo " - On macOS/Linux, ensure 'code' is available in your shell."
  echo "You can still open VS Code manually and follow the steps below."
  echo
  read -r -p "Attempt to open VS Code via 'code' anyway? [y/N] " try_open
  try_open="${try_open:-N}"
  if [[ ! "$try_open" =~ ^[Yy] ]]; then
    echo
    echo "Manual instructions:"
    echo " 1) Open VS Code."
    echo " 2) File → Open Folder → $ABS_DIR"
    echo " 3) Press F5 to launch the Extension Development Host."
    echo " 4) In the new window press Ctrl+Shift+P and run: Task Automation: Compute Percentage"
    exit 0
  fi
fi

# Open VS Code in Extension Development Host mode
echo
echo "Opening VS Code Extension Development Host for: $ABS_DIR"
# Use --extensionDevelopmentPath to open the folder as an extension development workspace
# This opens a new window where pressing F5 will launch the Extension Development Host.
code --extensionDevelopmentPath="$ABS_DIR" "$ABS_DIR" || {
  echo "Failed to launch 'code'. If you are on Windows and using PowerShell, try running this script from PowerShell or ensure 'code' is on PATH."
  exit 1
}

# Print the exact steps the user requested
cat <<'INSTR'

Workaround / manual steps to run the analysis (follow these in the Extension Development Host window):

  1) With the task-automation-inspector folder open in VS Code, press F5 to launch the Extension Development Host.
  2) In the new window that opens, press Ctrl+Shift+P to open the Command Palette.
  3) Type and select "Task Automation: Compute Percentage" to run the analysis.

Notes:
 - The script opens the folder in extension development mode; you must press F5 in that window to start the Extension Development Host.
 - The command must be invoked from the Extension Development Host window (the one launched by F5).
 - This approach preserves OS security and requires your explicit interaction to run the extension and its command.

INSTR

exit 0
