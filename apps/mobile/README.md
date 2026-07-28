# mobile

The **Hunty** React Native / Expo mobile app. It uses Expo SDK 55, Expo Router
for file-based navigation, and connects to the Stellar blockchain via
`@stellar/stellar-sdk` and WalletConnect.

## Scripts

### Development

| Script | Description |
| --- | --- |
| `start` | Start the Expo dev server |
| `android` | Start and open on Android emulator |
| `ios` | Start and open on iOS simulator |
| `web` | Start and open in a web browser |

### Code quality

| Script | Description |
| --- | --- |
| `lint` | ESLint for `.js/.jsx/.ts/.tsx` |
| `lint:fix` | ESLint with auto-fix |
| `format` | Prettier write |
| `format:check` | Prettier check (CI) |
| `test` | Jest (passes with no tests) |

### Store & assets

| Script | Description |
| --- | --- |
| `store:validate` | Validate App Store / Play Store metadata |
| `store:generate` | Generate store listing assets |

### E2E

| Script | Description |
| --- | --- |
| `test:e2e` | Run Maestro E2E flows |
| `test:e2e:validate` | Validate Maestro baseline screenshots |

### EAS Build / Submit / Update

| Script | Description |
| --- | --- |
| `build:android` / `build:ios` / `build:all` | EAS production builds |
| `build:*:dev` / `build:*:preview` | Development & preview builds |
| `submit:*` | Submit builds to app stores |
| `update:development` / `update:preview` / `update:production` | OTA updates |

## Key dependencies

- **`expo` ~55** — Expo SDK (camera, location, notifications, secure-store, …)
- **`expo-router`** — file-based routing
- **`@stellar/stellar-sdk`** — Stellar blockchain client
- **`@walletconnect/*`** — WalletConnect v2 for mobile wallet connection
- **`@tanstack/react-query`** — server-state caching
- **`zustand`** — lightweight state management
- **`nativewind`** — Tailwind CSS for React Native
- **`@sentry/react-native`** — error tracking
