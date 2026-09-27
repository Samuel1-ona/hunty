# EAS Build & EAS Update Guide

Complete guide for using Expo Application Services (EAS) Build and EAS Update for Hunty mobile app deployment.

---

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [EAS Build Profiles](#eas-build-profiles)
3. [Build Commands](#build-commands)
4. [OTA Updates with EAS Update](#ota-updates-with-eas-update)
5. [App Signing](#app-signing)
6. [Deployment Workflow](#deployment-workflow)
7. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### 1. Install EAS CLI

```bash
cd mobile
pnpm add -D eas-cli
```

Or install globally:

```bash
npm install -g eas-cli
```

### 2. Link Project to Expo Account

```bash
eas init
```

This will prompt you to:
- Create or select an Expo account
- Create a new EAS project
- Update `app.json` with your EAS project ID

**Save your EAS Project ID** — you'll need it for environment variables.

### 3. Configure Environment Variables

Create `.env` files for each environment in `mobile/`:

```bash
cp .env.example .env.development
cp .env.example .env.preview
cp .env.example .env.production
```

Set these in your `.env.*` files:

```env
# Required for EAS
EAS_PROJECT_ID=your-eas-project-id
EXPO_UPDATE_URL=https://u.expo.dev/your-eas-project-id

# Optional (for CI/CD)
EXPO_TOKEN=your-expo-token
EXPO_APPLE_ID=your-apple-id
EXPO_ASC_APP_ID=your-app-store-connect-id
EXPO_APPLE_TEAM_ID=your-apple-team-id

# App configuration
APP_ENV=development|preview|production
WALLETCONNECT_PROJECT_ID=your-walletconnect-id
```

### 4. Verify Configuration

```bash
eas build --help
eas update --help
eas submit --help
```

---

## EAS Build Profiles

Three build profiles are configured in `eas.json`:

### Development Profile

**Purpose:** Local testing with development client
- **Development Client:** Enabled
- **Distribution:** Internal (shared via link)
- **Configuration:** Debug-friendly
- **Target:** Developers, QA

```bash
pnpm run build:android:dev  # Android development APK
pnpm run build:ios:dev      # iOS development simulator build
```

### Preview Profile

**Purpose:** QA testing and stakeholder demos
- **Development Client:** Disabled (production-like)
- **Distribution:** Internal
- **Configuration:** Release-optimized, staging environment
- **Target:** QA, stakeholders

```bash
pnpm run build:android:preview  # Android preview APK
pnpm run build:ios:preview      # iOS preview device build
```

### Production Profile

**Purpose:** App Store and Play Store releases
- **Development Client:** Disabled
- **Distribution:** Store-ready
- **Configuration:** Fully optimized, production environment
- **Target:** End users

```bash
pnpm run build:android:prod  # Android production AAB (for Play Store)
pnpm run build:ios:prod      # iOS production build (for App Store)
```

---

## Build Commands

### Quick Reference

```bash
# Build all profiles
pnpm run build:preview       # Preview on all platforms
pnpm run build:production    # Production on all platforms

# Android-specific
pnpm run build:android:dev       # Development
pnpm run build:android:preview   # Preview
pnpm run build:android:prod      # Production

# iOS-specific
pnpm run build:ios:dev           # Development
pnpm run build:ios:preview       # Preview
pnpm run build:ios:prod          # Production
```

### Build with Custom Message

```bash
cd mobile
eas build --platform android --profile production --message "v1.2.3 release"
```

### Build for Multiple Platforms

```bash
eas build --platform all --profile production
```

### View Build Status

```bash
eas build:list
eas build:view <BUILD_ID>
```

---

## OTA Updates with EAS Update

EAS Update allows pushing changes to users **without rebuilding the native app**. Updates are scoped to channels (development, preview, production) and matched to app versions.

### Update Channels

| Channel | Use Case | When to Deploy |
|---------|----------|------------------|
| `development` | Developer testing | After each commit on dev branch |
| `preview` | QA & staging | Before production release |
| `production` | User-facing app | Only for bug fixes & feature releases |

### Publishing Updates

```bash
# Preview update (staging environment)
pnpm run update:preview

# Production update (user-facing)
pnpm run update:production

# Or with EAS CLI directly
eas update --branch preview --message "Fix notification bug"
eas update --branch production --message "v1.2.3 release"
```

### Runtime Version Strategy

The `app.json` uses `"policy": "appVersion"` — updates are compatible with the native build version they were released against.

When to rebuild the native app:
- Adding new native dependencies
- Updating Expo SDK version
- Changes to native configuration (app.json android/ios sections)
- Major dependency updates

When OTA updates are sufficient:
- JavaScript code changes
- UI/UX modifications
- Bug fixes
- Configuration (API endpoints, feature flags)

### Viewing Update History

```bash
eas update:list
eas update:view <UPDATE_ID>
```

---

## App Signing

### Android Signing

#### Option 1: EAS-Managed Credentials (Recommended)

EAS can manage your Android keystore automatically:

```bash
eas credentials --platform android
```

Select "Upload a keystore" and provide:
- Path to `hunty-upload-key.jks`
- Keystore alias: `hunty-upload`
- Keystore password
- Key password

EAS encrypts and stores the keystore. Production builds will automatically use it.

#### Option 2: Local Credentials (for CI/CD)

Use environment variables in your CI provider (GitHub Actions, etc.):

```bash
ANDROID_KEYSTORE_BASE64=<base64-encoded-.jks>
ANDROID_KEYSTORE_PASSWORD=<password>
ANDROID_KEY_ALIAS=hunty-upload
ANDROID_KEY_PASSWORD=<password>
```

See [ANDROID_KEYSTORE.md](./ANDROID_KEYSTORE.md) for key generation and backup procedures.

### iOS Signing

#### App Store Distribution

```bash
eas credentials --platform ios
```

Select "Manage app signing credentials" and provide:
- Apple ID email
- App Store Connect API key (or password)
- Apple Team ID

EAS stores credentials securely. Production builds for App Store will use these.

#### Development Distribution

For development builds on physical iOS devices:

```bash
eas device:create
```

---

## Deployment Workflow

### Development Release (Every Commit)

```bash
# 1. Update code
git commit -m "Feature: add location tracking"

# 2. Push OTA update (JavaScript only)
pnpm run update:development

# 3. QA tests update in dev client
# No app rebuild needed!
```

### Preview Release (QA/Staging)

```bash
# 1. Merge to staging branch
git checkout staging
git merge feature/my-feature

# 2. Build preview app
pnpm run build:preview

# 3. Share build link with QA team
eas build:list  # View download links

# 4. QA tests on real devices
# ...

# 5. If bugs found, iterate:
git commit -m "Fix: adjust map zoom level"
pnpm run update:preview
```

### Production Release (User-Facing)

```bash
# 1. Merge to main branch
git checkout main
git merge staging

# 2. Bump version in app.json
# Example: "version": "1.2.3"

# 3. Build production app
pnpm run build:production

# 4. Monitor build status
eas build:list

# 5. Submit to stores
pnpm run submit:android
pnpm run submit:ios

# 6. After store approval, deploy update
pnpm run update:production
```

### Hotfix (Production Bug)

```bash
# 1. Create hotfix branch
git checkout -b hotfix/critical-bug main

# 2. Fix bug
git commit -m "Hotfix: prevent app crash on invalid location"

# 3. Push OTA update (no rebuild needed!)
pnpm run update:production

# 4. Merge back to main
git checkout main
git merge hotfix/critical-bug

# 5. Delete hotfix branch
git branch -d hotfix/critical-bug
```

---

## Troubleshooting

### Build Fails with "Project Not Linked"

```
Error: This Expo project is not linked to an EAS Build project
```

**Solution:**

```bash
eas init
```

Then verify `app.json` has your EAS project ID:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### "No Release Credentials Found"

```
Error: No valid credentials for Android on the EAS build profile...
```

**Solution:**

```bash
eas credentials --platform android
# Upload your keystore
```

Or set environment variables in CI:

```bash
export ANDROID_KEYSTORE_BASE64=...
export ANDROID_KEYSTORE_PASSWORD=...
```

### Update Not Showing on Device

- **Ensure runtime version matches:** The update must target the same app version as the installed build.
- **Check channel:** The device must be configured to check the correct update channel.
- **Restart app:** Force-close and restart the app to check for updates.
- **Clear cache:** Delete app cache or reinstall if updates aren't appearing.

```bash
# Check if update was published
eas update:list
```

### iOS Build Stuck

- **Check credentials:** Verify Apple ID and Team ID are correct:
  ```bash
  eas credentials --platform ios
  ```
- **Review logs:** Download full build logs from EAS dashboard
- **Retry:** EAS sometimes hits transient issues; retrying often helps:
  ```bash
  eas build --platform ios --profile production
  ```

### Android Build Memory Issues

For large projects, EAS may need more memory. Add to `eas.json`:

```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "app-bundle",
        "gradleCommand": "assembleRelease"
      }
    }
  }
}
```

---

## CI/CD Integration

### GitHub Actions

Add secrets to your GitHub repository:

```
EAS_PROJECT_ID
EXPO_TOKEN
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
EXPO_APPLE_ID
EXPO_ASC_APP_ID
EXPO_APPLE_TEAM_ID
```

Sample workflow:

```yaml
name: EAS Build & Update

on:
  push:
    branches:
      - staging
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd mobile
          pnpm install
      
      - name: Build for preview
        if: github.ref == 'refs/heads/staging'
        run: |
          cd mobile
          eas build --platform all --profile preview --non-interactive
        env:
          EAS_PROJECT_ID: ${{ secrets.EAS_PROJECT_ID }}
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
      
      - name: Build for production
        if: github.ref == 'refs/heads/main'
        run: |
          cd mobile
          eas build --platform all --profile production --non-interactive
        env:
          EAS_PROJECT_ID: ${{ secrets.EAS_PROJECT_ID }}
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
```

---

## References

- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [EAS Build](https://docs.expo.dev/eas-update/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [App Signing](https://docs.expo.dev/app-signing/app-credentials/)
- [Hunty Android Keystore Guide](./ANDROID_KEYSTORE.md)
