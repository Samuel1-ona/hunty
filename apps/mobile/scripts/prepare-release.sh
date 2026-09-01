#!/bin/bash

# EAS Release Preparation Script
# Purpose: Prepare and coordinate releases across platforms
# Usage: ./prepare-release.sh <version> [build-profile]

VERSION=$1
PROFILE=${2:-production}

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version> [build-profile]"
    echo ""
    echo "Version format: 1.0.0"
    echo "Profiles: development, preview, production (default)"
    exit 1
fi

# Validate version format
if ! [[ $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Invalid version format '$VERSION'"
    echo "Must be: X.Y.Z (e.g., 1.0.0)"
    exit 1
fi

echo "========================================"
echo "EAS Release Preparation"
echo "========================================"
echo ""
echo "Version: $VERSION"
echo "Profile: $PROFILE"
echo ""

# Check if version already exists as tag
if git rev-parse "$VERSION" >/dev/null 2>&1; then
    echo "Error: Version tag '$VERSION' already exists"
    echo "Choose a different version"
    exit 1
fi

echo "Step 1: Verify working directory is clean"
if ! git diff-index --quiet HEAD --; then
    echo "Error: Working directory has uncommitted changes"
    echo "Please commit or stash changes first"
    exit 1
fi
echo "✓ Working directory is clean"
echo ""

echo "Step 2: Build for $PROFILE"
echo ""
echo "This will build both Android and iOS apps."
echo "You can monitor build status with: eas build:list --limit 5"
echo ""

read -p "Start builds? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Building Android..."
eas build --platform android --profile $PROFILE --no-wait -m "Release $VERSION"

echo ""
echo "Building iOS..."
eas build --platform ios --profile $PROFILE --no-wait -m "Release $VERSION"

echo ""
echo "========================================"
echo "Build submitted to EAS"
echo "========================================"
echo ""
echo "Monitor builds:"
echo "  eas build:list --limit 5"
echo ""
echo "View build logs:"
echo "  eas build:view <build-id>"
echo ""
echo "When builds complete, verify them locally, then:"
echo "  git tag $VERSION"
echo "  git push origin $VERSION"
echo "  gh release create $VERSION"
