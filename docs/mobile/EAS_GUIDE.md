# 🚀 Hunty Mobile — Expo Application Services (EAS) Guide

This guide is the authoritative, consolidated resource for setting up, building, deploying, and updating the Hunty React Native / Expo mobile application using Expo Application Services (EAS).

---

## Table of Contents

1. [⚡ Quick Start](#-quick-start)
2. [📋 Prerequisites](#-prerequisites)
3. [🛠️ Initial Setup & Environment Configuration](#️-initial-setup--environment-configuration)
4. [🏗️ EAS Build Profiles](#️-eas-build-profiles)
5. [📦 Build Commands & Quick Reference](#-build-commands--quick-reference)
6. [🔄 OTA Updates (EAS Update)](#-ota-updates-eas-update)
7. [🔐 App Signing & Credentials](#-app-signing--credentials)
8. [🚀 Deployment & Release Workflows](#-deployment--release-workflows)
9. [🤖 CI/CD Integration](#-cicd-integration)
10. [🆘 Troubleshooting & Common Fixes](#-troubleshooting--common-fixes)

---

## ⚡ Quick Start

For developers already familiar with Expo and EAS, follow these quick commands to get up and running in 5 minutes:

```bash
# 1. Navigate to the mobile directory and install dependencies
cd apps/mobile
pnpm install

# 2. Authenticate with your Expo account
eas login

# 3. Initialize the project in EAS (if not already initialized)
eas init

# 4. Set up signing credentials (interactive)
eas credentials --platform ios
eas credentials --platform android

# 5. Build the preview application
pnpm run build:all:preview
```

---

## 📋 Prerequisites

### System Requirements

- **Node.js:** 18+ (Verify using `node --version`)
- **pnpm:** 9+ (Verify using `pnpm --version`)
- **Xcode:** 15+ (macOS only, required for local iOS simulator builds)
- **Android Studio & SDK:** Latest version (Required for local Android builds/emulators)
- **Java Development Kit (JDK):** Version 11+ (Required for keystore management via `keytool`)

### Accounts & Developer Access

- **Expo Account:** Register at [expo.dev](https://expo.dev) and join the Hunty organization/workspace.
- **Apple Developer Account:** An active Apple Developer Program membership is required for iOS App Store distribution and physical device ad-hoc testing.
- **Google Play Console Account:** A Google Developer account is required for Android production releases.

---

## 🛠️ Initial Setup & Environment Configuration

### 1. Link Your Local Project to EAS

If you are setting up the project for the first time or creating a new EAS project repository, link it using:

```bash
cd apps/mobile
eas init
```

This updates `apps/mobile/app.json` by adding your project ID under `extra.eas.projectId`.

### 2. Configure Environment Files

EAS builds consume environment variables defined in local `.env` files depending on the build profile. Copy the environment templates in `apps/mobile/`:

```bash
cd apps/mobile
cp .env.development.example .env.development
cp .env.preview.example .env.preview
cp .env.production.example .env.production
```

In each file, configure the required variables:
- `EAS_PROJECT_ID`: The project ID generated during `eas init`.
- `EXPO_UPDATE_URL`: Set to `https://u.expo.dev/<your-eas-project-id>`.
- `NEXT_PUBLIC_WC_PROJECT_ID`: Your WalletConnect project ID.
- Environment-specific API endpoints (e.g., local host, staging server, or production server).

---

## 🏗️ EAS Build Profiles

The build environment is controlled by the configuration in [eas.json](file:///home/a-one/Desktop/Drip%20Project/hunty/apps/mobile/eas.json). Three profiles are configured:

| Profile | Dev Client | Distribution | Output Type | Primary Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **development** | ✓ Yes (Expo Dev Client) | Internal | Android APK / iOS Simulator build | Local debugging and daily development |
| **preview** | ✗ No (Standalone app) | Internal | Android APK / iOS Ad-Hoc | QA testing, stakeholder previews, and demos |
| **production** | ✗ No (Standalone app) | App Store / Play Store | Android AAB / iOS IPA | Submission to Google Play Store & Apple App Store |

---

## 📦 Build Commands & Quick Reference

Ensure you are in the `apps/mobile` directory before running any commands.

### All-Platform Commands
```bash
pnpm run build:preview       # Build preview profile on all platforms
pnpm run build:production    # Build production profile on all platforms
```

### Android-Specific Commands
```bash
pnpm run build:android:dev       # Build Android development APK (uses Dev Client)
pnpm run build:android:preview   # Build Android preview APK
pnpm run build:android:prod      # Build Android production AAB (App Bundle)
```

### iOS-Specific Commands
```bash
pnpm run build:ios:dev           # Build iOS development simulator build
pnpm run build:ios:preview       # Build iOS preview ad-hoc build
pnpm run build:ios:prod          # Build iOS production App Store build
```

### Custom Build Options
```bash
# Build locally on your machine instead of Expo servers (requires SDKs)
eas build --platform android --profile development --local

# Clear build cache on Expo servers
eas build --platform all --profile preview --clear-cache

# Run build in non-interactive mode (for CI pipelines)
eas build --platform all --profile production --non-interactive
```

---

## 🔄 OTA Updates (EAS Update)

EAS Update allows you to push JavaScript and asset modifications directly to users' devices **without rebuilding the native app**.

### OTA Channel Strategy

Updates are scoped to channels which match the active build profiles:

| Channel | Branch | Targeting Profile | Deployment Script |
| :--- | :--- | :--- | :--- |
| **development** | `development` | development | `pnpm run update:development` |
| **preview** | `preview` | preview | `pnpm run update:preview` |
| **production** | `production` | production | `pnpm run update:production` |

### Publishing Updates

```bash
# Publish an OTA update to the production channel
pnpm run update:production -m "v1.1.1: Fix map cluster centering"

# Alternatively, use the EAS CLI directly
eas update --branch production --message "v1.1.1: Fix map cluster centering"
```

### Runtime Version Strategy

Our configuration uses the `"policy": "appVersion"` runtime version strategy. This ensures that updates are only delivered to devices with native builds matching the exact version policy they were built against.

> [!IMPORTANT]
> **When must you rebuild the native app (cannot use OTA update)?**
> - Adding, upgrading, or removing native modules/dependencies.
> - Upgrading the Expo SDK version.
> - Modifying native configurations in `app.json` (such as plist/manifest changes, bundle ID, or permissions).
>
> **When are OTA updates sufficient?**
> - Modifying React Native components, hooks, or helper JS/TS logic.
> - Modifying stylesheets or static assets.
> - Changing non-native configurations (e.g., API endpoints, feature flags).

### Viewing History & Rollbacks

```bash
# View update list
eas update:list

# View details for a specific update
eas update:view <UPDATE_ID>

# Rollback: Re-publish a specific previous update to a channel
eas update:republish <UPDATE_ID> --channel production
```

---

## 🔐 App Signing & Credentials

All signing credentials can be stored securely on Expo's encrypted servers and retrieved automatically during cloud builds.

### iOS Credentials Setup

#### Option 1: EAS-Managed (Recommended)
Let EAS manage Apple Provisioning Profiles and Distribution Certificates automatically:

```bash
eas credentials --platform ios
```
*Provide your Apple ID, Apple developer password (or App Store Connect API Key), and Apple Team ID when prompted.*

#### Option 2: Manual Upload
If your organization manages credentials externally, you can import certificates manually using the EAS console or interactive CLI prompts:
```bash
eas credentials --platform ios --local
```

### Android Credentials Setup

Android builds require an upload keystore. Follow the secure generation and registration process:

1. **Keystore Generation:** Refer to the detailed [Android Keystore Protocol Guide](ANDROID_KEYSTORE.md) for generating the `.jks` file securely.
2. **Register Keystore with EAS:**
   ```bash
   eas credentials --platform android
   ```
   Select **"Upload a keystore"** and input:
   - Keystore file path (e.g., `hunty-upload-key.jks`)
   - Keystore alias (e.g., `hunty-upload`)
   - Keystore password
   - Key password

### Google Play Service Account (Submission Autopilot)

To submit production builds automatically to Google Play via `eas submit`:

1. Create a service account with **Release Manager** permissions in Google Cloud Console.
2. Download the service account JSON file.
3. Save it to `apps/mobile/store/google-play-service-account.json`. (This directory/file is gitignored to prevent credential leaks).
4. Register the service account with EAS:
   ```bash
   eas credentials --platform android
   ```

---

## 🚀 Deployment & Release Workflows

### Regular Development Cycle (Iterative)

1. Commit changes to your feature branch.
2. If only JavaScript/asset changes were made:
   ```bash
   pnpm run update:development -m "Refactored reward card UI"
   ```
3. Test immediately on physical devices running the Expo Dev Client.

### Staging & QA Cycle

1. Merge the feature branch into the `staging` branch.
2. Trigger a preview build to compile new native binaries:
   ```bash
   pnpm run build:all:preview
   ```
3. Share the build links/QR codes with the QA team.
4. If bugs are found, commit fixes and deploy them as OTA updates to keep testing:
   ```bash
   pnpm run update:preview -m "Fixed wallet connection state on reconnect"
   ```

### Production Release Cycle (App Stores)

1. Merge your changes into the `main` branch.
2. Bump the version and build numbers in `apps/mobile/app.json` and `apps/mobile/package.json`.
3. Trigger a production build:
   ```bash
   pnpm run build:all:prod
   ```
4. Verify the builds succeed and download/test them on local devices or TestFlight.
5. Submit to app stores:
   ```bash
   pnpm run submit:production:android
   pnpm run submit:production:ios
   ```
6. Once the review is approved by Apple/Google, push a corresponding production update:
   ```bash
   pnpm run update:production -m "v1.2.0 release"
   ```
7. Tag the release commit:
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

---

## 🤖 CI/CD Integration

EAS is built to run cleanly in continuous integration pipelines. Below is an example GitHub Actions configuration for automated production builds.

### Required GitHub Actions Secrets
Configure these in your GitHub repository settings under `Settings → Secrets and Variables → Actions`:
- `EXPO_TOKEN`: Your Expo access token.
- `EAS_PROJECT_ID`: The projectId from `app.json`.
- `ANDROID_KEYSTORE_BASE64`: Base64 encoded keystore file.
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

### Sample GitHub Actions Workflow
```yaml
name: Mobile App Production Build

on:
  push:
    branches:
      - main
    paths:
      - 'apps/mobile/**'

jobs:
  build:
    runs-on: macos-latest
    defaults:
      run:
        working-directory: apps/mobile
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Setup Expo / EAS CLI
        uses: expo/expo-github-action@v8
        with:
          expo-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build Android AAB & iOS IPA
        run: eas build --platform all --profile production --non-interactive
        env:
          EAS_PROJECT_ID: ${{ secrets.EAS_PROJECT_ID }}
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
```

---

## 🆘 Troubleshooting & Common Fixes

### Build Fails with "Project Not Linked"
**Error:** `Error: This Expo project is not linked to an EAS Build project`
* **Fix:** Run `eas init` to link your local folder to an active Expo project. Check that `apps/mobile/app.json` has:
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

### Build Fails with "Credentials Not Found"
**Error:** `Error: No valid credentials for [Platform] on the EAS build profile...`
* **Fix:** Re-authenticate and set up your keys by running `eas credentials --platform <ios|android>`.

### OTA Update Not Appearing on Device
1. **Verify App Version/Runtime Version:** The update's runtime version (built against version policies) must match the installed native app's runtime version exactly.
2. **Verify Channel:** Ensure the native build was built under the profile configured to listen to that channel (e.g. preview build listening to preview update channel).
3. **App Cache:** Force close the app, clear its memory, and launch it again. The app checks for updates on cold launch and applies them on the subsequent launch.

### iOS Build Fails with "Apple Team ID Required"
* **Fix:** Make sure you've joined the Apple developer team and that you pass the correct credentials using `eas credentials --platform ios` to store your Apple Team ID in EAS.

### Android Build Memory Issues
For large asset packages or memory-intensive bundling, you may need to increase allocation. Customize the gradle command in `eas.json`:
```json
"production": {
  "android": {
    "gradleCommand": "./gradlew assembleRelease -Dorg.gradle.jvmargs=-Xmx4096m"
  }
}
```

---

## 🔗 Useful References
- [Expo EAS Documentation](https://docs.expo.dev/eas/)
- [EAS Build Reference](https://docs.expo.dev/build/introduction/)
- [EAS Update Guide](https://docs.expo.dev/eas-update/introduction/)
- [App Signing Best Practices](https://docs.expo.dev/app-signing/managed-credentials/)
