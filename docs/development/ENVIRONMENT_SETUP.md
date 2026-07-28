# Environment Configuration Guide

This document describes how the Hunty project is configured for different deployment environments.

## Overview

The project supports three main environments:

- **Development** (`development`) - Local development with Soroban testnet
- **Staging** (`staging`) - Vercel preview deployments with Soroban testnet
- **Production** (`production`) - Vercel production deployments with Soroban mainnet

## Environment Variables

### Core Environment Variables

Each environment is configured via dedicated `.env.*` files:

- `.env.development` - Local development configuration
- `.env.staging` - Staging/preview configuration
- `.env.production` - Production configuration

### Public Variables (NEXT_PUBLIC_*)

These variables are available to both server and client code:

| Variable | Purpose | Development | Staging | Production |
|----------|---------|-------------|---------|-----------|
| `NEXT_PUBLIC_ENVIRONMENT` | Current environment identifier | `development` | `staging` | `production` |
| `NEXT_PUBLIC_BASE_URL` | Application base URL | `http://localhost:3000` | `https://staging.hunty.app` | `https://hunty.app` |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | Soroban RPC endpoint | Testnet | Testnet | Mainnet |
| `NEXT_PUBLIC_SOROBAN_NETWORK_PASSPHRASE` | Stellar network identifier | Test network | Test network | Public network |
| `NEXT_PUBLIC_SOROBAN_NETWORK_TYPE` | Network type | `testnet` | `testnet` | `mainnet` |
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000/api` | Staging API | Production API |
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL endpoint | `http://localhost:4000/graphql` | Staging GraphQL | Production GraphQL |
| `NEXT_PUBLIC_ENABLE_STAGING_BANNER` | Show staging indicator | `false` | `true` | `false` |

### Secret Variables

These variables are kept private (server-side only) and must be configured in CI/CD:

| Variable | Purpose | Scope |
|----------|---------|-------|
| `DATABASE_URL` | Database connection string | All environments |
| `PINATA_JWT` | IPFS gateway authentication | All environments |
| `RESEND_API_KEY` | Email service API key | All environments |
| `NEXT_PUBLIC_SENTRY_DSN` | Error tracking endpoint | All environments |

## Soroban Network Configuration

### Testnet (Staging & Development)

- **RPC URL**: `https://soroban-testnet.stellar.org`
- **Network Passphrase**: `Test SDF Network ; September 2015`
- **Use Case**: Testing, preview deployments, development

### Mainnet (Production)

- **RPC URL**: `https://soroban-mainnet.stellar.org`
- **Network Passphrase**: `Public Global Stellar Network ; September 2015`
- **Use Case**: Live production deployment

## Deployment Configuration

### Vercel Setup

The `vercel.json` configuration:

1. **Defines environment variables** that Vercel manages
2. **Configures preview deployments** for staging branch
3. **Sets up production deployments** for main branch
4. **Specifies function configuration** for API routes

### GitHub Actions Workflow

The `.github/workflows/deploy-environments.yml` workflow:

1. **Triggers on branch push**:
   - `staging` branch → Staging deployment (testnet)
   - `main` branch → Production deployment (mainnet)
   - Manual workflow dispatch for flexibility

2. **Builds environment-specific code** with appropriate variables

3. **Deploys to Vercel** with the correct environment

## Using Environment Configuration in Code

### Server-Side Usage

```typescript
import { getEnvironmentConfig } from "@/lib/config/environment";

const config = getEnvironmentConfig();

if (config.isProduction) {
  // Production-only code
}

const rpcUrl = config.sorobanRpcUrl; // Mainnet or Testnet based on env
```

### Client-Side Usage (React Components)

```typescript
"use client"

import { useEnvironmentConfig } from "@/lib/config/environment";

export function MyComponent() {
  const config = useEnvironmentConfig();

  return (
    <div>
      {config.isStaging && <EnvironmentBadge />}
      API: {config.apiUrl}
    </div>
  );
}
```

### Environment Indicators in UI

The `EnvironmentIndicator` component displays the current environment:

- **Development**: Blue badge in bottom-right corner
- **Staging**: Yellow badge with testnet indicator
- **Production**: No indicator shown

Use in your layout:

```typescript
import { EnvironmentIndicator } from "@/components/EnvironmentIndicator";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <EnvironmentIndicator />
        {children}
      </body>
    </html>
  );
}
```

## Database Configuration

Each environment has its own database:

- **Development**: Local PostgreSQL (localhost:5432)
- **Staging**: Staging database server
- **Production**: Production database server

Update `DATABASE_URL` in each `.env.*` file to point to the correct database.

## Local Development Setup

1. **Copy environment template**:
   ```bash
   cp .env.development .env.local
   ```

2. **Update values** in `.env.local`:
   ```bash
   DATABASE_URL=postgresql://user:password@localhost:5432/hunty_dev
   PINATA_JWT=your_pinata_jwt
   RESEND_API_KEY=your_resend_key
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Verify environment indicator** shows "Dev" badge

## CI/CD Setup

### Required Secrets in GitHub

Configure these secrets for automatic deployments:

**Staging Secrets**:
- `STAGING_SOROBAN_RPC_URL`
- `STAGING_SOROBAN_NETWORK_PASSPHRASE`
- `STAGING_API_URL`
- `STAGING_GRAPHQL_URL`
- `STAGING_DATABASE_URL`
- `STAGING_PINATA_JWT`
- `STAGING_RESEND_API_KEY`

**Production Secrets**:
- `PROD_SOROBAN_RPC_URL`
- `PROD_SOROBAN_NETWORK_PASSPHRASE`
- `PROD_API_URL`
- `PROD_GRAPHQL_URL`
- `PROD_DATABASE_URL`
- `PROD_PINATA_JWT`
- `PROD_RESEND_API_KEY`

**Vercel Secrets**:
- `VERCEL_TOKEN` - Personal access token
- `VERCEL_ORG_ID` - Organization ID
- `VERCEL_PROJECT_ID` - Project ID

## Security Considerations

1. **Never commit secrets** - Use `.env.local` for local development
2. **CSP in report-only mode** for staging to detect issues
3. **CSP enforcement** in production only
4. **Staging banner** helps developers avoid mistakes
5. **Separate databases** prevent data cross-contamination

## Monitoring & Debugging

### Check Current Environment

The `getEnvironmentConfig()` function provides all environment details:

```typescript
const config = getEnvironmentConfig();
console.log(config);
// {
//   environment: "staging",
//   networkType: "testnet",
//   baseUrl: "https://staging.hunty.app",
//   isStaging: true,
//   isSorobanTestnet: true,
//   ...
// }
```

### View Deployment Status

- **Staging**: https://staging.hunty.app (with yellow badge)
- **Production**: https://hunty.app (no badge)

Check browser console to verify environment configuration loaded correctly.
