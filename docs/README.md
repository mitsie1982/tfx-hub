# TFX Hub - Documentation

Welcome to TFX Hub documentation. This directory contains comprehensive guides for developers, operators, and contributors.

## Quick Links

- **New to TFX Hub?** → Start with [Onboarding Guide](./onboarding/README.md)
- **Setting up locally?** → See [Developer Setup](./guides/developer_setup.md)
- **Understanding architecture?** → Read [Architecture Overview](./architecture/overview.md)
- **Need to troubleshoot?** → Check [Troubleshooting Guide](./guides/troubleshooting.md)
- **Making changes?** → Review [Contributing Guide](./CONTRIBUTING.md)
- **Security concerns?** → See [Security Policy](./SECURITY.md)

## Directory Structure

```
docs/
├── onboarding/              # New developer onboarding
│   ├── README.md           # Quick start
│   ├── for_mobile_devs.md  # Mobile engineer guide
│   ├── for_backend_devs.md # Backend engineer guide
│   ├── for_qa.md           # QA engineer guide
│   └── glossary.md         # Terms and definitions
├── guides/                  # How-to guides and runbooks
│   ├── developer_setup.md  # Local development setup
│   ├── testing_guide.md    # Running tests
│   ├── debugging.md        # Debugging strategies
│   ├── troubleshooting.md  # Common issues and fixes
│   └── release_process.md  # Release workflow
├── architecture/            # Technical documentation
│   ├── overview.md         # System architecture
│   ├── mobile_stack.md     # React Native stack
│   ├── backend_stack.md    # Node/Express backend
│   ├── database.md         # Database schema and design
│   └── security.md         # Security architecture
├── API.md                  # API reference
├── CONTRIBUTING.md         # Contributing guidelines
├── SECURITY.md            # Security policy
└── README.md              # This file
```

## Key Projects

### Applications
- **contractor-app** — React Native mobile app for service contractors
- **ams-app** — Asset management system

### Shared Packages
- **@tfx/shared-auth** — JWT authentication and middleware
- **@tfx/shared-logging** — Structured logging with correlation IDs
- **@tfx/shared-logic** — Core business logic
- **@tfx/shared-ui** — Reusable UI components

### Testing & E2E
- **E2E/detox** — React Native end-to-end tests
- **E2E/appium** — Cross-platform E2E tests

## Quick Commands

```bash
# Install dependencies
pnpm install

# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @tfx/shared-auth test

# Start development
pnpm --filter @tfx/contractor-app dev

# Security checks
pnpm run security:scan
pnpm run security:audit

# Build for production
pnpm --filter @tfx/contractor-app build

# Documentation
pnpm run docs:build  # (if available)
```

## Development Workflow

1. **Clone & Setup**
   ```bash
   git clone <repo>
   cd tfx-hub
   pnpm install
   pnpm run security:install-hooks
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feat/my-feature
   ```

3. **Make Changes**
   - Write code and tests
   - Ensure pre-commit hooks pass
   - Commit with `git commit -m "feat: ..."`

4. **Push & Open PR**
   ```bash
   git push origin feat/my-feature
   ```

5. **Code Review**
   - Address review comments
   - Run full test suite
   - Merge when approved

## CI/CD Pipelines

- **ci_security.yml** — Security checks (secrets, audit, linting)
- **ci_secrets_scan.yml** — Secret detection on PRs
- **ci_auth_tests.yml** — Auth package tests
- **ci_observability.yml** — Observability validation
- **ci_e2e.yml** — End-to-end tests
- **ci_release.yml** — Release automation

## Getting Help

- **Documentation Issues** → Open a GitHub issue with `[docs]` label
- **Questions** → Check existing issues or start a discussion
- **Security Issues** → See [SECURITY.md](./SECURITY.md) reporting process
- **Slack/Chat** → Ask in #tfx-hub channel

## Updates & Maintenance

This documentation is maintained alongside code. When making changes:
1. Update relevant docs in the same PR
2. Keep READMEs in sync with code
3. Add new docs for new major features
4. Review docs quarterly for accuracy

---

**Last Updated**: $TS
**Version**: 1.0.0
