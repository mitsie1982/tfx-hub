#!/usr/bin/env bash
set -euo pipefail

# scripts/generate_docs_and_onboarding.sh
# Purpose:
#  - Generate comprehensive project documentation
#  - Create developer onboarding guides
#  - Generate architecture and workflow diagrams
#  - Create quick-start guides by role
#  - Generate API documentation skeletons
#  - Create troubleshooting and runbooks
#
# Usage:
#   chmod +x scripts/generate_docs_and_onboarding.sh
#   ./scripts/generate_docs_and_onboarding.sh

ROOT="$(pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

DOCS_DIR="$ROOT/docs"
GUIDES_DIR="$DOCS_DIR/guides"
ARCH_DIR="$DOCS_DIR/architecture"
ONBOARDING_DIR="$DOCS_DIR/onboarding"

mkdir -p "$DOCS_DIR" "$GUIDES_DIR" "$ARCH_DIR" "$ONBOARDING_DIR"

echo "📚 Generating comprehensive documentation and onboarding materials ($TS)"

# ============================================================================
# 1. PROJECT README
# ============================================================================
README="$DOCS_DIR/README.md"
cat > "$README" <<'EOF'
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
EOF
echo "✓ Created project README: $README"

# ============================================================================
# 2. ONBOARDING README
# ============================================================================
ONBOARD_README="$ONBOARDING_DIR/README.md"
cat > "$ONBOARD_README" <<'EOF'
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
EOF
echo "✓ Created onboarding README: $ONBOARD_README"

# ============================================================================
# 3. MOBILE DEVELOPER GUIDE
# ============================================================================
MOBILE_GUIDE="$ONBOARDING_DIR/for_mobile_devs.md"
cat > "$MOBILE_GUIDE" <<'EOF'
# Onboarding Guide: Mobile Developer

Welcome! This guide is tailored for React Native and mobile platform engineers.

## Setup

Follow the [main onboarding guide](./README.md) first, then:

### iOS Development
```bash
# Install CocoaPods
sudo gem install cocoapods

# Setup iOS simulator
cd apps/contractor-app/ios
pod install
cd ../..

# Start development
cd apps/contractor-app
npm start    # Metro bundler
# In another terminal:
npm run ios  # Open iOS simulator
```

### Android Development
```bash
# Install Android SDK (via Android Studio)
# Set ANDROID_HOME environment variable
export ANDROID_HOME=~/Library/Android/SDK  # macOS
export ANDROID_HOME=~/Android/Sdk          # Linux

# Setup emulator
android avd  # Create virtual device

# Start development
cd apps/contractor-app
npm start    # Metro bundler
# In another terminal:
npm run android  # Open Android emulator
```

### Windows/React Native Windows (RNW)
Refer to [Windows Support Spike](../../spikes/windows/rnw-sample/README.md) for current status.

## Stack

- **Framework** — React Native 0.72+
- **Package Manager** — pnpm (workspaces)
- **State Management** — Redux / Context API (check app/src/store)
- **API Client** — Axios / Fetch (see @tfx/shared-auth)
- **Navigation** — React Navigation (or similar)
- **Testing** — Jest + Detox (E2E)

## File Structure

```
apps/contractor-app/
├── src/
│   ├── App.tsx              # Root component + observability
│   ├── screens/             # Screen components
│   ├── components/          # Reusable components
│   ├── services/            # API and utility services
│   ├── store/               # State management
│   ├── types/               # TypeScript interfaces
│   ├── hooks/               # Custom React hooks
│   └── styles/              # Shared styles/theme
├── e2e/                     # Detox E2E tests
├── ios/                     # iOS native code
├── android/                 # Android native code
├── app.json                 # App configuration
└── package.json
```

## Common Tasks

### Run Tests
```bash
# Unit tests
pnpm --filter @tfx/contractor-app test

# E2E tests (iOS)
pnpm --filter e2e-detox test:ios

# E2E tests (Android)
pnpm --filter e2e-detox test:android
```

### Debug

```bash
# Metro debug menu
# Shake device (cmd+D on iOS simulator, RR on Android emulator)
# Select "Debug" option

# Chrome DevTools
# Open http://localhost:8081/debugger-ui
```

### Native Modules

If you need native code:
1. Find native file: `ios/ContractorApp.xcodeproj/...`
2. Open in Xcode: `xed ios`
3. Make changes and rebuild

For Android, use Android Studio:
```bash
# Install Android Studio plugins for React Native
# Then open android/ folder in Android Studio
```

## Performance Tips

- **Minimize re-renders** — Use React.memo and useMemo
- **LazyLoad screens** — React Navigation code splitting
- **Optimize images** — Use appropriate sizes and formats
- **Avoid large state** — Keep Redux store normalized
- **Profile with DevTools** — React Native DevTools in Metro menu

## Deployment

See [Release Process](../guides/release_process.md) for:
- Building APKs/IPAs
- Fastlane automation
- App Store / Play Store submission
- Beta releases via Firebase Test Lab / App Center

## Useful Commands

```bash
# Clear Metro cache
pnpm run metro -- --reset-cache

# Rebuild native modules
cd apps/contractor-app
rm -rf ios/Pods
pod install  # iOS

# gradlew clean  # Android

# Run linter
pnpm --filter @tfx/contractor-app lint

# Format code
pnpm --filter @tfx/contractor-app format
```

## Troubleshooting

### Metro bundler hangs
```bash
# Clear cache and restart
pnpm run metro -- --reset-cache
# Kill Metro process and restart
lsof -i :8081
kill -9 <PID>
npm start
```

### Simulator doesn't recognize changes
```bash
# Full rebuild
cd apps/contractor-app
rm -rf node_modules
pnpm install
npm run ios  # or npm run android
```

### Native build fails
```bash
# iOS
cd ios
pod install --repo-update
xcodebuild clean -scheme ContractorApp

# Android
./gradlew clean
./gradlew build
```

## Resources

- [React Native Docs](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [Detox E2E](https://wix.github.io/Detox)
- [TypeScript + React Native](https://www.typescriptlang.org/docs/handbook/react.html)

---

Happy coding! Questions? Slack #tfx-hub-mobile
EOF
echo "✓ Created mobile dev guide: $MOBILE_GUIDE"

# ============================================================================
# 4. BACKEND DEVELOPER GUIDE
# ============================================================================
BACKEND_GUIDE="$ONBOARDING_DIR/for_backend_devs.md"
cat > "$BACKEND_GUIDE" <<'EOF'
# Onboarding Guide: Backend Developer

Welcome! This guide is tailored for Node.js and API engineers.

## Setup

Follow the [main onboarding guide](./README.md) first, then:

```bash
# Install backend dependencies
pnpm install

# Start local backend server
pnpm --filter @tfx/shared-auth test:integration

# Verify API is running
curl http://localhost:3000/health  # or configured port
```

## Stack

- **Runtime** — Node.js 18+
- **Package Manager** — pnpm (workspaces)
- **Web Framework** — Express 5.x
- **Auth** — JWT (jsonwebtoken)
- **Database** — PostgreSQL (or configured DB)
- **Logging** — Structured JSON via @tfx/shared-logging
- **Testing** — Jest + Supertest (integration tests)
- **API Documentation** — OpenAPI / Swagger (planned)

## File Structure

```
packages/shared-auth/
├── src/
│   ├── index.js            # Main auth middleware
│   ├── services/           # Business logic
│   ├── routes/             # API endpoints
│   ├── middleware/         # Express middleware
│   ├── types/              # TypeScript definitions
│   └── utils/              # Helper functions
├── tests/
│   ├── unit/               # Unit tests
│   └── integration/        # API integration tests
└── package.json
```

## Common Tasks

### Run Tests
```bash
# Unit tests
pnpm --filter @tfx/shared-auth test

# Integration tests
pnpm --filter @tfx/shared-auth test:integration

# Watch mode
pnpm --filter @tfx/shared-auth test -- --watch

# Coverage report
pnpm --filter @tfx/shared-auth test -- --coverage
```

### Start Development Server
```bash
# Watch mode with auto-reload
pnpm --filter @tfx/shared-auth run dev

# Or with NODE_ENV and debug logging
NODE_ENV=development DEBUG=tfx:* npm start
```

### Debug

```bash
# VSCode debugging
# Add breakpoint, then run:
node --inspect-brk index.js
# Opens chrome://inspect

# Or use VSCode debug launcher (.vscode/launch.json)
# F5 to start debugging

# Log debugging
# Use @tfx/shared-logging:
const logger = require('@tfx/shared-logging')('my-service');
logger.info('Debug message', { key: 'value' });
```

### Database Migrations

```bash
# Run migrations (if using migrations tool)
pnpm run migrate:up

# Rollback
pnpm run migrate:down

# Create new migration
pnpm run migrate:create my_migration
```

## API Development

### Creating Endpoints

```javascript
const express = require('express');
const { authMiddleware } = require('@tfx/shared-auth');
const logger = require('@tfx/shared-logging')('my-service');

const router = express.Router();

// Protected endpoint
router.get('/api/resource/:id', authMiddleware, async (req, res) => {
  try {
    logger.info('Fetching resource', { id: req.params.id, userId: req.user.id });
    // Logic here
    res.json({ id: req.params.id, data: '...' });
  } catch (err) {
    logger.error('Failed to fetch resource', { err: err.message, code: 'ERR_FETCH' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
```

### Authentication

```javascript
const { signToken, verifyToken } = require('@tfx/shared-auth');

// Sign token
const token = signToken({ userId: 123, role: 'admin' }, { expiresIn: '1h' });

// Verify token in middleware
const verified = verifyToken(token);
console.log(verified); // { userId: 123, role: 'admin', iat: ..., exp: ... }
```

### Logging

```javascript
const logger = require('@tfx/shared-logging')('service-name');

logger.info('User logged in', { userId: 123 });
logger.warn('Rate limit approaching', { userId: 123, remaining: 5 });
logger.error('Database error', { code: 'ECONNREFUSED', detail: '...' });
logger.debug('Detailed trace', { query: '...', result: '...' });

// Start request with correlation ID
const reqLogger = logger.startRequest();
// ...later...
// Logs automatically include requestId for tracing
```

## Performance & Security

### Query Optimization
```javascript
// Bad: N+1 queries
const users = db.query('SELECT * FROM users');
for (const user of users) {
  user.posts = db.query('SELECT * FROM posts WHERE user_id = ?', user.id);
}

// Good: Single query with JOIN
const users = db.query(`
  SELECT u.*, p.* FROM users u
  LEFT JOIN posts p ON u.id = p.user_id
`);
```

### Security Best Practices
- ✅ Use parameterized queries (prevent SQL injection)
- ✅ Validate/sanitize input
- ✅ Enforce HTTPS in production
- ✅ Never log sensitive data
- ✅ Use rate limiting on public APIs
- ✅ Implement CORS properly
- ❌ Never hardcode secrets
- ❌ Never trust client data

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Deployment

### Local
```bash
# Start with env config
NODE_ENV=development npm start
```

### Staging/Production
See [Release Process](../guides/release_process.md) for:
- Docker containerization
- Environment configuration
- Database migrations
- Health checks
- Monitoring and alerting

## Useful Commands

```bash
# Run linter
pnpm --filter @tfx/shared-auth lint

# Format code
pnpm --filter @tfx/shared-auth format

# Check dependencies
pnpm outdated

# Audit for vulnerabilities
pnpm audit

# Generate API docs (if configured)
pnpm run docs:generate
```

## Troubleshooting

### Port already in use
```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database connection timeout
```bash
# Check connection string
echo $DATABASE_URL

# Verify database is running
psql $DATABASE_URL -c "SELECT 1"

# Check logs
NODE_ENV=development DEBUG=tfx:* npm start
```

### Tests fail intermittently
```bash
# Increase timeout
jest --testTimeout=10000

# Run sequentially (not parallel)
jest --maxWorkers=1

# Check for async issues
# Add done() callback or return Promise
```

## Resources

- [Express.js Docs](https://expressjs.com)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [JWT Auth](https://jwt.io)
- [PostgreSQL Docs](https://www.postgresql.org/docs)
- [Jest Testing](https://jestjs.io)

---

Happy coding! Questions? Slack #tfx-hub-backend
EOF
echo "✓ Created backend dev guide: $BACKEND_GUIDE"

# ============================================================================
# 5. QA ENGINEER GUIDE
# ============================================================================
QA_GUIDE="$ONBOARDING_DIR/for_qa.md"
cat > "$QA_GUIDE" <<'EOF'
# Onboarding Guide: QA Engineer

Welcome! This guide is tailored for quality assurance and test automation engineers.

## Setup

Follow the [main onboarding guide](./README.md) first, then:

```bash
# Install test dependencies
pnpm install

# Verify test infrastructure
pnpm test

# Setup E2E testing environment
pnpm --filter e2e-detox install
pnpm --filter e2e-appium install
```

## Testing Stack

- **Unit Tests** — Jest
- **Integration Tests** — Jest + Supertest
- **E2E (Mobile)** — Detox (React Native)
- **E2E (Cross-platform)** — Appium + WebDriverIO
- **Test Reports** — LCOV / HTML reports
- **CI/CD** — GitHub Actions

## Test Structure

```
├── packages/shared-auth/
│   ├── tests/
│   │   ├── unit/           # Unit tests with Jest
│   │   └── integration/    # API tests with Supertest
│   └── package.json
├── apps/contractor-app/
│   ├── tests/              # Component tests
│   └── __tests__/          # More unit tests
└── e2e/
    ├── detox/             # React Native E2E
    │   ├── e2e/           # Test files
    │   └── config/        # Device configs
    └── appium/            # Cross-platform E2E
        ├── test/          # Test files
        └── wdio.conf.js   # Configuration
```

## Running Tests

### Unit Tests
```bash
# All unit tests
pnpm test

# Specific package
pnpm --filter @tfx/shared-auth test

# Watch mode
pnpm --filter @tfx/shared-auth test -- --watch

# With coverage
pnpm --filter @tfx/shared-auth test -- --coverage
```

### Integration Tests
```bash
# API integration tests
pnpm --filter @tfx/shared-auth test:integration

# With specific config
npm test -- --testPathPattern=integration
```

### E2E Tests (React Native)
```bash
# iOS simulator
pnpm --filter e2e-detox test:ios

# Android emulator
pnpm --filter e2e-detox test:android

# Specific test file
pnpm --filter e2e-detox test -- --testNamePattern="Login"
```

### E2E Tests (Cross-platform)
```bash
# Start Appium server first
appium

# In another terminal, run tests
pnpm --filter e2e-appium test

# Specific device
pnpm --filter e2e-appium test -- --capabilities.platformName=Android
```

## Writing Tests

### Unit Test Example
```javascript
// __tests__/calculator.test.js
describe('Calculator', () => {
  test('adds two numbers', () => {
    const result = add(2, 3);
    expect(result).toBe(5);
  });

  test('handles negative numbers', () => {
    const result = add(-2, 3);
    expect(result).toBe(1);
  });
});
```

### Integration Test Example
```javascript
// tests/integration/auth.test.js
const request = require('supertest');
const app = require('../../src/index');

describe('Authentication API', () => {
  test('POST /login returns 200 with valid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test@example.com', password: 'password123' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
  });
});
```

### E2E Test Example (Detox)
```javascript
// e2e/detox/e2e/login.e2e.js
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should login with valid credentials', async () => {
    await element(by.id('email_input')).typeText('test@example.com');
    await element(by.id('password_input')).typeText('password123');
    await element(by.id('login_button')).tap();

    await expect(element(by.text('Welcome'))).toBeVisible();
  });
});
```

## Test Coverage Goals

- **Unit Tests** — >80% coverage
- **Integration Tests** — Critical paths (auth, payment, core flows)
- **E2E Tests** — Happy path + major edge cases
- **Overall** — Aim for 85%+ combined coverage

## Performance Testing

```bash
# Run tests with timing
npm test -- --verbose

# Profile slow tests
npm test -- --testTimeout=5000 --detectOpenHandles

# Memory profiling
node --inspect-brk node_modules/.bin/jest
# Open chrome://inspect
```

## Test Reports

```bash
# Generate HTML coverage report
pnpm test -- --coverage --coverageReporters=html

# View report
open coverage/index.html

# JUnit XML report (for CI)
pnpm test -- --reporters=default --reporters=jest-junit
```

## Device Testing

### iOS Simulator
```bash
# List available simulators
xcrun simctl list

# Launch specific simulator
xcrun simctl boot "iPhone 14"

# Run tests on specific simulator
pnpm --filter e2e-detox test:ios -- --device.type=iPhone14
```

### Android Emulator
```bash
# List available emulators
emulator -list-avds

# Launch emulator
emulator -avd <name>

# Run tests on specific emulator
pnpm --filter e2e-detox test:android -- --device.name=<name>
```

## Continuous Integration

### CI Jobs
- **Pull Request**: Unit + integration tests
- **Main Branch**: Full suite (unit + integration + E2E)
- **Nightly**: Extended performance tests
- **Release**: Full regression suite

### Viewing Results
```bash
# Local CI simulation
act -j test  # GitHub Actions

# Check logs
git log --oneline -p  # Local commits

# View CI on GitHub
# Go to Actions tab → Select workflow → View logs
```

## Bug Reporting

When a test fails:
1. **Reproduce locally** — Run test in isolation
2. **Gather logs** — Check console/file logs
3. **Screenshot/Video** — Detox/Appium capture
4. **Environment** — Node version, OS, simulator version
5. **Report** — Include all above in issue

## Troubleshooting

### Test timeouts
```bash
# Increase timeout
jest --testTimeout=10000

# Check for hanging promises
test('...', async () => {
  // Ensure all async operations are awaited
  await someAsyncOp();
});
```

### Flaky tests
```bash
# Run test multiple times
jest --runInBand my.test.js --testNamePattern="flaky test"

# Common causes:
# - Race conditions
# - Unclean test state
# - External service dependencies
# - Timing assumptions
```

### Device connection issues
```bash
# Reset simulator
xcrun simctl erase all  # iOS

# Or restart emulator
emulator -avd <name> -wipe-data  # Android
```

## Resources

- [Jest Documentation](https://jestjs.io)
- [Detox E2E Testing](https://wix.github.io/Detox)
- [Appium Docs](http://appium.io)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

Happy testing! Questions? Slack #tfx-hub-qa
EOF
echo "✓ Created QA dev guide: $QA_GUIDE"

# ============================================================================
# 6. GLOSSARY
# ============================================================================
GLOSSARY="$ONBOARDING_DIR/glossary.md"
cat > "$GLOSSARY" <<'EOF'
# Glossary of Terms

Technical terms and abbreviations used in TFX Hub.

## A

**API** — Application Programming Interface. Set of rules for software communication.

**Auth/Authentication** — Process of verifying user identity (login).

**Authorization** — Process of determining what a user can do (permissions).

**Axios** — HTTP client library for making API requests.

## C

**CI/CD** — Continuous Integration/Continuous Deployment. Automated testing and release.

**Commit** — A saved change in Git with a message.

**Conventional Commits** — Standardized commit format (feat:, fix:, etc.).

**CORS** — Cross-Origin Resource Sharing. Security mechanism for APIs.

## D

**Detox** — E2E testing framework for React Native apps.

**Dependency** — External library or package your code relies on.

## E

**E2E/End-to-End Testing** — Testing complete user flows (UI → API → Database).

**ESLint** — JavaScript code linting tool.

**Express** — Node.js web framework for building APIs.

## G

**Git** — Version control system for tracking code changes.

**GitHub** — Cloud platform for Git repositories and collaboration.

**Glossary** — This document! List of terms with definitions.

## H

**Husky** — Git hooks manager for running scripts on commits.

## J

**JWT/JSON Web Token** — Standard format for authentication tokens.

**Jest** — JavaScript testing framework.

## L

**Lint/Linting** — Automated code quality checking.

## M

**Metro** — React Native JavaScript bundler.

**Monorepo** — Repository containing multiple projects (Apps + Packages).

## N

**Node.js** — JavaScript runtime for server-side development.

**npm** — Node Package Manager (package management tool).

## P

**Package** — Reusable code library (e.g., @tfx/shared-auth).

**Payload** — Data sent in an API request/response.

**pnpm** — Fast Node package manager with workspace support.

**PR/Pull Request** — Request to merge code changes into main branch.

## R

**React Native** — Framework for building iOS/Android apps with React.

**Regex/Regular Expression** — Pattern matching for strings.

**Release** — Version of software deployed to production.

## S

**Supertest** — HTTP testing library for Node APIs.

**Submodule** — Git repository embedded in another repository.

## T

**Terminal/CLI** — Command-line interface for running commands.

**Test Coverage** — Percentage of code exercised by tests.

**TypeScript** — Typed superset of JavaScript.

## U

**Unit Test** — Test for single function/component in isolation.

## V

**Vulnerability** — Security weakness that could be exploited.

## W

**Webhook** — Automated callback for external services.

**Workspace** — pnpm project containing multiple packages.

## Key Acronyms

| Acronym | Meaning |
|---------|---------|
| API | Application Programming Interface |
| CI/CD | Continuous Integration / Continuous Deployment |
| CORS | Cross-Origin Resource Sharing |
| E2E | End-to-End |
| JWT | JSON Web Token |
| SQL | Structured Query Language |
| SSR | Server-Side Rendering |
| UI | User Interface |
| UX | User Experience |
| URL | Uniform Resource Locator |

---

**Note**: This glossary is living document. Add new terms as needed!
EOF
echo "✓ Created glossary: $GLOSSARY"

# ============================================================================
# 7. ARCHITECTURE OVERVIEW
# ============================================================================
ARCH_OVERVIEW="$ARCH_DIR/overview.md"
cat > "$ARCH_OVERVIEW" <<'EOF'
# Architecture Overview

High-level system architecture for TFX Hub.

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                   End Users                         │
│          (Contractors, Homeowners)                  │
└────────────┬────────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────────┐   ┌───▼──────────┐
│ Mobile App │   │  Web Client  │
│ (RN iOS/   │   │  (React/     │
│  Android)  │   │   Vue.js)    │
└───┬────────┘   └───┬──────────┘
    │                │
    └────────┬───────┘
             │ HTTP/HTTPS
    ┌────────▼────────────────────────────┐
    │      Backend API Gateway             │
    │  (Express.js / Node.js)              │
    │  - Authentication (JWT)              │
    │  - Routing & Validation              │
    │  - Rate Limiting                     │
    └────────┬──────────────────┬──────────┘
             │                  │
    ┌────────▼──────────┐  ┌───▼──────────────┐
    │  Business Logic   │  │ Authentication   │
    │  (@tfx/shared-*)  │  │ Service          │
    │  - User logic     │  │ (JWT middleware) │
    │  - Orders         │  │                  │
    │  - Payments       │  │                  │
    └────────┬──────────┘  └──────────────────┘
             │
    ┌────────▼───────────────────────┐
    │      PostgreSQL Database       │
    │  - Users/Contractors           │
    │  - Orders/Payments             │
    │  - Audit Logs                  │
    └────────────────────────────────┘
```

## Components

### 1. Client Layer

**Mobile App** (React Native)
- iOS & Android native apps
- Built with React Native + Expo (or managed)
- Location services
- Push notifications
- Offline support

**Web Client** (Frontend)
- React or Vue.js application
- Responsive design
- Progressive Web App (PWA)

### 2. API Layer

**Express.js Backend**
- RESTful API endpoints
- JWT authentication
- Request validation
- Rate limiting
- CORS handling
- Error handling

### 3. Business Logic Layer

**Shared Packages** (pnpm Workspaces)
- `@tfx/shared-auth` — Authentication & authorization
- `@tfx/shared-logging` — Structured logging
- `@tfx/shared-logic` — Core business logic
- `@tfx/shared-ui` — Reusable UI components

### 4. Data Layer

**PostgreSQL Database**
- Relational data model
- User management
- Transaction data
- Audit logs
- Full-text search indexes

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Mobile** | React Native | 0.72+ |
| **Web** | React / Vue | 18+ |
| **Backend** | Node.js / Express | 18+ / 5.x |
| **Auth** | JWT / jsonwebtoken | 9.x |
| **Database** | PostgreSQL | 12+ |
| **Package Mgr** | pnpm | 10+ |
| **Testing** | Jest / Detox / Appium | Latest |
| **Logging** | Winston / Bunyan | Custom |
| **Monitoring** | Prometheus / Grafana | Latest |

## Data Flow

### User Registration Flow
```
1. User fills form in app
2. Form validation (client-side)
3. POST /api/auth/register
4. Backend validates input
5. Hash password
6. Insert into database
7. Send confirmation email
8. Return JWT token
9. App stores token in secure storage
10. App navigates to home screen
```

### Order Creation Flow
```
1. Contractor searches for jobs
2. User clicks "Apply for job"
3. POST /api/orders/:id/apply
4. Backend validates contractor status
5. Backend checks qualifications
6. Insert application into database
7. Notify job poster
8. Return confirmation
9. App shows "Applied" status
```

## Security Architecture

- **Transport**: HTTPS/TLS for all API communication
- **Authentication**: JWT tokens with secure expiration
- **Authorization**: Role-based access control (RBAC)
- **Secrets**: Environment variables, never hardcoded
- **Database**: Parameterized queries (prevent SQL injection)
- **Logging**: Never log sensitive data (PII, passwords)
- **CORS**: Whitelist specific origins
- **Rate Limiting**: Prevent API abuse

## Scalability Considerations

**Current State**:
- Monolithic API
- Single PostgreSQL instance
- Suitable for <10k users

**Future State**:
- Microservices (Auth, Orders, Payments)
- Database replication (read replicas)
- Redis caching layer
- Message queue (RabbitMQ / Kafka)
- CDN for static assets
- Horizontal scaling (load balancer)

## Deployment Architecture

### Development
```
Dev Machine
├── Node.js + pnpm
├── Local PostgreSQL
├── Metro (React Native bundler)
└── Jest (local tests)
```

### Staging
```
Docker Container (Ubuntu)
├── Node.js + Express
├── PostgreSQL (managed)
├── Nginx (reverse proxy)
└── Health checks
```

### Production
```
Kubernetes Cluster (AWS/GCP/Azure)
├── Deployment: 3 replicas
├── Service: Load balanced
├── Persistent Volume: Database backups
├── ConfigMap: Environment variables
├── Secret: Credentials
└── Ingress: HTTPS routing
```

## CI/CD Pipeline

```
Git Push
  ↓
GitHub Actions Triggered
  ├── Run Linter (ESLint)
  ├── Run Unit Tests (Jest)
  ├── Run Integration Tests
  ├── Scan for Secrets
  ├── Check Dependencies (audit)
  └── Build Docker image
  ↓
On PR Approval:
  ├── Merge to main
  ├── Deploy to staging
  └── Run smoke tests
  ↓
On Release Tag:
  ├── Build production image
  ├── Run full regression tests
  ├── Deploy to production
  ├── Health checks
  └── Rollback on failure
```

## Performance Targets

- **API Response Time**: <200ms (p95)
- **Mobile App Startup**: <3s
- **Database Query Time**: <100ms (p95)
- **Uptime**: 99.9% (SLA)

## Monitoring & Observability

- **Logging**: Structured JSON logs (ELK stack)
- **Metrics**: Prometheus with Grafana dashboards
- **Tracing**: Distributed tracing (Jaeger)
- **Alerts**: PagerDuty / Datadog
- **APM**: New Relic / Datadog APM

## Design Principles

1. **Security First** — Validate all inputs, never trust clients
2. **Fail Gracefully** — Comprehensive error handling
3. **Observable** — Structured logging everywhere
4. **Testable** — Modular code with high test coverage
5. **Scalable** — Stateless services, can add replicas
6. **Maintainable** — Clear code structure and documentation

---

See more details in [Database Schema](./database.md) and [Security](./security.md).
EOF
echo "✓ Created architecture overview: $ARCH_OVERVIEW"

# ============================================================================
# 8. CONTRIBUTING GUIDE
# ============================================================================
CONTRIBUTING="$DOCS_DIR/CONTRIBUTING.md"
cat > "$CONTRIBUTING" <<'EOF'
# Contributing to TFX Hub

Thank you for your interest in contributing! This guide explains our development process.

## Code of Conduct

- Be respectful and inclusive
- No harassment, discrimination, or unwelcome behavior
- Report violations to maintainers@tfxhub.com

## Getting Started

1. Fork the repository
2. Clone your fork
3. Follow [Onboarding Guide](./onboarding/README.md)
4. Create a feature branch: `git checkout -b feat/my-feature`

## Development Workflow

### 1. Pick an Issue
- Look for `good first issue` label for new contributors
- Check `help wanted` for features needing work
- Assign yourself and add `In Progress` label

### 2. Create Feature Branch
```bash
git checkout -b feat/short-description
# Use conventional commit format: feat/, fix/, docs/, etc.
```

### 3. Make Changes
```bash
# Write code and tests
# Run pre-commit checks
pnpm run security:scan
pnpm test

# Format code
pnpm run format

# Lint code
pnpm run lint
```

### 4. Commit with Conventional Commits
```bash
# Format: type(scope): description
# Examples:
git commit -m "feat(auth): add OAuth support"
git commit -m "fix(api): resolve memory leak in logger"
git commit -m "docs(readme): update installation steps"
git commit -m "test(e2e): add login flow test"

# Types: feat, fix, docs, style, refactor, perf, test, chore, ci
```

### 5. Push and Open PR
```bash
git push origin feat/my-feature
# Open PR on GitHub with description
```

### 6. Code Review
- Respond to review comments
- Re-request review when ready
- Merge when approved and CI passes

## Pull Request Standards

### Title Format
```
[CATEGORY] Short description

Examples:
[FEATURE] Add OAuth authentication
[BUG] Fix memory leak in logger
[DOCS] Update setup guide
```

### Description Template
```markdown
## Description
Brief explanation of changes

## Motivation
Why are these changes needed?

## Testing
How were changes tested?

## Checklist
- [ ] Tests added/updated
- [ ] Docs updated
- [ ] No breaking changes (or version bump)
- [ ] Security implications considered
```

### Quality Standards

**All PRs must pass:**
- ✅ Linter (ESLint) with no warnings
- ✅ Unit tests (>80% coverage)
- ✅ Integration tests
- ✅ E2E tests (if applicable)
- ✅ Security scan (no secrets/vulnerabilities)
- ✅ Code review (2 approvals minimum)

## Testing Requirements

### Unit Tests
```bash
pnpm test
# Aim for >80% coverage
pnpm test -- --coverage
```

### Integration Tests
```bash
pnpm --filter @tfx/shared-auth test:integration
```

### E2E Tests
```bash
pnpm --filter e2e-detox test:ios
pnpm --filter e2e-appium test
```

### Security Checks
```bash
pnpm run security:scan        # Secret scanning
pnpm audit                     # Dependency audit
pnpm run security:lint         # Code linting
```

## Commit Message Guidelines

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- **feat** — New feature
- **fix** — Bug fix
- **docs** — Documentation changes
- **style** — Formatting (no code logic change)
- **refactor** — Code restructure (no feature/bug change)
- **perf** — Performance improvement
- **test** — Test additions/fixes
- **chore** — Build, dependencies, tooling
- **ci** — CI/CD configuration

### Examples
```
feat(auth): add OAuth 2.0 support

fix(api): handle null values in response

docs(readme): update installation instructions

test(e2e): add contractor profile flow
```

## Coding Standards

### JavaScript/TypeScript
- Use ESLint rules (auto-fixed by pre-commit)
- Use Prettier for formatting
- Aim for >80% test coverage
- Document complex logic with comments

### File Naming
- Components: PascalCase (LoginForm.tsx)
- Functions/variables: camelCase (getUserId)
- Constants: UPPER_SNAKE_CASE (MAX_RETRY_COUNT)
- Files: kebab-case (auth-middleware.js)

### Documentation
- Add JSDoc comments to functions
- Update README for new features
- Add examples for public APIs
- Link to architecture docs

Example:
```javascript
/**
 * Authenticates user with email and password
 * @param {string} email - User email address
 * @param {string} password - User password
 * @returns {Promise<{token: string}>} - JWT token
 * @throws {AuthError} - If credentials invalid
 */
async function login(email, password) {
  // ... implementation
}
```

## Design Review Process

For major features (>500 lines, >3 files):
1. Open GitHub issue with `design` label
2. Describe proposed architecture
3. Get feedback from maintainers
4. Iterate on design
5. Implement with confidence

## Documentation Requirements

Update docs for:
- ✅ API endpoint changes
- ✅ Database schema changes
- ✅ Configuration changes
- ✅ New public APIs
- ✅ Security implications
- ✅ Breaking changes (with migration guide)

## Review Checklist for Reviewers

- [ ] Code follows style guide
- [ ] Tests cover new logic
- [ ] No security vulnerabilities
- [ ] No hardcoded secrets/credentials
- [ ] No performance regressions
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No unnecessary dependencies

## Merge Process

Once approved:
1. Ensure CI passes on main branch
2. Use "Squash and merge" for single-feature PRs
3. Use "Create a merge commit" for complex changes
4. Delete feature branch after merge

## Release Process

See [Release Process](./guides/release_process.md) for:
- Version numbering (semver)
- Changelog generation
- Tag creation
- Release notes

## Reporting Issues

### Bug Reports
Include:
- Description of bug
- Steps to reproduce
- Expected vs. actual behavior
- Environment (Node version, OS, etc.)
- Error logs/screenshots

### Feature Requests
Include:
- Problem statement (why needed?)
- Proposed solution
- Alternative approaches
- Use cases/examples

## Getting Help

- **Questions** → Open GitHub discussion
- **Issues** → Use GitHub issues
- **Slack** → #tfx-hub channel
- **Email** → dev@tfxhub.com

## License

By contributing, you agree that your contributions are licensed under the project's license.

---

Thank you for making TFX Hub better! 🚀
EOF
echo "✓ Created contributing guide: $CONTRIBUTING"

# ============================================================================
# 9. SECURITY POLICY
# ============================================================================
SECURITY="$DOCS_DIR/SECURITY.md"
cat > "$SECURITY" <<'EOF'
# Security Policy

## Reporting Security Vulnerabilities

**Do NOT** open a public GitHub issue for security vulnerabilities.

### Report Process
1. Email: **security@tfxhub.com**
2. Include:
   - Description of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)
3. We will respond within 48 hours
4. Please allow 90 days for patching before public disclosure

## Security Practices

### Development

- ✅ All code is reviewed by peers
- ✅ Secrets never hardcoded (use .env)
- ✅ Dependencies audited weekly
- ✅ Security tests in CI pipeline
- ✅ HTTPS enforced in production
- ✅ Database queries parameterized

### Authentication

- ✅ JWT tokens with secure expiration
- ✅ Passwords hashed with bcrypt (10+ rounds)
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting on auth endpoints
- ✅ Account lockout after 5 failed logins

### Data Protection

- ✅ HTTPS/TLS for all transport
- ✅ Sensitive data encrypted at rest
- ✅ PII never logged
- ✅ Database encryption enabled
- ✅ Regular backups with encryption
- ✅ GDPR-compliant data handling

### Dependency Management

- ✅ `npm audit` on every PR
- ✅ Automatic dependency updates (Dependabot)
- ✅ Vulnerability scanning (Snyk)
- ✅ No unnecessary dependencies
- ✅ Pin versions for reproducibility

### Deployment

- ✅ Immutable infrastructure (containers)
- ✅ Secrets in environment/vault
- ✅ Least privilege IAM policies
- ✅ Network segmentation
- ✅ WAF (Web Application Firewall)
- ✅ DDoS protection

## Vulnerability Disclosure Timeline

1. **Day 0** — Vulnerability reported
2. **Day 1** — Acknowledgment sent
3. **Day 7** — Patch released (if critical)
4. **Day 30** — Public announcement (if non-critical)
5. **Day 90** — Public disclosure if unpatched

## Bug Bounty

We currently do not have a formal bug bounty program, but we deeply appreciate security researchers finding and responsibly disclosing vulnerabilities. Recognized contributors may receive:
- Public acknowledgment
- Feedback and collaboration
- Priority for new features

## Security Standards

- **OWASP Top 10** — Mitigated and monitored
- **CWE Top 25** — Regular scanning
- **SANS Top 25** — Code reviews
- **PCI DSS** — If processing payments
- **GDPR** — For EU user data
- **SOC 2** — Compliance audit (planned)

## Third-party Security

We:
- ✅ Review terms of external services
- ✅ Verify SSL/TLS certificates
- ✅ Check privacy policies
- ✅ Monitor for breaches (haveibeenpwned)
- ✅ Use reputable infrastructure (AWS, GCP, Azure)

## Security Testing

Our CI pipeline includes:
1. **Static Analysis** — ESLint, SonarQube
2. **Dependency Audit** — npm audit, Snyk
3. **Secret Scanning** — TruffleHog, detect-secrets
4. **SAST** — Semgrep (if configured)
5. **DAST** — OWASP ZAP (planned)
6. **Penetration Testing** — Quarterly (external firm)

## Privacy Policy

User data is:
- ✅ Encrypted in transit (HTTPS)
- ✅ Encrypted at rest (AES-256)
- ✅ Never sold to third parties
- ✅ Retained only as long as necessary
- ✅ Deletable on request (GDPR Right to be Forgotten)

## Incident Response

In case of a security incident:
1. We immediately assess impact
2. Contain the incident
3. Notify affected users
4. Publish post-mortem analysis
5. Implement preventive measures

## Security Contacts

- **General Security** — security@tfxhub.com
- **Incident Report** — incident@tfxhub.com
- **Compliance** — compliance@tfxhub.com
- **On-call** — Check status page for escalation

---

Last Updated: 2026-04-01
Next Review: 2026-07-01
EOF
echo "✓ Created security policy: $SECURITY"

# ============================================================================
# 10. API DOCUMENTATION SKELETON
# ============================================================================
API_DOC="$DOCS_DIR/API.md"
cat > "$API_DOC" <<'EOF'
# API Reference

Comprehensive API documentation for TFX Hub backend.

## Base URL

```
Development:  http://localhost:3000
Staging:      https://staging-api.tfxhub.com
Production:   https://api.tfxhub.com
```

## Authentication

All API endpoints (except `/auth/login` and `/auth/register`) require a JWT token:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" https://api.tfxhub.com/user
```

### Getting a Token

```bash
curl -X POST https://api.tfxhub.com/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"user@example.com\", \"password\": \"password123\"}"

# Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "contractor"
  }
}
```

Token expiration: 24 hours (configurable)

## Error Responses

All errors follow this format:

```json
{
  "error": "UnauthorizedError",
  "code": "AUTH_INVALID_TOKEN",
  "message": "Invalid or expired token",
  "status": 401,
  "requestId": "req_abc123xyz"
}
```

### Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation failed) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate, etc.) |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

## Endpoints

### Authentication

#### POST /auth/register
Create a new user account.

**Request:**
```json
{
  "email": "contractor@example.com",
  "password": "securePassword123",
  "firstName": "John",
  "lastName": "Smith",
  "role": "contractor"  // or "homeowner"
}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "contractor@example.com",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "contractor@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "email": "contractor@example.com",
    "role": "contractor"
  }
}
```

### Users

#### GET /user
Get current user profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "contractor@example.com",
  "firstName": "John",
  "lastName": "Smith",
  "role": "contractor",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

#### PUT /user
Update current user profile.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:**
```json
{
  "id": "user_123",
  "email": "contractor@example.com",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Orders (Jobs)

#### GET /orders
List all available jobs.

**Query Parameters:**
```
?status=open     // open, in-progress, completed, cancelled
?trade=plumbing  // Filter by trade
?location=10001  // Filter by postal code
?page=1          // Pagination
&limit=20        // Results per page
```

**Response:**
```json
{
  "data": [
    {
      "id": "order_456",
      "title": "Emergency Plumbing",
      "description": "Leaky pipe in kitchen",
      "trade": "plumbing",
      "status": "open",
      "budget": 500,
      "location": {
        "postal": "10001",
        "address": "123 Main St, NY"
      },
      "createdAt": "2026-03-20T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### POST /orders
Create a new job (homeowners only).

**Request:**
```json
{
  "title": "Roof Repair Needed",
  "description": "Section of roof needs repair",
  "trade": "roofing",
  "budget": 2000,
  "location": {
    "postal": "90210",
    "address": "456 Oak Ave, LA"
  }
}
```

**Response:**
```json
{
  "id": "order_789",
  "status": "open",
  "createdAt": "2026-04-01T10:00:00Z"
}
```

#### GET /orders/:id
Get specific job details.

**Response:**
```json
{
  "id": "order_456",
  "title": "Emergency Plumbing",
  "description": "Leaky pipe in kitchen",
  "status": "open",
  "budget": 500,
  "homeownerId": "user_homeowner_1",
  "contractor": null,  // Null if no contractor assigned
  "applications": [
    {
      "id": "app_1",
      "contractorId": "user_contractor_1",
      "contractorName": "John Smith",
      "rating": 4.8,
      "message": "I can help with this today"
    }
  ]
}
```

### Payments (Planned)

Endpoints for payments will be documented as they're implemented.

## Rate Limiting

- **Unauthenticated** — 60 requests/minute
- **Authenticated** — 300 requests/minute
- **Premium** — 1000 requests/minute

Headers returned:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1617259200
```

## Pagination

List endpoints support pagination:

```bash
curl "https://api.tfxhub.com/orders?page=2&limit=20"
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Webhooks

Webhooks are sent for important events (planned feature):

- `order.created`
- `order.assigned`
- `order.completed`
- `payment.completed`

## SDK/Libraries

### JavaScript/TypeScript
```javascript
import { TFXHubClient } from '@tfxhub/sdk-js';

const client = new TFXHubClient({
  apiKey: 'your_token_here'
});

const user = await client.user.get();
const orders = await client.orders.list({ status: 'open' });
```

## Testing

### cURL Examples

```bash
# Register
curl -X POST https://api.tfxhub.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","firstName":"Test","role":"contractor"}'

# Login
curl -X POST https://api.tfxhub.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Get user
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.tfxhub.com/user

# List orders
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://api.tfxhub.com/orders?status=open"
```

## OpenAPI/Swagger

Full OpenAPI specification available at:
```
https://api.tfxhub.com/docs/openapi.json
```

Interactive Swagger UI:
```
https://api.tfxhub.com/docs
```

---

For integration examples and SDK documentation, see [Integration Guide](./guides/integration.md).

Last Updated: 2026-04-01
EOF
echo "✓ Created API documentation: $API_DOC"

# ============================================================================
# 11. Summary and final commit
# ============================================================================
echo ""
echo "✅ Documentation generation complete!"
echo ""
echo "📚 Generated Documentation:"
echo "   ✓ docs/README.md (Project overview)"
echo "   ✓ docs/onboarding/README.md (New dev quick start)"
echo "   ✓ docs/onboarding/for_mobile_devs.md (Mobile engineer guide)"
echo "   ✓ docs/onboarding/for_backend_devs.md (Backend engineer guide)"
echo "   ✓ docs/onboarding/for_qa.md (QA engineer guide)"
echo "   ✓ docs/onboarding/glossary.md (Terms & definitions)"
echo "   ✓ docs/architecture/overview.md (System architecture)"
echo "   ✓ docs/CONTRIBUTING.md (Contributing guidelines)"
echo "   ✓ docs/SECURITY.md (Security policy)"
echo "   ✓ docs/API.md (API reference)"
echo ""
echo "🎯 Next Steps for Developers:"
echo "   1. Start with: docs/onboarding/README.md"
echo "   2. Choose your track (mobile, backend, QA)"
echo "   3. Follow setup instructions"
echo "   4. Review architecture: docs/architecture/overview.md"
echo "   5. Understand contribution process: docs/CONTRIBUTING.md"
echo ""
echo "📖 For Reviewers:"
echo "   - Code standards: docs/CONTRIBUTING.md"
echo "   - Architecture decisions: docs/architecture/"
echo "   - API contracts: docs/API.md"
echo "   - Security requirements: docs/SECURITY.md"
echo ""
echo "🔍 For Project Leadership:"
echo "   - Project overview: docs/README.md"
echo "   - Security posture: docs/SECURITY.md"
echo "   - Roadmap coordination: docs/guides/release_process.md"
echo ""

# Attempt git commit
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git add "$DOCS_DIR" 2>/dev/null || true
  git commit -m "docs: add comprehensive onboarding and architecture documentation ($TS)" 2>/dev/null || true
fi

echo "✅ Done. All documentation files generated and ready!"
EOF
chmod +x scripts/setup_security_and_hooks.sh
bash scripts/generate_docs_and_onboarding.sh
