#!/usr/bin/env bash
set -euo pipefail
# scripts/release.sh
# Automated release workflow: version bump, changelog, tag, and publish
#
# Usage:
#   ./scripts/release.sh patch    # 1.0.0 → 1.0.1
#   ./scripts/release.sh minor    # 1.0.0 → 1.1.0
#   ./scripts/release.sh major    # 1.0.0 → 2.0.0
#   ./scripts/release.sh --dry-run # Preview changes

VERSION_TYPE="${1:-patch}"
DRY_RUN="${2:---dry-run}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ "$VERSION_TYPE" = "--help" ] || [ "$VERSION_TYPE" = "-h" ]; then
  echo "Usage: $0 <patch|minor|major> [--dry-run]"
  echo ""
  echo "Examples:"
  echo "  $0 patch              # Increment patch version"
  echo "  $0 minor              # Increment minor version"
  echo "  $0 major              # Increment major version"
  echo "  $0 patch --dry-run    # Preview changes without committing"
  exit 0
fi

# Read current version
CURRENT_VERSION=$(node -pe "require('./package.json').version")
echo "Current version: $CURRENT_VERSION"

# Calculate new version (using semver library or manual logic)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

case "$VERSION_TYPE" in
  patch)
    NEW_VERSION="$MAJOR.$MINOR.$((PATCH + 1))"
    ;;
  minor)
    NEW_VERSION="$MAJOR.$((MINOR + 1)).0"
    ;;
  major)
    NEW_VERSION="$((MAJOR + 1)).0.0"
    ;;
  *)
    echo "Error: Invalid version type '$VERSION_TYPE'. Use: patch, minor, or major"
    exit 1
    ;;
esac

echo "New version: $NEW_VERSION"

if [ "$DRY_RUN" != "--dry-run" ]; then
  echo "🏷️  Tagging release: v$NEW_VERSION"

  # Update version in package.json
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    pkg.version = '$NEW_VERSION';
    fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  "

  # Generate changelog (if changelog tool available)
  if command -v conventional-changelog >/dev/null 2>&1; then
    conventional-changelog -p angular -i CHANGELOG.md -s || echo "Changelog generation skipped"
  fi

  # Commit and tag
  git add package.json CHANGELOG.md 2>/dev/null || git add package.json
  git commit -m "chore(release): v$NEW_VERSION"
  git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"

  echo "✅ Release tagged: v$NEW_VERSION"
  echo "📤 Push to trigger CI/CD release:"
  echo "   git push origin main --tags"
else
  echo "🔍 Dry run - no changes made"
  echo "Changes that would be made:"
  echo "  1. Update package.json version to $NEW_VERSION"
  echo "  2. Generate/update CHANGELOG.md"
  echo "  3. Create git commit with tag v$NEW_VERSION"
fi
