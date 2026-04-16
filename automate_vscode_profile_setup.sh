#!/usr/bin/env bash
set -euo pipefail

# CONFIG: edit these lists before running
EXTENSIONS=(
  ms-python.python
  ms-vscode.cpptools
  esbenp.prettier-vscode
  dbaeumer.vscode-eslint
  eamodio.gitlens
)
# Put your JSON content here or point to files
SETTINGS_JSON='{
  "editor.tabSize": 2,
  "editor.formatOnSave": true,
  "files.exclude": {"**/.git": true}
}'
KEYBINDINGS_JSON='[]'
SNIPPETS_JSON='{
  "print": {
    "prefix": "log",
    "body": ["console.log($1);"],
    "description": "console.log"
  }
}'

# Detect OS and user config path
OS="$(uname -s)"
case "$OS" in
  Darwin) PLATFORM="mac"; USER_DIR="$HOME/Library/Application Support/Code/User" ;;
  Linux) PLATFORM="linux"; USER_DIR="$HOME/.config/Code/User" ;;
  MINGW*|MSYS*|CYGWIN*|Windows_NT) PLATFORM="windows"; USER_DIR="$APPDATA/Code/User" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

echo "Platform: $PLATFORM"
mkdir -p "$USER_DIR"

# Install VS Code if 'code' not found (best-effort; requires sudo/admin)
if ! command -v code >/dev/null 2>&1; then
  echo "VS Code CLI not found. Attempting to install VS Code..."
  if [ "$PLATFORM" = "mac" ]; then
    if command -v brew >/dev/null 2>&1; then
      brew install --cask visual-studio-code
    else
      echo "Homebrew not found; please install VS Code manually."
      exit 1
    fi
  elif [ "$PLATFORM" = "linux" ]; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y wget gpg
      wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > microsoft.gpg
      sudo install -o root -g root -m 644 microsoft.gpg /usr/share/keyrings/
      sudo sh -c 'echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
      sudo apt-get update && sudo apt-get install -y code
      rm -f microsoft.gpg
    else
      echo "Unsupported Linux package manager; install VS Code manually."
      exit 1
    fi
  elif [ "$PLATFORM" = "windows" ]; then
    echo "Please install VS Code for Windows and ensure 'code' is on PATH."
    exit 1
  fi
fi

# Install extensions
echo "Installing extensions..."
for ext in "${EXTENSIONS[@]}"; do
  echo "Installing $ext"
  code --install-extension "$ext" --force
done

# Write settings, keybindings, snippets
echo "Writing settings to $USER_DIR"
printf '%s\n' "$SETTINGS_JSON" > "$USER_DIR/settings.json"
printf '%s\n' "$KEYBINDINGS_JSON" > "$USER_DIR/keybindings.json"
mkdir -p "$USER_DIR/snippets"
printf '%s\n' "$SNIPPETS_JSON" > "$USER_DIR/snippets/global.code-snippets"

echo "Done. Restart VS Code to apply changes."
