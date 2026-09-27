# App Store & Play Store Assets

Compiled metadata and screenshot placeholders for EAS Build / Submit.

## Required screenshots

### iOS (App Store Connect)

| Device | Size (px) | Path |
|--------|-----------|------|
| iPhone 6.7" | 1290 × 2796 | `ios/iphone-67/` |
| iPhone 6.5" | 1284 × 2778 | `ios/iphone-65/` |
| iPad Pro 12.9" | 2048 × 2732 | `ios/ipad-129/` |

Suggested filenames: `01-hunts-feed.png`, `02-hunt-detail.png`, `03-wallet-connect.png`, `04-profile.png`, `05-map-play.png`

### Android (Google Play)

| Type | Size (px) | Path |
|------|-----------|------|
| Phone | 1080 × 1920 min | `android/phone/` |
| Feature graphic | 1024 × 500 | `android/feature-graphic.png` |

## Icons & splash (already in repo)

- App icon: `../assets/icon.png` (1024×1024 recommended for store)
- Adaptive icon: `../assets/adaptive-icon.png`
- Splash: `../assets/splash-icon.png`

## Push metadata to stores

```bash
cd mobile
eas metadata:push --profile production
```

Requires `EXPO_TOKEN` and App Store Connect / Play Console credentials configured in EAS.

## Validate before submit

```bash
cd mobile
pnpm run store:validate
```
