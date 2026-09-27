# EAS Credentials & App Signing Guide

Complete guide for managing application signing credentials with Expo Application Services (EAS).

---

## Table of Contents

1. [Overview](#overview)
2. [iOS Credentials](#ios-credentials)
3. [Android Credentials](#android-credentials)
4. [Credentials Management](#credentials-management)
5. [Troubleshooting](#troubleshooting)
6. [Security Best Practices](#security-best-practices)

---

## Overview

EAS Build manages credentials securely and integrates with both Apple and Google's signing infrastructure. Credentials are stored encrypted on Expo's servers and used only during build time.

### Credential Types

| Credential | Purpose | Platform | Required For |
|-----------|---------|----------|--------------|
| **Provisioning Profile** | Grants device/app permissions | iOS | All iOS builds |
| **Code Signing Certificate** | Verifies app authenticity | iOS | All iOS builds |
| **Bundle ID** | Unique app identifier | iOS | All iOS builds |
| **Android Keystore** | Signing key for APKs/AABs | Android | Production builds |
| **Google Play Service Account** | API access to Play Console | Android | Uploading to Play Store |

---

## iOS Credentials

### Prerequisites

- Apple Developer Account (individual or organization)
- Apple Developer Team ID
- Xcode installed locally (for certificate generation, if needed)

### Option 1: Automatic Credential Management (Recommended)

EAS can automatically manage all iOS credentials. This is the simplest approach for most teams.

```bash
cd mobile
eas credentials --platform ios
```

**What this does:**
- Authenticates with your Apple Developer Account
- Creates a provisioning profile for `io.hunty.mobile`
- Generates a code signing certificate if needed
- Stores credentials securely on Expo's servers

**Prompts you for:**
- Apple ID
- Apple Team ID (found at https://developer.apple.com/account/#/membership)

### Option 2: Manual Credential Management

Use this if you want to manage certificates yourself:

```bash
# Generate a signing certificate locally
# (You only need to do this once)

# 1. Generate a certificate signing request (CSR)
# 2. Upload to Apple Developer portal
# 3. Download the certificate
# 4. Import into Keychain

# Then use:
eas credentials --platform ios --local
```

### iOS Build & Upload

**Build for internal testing:**
```bash
pnpm run build:ios:preview
```

**Build for App Store (requires credentials):**
```bash
pnpm run build:ios:prod
```

**Submit to App Store:**
```bash
pnpm run submit:production:ios
```

During submission, provide:
- `EXPO_APPLE_ID` — Your Apple ID (stored in environment)
- `EXPO_ASC_APP_ID` — Your App Store Connect ID
- `EXPO_APPLE_TEAM_ID` — Your Apple Team ID

---

## Android Credentials

### Prerequisites

- Google Play Console account
- Android Keystore (signing key)
- Google Play Service Account credentials (for automated uploads)

### Android Keystore Generation

The upload keystore is **critical** — losing it requires contacting Google Play support.

#### Generate the Upload Keystore

```bash
# Navigate to a secure location (not version-controlled)
keytool -genkeypair \
  -v \
  -keystore hunty-upload-key.jks \
  -alias hunty-upload \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -storetype JKS
```

**Prompts:**
- **Keystore password** — Use a strong password (20+ chars). Store in password manager.
- **Key password** — Can match keystore password or be different
- **Name:** Your Name
- **Organizational Unit:** Engineering
- **Organization:** Hunty
- **City/State/Country:** Your location

Example:
```
First and Last Name [Unknown]:  Your Name
Organizational Unit [Unknown]:  Engineering
Organization [Unknown]:  Hunty
City or Locality [Unknown]:  San Francisco
State or Province [Unknown]:  CA
Two letter country code for this unit [Unknown]:  US
```

**Verify the keystore:**

```bash
keytool -list -v -keystore hunty-upload-key.jks -alias hunty-upload
```

Confirm:
- Algorithm: RSA
- Key Size: 4096
- Validity: ~27 years from now

**Save SHA fingerprints** — Record the SHA-256 fingerprint for Google Play Console.

#### Register with EAS

```bash
cd mobile
eas credentials --platform android
```

Select: **Upload a keystore**

Provide:
- Path to `hunty-upload-key.jks`
- Alias: `hunty-upload`
- Keystore password
- Key password

EAS will encrypt and store the keystore.

#### Backup the Keystore

**CRITICAL:** Keep multiple encrypted backups:

```bash
# Create encrypted backup (using 7zip or GPG)
7z a -p -mhe=on hunty-upload-key.jks.7z hunty-upload-key.jks

# Or with GPG:
gpg --symmetric --cipher-algo AES256 hunty-upload-key.jks
```

Store backups in:
1. Secure password manager (LastPass, 1Password, etc.)
2. Cloud storage (Google Drive, OneDrive) with encryption
3. Hardware key or external drive in safe location

**Never** commit the keystore to version control.

### Google Play Service Account

Needed for automated app uploads to Google Play.

#### Create Service Account in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the **Google Play Android Developer API**
4. Create a Service Account:
   - Service Account Name: `hunty-eas-build`
   - Grant roles: `Editor`
5. Create a JSON key:
   - Click the service account
   - Go to **Keys** tab
   - Create new key → JSON
   - Save as `google-play-service-account.json`

#### Register with Google Play

1. Go to [Google Play Console](https://play.google.com/console/)
2. Settings → Users and permissions
3. Add new user → Select the service account email
4. Grant roles: **Release manager**, **App admin**

#### Add to EAS

Store the service account JSON file:

```bash
cd mobile
mkdir -p store
# Copy your google-play-service-account.json to store/
cp ~/Downloads/google-play-service-account.json ./store/
```

**Do not commit this file.** Add to `.gitignore`:

```
store/google-play-service-account.json
```

### Android Build & Upload

**Build for internal testing (APK):**
```bash
pnpm run build:android:preview
```

**Build for Play Store (AAB):**
```bash
pnpm run build:android:prod
```

**Submit to Google Play:**
```bash
pnpm run submit:production:android
```

---

## Credentials Management

### View Stored Credentials

```bash
eas credentials --platform ios  # iOS
eas credentials --platform android  # Android
```

### Update Credentials

```bash
# For iOS
eas credentials --platform ios --clear

# For Android
eas credentials --platform android --clear
```

Then regenerate:

```bash
eas credentials --platform ios
eas credentials --platform android
```

### Environment Variables

For CI/CD, use environment variables (preferred over storing credentials in `eas.json`):

```bash
# iOS credentials
EXPO_APPLE_ID=your-apple-id
EXPO_ASC_APP_ID=123456789
EXPO_APPLE_TEAM_ID=ABCDEF1234

# Android credentials (if using local keystore)
ANDROID_KEYSTORE_BASE64=<base64-encoded-keystore>
ANDROID_KEYSTORE_PASSWORD=your-password
ANDROID_KEY_ALIAS=hunty-upload
ANDROID_KEY_PASSWORD=your-key-password

# Expo
EXPO_TOKEN=your-expo-token
```

---

## Troubleshooting

### "Credentials not found"

**Solution:** Run `eas credentials --platform <ios|android>` to set up or re-authenticate.

### "Provisioning profile invalid"

**Solution:** 
1. Delete credentials: `eas credentials --platform ios --clear`
2. Regenerate: `eas credentials --platform ios`
3. Rebuild: `pnpm run build:ios:prod`

### "Keystore password incorrect"

**Solution:**
1. Verify password is correct
2. If forgotten, you'll need to generate a new keystore and contact Google Play support
3. Update credentials: `eas credentials --platform android --clear`

### "Bundle ID mismatch"

**Solution:** Verify `app.json` has correct `bundleIdentifier` (iOS) and `package` (Android):

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "io.hunty.mobile"
    },
    "android": {
      "package": "io.hunty.mobile"
    }
  }
}
```

---

## Security Best Practices

1. **Never commit credentials** — Always use `.gitignore` and environment variables
2. **Use strong passwords** — Keystores and certificates must have strong passwords
3. **Backup keystores securely** — Multiple encrypted backups in different locations
4. **Rotate credentials regularly** — Every 1-2 years
5. **Use team accounts** — Avoid personal Apple/Google accounts
6. **Audit access** — Regularly review who has access to credentials
7. **Enable 2FA** — Use two-factor authentication on all app store accounts
8. **Store secrets in CI/CD** — Use GitHub Secrets, GitLab CI Variables, etc.

---

## References

- [Expo EAS Build Credentials](https://docs.expo.dev/app-signing/managed-credentials/)
- [Apple Developer](https://developer.apple.com/)
- [Google Play Console](https://play.google.com/console/)
- [Keystore Best Practices](https://developer.android.com/studio/publish/app-signing)
