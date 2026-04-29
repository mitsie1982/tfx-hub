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
