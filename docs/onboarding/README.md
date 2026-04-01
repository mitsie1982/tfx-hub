# Developer Onboarding Guide

Welcome to the TFX Hub team! This guide will get you up and running in ~30 minutes.

## Prerequisites

- **Node.js**: v18+ (check with `node --version`)
- **pnpm**: v10+ (install with `npm install -g pnpm@latest`)
- **Git**: v2.30+ with SSH configured
- **macOS/Linux/WSL2**: Windows native development not fully supported yet

## 5-Minute Setup

```bash
# 1. Clone repository
git clone git@github.com:tfxhub/tfx-hub.git
cd tfx-hub

# 2. Install dependencies
pnpm install

# 3. Install git hooks
pnpm run security:install-hooks

# 4. Verify setup
pnpm test
```

If all tests pass, you're ready to develop! 🎉

## Your Role

Choose your path:

- **Mobile Engineer** → [Mobile Dev Guide](./for_mobile_devs.md)
- **Backend Engineer** → [Backend Dev Guide](./for_backend_devs.md)
- **QA Engineer** → [QA Guide](./for_qa.md)
- **Full Stack** → Start with [Developer Setup](../guides/developer_setup.md)

## Common Tasks

### Run Tests
```bash
# All tests
pnpm test

# Specific package
pnpm --filter @tfx/shared-auth test

# Watch mode
pnpm --filter @tfx/shared-auth test --watch
```

### Start Development
```bash
# Mobile dev (React Native)
cd apps/contractor-app
npm start

# Backend dev (Node.js)
npm run dev
```

### Make Commits
```bash
# Changes are scanned for secrets and linted automatically
git add .
git commit -m "feat: add new feature"
# → Pre-commit hooks run automatically
# → Commit blocked if secrets detected or tests fail
```

### Open Pull Request
```bash
git push origin feat/my-feature
# → Open PR on GitHub
# → CI/CD runs security, tests, and builds
# → Request reviewers
# → Address feedback
# → Merge when approved
```

## Project Structure

```
tfx-hub/
├── apps/                    # End-user applications
│   ├── contractor-app/      # Mobile app (React Native)
│   └── ams-app/             # Asset management system
├── packages/                # Shared libraries
│   ├── shared-auth/         # JWT auth middleware
│   ├── shared-logging/      # Structured logging
│   ├── shared-logic/        # Business logic
│   └── shared-ui/           # UI components
├── e2e/                     # End-to-end tests
│   ├── detox/               # React Native E2E (iOS/Android)
│   └── appium/              # Cross-platform E2E
├── docs/                    # Documentation
├── scripts/                 # Helper scripts
├── .github/                 # CI/CD workflows
└── package.json             # Root workspace config
```

## Key Concepts

- **pnpm Workspaces** — Monorepo with shared packages (packages/shared-*)
- **Pre-commit Hooks** — Automated checks before each commit (Husky)
- **Conventional Commits** — Strict commit message format (feat:, fix:, etc.)
- **CI/CD Pipelines** — Automated testing, security, and releases
- **JWT Auth** — Token-based authentication for APIs
- **Structured Logging** — JSON logs with correlation IDs

See [Glossary](./glossary.md) for detailed definitions.

## Troubleshooting

### Node version mismatch
```bash
# Check Node version
node --version

# Update Node (use nvm or nodenv)
nvm install 18
nvm use 18
```

### pnpm install fails
```bash
# Clear cache
pnpm store prune

# Reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Pre-commit hook blocks commit
```bash
# Check what's blocked
pnpm run security:scan

# Fix issues (usually auto-fixed)
git add .
git commit -m "feat: your message"
```

### Tests fail locally but pass in CI
```bash
# Clear node_modules and reinstall
pnpm install

# Run specific test in debug mode
pnpm --filter @tfx/shared-auth test -- --verbose
```

For more help, see [Troubleshooting Guide](../guides/troubleshooting.md) or open an issue.

## Next Steps

1. **Explore the codebase** — Start with `docs/architecture/overview.md`
2. **Review existing PRs** — See coding standards in action
3. **Pick a small issue** — Label: `good first issue`
4. **Ask questions** — Slack or GitHub discussions
5. **Start building** — Choose a feature and implement!

## Resources

- **Architecture** → [architecture/overview.md](../architecture/overview.md)
- **Testing** → [guides/testing_guide.md](../guides/testing_guide.md)
- **Security** → [security.md](../architecture/security.md)
- **API Reference** → [API.md](../API.md)
- **Contributing** → [CONTRIBUTING.md](../CONTRIBUTING.md)

---

**Questions?** Open an issue or reach out on Slack. Welcome aboard! 👋
