#!/usr/bin/env bash
set -euo pipefail

# scripts/setup_react_native_contractor.sh
# Idempotent scaffold for apps/contractor-app (React Native TypeScript)
# - Initializes RN TypeScript app if missing
# - Wires monorepo packages (packages/shared-ui, packages/shared-logic)
# - Adds sample Contractor screen using shared UI
# - Adds Metro, tsconfig, ESLint, and VS Code tasks
# - Installs dependencies with pnpm if available
#
# Usage:
#   chmod +x scripts/setup_react_native_contractor.sh
#   ./scripts/setup_react_native_contractor.sh

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

APP_DIR="$ROOT/apps/contractor-app"
SHARED_UI="$ROOT/packages/shared-ui"
SHARED_LOGIC="$ROOT/packages/shared-logic"
METRO_CONFIG="$ROOT/metro.config.js"
TS_CONFIG_ROOT="$ROOT/tsconfig.json"
ESLINT_ROOT="$ROOT/.eslintrc.json"
TEMPLATE="react-native-template-typescript"
APP_NAME="contractor-app"

mkdir -p "$APP_DIR" "$SHARED_UI/src" "$SHARED_LOGIC/src" ".vscode"

echo "=== Contractor app scaffold ($TS) ==="

# 1) Initialize React Native TypeScript app if not present
if [ ! -f "$APP_DIR/package.json" ] || ! grep -q "react-native" "$APP_DIR/package.json" 2>/dev/null; then
  echo "Initializing React Native TypeScript app in $APP_DIR..."
  npx react-native init "$APP_NAME" --directory "$APP_DIR" --template "$TEMPLATE" || {
    echo "react-native init failed or not available. Please create a TypeScript RN app manually in $APP_DIR and re-run."
  }
else
  echo "React Native app already present in $APP_DIR (skipped)"
fi

# 2) Ensure app package.json scripts are friendly for monorepo
if [ -f "$APP_DIR/package.json" ]; then
  node -e "
const fs=require('fs');
const p='$APP_DIR/package.json';
let pkg=JSON.parse(fs.readFileSync(p,'utf8'));
pkg.scripts = pkg.scripts || {};
pkg.scripts.dev = pkg.scripts.dev || 'react-native start';
pkg.scripts.ios = pkg.scripts.ios || 'react-native run-ios';
pkg.scripts.android = pkg.scripts.android || 'react-native run-android';
pkg.scripts.lint = pkg.scripts.lint || 'eslint . --ext .js,.jsx,.ts,.tsx';
fs.writeFileSync(p, JSON.stringify(pkg, null, 2));
console.log('Updated', p);
" || true
fi

# 3) Metro config (root) — ensure exists and includes packages watchFolders
if [ ! -f "$METRO_CONFIG" ]; then
  cat > "$METRO_CONFIG" <<'JS'
/**
 * metro.config.js - monorepo-aware Metro config
 */
const path = require('path');
const { getDefaultConfig } = require('metro-config');

module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();
  const projectRoot = __dirname;
  const watchFolders = [
    path.resolve(projectRoot, 'packages'),
  ];
  const resolver = {
    ...defaultConfig.resolver,
    sourceExts: [...defaultConfig.resolver.sourceExts, 'cjs'],
  };
  return {
    ...defaultConfig,
    projectRoot,
    watchFolders,
    resolver,
  };
})();
JS
  echo "Created metro.config.js"
else
  echo "metro.config.js exists (skipped)"
fi

# 4) Root tsconfig.json — ensure path aliases include shared packages
if [ ! -f "$TS_CONFIG_ROOT" ]; then
  cat > "$TS_CONFIG_ROOT" <<JSON
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "jsx": "react",
    "lib": ["ES2020", "DOM"],
    "moduleResolution": "node",
    "allowJs": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@tfx/shared-ui": ["packages/shared-ui/src"],
      "@tfx/shared-logic": ["packages/shared-logic/src"]
    }
  },
  "include": ["apps/**/*", "packages/**/*"]
}
JSON
  echo "Created root tsconfig.json"
else
  echo "tsconfig.json exists (skipped)"
fi

# 5) ESLint root config — create if missing
if [ ! -f "$ESLINT_ROOT" ]; then
  cat > "$ESLINT_ROOT" <<JSON
{
  "root": true,
  "extends": ["@react-native-community", "eslint:recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }]
  }
}
JSON
  echo "Created .eslintrc.json"
else
  echo ".eslintrc.json exists (skipped)"
fi

# 6) Create a sample Contractor screen that uses shared UI Button
CONTRACTOR_SCREEN="$APP_DIR/src/ContractorHome.tsx"
mkdir -p "$APP_DIR/src"
if [ ! -f "$CONTRACTOR_SCREEN" ]; then
  cat > "$CONTRACTOR_SCREEN" <<'TSX'
import React from 'react';
import { SafeAreaView, Text, StyleSheet } from 'react-native';
import { Button } from '@tfx/shared-ui';

export default function ContractorHome() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>TFX Hub Contractor (Example)</Text>
      <Button title="Browse Projects" onPress={() => console.log('Browse Projects pressed')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 20, marginBottom: 16 }
});
TSX
  echo "Created ContractorHome screen at $CONTRACTOR_SCREEN"
else
  echo "ContractorHome screen exists (skipped)"
fi

# 7) Update App entry to render ContractorHome
APP_ENTRY_TSX="$APP_DIR/App.tsx"
if [ -f "$APP_ENTRY_TSX" ]; then
  cp "$APP_ENTRY_TSX" "$APP_ENTRY_TSX.bak" 2>/dev/null || true
  cat > "$APP_ENTRY_TSX" <<'TSX'
import React from 'react';
import ContractorHome from './src/ContractorHome';

export default function App() {
  return <ContractorHome />;
}
TSX
  echo "Updated $APP_ENTRY_TSX to render ContractorHome"
else
  cat > "$APP_ENTRY_TSX" <<'TSX'
import React from 'react';
import ContractorHome from './src/ContractorHome';
export default function App() { return <ContractorHome />; }
TSX
  echo "Created App.tsx"
fi

# 8) Ensure packages/shared-ui has index export and Button (create minimal if missing)
SHARED_UI_INDEX="$SHARED_UI/src/index.ts"
SHARED_UI_BUTTON="$SHARED_UI/src/Button.tsx"
if [ ! -f "$SHARED_UI_BUTTON" ]; then
  mkdir -p "$SHARED_UI/src"
  cat > "$SHARED_UI_BUTTON" <<'TSX'
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = { title: string; onPress?: () => void; style?: any; };

export default function Button({ title, onPress, style }: Props) {
  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: { backgroundColor: '#0b5cff', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center' },
  text: { color: '#fff', fontWeight: '600' }
});
TSX
  echo "Created shared UI Button at $SHARED_UI_BUTTON"
fi

if [ ! -f "$SHARED_UI_INDEX" ]; then
  cat > "$SHARED_UI_INDEX" <<TS
export { default as Button } from './Button';
TS
  echo "Created $SHARED_UI_INDEX"
fi

# 9) Ensure packages/shared-logic has index export (create minimal if missing)
SHARED_LOGIC_INDEX="$SHARED_LOGIC/src/index.js"
if [ ! -f "$SHARED_LOGIC_INDEX" ]; then
  mkdir -p "$SHARED_LOGIC/src"
  cat > "$SHARED_LOGIC_INDEX" <<JS
// @tfx/shared-logic - placeholder exports
module.exports = {
  info: 'shared-logic placeholder'
};
JS
  echo "Created $SHARED_LOGIC_INDEX"
fi

# 10) Add VS Code tasks for contractor app
VSCODE_TASKS="$ROOT/.vscode/tasks.contractor.json"
cat > "$VSCODE_TASKS" <<JSON
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "RN: Start Metro (contractor)",
      "type": "shell",
      "command": "pnpm --filter contractor-app dev",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "RN: Run Android (contractor)",
      "type": "shell",
      "command": "pnpm --filter contractor-app android",
      "presentation": { "reveal": "always" }
    },
    {
      "label": "RN: Run iOS (contractor)",
      "type": "shell",
      "command": "pnpm --filter contractor-app ios",
      "presentation": { "reveal": "always" }
    }
  ]
}
JSON
echo "Created VS Code tasks at $VSCODE_TASKS"

# 11) Add README for contractor-app
README_APP="$APP_DIR/README.md"
cat > "$README_APP" <<MD
# Contractor App (React Native)

This folder contains the Contractor React Native app.

## Dev
- Start Metro: pnpm --filter contractor-app dev
- Run Android: pnpm --filter contractor-app android
- Run iOS: pnpm --filter contractor-app ios

Shared UI components are imported from packages/shared-ui via path alias @tfx/shared-ui.
MD
echo "Wrote $README_APP"

# 12) Install workspace dependencies (best-effort)
if command -v pnpm >/dev/null 2>&1; then
  echo "Installing workspace dependencies with pnpm..."
  pnpm install || true
else
  echo "pnpm not found. Run 'pnpm install' or use npm/yarn to install dependencies."
fi

# 13) Commit created artifacts if inside git repo
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$APP_DIR" "$SHARED_UI" "$SHARED_LOGIC" "$VSCODE_TASKS" "$README_APP" || true
  git commit -m "chore(contractor-app): scaffold RN TypeScript contractor app and wire shared packages ($TS)" || true
fi

# 14) Summary and acceptance criteria
echo
echo "Contractor app scaffold complete."
echo " - App: $APP_DIR"
echo " - Shared UI: $SHARED_UI/src/Button.tsx"
echo " - Shared logic placeholder: $SHARED_LOGIC/src/index.js"
echo " - VS Code tasks: $VSCODE_TASKS"
echo
echo "Acceptance criteria:"
echo " 1) Run 'pnpm --filter contractor-app dev' to start Metro (or run 'pnpm install' first)."
echo " 2) Launch Android or iOS emulator and run the app; the ContractorHome screen should render and show the shared Button."
echo
echo "Next step (Step 5): implement shared auth module and tenant middleware."
echo "When ready, prompt 'Whats next' and I will render Step 5 script."
