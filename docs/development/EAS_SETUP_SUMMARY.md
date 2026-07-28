# EAS Build & EAS Update Configuration Summary

## Overview

Complete EAS (Expo Application Services) setup for Hunty mobile app to enable:
- Cloud-based native builds (Android APK/AAB, iOS IPA)
- Over-the-air (OTA) updates without app rebuilding
- Automated deployment to App Store and Play Store
- Production-ready app signing

---

## Files Modified

### 1. `mobile/eas.json` (Created/Fixed)

**Changes:**
- Repaired malformed JSON structure
- Cleaned up conflicting build profile configurations
- Added three distinct build profiles: development, preview, production
- Added EAS Update configuration with three update channels
- Added submit configurations for both Android and iOS

**Key Additions:**
```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "developmentClient": false, "distribution": "internal" },
    "production": { "developmentClient": false, "distribution": "store" }
  },
  "update": {
    "development": { "branch": "development", "channel": "development" },
    "preview": { "branch": "preview", "channel": "preview" },
    "production": { "branch": "production", "channel": "production" }
  }
}
```

### 2. `mobile/app.config.ts` (Updated)

**Changes:**
- Updated bundle IDs from placeholder `com.yourorg.*` to `io.hunty.mobile.*`
- Enhanced updates configuration with `fallbackToCacheTimeout` and `enabled` flags
- Configured EAS project ID from environment variable `EAS_PROJECT_ID`
- Configured update URL from environment variable `EXPO_UPDATE_URL`

**Before:**
```typescript
bundleId: "com.yourorg.hunty.dev",
androidPackage: "com.yourorg.hunty.dev",
updates: { url: "https://u.expo.dev/YOUR_EAS_PROJECT_ID" }
```

**After:**
```typescript
bundleId: "io.hunty.mobile.dev",
androidPackage: "io.hunty.mobile.dev",
updates: {
  url: process.env.EXPO_UPDATE_URL ?? "https://u.expo.dev/YOUR_EAS_PROJECT_ID",
  fallbackToCacheTimeout: 0,
  enabled: true,
}
```

### 3. `mobile/package.json` (Updated)

**Changes:**
- Added `expo-updates` (~0.17.0) to dependencies for OTA update support
- Added `eas-cli` (^3.74.0) to devDependencies
- Added 17 new npm scripts for build, update, and submit workflows

**New Scripts:**
```json
{
  "build:android": "eas build --platform android --profile production",
  "build:ios": "eas build --platform ios --profile production",
  "build:preview": "eas build --platform all --profile preview",
  "build:production": "eas build --platform all --profile production",
  "build:android:dev": "eas build --platform android --profile development",
  "build:ios:dev": "eas build --platform ios --profile development",
  "build:android:preview": "eas build --platform android --profile preview",
  "build:ios:preview": "eas build --platform ios --profile preview",
  "build:android:prod": "eas build --platform android --profile production",
  "build:ios:prod": "eas build --platform ios --profile production",
  "update:preview": "eas update --branch preview --message \"Preview OTA update\"",
  "update:production": "eas update --branch production --message \"Production OTA update\"",
  "submit:android": "eas submit --platform android --profile production",
  "submit:ios": "eas submit --platform ios --profile production"
}
```

### 4. `mobile/.env.example` (Updated)

**Changes:**
- Added `EAS_PROJECT_ID` environment variable
- Added `EXPO_UPDATE_URL` environment variable
- Documented all EAS-related CI/CD secrets

### 5. `README.md` (Updated)

**Changes:**
- Added mobile EAS Build & OTA setup examples to the Getting Started section

### 6. `mobile/EAS_BUILD_UPDATE_GUIDE.md` (New)

Complete deployment guide covering:
- Initial EAS setup and linking to Expo account
- Build profile configurations and use cases
- Build commands quick reference
- EAS Update (OTA) channel management and publishing
- App signing procedures for Android and iOS
- Step-by-step deployment workflows (dev, preview, production, hotfix)
- Troubleshooting common issues
- CI/CD integration example (GitHub Actions)

---

## Environment Configuration

### Required Environment Variables

Set these in `mobile/.env.development`, `.env.preview`, `.env.production`:

```env
# EAS Project
EAS_PROJECT_ID=<your-eas-project-id>
EXPO_UPDATE_URL=https://u.expo.dev/<your-eas-project-id>

# CI/CD Secrets (GitHub Actions, etc.)
EXPO_TOKEN=<your-expo-token>
EXPO_APPLE_ID=<your-apple-id>
EXPO_ASC_APP_ID=<your-app-store-connect-id>
EXPO_APPLE_TEAM_ID=<your-apple-team-id>

# Android Signing (for CI/CD with local credentials)
ANDROID_KEYSTORE_BASE64=<base64-encoded-.jks>
ANDROID_KEYSTORE_PASSWORD=<password>
ANDROID_KEY_ALIAS=hunty-upload
ANDROID_KEY_PASSWORD=<password>
```

---

## Setup Steps

### 1. Install & Link to Expo

```bash
cd mobile
pnpm add -D eas-cli
pnpm install
eas init
```

**Output:** This creates/links your EAS project and updates `app.json` with your project ID.

### 2. Configure Credentials

**Android (EAS-managed):**
```bash
eas credentials --platform android
# Upload your hunty-upload-key.jks
# See mobile/ANDROID_KEYSTORE.md for keystore generation
```

**iOS (EAS-managed):**
```bash
eas credentials --platform ios
# Provide Apple ID, password/API key, and Team ID
```

### 3. Test Build

```bash
# Development build (for local testing)
pnpm run build:android:dev

# Or preview build (production-like)
pnpm run build:ios:preview
```

### 4. Deploy OTA Update

```bash
# After code changes, deploy without rebuilding
pnpm run update:preview
```

### 5. Production Release

```bash
# Build for app stores
pnpm run build:production

# Submit to stores
pnpm run submit:android
pnpm run submit:ios

# Deploy user-facing update
pnpm run update:production
```

---

## Build Profiles

| Profile | Dev Client | Distribution | Use Case |
|---------|-----------|--------------|----------|
| **development** | ✓ Yes | Internal | Developer testing |
| **preview** | ✗ No | Internal | QA & staging |
| **production** | ✗ No | Store | App Store/Play Store |

---

## OTA Update Channels

| Channel | Branch | Use Case | Deploy With |
|---------|--------|----------|-------------|
| **development** | `development` | Dev testing | `pnpm run update:development` |
| **preview** | `preview` | Staging/QA | `pnpm run update:preview` |
| **production** | `production` | Users | `pnpm run update:production` |

Updates are matched to the native app version using the `"policy": "appVersion"` runtime version strategy.

---

## Runtime Version Strategy

**Current:** `"policy": "appVersion"` — updates are compatible with the native build version.

When to **rebuild** the native app:
- Adding/removing native dependencies
- Updating Expo SDK version
- Changes to native config (iOS/Android sections in app.json)
- Major framework updates

When **OTA updates** suffice:
- JavaScript/TypeScript changes
- UI/UX modifications
- Bug fixes
- Feature flag changes
- API endpoint changes

---

## App Signing

### Android

See [mobile/ANDROID_KEYSTORE.md](./mobile/ANDROID_KEYSTORE.md) for:
- Keystore generation
- EAS credential upload
- CI/CD integration
- Secure backup protocols

### iOS

Use `eas credentials --platform ios` to:
- Configure Apple ID
- Link App Store Connect
- Manage signing certificates

---

## Testing & Validation

### Test EAS Build Configuration

```bash
cd mobile
eas build --platform android --profile development --wait
# Or for iOS
eas build --platform ios --profile preview --wait
```

### Test OTA Updates

```bash
# Publish to preview channel
pnpm run update:preview

# Open dev client on device/simulator
# Should fetch update automatically
```

### Validate Package Scripts

```bash
# Check all scripts are available
npm run | grep -E "(build:|update:|submit:)"
```

---

## CI/CD Ready

The setup is ready for integration with:
- **GitHub Actions** - Build on push, update on merge
- **GitLab CI** - EAS Build triggers
- **Jenkins** - Custom build pipelines
- **Any CI provider** - Via EAS CLI and environment variables

See [mobile/EAS_BUILD_UPDATE_GUIDE.md](./mobile/EAS_BUILD_UPDATE_GUIDE.md#cicd-integration) for GitHub Actions example.

---

## Next Steps

1. **Initialize EAS:** Run `eas init` to link your project
2. **Configure credentials:** Upload Android keystore and iOS credentials
3. **Test build:** Try `pnpm run build:preview` to validate setup
4. **Set up CI/CD:** Add EAS secrets to your CI provider
5. **Deploy first update:** Test OTA updates with `pnpm run update:preview`
6. **Monitor builds:** Check `eas build:list` and `eas update:list` regularly

---

## References

- [EAS Documentation](https://docs.expo.dev/eas/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [EAS Update](https://docs.expo.dev/eas-update/introduction/)
- [App Signing](https://docs.expo.dev/app-signing/app-credentials/)
- [Hunty Android Keystore Guide](./mobile/ANDROID_KEYSTORE.md)
- [Complete EAS Guide](./mobile/EAS_BUILD_UPDATE_GUIDE.md)
