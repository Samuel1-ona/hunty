# Android Upload Keystore — Generation & Backup Protocol

This document covers the correct generation sequence and secure backup protocol for the Android upload keystore required for Google Play deployment.

---

## Overview

Google Play uses two distinct keys:

| Key | Owner | Purpose |
|-----|-------|---------|
| **Upload keystore** | You (the developer) | Signs APKs/AABs before uploading to Play Console |
| **App signing key** | Google (Play App Signing) | Re-signs the app before delivery to users |

You must never lose the upload keystore. If lost, you must contact Google Play support to reset it — a slow, manual process that blocks releases.

---

## 1. Prerequisites

```bash
# Java keytool (bundled with JDK)
java -version   # must be 11+

# EAS CLI
npm install -g eas-cli
eas login
```

---

## 2. Generate the Upload Keystore

```bash
keytool -genkeypair \
  -v \
  -keystore hunty-upload-key.jks \
  -alias hunty-upload \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -storetype JKS
```

You will be prompted for:
- **Keystore password** — use a strong, unique password (≥20 chars). Store in your password manager.
- **Key password** — can match the keystore password or be different. Store separately.
- **Distinguished Name fields** — First/Last Name, Org Unit, Org, City, State, Country.

> **Important:** `validity 10000` (~27 years) ensures the key does not expire before your app's lifetime. Google recommends at least 25 years.

---

## 3. Verify the Keystore

```bash
keytool -list -v -keystore hunty-upload-key.jks -alias hunty-upload
```

Confirm:
- Key algorithm: RSA
- Key size: 4096
- Valid until: far future date
- Certificate fingerprints (SHA-256) — record these for Play Console verification

---

## 4. Register with EAS Build

EAS Build manages the keystore for CI/CD. Upload it once:

```bash
cd mobile
eas credentials --platform android
# Select: "Upload a keystore"
# Provide: path to hunty-upload-key.jks, alias, keystore password, key password
```

EAS encrypts and stores the keystore on Expo's servers. It is used automatically during `eas build --platform android --profile production`.

Alternatively, store credentials locally in `eas.json` via environment variables (preferred for self-hosted CI):

```json
// eas.json — production android build profile
"production": {
  "android": {
    "buildType": "app-bundle",
    "credentialsSource": "local"
  }
}
```

Then provide via environment variables in your CI pipeline:

```
ANDROID_KEYSTORE_BASE64   # base64-encoded .jks file
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Encode the keystore for storage:

```bash
base64 -i hunty-upload-key.jks | tr -d '\n' > hunty-upload-key.b64
```

---

## 5. Enroll in Google Play App Signing

In Play Console → **Setup → App signing**, enroll in Play App Signing. Upload your upload keystore's certificate (not the keystore itself):

```bash
# Export the certificate (DER format required by Play Console)
keytool -export \
  -rfc \
  -keystore hunty-upload-key.jks \
  -alias hunty-upload \
  -file hunty-upload-cert.pem
```

Upload `hunty-upload-cert.pem` to Play Console. Google will store the app signing key; you retain the upload key.

---

## 6. Secure Backup Protocol

Losing the upload keystore permanently blocks Play Store releases until Google manually resets it. Follow this protocol on every keystore generation or rotation.

### 6.1 Immediate Backups (Day 0)

- [ ] Copy `hunty-upload-key.jks` to **at least three** independent locations:
  1. **Password manager** (e.g. 1Password, Bitwarden) — store the `.jks` as a file attachment alongside both passwords
  2. **Encrypted cloud storage** — upload to a private S3 bucket or equivalent with server-side encryption enabled; restrict access to the release team only
  3. **Offline cold storage** — copy to an encrypted USB drive stored in a physically secure location (e.g. office safe)

- [ ] Store `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD` as secrets in your CI provider (GitHub Actions, EAS, etc.)

- [ ] Record the SHA-256 certificate fingerprint in your team's internal wiki or runbook

### 6.2 Access Control

- Restrict keystore access to the **release manager role** only
- Never commit the `.jks` file or raw passwords to the repository — add to `.gitignore`:

```
# .gitignore (mobile/)
*.jks
*.keystore
*.b64
google-play-service-account.json
```

- Rotate CI secrets immediately if a team member with access leaves

### 6.3 Quarterly Verification

Every quarter, verify the backup is intact and usable:

```bash
# Decode from backup and verify
echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > /tmp/verify-key.jks
keytool -list -v -keystore /tmp/verify-key.jks -alias hunty-upload
rm /tmp/verify-key.jks
```

Confirm the SHA-256 fingerprint matches the recorded value.

### 6.4 Rotation Policy

- Rotate the upload keystore if: a team member with access leaves, a credential leak is suspected, or Google Play support requires it
- After rotation, re-upload the new certificate to Play Console and update all CI secrets
- Keep the old keystore archived (never delete) in case Google needs it for verification

---

## 7. CI/CD Integration (GitHub Actions)

Add these secrets to your GitHub repository (`Settings → Secrets → Actions`):

| Secret name | Value |
|-------------|-------|
| `ANDROID_KEYSTORE_BASE64` | Output of `base64 -i hunty-upload-key.jks \| tr -d '\n'` |
| `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
| `ANDROID_KEY_ALIAS` | `hunty-upload` |
| `ANDROID_KEY_PASSWORD` | Key password |

Reference in your workflow:

```yaml
- name: Decode keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 --decode > mobile/hunty-upload-key.jks

- name: Build production AAB
  working-directory: mobile
  env:
    ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
    ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
    ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
  run: eas build --platform android --profile production --non-interactive
```

---

## 8. Quick Reference

```bash
# Generate
keytool -genkeypair -v -keystore hunty-upload-key.jks -alias hunty-upload \
  -keyalg RSA -keysize 4096 -validity 10000 -storetype JKS

# Verify
keytool -list -v -keystore hunty-upload-key.jks -alias hunty-upload

# Export certificate for Play Console
keytool -export -rfc -keystore hunty-upload-key.jks -alias hunty-upload \
  -file hunty-upload-cert.pem

# Encode for CI secrets
base64 -i hunty-upload-key.jks | tr -d '\n'

# Upload to EAS
eas credentials --platform android
```
