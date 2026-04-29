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
