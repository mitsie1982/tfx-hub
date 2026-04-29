# Release Process and Deployment Guide

## Overview

TFX Hub uses semantic versioning (semver) and automated CI/CD for releases.

## Versioning Scheme

Format: `MAJOR.MINOR.PATCH` (e.g., 1.2.3)

- **MAJOR** — Breaking API changes
- **MINOR** — New features (backward compatible)
- **PATCH** — Bug fixes (backward compatible)

Examples:
- `1.0.0` → `1.1.0` — Added new endpoint (minor)
- `1.1.0` → `1.1.1` — Fixed bug (patch)
- `1.1.1` → `2.0.0` — Removed API endpoint (major)

## Release Workflow

### 1. Local Release

```bash
# Ensure main branch is clean and up-to-date
git checkout main
git pull origin main

# Create release (automatic version bump, changelog, tag)
./scripts/release.sh patch   # or minor, major

# This does:
# - Bump version in package.json
# - Generate/update CHANGELOG.md
# - Create git commit
# - Create annotated git tag (v1.2.3)

# Preview changes without committing
./scripts/release.sh patch --dry-run
```

### 2. Push Release

```bash
# Push commits and tags to trigger CI/CD
git push origin main --tags

# This triggers:
# - GitHub Actions workflow: ci_release.yml
# - Build and test
# - Docker image creation
# - Push to registry (if configured)
# - Deploy to staging (if configured)
```

### 3. Deploy to Production

```bash
# Option 1: Manual deployment (recommended for critical releases)
# Verify release in staging: https://staging-api.tfxhub.com/health
# Then deploy:
./scripts/deploy.sh production

# Option 2: Automatic deployment (if configured in CI/CD)
# Release to production automatically on tag push (watch logs)
```

## CI/CD Release Workflow

When you push a tag (e.g., `v1.2.3`):

```
Push tag
  ↓
GitHub Actions triggers ci_release.yml
  ├── Checkout code
  ├── Build application
  ├── Run full test suite
  ├── Build Docker image: tfxhub/api:1.2.3
  ├── Push to Docker registry
  ├── Create GitHub Release
  ├── Deploy to staging
  ├── Run smoke tests
  └── (Manual approval) Deploy to production
```

## Release Types

### Patch Release (Bug fix)
```bash
# Example: 1.2.0 → 1.2.1
./scripts/release.sh patch

# Triggers: Bug fix CI job → Staging deploy → (Optional) Prod deploy
```

### Minor Release (New features)
```bash
# Example: 1.2.0 → 1.3.0
./scripts/release.sh minor

# Triggers: Feature test suite → Integration tests → Staging → Prod
```

### Major Release (Breaking changes)
```bash
# Example: 1.3.0 → 2.0.0
./scripts/release.sh major

# Triggers: Full regression suite → Staging → Manual approval → Prod
# Note: Requires manual approval before production deployment
```

## Production Checklist

Before deploying to production:

- [ ] All tests passing (GitHub Actions green)
- [ ] Code reviewed and approved (2+ reviews)
- [ ] Staging deployment verified
- [ ] Smoke tests passing
- [ ] Database migrations tested
- [ ] Secrets/configuration ready
- [ ] Rollback plan documented
- [ ] Communication to stakeholders

## Rollback Procedure

If issues occur in production:

```bash
# 1. Identify the failing version
git tag  # List all tags

# 2. Revert to previous version
git checkout v1.2.0

# 3. Redeploy
./scripts/deploy.sh production

# 4. Create incident report
# (File: docs/runbooks/incident_YYYY-MM-DD.md)

# 5. Investigate root cause
# (Update code and re-release)
```

## Change Log

Maintained in `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) format.

Format:
```markdown
## [1.2.3] - 2026-04-01

### Added
- New user authentication feature

### Changed
- Updated API response format

### Fixed
- Memory leak in logger

### Deprecated
- Old /v1/api endpoint (use /v2 instead)

### Removed
- Legacy format support

### Security
- Fixed SQL injection vulnerability
```

## Release Notes

Generated automatically from:
1. **Commit messages** — Conventional Commits format
2. **CHANGELOG.md** — Manual additions
3. **GitHub Release** — Auto-published with artifacts

Final release notes available at:
```
https://github.com/tfxhub/tfx-hub/releases/tag/v1.2.3
```

## Monitoring Releases

### Health Checks
```bash
# Liveness check
curl https://api.tfxhub.com/health/live

# Readiness check
curl https://api.tfxhub.com/health/ready

# Metrics
curl https://api.tfxhub.com/metrics
```

### Dashboards
- **Grafana** — http://monitoring.tfxhub.com (or localhost:3001)
- **Prometheus** — http://monitoring.tfxhub.com:9090 (or localhost:9090)

### Key Metrics to Monitor Post-Release
- ✅ Error rate (should be <1%)
- ✅ API latency (p95 <500ms)
- ✅ Memory usage (stable)
- ✅ Database connections (healthy)
- ✅ Failed deployments (0)

## Hotfix (Emergency Release)

For urgent production fixes:

```bash
# Create hotfix branch from main
git checkout -b hotfix/critical-bug

# Make minimal fix
# Test thoroughly
# Create PR and get expedited review

# Release with patch version
./scripts/release.sh patch

# Deploy immediately
./scripts/deploy.sh production
```

## Scheduled Releases

Regular release cadence (recommended):
- **Weekly** — Patch releases (bug fixes)
- **Bi-weekly** — Minor releases (features)
- **Quarterly** — Major releases (major features, breaking changes)

## Secrets and Configuration

For production deployments:

1. **Database credentials** — Store in GitHub Secrets + Vault
2. **API keys** — Rotate quarterly
3. **SSL/TLS certificates** — Auto-renew via Let's Encrypt
4. **Configuration** — Environment-specific .env files

See [Security Policy](../SECURITY.md) for detailed guidelines.

## Troubleshooting

### Release script fails
```bash
# Verify git setup
git status
git config user.name
git config user.email

# Ensure main branch
git checkout main
git pull origin main
```

### Test failures before release
```bash
# Run full test suite locally
pnpm test
pnpm --filter @tfx/shared-auth test:integration

# Fix failures before attempting release
```

### Deployment stuck
```bash
# Check CI/CD logs
# GitHub Actions → Actions tab → Latest workflow

# Check container health
kubectl get pods  # (if using Kubernetes)
docker ps         # (if using Docker)
```

## Further Reading

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)

---

**Questions?** Open an issue or ask in #releases channel on Slack.
