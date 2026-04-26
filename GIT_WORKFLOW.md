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
