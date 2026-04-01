# ⚡ Quick Start: VS Code Demo Tasks

## 30-Second Setup

**Already set up!** All demo tasks are installed in `.vscode/tasks.windows-demo.json`

---

## 🚀 Run a Demo - 3 Ways

### Way 1: Command Palette (Universal)
```
Ctrl+Shift+P → Type "Demo: Contractor" → Enter
```

### Way 2: Task Menu  
```
Ctrl+Shift+P → Type "Tasks: Run Task" → Select demo → Enter
```

### Way 3: Keyboard Shortcut (Optional)
Set up quick keys by copying `.vscode/keybindings.example.json`:
- `Ctrl+Alt+C` → Demo: Contractor
- `Ctrl+Alt+U` → Demo: Customer
- `Ctrl+Alt+A` → Demo: AMS
- `Ctrl+Alt+M` → Demo: Members

---

## 📋 Available Tasks

| Task | Purpose | Hotkey |
|------|---------|--------|
| **Demo: Contractor** | Launch contractor app | `Ctrl+Alt+C` (optional) |
| **Demo: Customer** | Launch customer app | `Ctrl+Alt+U` (optional) |
| **Demo: AMS** | Launch AMS app | `Ctrl+Alt+A` (optional) |
| **Demo: Members** | Launch members app | `Ctrl+Alt+M` (optional) |
| **Create Desktop Shortcuts** | Generate desktop .lnk files | `Ctrl+Shift+P` |
| **Check Dependencies** | Verify Node/pnpm/PowerShell | `Ctrl+Alt+K` (optional) |
| **Kill Metro Bundler** | Stop running Metro process | `Ctrl+Shift+P` |
| **Open Demo Readme** | View setup prerequisites | `Ctrl+Shift+P` |
| **Open VS Code Integration Guide** | Full integration documentation | `Ctrl+Shift+P` |

---

## ⌨️ Setting Up Keyboard Shortcuts  

**Option A (Recommended):**
1. Press `Ctrl+Shift+P`
2. Search "Keyboard Shortcuts (JSON)"
3. Copy content from `.vscode/keybindings.example.json`
4. Paste into your VS Code keybindings.json
5. Restart VS Code or press `Ctrl+R`

**Option B (Manual):**
1. Press `Ctrl+Shift+P` → "Keyboard Shortcuts"
2. Click pencil icon on any demo task
3. Enter desired key combo (e.g., `Ctrl+Alt+C`)
4. Press Enter to save

---

## 🎯 Task Behavior

### Demo Tasks (Contractor, Customer, AMS, Members)
- Runs in **new terminal tab**
- Auto-clears previous output
- Installs `node_modules` if missing
- Starts Metro bundler
- Launches app (RNW or web fallback)
- Terminal stays open for logs/debugging

### Create Desktop Shortcuts
- Creates 4 `.lnk` files on Desktop
- Each points to a demo launcher script
- Windows Explorer/Desktop can run them immediately
- No terminal needed for users with desktop shortcuts

### Check Dependencies
- Verifies Node.js, pnpm, PowerShell are installed
- Shows version numbers
- Reports in shared output panel

### Kill Metro Bundler
- Force-stops Metro process(es)
- Useful if bundler hangs or you need fresh start
- Runs quickly, doesn't interfere with app

---

## ✅ Verification Checklist

- [ ] `.vscode/tasks.windows-demo.json` exists and is readable
- [ ] `scripts/start_contractor_demo.ps1` exists
- [ ] `scripts/start_customer_demo.ps1` exists
- [ ] `scripts/start_ams_demo.ps1` exists
- [ ] `scripts/start_members_demo.ps1` exists
- [ ] `docs/windows_demo_readme.md` exists
- [ ] VS Code Command Palette can find "Tasks: Run Task"
- [ ] At least one demo task runs without errors

---

## 🐛 Troubleshooting

### Tasks don't appear in Command Palette
→ Reload VS Code: `Ctrl+R`

### PowerShell execution policy error
→ Already handled by `-ExecutionPolicy Bypass` flag in tasks

### Metro Bundler port already in use (8081)
→ Run "Kill Metro Bundler" task, then run your demo again

### App directory not found
→ Create `apps/{app}-app/` folder structure, or edit script with correct path

### Node modules missing
→ Scripts auto-run `pnpm install` (or `npm install` if pnpm unavailable)

### Keyboard shortcuts not working
→ Ensure keybindings are in your personal `keybindings.json`, not just `keybindings.example.json`

---

## 📚 Related Documentation

- [VS Code Integration Guide](docs/vscode_integration_guide.md) - Detailed configuration
- [Windows Demo Readme](docs/windows_demo_readme.md) - Setup prerequisites
- [.vscode/tasks.windows-demo.json](.vscode/tasks.windows-demo.json) - Task definitions

---

## 💡 Pro Tips

1. **Right-click task in Command Palette**: Shows "Configure Task" option to edit inline
2. **Group tasks by type**: Demos are in "test" group, shortcuts in "build" group (use Ctrl+Shift+B for build tasks)
3. **Run task without terminal**: Set `"reveal": "silent"` in task definition
4. **Dependent tasks**: Add `"dependsOn": ["other task"]` to run multiple tasks in sequence
5. **Watch mode**: Add problemMatcher with background pattern to keep task running

---

## ✨ One More Thing

The **fastest way** to run a demo after initial setup:

```
1. Ctrl+Shift+P
2. Start typing task name (e.g., "Contractor")
3. Press Enter
4. Done! Task runs, Metro starts, app launches
```

No navigation menus, no extra clicks.

---

**VS Code Integration: Complete ✅**

All 9 tasks configured, commented, and ready to use!
