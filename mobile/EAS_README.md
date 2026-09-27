# 🚀 Hunty Mobile - Expo EAS Configuration

**Complete Expo Application Services setup for iOS and Android builds, updates, and deployments.**

---

## ⚡ Quick Start (5 minutes)

```bash
# 1. Navigate to mobile directory
cd mobile

# 2. Install dependencies
pnpm install

# 3. Login to Expo
eas login

# 4. View configuration
cat app.json     # App configuration
cat eas.json     # EAS build profiles
cat package.json | grep -A 20 '"scripts"'  # npm scripts

# 5. You're ready!
pnpm run build:all:preview   # Build for preview
```

---

## 📚 Documentation Map

Start here based on your need:

### 🆕 New to This Setup?
→ **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Fast lookup for common commands

### 🛠️ Want Complete Setup Instructions?
→ **[EAS_SETUP_DEPLOYMENT_GUIDE.md](./EAS_SETUP_DEPLOYMENT_GUIDE.md)** - Full guide with examples (2000+ lines)

### 🔐 Need to Set Up Credentials?
→ **[EAS_CREDENTIALS_GUIDE.md](./EAS_CREDENTIALS_GUIDE.md)** - iOS/Android signing & credentials

### 📋 Want an Overview?
→ **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Architecture & features

### ✅ What Was Delivered?
→ **[DELIVERABLES.md](./DELIVERABLES.md)** - Deliverables & next steps

### 📖 Comprehensive Summary?
→ **[FINAL_SUMMARY.md](./FINAL_SUMMARY.md)** - Complete implementation summary

---

## 🎯 Three Build Profiles

| Profile | Use Case | Output | Command |
|---------|----------|--------|---------|
| **development** | Local testing, development | APK | `pnpm run build:android:dev` |
| **preview** | QA testing, demos | APK | `pnpm run build:all:preview` |
| **production** | App Store/Play Store | AAB/IPA | `pnpm run build:all:prod` |

---

## 📦 Common Commands

### Building
```bash
# Development (for testing locally)
pnpm run build:android:dev
pnpm run build:ios:dev

# Preview (for QA/testing)
pnpm run build:all:preview

# Production (for app stores)
pnpm run build:all:prod
```

### OTA Updates
```bash
# Publish JavaScript/asset update (no rebuild needed)
pnpm run update:production -m "v1.1.0: Fixed login bug"
```

### Deployment
```bash
# Submit to app stores
pnpm run submit:production:android
pnpm run submit:production:ios
```

### Credentials
```bash
# Set up credentials (one-time)
eas credentials --platform ios
eas credentials --platform android

# View credentials status
eas credentials --platform ios --list
```

---

## 🔑 Environment Setup

### 1. Copy Environment Files
```bash
cp .env.development.example .env.development
cp .env.preview.example .env.preview
cp .env.production.example .env.production
```

### 2. Fill in Required Variables
```bash
# In each .env file, set:
EAS_PROJECT_ID=your-eas-project-id
EXPO_TOKEN=your-expo-token
WALLETCONNECT_PROJECT_ID=your-walletconnect-id
# ... and others (see .env.*.example files)
```

### 3. Get Your EAS Project ID
```bash
# From app.json
cat app.json | grep projectId
```

### 4. Get Your EXPO_TOKEN
- Go to: https://expo.dev/account/settings
- Create a token if needed
- Copy and paste into .env files

---

## 🧪 Quick Test

### Test the System (15 minutes)
```bash
cd mobile

# 1. Authenticate
eas login

# 2. Check credentials
eas credentials --platform ios --list
eas credentials --platform android --list

# 3. Try building
pnpm run build:all:preview --no-wait

# 4. Check status
eas build:list --limit 5
```

---

## 📖 Documentation Files

```
mobile/
├── README.md (you are here)
├── QUICK_REFERENCE.md          ← Quick command lookup
├── FINAL_SUMMARY.md            ← Complete implementation summary
├── EAS_SETUP_DEPLOYMENT_GUIDE.md    ← Full setup guide
├── EAS_CREDENTIALS_GUIDE.md    ← Credentials & signing
├── IMPLEMENTATION_SUMMARY.md   ← Features & architecture
└── DELIVERABLES.md             ← Deliverables & next steps
```

---

## 🏗️ What's Configured

✅ **Three build profiles** - Development, Preview, Production
✅ **OTA updates** - Three managed channels for updates
✅ **Auto signing** - iOS provisioning profiles, Android keystore
✅ **40+ npm scripts** - Convenient build & deployment commands
✅ **Environment config** - Separate dev/preview/prod environments
✅ **Helper scripts** - Tools for status, updates, releases
✅ **Full documentation** - 1800+ lines of guides
✅ **Best practices** - Following Expo & EAS recommendations

---

## 🚀 Common Workflows

### Release to Production
```bash
# 1. Build
pnpm run build:all:prod

# 2. Wait for builds to complete
eas build:list --limit 5

# 3. Submit to stores
pnpm run submit:production:android
pnpm run submit:production:ios

# 4. Complete review in App Store Connect / Play Console
```

### Publish OTA Update
```bash
# Make code changes
# Then publish
pnpm run update:production -m "v1.1.0: Fixed bug"

# Users get update on app restart
```

### Share Build with Team
```bash
# Build preview
pnpm run build:all:preview

# Share QR code or download link
eas build:download <build-id>
```

---

## 🆘 Troubleshooting

### "Credentials not found"
```bash
eas credentials --platform <ios|android>
```

### "EAS Project ID not set"
```bash
# Get it from app.json
cat app.json | grep projectId

# Or use eas init to set it
eas init
```

### "Build failed - check logs"
```bash
eas build:log <build-id>
```

### More Issues?
See troubleshooting sections in:
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md#troubleshooting-quick-fixes)
- [EAS_SETUP_DEPLOYMENT_GUIDE.md](./EAS_SETUP_DEPLOYMENT_GUIDE.md#troubleshooting)
- [EAS_CREDENTIALS_GUIDE.md](./EAS_CREDENTIALS_GUIDE.md#troubleshooting)

---

## 📋 Setup Checklist

- [ ] Read this README
- [ ] Review [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
- [ ] Copy `.env.*.example` files to `.env.*`
- [ ] Fill in environment variables
- [ ] Run `eas login`
- [ ] Set up credentials: `eas credentials --platform ios`
- [ ] Set up credentials: `eas credentials --platform android`
- [ ] Test build: `pnpm run build:all:preview`
- [ ] Read full setup guide: [EAS_SETUP_DEPLOYMENT_GUIDE.md](./EAS_SETUP_DEPLOYMENT_GUIDE.md)

---

## 🔗 Resources

- **Expo Docs:** https://docs.expo.dev
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **EAS Update:** https://docs.expo.dev/eas-update/introduction/
- **App Signing:** https://docs.expo.dev/app-signing/managed-credentials/

---

## 📝 For More Info

| Need | See |
|------|-----|
| Quick command reference | [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) |
| Complete setup instructions | [EAS_SETUP_DEPLOYMENT_GUIDE.md](./EAS_SETUP_DEPLOYMENT_GUIDE.md) |
| Credentials & signing | [EAS_CREDENTIALS_GUIDE.md](./EAS_CREDENTIALS_GUIDE.md) |
| Features overview | [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) |
| What was delivered | [DELIVERABLES.md](./DELIVERABLES.md) |
| Complete summary | [FINAL_SUMMARY.md](./FINAL_SUMMARY.md) |

---

**Status:** ✅ Production Ready
**Last Updated:** December 2024
**Version:** 1.0.0

Start building! 🚀
