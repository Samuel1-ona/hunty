# EAS Quick Reference Card

Fast lookup for common Hunty mobile build and deployment commands.

---

## Initial Setup (First Time Only)

```bash
cd mobile
pnpm install
eas login
eas init
eas credentials --platform ios
eas credentials --platform android
```

---

## Development (Daily Use)

```bash
# Start development server
pnpm start --android    # or --ios, --web

# Build development app for internal testing
pnpm run build:android:dev
pnpm run build:ios:dev
```

---

## Testing & QA (Preview Builds)

```bash
# Build preview for QA/testing
pnpm run build:android:preview
pnpm run build:ios:preview
pnpm run build:all:preview     # Both platforms

# Check build status
./scripts/check-build-status.sh
```

---

## Production Releases

### Step 1: Build

```bash
# Build for production
pnpm run build:android:prod
pnpm run build:ios:prod
pnpm run build:all:prod        # Both platforms
```

### Step 2: Wait for Builds

```bash
# Check status
eas build:list --limit 5

# View logs
eas build:log <build-id>
```

### Step 3: Submit to App Stores

```bash
# Submit to Google Play
pnpm run submit:production:android

# Submit to App Store
pnpm run submit:production:ios

# Submit both
pnpm run submit:all
```

---

## Over-the-Air (OTA) Updates

### Update JavaScript/Assets (No Rebuild Needed)

```bash
# For development
pnpm run update:development

# For testing/preview
pnpm run update:preview

# For production (users)
pnpm run update:production
```

### Update with Custom Message

```bash
eas update --channel production --branch production -m "v1.1.0: Fixed login bug"
```

### View Update History

```bash
eas update:list --limit 10
eas update:list --channel production
```

---

## Helper Scripts

```bash
# Check recent builds
./scripts/check-build-status.sh 10

# Publish OTA update with confirmation
./scripts/publish-ota-update.sh production

# Prepare release (coordinates builds)
./scripts/prepare-release.sh 1.1.0
```

---

## Environment Setup

```bash
# Copy environment templates
cp .env.development.example .env.development
cp .env.preview.example .env.preview
cp .env.production.example .env.production

# Edit each file and set:
# - EAS_PROJECT_ID
# - EXPO_TOKEN
# - API endpoints
# - Other platform-specific settings
```

---

## Build Profiles Overview

| Profile | Purpose | Output | Command |
|---------|---------|--------|---------|
| **development** | Dev testing | APK | `pnpm run build:android:dev` |
| **preview** | QA testing | APK | `pnpm run build:android:preview` |
| **production** | App Store/Play Store | AAB | `pnpm run build:android:prod` |

---

## Troubleshooting Quick Fixes

### Build fails with "Credentials not found"

```bash
eas credentials --platform <ios|android>
```

### Can't remember EAS Project ID

```bash
cat app.json | grep projectId
```

### Need to reset credentials

```bash
# Clear iOS credentials
eas credentials --platform ios --clear
eas credentials --platform ios

# Clear Android credentials
eas credentials --platform android --clear
eas credentials --platform android
```

### Check what's stored

```bash
eas credentials --platform ios --list
eas credentials --platform android --list
```

---

## Full Documentation

- **Setup Guide:** [EAS_SETUP_DEPLOYMENT_GUIDE.md](./EAS_SETUP_DEPLOYMENT_GUIDE.md)
- **Credentials Guide:** [EAS_CREDENTIALS_GUIDE.md](./EAS_CREDENTIALS_GUIDE.md)
- **Build Profiles:** [EAS_BUILD_UPDATE_GUIDE.md](./EAS_BUILD_UPDATE_GUIDE.md)
- **Android Keystore:** [ANDROID_KEYSTORE.md](./ANDROID_KEYSTORE.md)

---

## Common Scenarios

### Scenario 1: Build for Internal Testing

```bash
pnpm run build:all:preview
# Share QR code or download APK with team
```

### Scenario 2: Emergency Hotfix (JS Only)

```bash
# Fix the bug
# Test locally

# Publish OTA update
pnpm run update:production -m "Critical fix: login issue"
```

### Scenario 3: Emergency Hotfix (Native Code)

```bash
# Fix native code
# Update version in app.json

# Build and submit
pnpm run build:all:prod
pnpm run submit:production:android
pnpm run submit:production:ios
```

### Scenario 4: Release New Version

```bash
# Update version in app.json and package.json
# Update CHANGELOG

# Build
pnpm run build:all:prod

# Submit
pnpm run submit:production:android
pnpm run submit:production:ios

# Tag release
git tag v1.1.0
git push origin v1.1.0
```

---

## Key Concepts

### Runtime Version
- Determines which apps can receive OTA updates
- Set in `eas.json` per build profile
- Development, preview, and production have different runtime versions
- Must match between build and update channel

### Build Profiles
- **development:** Development client, debug-friendly
- **preview:** Standalone app, internal distribution
- **production:** Standalone app, store submission

### OTA Updates
- Updates JavaScript and assets WITHOUT rebuilding
- Faster deployment for bug fixes
- Cannot update native code
- Users get updates on app restart

### Credentials
- Encrypted storage on Expo servers
- Automatically managed by EAS
- Can be reset if needed
- Should be backed up securely

---

**For detailed information, see [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)**
