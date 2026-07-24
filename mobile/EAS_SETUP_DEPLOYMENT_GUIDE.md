# Comprehensive EAS Setup & Deployment Guide

This is the authoritative guide for setting up, building, and deploying the Hunty mobile app using Expo Application Services (EAS).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [Build Profiles](#build-profiles)
5. [Building Apps](#building-apps)
6. [OTA Updates](#ota-updates)
7. [App Store Submission](#app-store-submission)
8. [CI/CD Integration](#cicd-integration)
9. [Common Workflows](#common-workflows)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

For experienced developers:

```bash
# 1. Authenticate with Expo
cd mobile
pnpm install
eas login

# 2. Initialize EAS (if not done)
eas init

# 3. Build and submit
pnpm run build:ios:prod    # iOS production build
pnpm run build:android:prod # Android production build
pnpm run submit:production:ios      # Submit to App Store
pnpm run submit:production:android  # Submit to Play Store
```

---

## Prerequisites

### System Requirements

- **Node.js:** 18+ (verify: `node --version`)
- **npm/pnpm:** Latest version (`pnpm install -g pnpm@latest`)
- **Git:** Latest version
- **Xcode:** 15+ (macOS only, for iOS builds)
- **Android Studio:** Latest (for Android builds)

### Accounts & Access

- **Expo Account:** [Sign up](https://expo.dev)
- **Apple Developer Account:** [Join program](https://developer.apple.com/account)
- **Google Play Console Account:** [Register](https://play.google.com/console/)
- **GitHub Account:** (recommended for CI/CD)

### Credentials

You will need to set up:
- iOS: Provisioning profile & code signing certificate
- Android: Upload keystore & Google Play service account
- See [EAS_CREDENTIALS_GUIDE.md](./EAS_CREDENTIALS_GUIDE.md) for detailed instructions

---

## Initial Setup

### 1. Install Dependencies

```bash
cd mobile

# Install Node dependencies
pnpm install

# Install EAS CLI (already in devDependencies, or globally)
npm install -g eas-cli
# or use: pnpm exec eas
```

### 2. Create Expo Account

```bash
# Sign up at https://expo.dev, then login
eas login

# Verify login
eas whoami
```

### 3. Link Project to EAS

```bash
# This creates a new EAS project and updates app.json
eas init
```

Follow the prompts:
- **Select app:** Create new (or use existing)
- **Name:** hunty-mobile
- Your EAS project ID will be saved in `app.json` under `extra.eas.projectId`

**Save your EAS Project ID** — You'll need it for environment variables.

### 4. Configure Environment Variables

Copy the environment templates:

```bash
cd mobile

# For development
cp .env.development.example .env.development

# For preview/staging
cp .env.preview.example .env.preview

# For production
cp .env.production.example .env.production
```

Edit each file and fill in:
- `EAS_PROJECT_ID` (from step 3)
- `EXPO_TOKEN` (from Expo account settings)
- `WALLETCONNECT_PROJECT_ID` (register at https://cloud.reown.com)
- API URLs appropriate to each environment

### 5. Set Up App Store Credentials

See [EAS_CREDENTIALS_GUIDE.md](./EAS_CREDENTIALS_GUIDE.md) for detailed instructions on:
- iOS provisioning profiles and certificates
- Android keystore and Google Play service account

```bash
# Interactive credential setup
eas credentials --platform ios
eas credentials --platform android
```

### 6. Verify Setup

```bash
# Test EAS can access credentials
eas credentials --platform ios --list
eas credentials --platform android --list

# Check build config
eas build --help
```

---

## Build Profiles

Three build profiles are configured in `eas.json`:

### Development Profile

**Purpose:** Internal development with full debugging
- **Type:** Development client (Expo Go-like experience)
- **Distribution:** Internal (QR code to install)
- **Output:** APK (Android), Simulator build (iOS)
- **Usage:** Local testing, development iteration

```bash
# Android dev build (APK, can install on device)
pnpm run build:android:dev

# iOS dev build (simulator only)
pnpm run build:ios:dev

# Flags:
# --local         Build on your machine (requires Xcode/Android SDK)
# --wait          Wait for build to complete
# --no-wait       Exit immediately, check status later
```

**Install on device:**
```bash
# Android: Scan QR code or download APK
# iOS: Cannot directly install on device (simulator only)
```

### Preview Profile

**Purpose:** Internal testing, QA, stakeholder demos
- **Type:** Standalone app (no development client)
- **Distribution:** Internal (QR code to install)
- **Output:** APK (Android), Ad-hoc build (iOS)
- **Usage:** Beta testing before production

```bash
# Build for preview
pnpm run build:android:preview
pnpm run build:ios:preview

# Or both platforms:
pnpm run build:all:preview
```

**Who should use:**
- QA team
- Internal stakeholders
- Beta testers
- Designers validating UI

### Production Profile

**Purpose:** App Store & Play Store releases
- **Type:** Standalone app (no development client)
- **Distribution:** Store (for submission)
- **Output:** AAB (Android), IPA (iOS)
- **Usage:** Publishing to end users

```bash
# Build for production
pnpm run build:android:prod
pnpm run build:ios:prod

# Or both platforms:
pnpm run build:all:prod
```

**Important:** Production builds use:
- Release configuration (optimized, smaller bundle)
- Production signing certificates
- Production API endpoints (via .env.production)

---

## Building Apps

### Android Builds

**Development (APK, local testing):**
```bash
pnpm run build:android:dev --local
```

**Preview (APK, internal testing):**
```bash
pnpm run build:android:preview
```

**Production (AAB, for Play Store):**
```bash
pnpm run build:android:prod
```

### iOS Builds

**Development (simulator only):**
```bash
pnpm run build:ios:dev --local
```

**Preview (Ad-hoc, internal testing):**
```bash
pnpm run build:ios:preview
```

**Production (for App Store):**
```bash
pnpm run build:ios:prod
```

### Build Options

```bash
# Wait for build to complete (blocking)
pnpm run build:android:prod --wait

# Exit immediately, check status later
pnpm run build:android:prod --no-wait

# Specify custom message
eas build --platform android --profile production -m "v1.1.0 security fix"

# Local build (requires Xcode/Android SDK)
eas build --platform android --profile production --local

# Clear build cache
eas build --platform android --profile production --clear-cache
```

### Check Build Status

```bash
# View recent builds
eas build:list --limit 10

# View specific build details
eas build:view <build-id>

# Monitor build logs in real-time
eas build:log <build-id>

# Get download link
eas build:download <build-id>
```

---

## OTA Updates

Over-The-Air (OTA) updates allow you to push JavaScript/asset changes without rebuilding the app.

### How OTA Updates Work

1. You publish an update to a channel
2. App checks for updates on launch
3. If update available, downloads and applies it
4. Updates take effect on next app restart

**Note:** Native code changes (native modules, native features) require a new build.

### Configure Runtime Versions

`eas.json` specifies runtime versions per build profile:

```json
{
  "build": {
    "development": {
      "runtimeVersion": "1.0.0-development"
    },
    "preview": {
      "runtimeVersion": "1.0.0-preview"
    },
    "production": {
      "runtimeVersion": "1.0.0"
    }
  }
}
```

When you build, all apps from that build receive the same runtime version. Only apps with matching runtime versions can receive updates for that channel.

### Publishing Updates

**Development channel:**
```bash
pnpm run update:development
```

**Preview channel:**
```bash
pnpm run update:preview
```

**Production channel:**
```bash
pnpm run update:production
```

### Add Custom Update Message

```bash
eas update --channel production --branch production -m "v1.1.0: Fixed login bug"
```

### View Published Updates

```bash
# List all updates
eas update:list

# For specific channel
eas update:list --channel production

# View update details
eas update:view <update-id>
```

### Rollback an Update

```bash
# Publish a previous commit to production
git checkout <previous-commit>
pnpm run update:production -m "Rollback to v1.0.9"

# Or republish a specific previous update
eas update:republish <update-id> --channel production
```

---

## App Store Submission

### iOS App Store Submission

**Prerequisites:**
- Xcode installed
- Apple Developer account with active membership
- Provisioning profile and signing certificate set up (see credentials guide)

**1. Create App in App Store Connect:**

- Go to [App Store Connect](https://appstoreconnect.apple.com/)
- Click "My Apps" → "+"
- Create new app
- Bundle ID: `io.hunty.mobile`
- SKU: `hunty-mobile`
- Save `App Store Connect ID` for environment variable

**2. Set Environment Variables:**

```bash
# Add to .env.production
EXPO_APPLE_ID=your-apple-id@email.com
EXPO_ASC_APP_ID=1234567890
EXPO_APPLE_TEAM_ID=ABCDEF1234
```

**3. Build Production App:**

```bash
pnpm run build:ios:prod
```

**4. Submit to App Store:**

```bash
pnpm run submit:production:ios
```

This will:
- Download the production IPA
- Validate the app
- Upload to App Store Connect
- Set build for TestFlight/App Review

**5. Review in App Store Connect:**

- Screenshots
- App preview video
- Release notes
- Pricing
- Age rating
- Content rights
- Submit for review

### Android Play Store Submission

**Prerequisites:**
- Google Play Console account
- Upload keystore set up (see credentials guide)
- Google Play service account (for automated uploads)

**1. Create App in Google Play Console:**

- Go to [Google Play Console](https://play.google.com/console/)
- Click "Create app"
- App name: "Hunty"
- Default language: English
- Create app store listing

**2. Set Environment Variables:**

```bash
# Add to .env.production
ANDROID_KEYSTORE_BASE64=<base64-encoded-keystore>
ANDROID_KEYSTORE_PASSWORD=your-keystore-password
ANDROID_KEY_ALIAS=hunty-upload
ANDROID_KEY_PASSWORD=your-key-password
```

Or use EAS credentials management (recommended):

```bash
eas credentials --platform android
```

**3. Build Production App:**

```bash
pnpm run build:android:prod
```

**4. Submit to Play Store:**

```bash
pnpm run submit:production:android
```

This will:
- Download the production AAB
- Validate the app
- Upload to Play Console
- Set for internal testing → closed testing → production rollout

**5. Review in Play Console:**

- Screenshots
- Feature graphics
- Description
- App category
- Content rating
- Privacy policy
- Save & review

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/eas-build-and-submit.yml
name: Build and Submit to App Stores

on:
  push:
    branches: [main]
    paths: ['mobile/**']
  workflow_dispatch:

jobs:
  build:
    runs-on: macos-latest
    defaults:
      run:
        working-directory: mobile

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build Android
        run: eas build --platform android --profile production --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: eas build --platform ios --profile production --no-wait
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

**Required GitHub Secrets:**
- `EXPO_TOKEN` — From Expo account settings
- `EXPO_APPLE_ID` — Your Apple ID
- `EXPO_ASC_APP_ID` — App Store Connect ID
- `EXPO_APPLE_TEAM_ID` — Apple Team ID
- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` — Google Play credentials

---

## Common Workflows

### Release Checklist

```bash
# 1. Update version in app.json and package.json
vi app.json      # Update version to 1.1.0
vi package.json  # Update version to 1.1.0

# 2. Update changelog
vi CHANGELOG.md

# 3. Build production apps
pnpm run build:all:prod

# 4. Wait for builds to complete
eas build:list --limit 5

# 5. Test the builds (download and test)
eas build:download <android-build-id>
eas build:download <ios-build-id>

# 6. Submit to app stores
pnpm run submit:production:android
pnpm run submit:production:ios

# 7. Complete review in App Store Connect / Play Console

# 8. Push version tag to Git
git tag v1.1.0
git push origin v1.1.0

# 9. Create GitHub release
gh release create v1.1.0 --notes "See CHANGELOG.md"
```

### Hotfix Release

```bash
# 1. Create hotfix branch
git checkout -b hotfix/1.1.1

# 2. Fix the issue
# ... make changes ...

# 3. Update version
vi app.json      # 1.1.1
vi package.json  # 1.1.1

# 4. OTA update (no rebuild needed if no native changes)
pnpm run update:production -m "v1.1.1 hotfix: fixed login issue"

# Or rebuild if native changes:
pnpm run build:all:prod
pnpm run submit:production:android
pnpm run submit:production:ios

# 5. Tag and release
git tag v1.1.1
git push origin v1.1.1
```

### Test OTA Update

```bash
# 1. Make a change to JavaScript/assets
# (e.g., change app/page.tsx message)

# 2. Publish to preview channel
pnpm run update:preview

# 3. Install preview build on device
eas build:download <preview-build-id>
# (scan QR or download APK)

# 4. Open app on device
# Within 30 seconds, app checks and downloads update
# On next app restart, update takes effect

# 5. Verify change appears
```

---

## Troubleshooting

### Build Fails with "Credentials not found"

```bash
# Solution: Re-authenticate
eas credentials --platform <ios|android>

# Or view current credentials
eas credentials --platform ios --list
eas credentials --platform android --list
```

### "Invalid runtime version"

```bash
# Solution: Rebuild with matching runtime version
# Then publish updates to same channel

# Or update runtime version in eas.json if intentional
eas update --branch production --skip-bundler
```

### Update Not Applying on Device

1. Check app is built for correct channel:
   ```bash
   eas build:list --limit 5
   ```

2. Verify runtime version matches:
   - Build runtime version in `eas.json`
   - Update runtime version in `eas.json`
   Must match!

3. Force update on device:
   ```bash
   # Close app completely
   # Reopen app
   # Update should download automatically within 30 sec
   ```

4. Check logs in device:
   ```bash
   # For development builds with Expo Dev Client:
   # Shake device → Expo Dev Menu → Logs
   ```

### iOS Build Fails "Apple Team Required"

```bash
# Solution: Set credentials
eas credentials --platform ios

# Provide Apple Team ID when prompted
```

### Android Build: "Keystore not found"

```bash
# Solution: Set up Android credentials
eas credentials --platform android

# Select "Upload a keystore" and provide hunty-upload-key.jks
```

---

## References

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [EAS Build Guide](https://docs.expo.dev/build/introduction/)
- [EAS Update Guide](https://docs.expo.dev/eas-update/introduction/)
- [App Signing Best Practices](https://docs.expo.dev/app-signing/managed-credentials/)
- [Troubleshooting Builds](https://docs.expo.dev/build-reference/troubleshooting/)
