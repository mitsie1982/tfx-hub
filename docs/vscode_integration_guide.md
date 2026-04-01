# VS Code Integration - Windows Demo Environment

**Quick Start:** `Ctrl+Shift+D` → Select a task → Run

---

## 🎯 Available Tasks

### Demo Launchers
Launch any demo application with dependencies and Metro bundler:

| Task | App | Command |
|------|-----|---------|
| **Demo: Contractor** | Contractor App | Auto-installs deps, starts Metro, launches app |
| **Demo: Customer** | Customer App | Auto-installs deps, starts Metro, launches app |
| **Demo: AMS** | AMS App | Auto-installs deps, starts Metro, launches app |
| **Demo: Members** | Members App | Auto-installs deps, starts Metro, launches app |

### Setup Tasks
Configure your Windows demo environment:

| Task | Purpose |
|------|---------|
| **Create Desktop Shortcuts** | Generate .lnk files for all demo apps on Desktop |
| **Open Demo Readme** | View prerequisites and setup guide |

---

## 🚀 How to Run Tasks

### Method 1: Command Palette (Recommended)
1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type "Tasks: Run Task"
3. Select desired task from list
4. Task runs in integrated terminal

### Method 2: Terminal Menu
1. Click **Terminal** in menu bar
2. Select **Run Task**
3. Choose your demo

### Method 3: Keyboard Shortcut
Set a custom keybinding in `.vscode/keybindings.json`:
```json
{
  "key": "ctrl+alt+c",
  "command": "workbench.action.tasks.runTask",
  "args": "Demo: Contractor"
},
{
  "key": "ctrl+alt+u",
  "command": "workbench.action.tasks.runTask",
  "args": "Demo: Customer"
}
```

---

## 📋 Task Details

### Demo: Contractor
```
[Execution Flow]
├─ Load: scripts/start_contractor_demo.ps1
├─ Verify: apps/contractor-app/ exists
├─ Install: Run pnpm install || npm install
├─ Start: Metro bundler (background process)
├─ Wait: 2 seconds
└─ Launch: npx react-native run-windows (or fallback to npm run dev)

[Output]
Visible in VS Code Integrated Terminal
Metro Bundler runs in background
App launches in native window
```

### Create Desktop Shortcuts
```
[Execution Flow]
├─ Load: scripts/create_demo_shortcuts.ps1
├─ Detect: Desktop location (standard Windows)
├─ Create: 4 .lnk shortcut files
│  ├─ Demo Contractor.lnk
│  ├─ Demo Customer.lnk
│  ├─ Demo AMS.lnk
│  └─ Demo Members.lnk
└─ Display: Confirmation messages

[Output]
Shortcuts appear on Desktop immediately
Also creates .bat launcher wrappers in scripts/
```

---

## 🎨 Customizing Tasks

### Edit Task Configuration
1. Open `.vscode/tasks.windows-demo.json`
2. Modify any task properties:
   ```json
   {
     "label": "Demo: Custom App",
     "type": "shell",
     "command": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_custom_demo.ps1",
     "presentation": {
       "reveal": "always",
       "panel": "new",
       "clear": true
     },
     "windows": {
       "options": { "shell": { "executable": "powershell.exe" } }
     }
   }
   ```
3. Save and run via Command Palette

### Useful Task Properties
```json
{
  "label": "Task Name",
  "type": "shell",
  "command": "...",
  "presentation": {
    "reveal": "always",          // Show terminal automatically
    "panel": "new",              // New panel vs reuse
    "clear": true,               // Clear previous output
    "echo": true,                // Show command before running
    "focus": true                // Focus terminal after run
  },
  "runOptions": {
    "runOn": "folderOpen"        // Auto-run on folder open (optional)
  },
  "problemMatcher": [],          // Parse output for errors
  "dependsOn": ["other task"]    // Run other task first
}
```

---

## 🛠️ Troubleshooting

### Task Not Appearing in Command Palette
1. Ensure `.vscode/tasks.windows-demo.json` exists
2. Reload VS Code: `Ctrl+R` or restart
3. Verify JSON syntax (no trailing commas)

### "PowerShell not found" Error
1. Ensure PowerShell 5.1+ is installed
2. Check PATH: Open Terminal → `Get-Command powershell`
3. If missing, install Windows PowerShell or PowerShell Core

### Metro Bundler Already Running
1. Kill existing Metro process: `npx lsof -i :8081` (macOS/Linux) or use Task Manager (Windows)
2. Or let the script handle it (may show warning)

### App Directory Not Found
1. Check that `apps/{app}-app/` folder exists
2. Edit the script: `.\scripts\start_{app}_demo.ps1`
3. Correct the path: `$AppDir = Join-Path $RepoRoot 'apps/your-app-location'`

### Execution Policy Error
1. If you see "cannot be loaded because running scripts is disabled..."
2. Run: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
3. Or modify task to include `-ExecutionPolicy Bypass` (already included)

---

## 🔗 Related Files

| File | Purpose |
|------|---------|
| `.vscode/tasks.windows-demo.json` | Task definitions |
| `scripts/start_*_demo.ps1` | Demo launchers (4 files) |
| `scripts/create_demo_shortcuts.ps1` | Shortcut generator |
| `docs/windows_demo_readme.md` | Setup guide |

---

## 💡 Tips & Tricks

### Keep Terminal Open After Task Completes
Add to task:
```json
"problemMatcher": {
  "pattern": {
    "regexp": ".*",
    "file": 1,
    "location": 2,
    "message": 3
  },
  "background": {
    "activeOnStart": true,
    "beginsPattern": "^.*",
    "endsPattern": "^.*done.*"
  }
}
```

### Run Multiple Tasks in Sequence
Create a task that depends on others:
```json
{
  "label": "Setup & Demo: Contractor",
  "dependsOn": ["Create Desktop Shortcuts", "Demo: Contractor"],
  "presentation": { "reveal": "always" }
}
```

### Open Task Output in New Terminal Tab
```json
"presentation": {
  "panel": "new"  // Creates fresh panel/tab per run
}
```

### Auto-Run Task When Opening Workspace
```json
"runOptions": {
  "runOn": "folderOpen"
}
```
(Add to any task in `tasks.json`)

---

## 📚 VS Code Documentation References

- [VS Code Tasks](https://code.visualstudio.com/docs/editor/tasks)
- [Integrated Terminal](https://code.visualstudio.com/docs/editor/integrated-terminal)
- [Command Palette](https://code.visualstudio.com/docs/getstarted/userinterface#_command-palette)
- [Problem Matcher](https://code.visualstudio.com/docs/editor/tasks#_processing-task-output-with-problem-matchers)

---

## ✨ Pro Tips

1. **Create keyboard shortcuts** for frequently-used tasks in `keybindings.json`
2. **Pin your favorite task** to the activity bar for 1-click access
3. **Use watch mode** for development (`problemMatcher` with background pattern)
4. **Chain dependent tasks** to automate multi-step workflows
5. **Customize presentation** (panel location, clear output) per preference

---

**Quick Command Reference:**
```
Ctrl+Shift+P          → Open Command Palette
Tasks: Run Task       → Show task list
Ctrl+`               → Toggle integrated terminal
Ctrl+Shift+`         → New terminal
Terminal > Run Task  → Menu alternative
```

---

**VS Code Integration Status: ✅ COMPLETE**

All demo tasks are configured and ready to use!
