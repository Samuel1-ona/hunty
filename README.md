# Hunty

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/next.js-15.3.4-black.svg)](https://nextjs.org/)
[![Expo](https://img.shields.io/badge/expo-Managed%20App-green.svg)](https://expo.dev/)
[![Stellar](https://img.shields.io/badge/stellar-soroban-blueviolet.svg)](https://soroban.stellar.org/)

Hunty is a cross-platform scavenger-hunt platform and dApp that combines web, mobile, and on-chain rewards. Creators publish location-based hunts and players complete challenges to earn NFTs, tokens, and other reward assets via Stellar/Soroban.

## Highlights

- **Multi-platform:** Web app built with Next.js App Router and a React Native mobile app in `mobile/`.
- **On-chain rewards:** Stellar/Soroban smart-contract integrations, wallet adapters, and NFT reward flows.
- **Decentralized assets:** IPFS-hosted media and metadata for hunts, NFTs, and rewards.
- **Developer tooling:** Type-safe TypeScript code, Vitest unit tests, and Playwright E2E tests.

## Key Features

- Create, publish, and manage hunts from a creator dashboard.
- Play hunts with location and clue validation, progress tracking, and completion flows.
- Mint and claim NFT rewards and on-chain token payouts for completed hunts.
- Community and leaderboard features for social play and competition.

## Tech Stack

- Frontend: Next.js, React, TypeScript
- Mobile: Expo / React Native
- Storage: IPFS for media and metadata
- Blockchain: Stellar + Soroban smart contracts, Freighter wallet support
- Testing: Vitest for unit tests, Playwright for E2E
- Tooling: pnpm, Tailwind CSS, PostCSS

## Repository Structure

- `app/` — Next.js app router routes and pages for the web UI
- `components/` — Reusable React components and UI patterns
- `lib/` — Core utilities, blockchain adapters, stores, and helpers
- `mobile/` — Expo React Native mobile app and mobile-specific assets
- `public/` — Static assets served by the web app
- `e2e/` — End-to-end Playwright tests
- `components/__tests__/`, `lib/__tests__/` — Unit tests

## Getting Started

1. Install dependencies at the root:

```bash
pnpm install
```

2. Run the web app in development:

```bash
pnpm dev
```

3. Start the mobile app from `mobile/`:

```bash
cd mobile
pnpm install
expo start
```

4. Run tests:

```bash
pnpm test
pnpm run e2e
```

## Docker development

This repository includes a local Docker development environment for the web app and a PostgreSQL database container.

1. Build and start the development stack:

```bash
docker compose up --build
```

2. Open the web app at:

```bash
http://localhost:3000
```

3. PostgreSQL is available at `localhost:5432` with:

- `POSTGRES_USER=hunty`
- `POSTGRES_PASSWORD=hunty`
- `POSTGRES_DB=hunty_dev`

4. Code changes are mounted from the host into the container, so hot reload works automatically.

5. Stop the stack:

```bash
docker compose down
```

## Notes

- This project prefers `pnpm`; a `pnpm-lock.yaml` is included.
- On-chain reward flows require wallet integrations and a local or testnet Stellar environment.
- See `lib/walletAdapter.ts` and `lib/stellarErrors.ts` for wallet helpers and common error handling.

## Roadmap

- Finalize and audit Soroban reward contracts.
- Improve on-chain UX with clearer signing prompts and gasless flows.
- Add persistent IPFS pinning and CDN fallback for asset availability.
- Expand mobile parity with offline play support.
- Add creator templates, analytics, and better minting tools.
- Build community features like messaging, team hunts, and governance.

## Contributing

- See `CONTRIBUTING.md` for contribution guidelines.
- Use branches for feature work and include tests with focused changes.

## Contact

- Open issues or PRs on the repository.
- Tag maintainers for urgent review requests.

## License

This project is open source under the MIT License.
