# Required GitHub Secrets and Variables

This document lists all the secrets and variables that need to be configured in your GitHub repository settings for the CI/CD workflows to function properly.

## GitHub Secrets (Repository Settings → Secrets and variables → Actions)

### Sentry Configuration

- `SENTRY_AUTH_TOKEN` - Authentication token for Sentry error tracking
- **Variables (not secrets):**
  - `SENTRY_ORG` - Sentry organization slug
  - `SENTRY_PROJECT` - Sentry project slug

### Expo Configuration

- `EXPO_TOKEN` - Expo account token for EAS builds and submissions
- `EXPO_APPLE_APP_SPECIFIC_PASSWORD` - Apple-specific password for TestFlight submissions

### Apple Development

- `APPLE_APP_SPECIFIC_PASSWORD` - Apple app-specific password for App Store operations

### Vercel Deployment

- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

### Staging Environment

- `STAGING_SOROBAN_RPC_URL` - Soroban RPC URL for staging
- `STAGING_SOROBAN_NETWORK_PASSPHRASE` - Soroban network passphrase for staging
- `STAGING_API_URL` - API URL for staging environment
- `STAGING_GRAPHQL_URL` - GraphQL endpoint for staging
- `STAGING_DATABASE_URL` - Database connection string for staging
- `STAGING_PINATA_JWT` - Pinata JWT token for IPFS operations (staging)
- `STAGING_RESEND_API_KEY` - Resend API key for email services (staging)

### Production Environment

- `PROD_SOROBAN_RPC_URL` - Soroban RPC URL for production
- `PROD_SOROBAN_NETWORK_PASSPHRASE` - Soroban network passphrase for production
- `PROD_API_URL` - API URL for production environment
- `PROD_GRAPHQL_URL` - GraphQL endpoint for production
- `PROD_DATABASE_URL` - Database connection string for production
- `PROD_PINATA_JWT` - Pinata JWT token for IPFS operations (production)
- `PROD_RESEND_API_KEY` - Resend API key for email services (production)

### Testing & Security

- `WALLET_EXTENSION_PATH` - Path to wallet extension for cross-browser testing
- `GITLEAKS_LICENSE` - License key for Gitleaks security scanning

## How to Configure Secrets

### Step-by-Step Instructions

#### Adding Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Under the "Secrets" tab, click **New repository secret**
4. Enter the **Name** (e.g., `SENTRY_AUTH_TOKEN`)
5. Enter the **Value** (your actual secret)
6. Click **Add secret**

#### Adding Variables

For non-sensitive values like `SENTRY_ORG` and `SENTRY_PROJECT`:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Under the "Variables" tab, click **New repository variable**
3. Enter the **Name** (e.g., `SENTRY_ORG`)
4. Enter the **Value** (your actual value)
5. Click **Add variable**

### Environment-Specific Secrets

For staging and production deployments, you can also configure secrets at the environment level:

1. Go to **Settings** → **Environments**
2. Create or select an environment (e.g., `staging`, `production`)
3. Under "Environment secrets", add environment-specific secrets
4. These secrets will only be available to workflows running in that environment

### Testing Your Configuration

After adding secrets, you can test them by:

1. Triggering a workflow manually via **Actions** tab → **Run workflow**
2. Checking the workflow logs to see if secrets are properly loaded
3. Secrets will appear as `***` in logs for security

## Required for Each Workflow

### CI Workflow (.github/workflows/ci.yml)

- `SENTRY_AUTH_TOKEN` (secret)
- `SENTRY_ORG` (variable)
- `SENTRY_PROJECT` (variable)

### iOS TestFlight Workflow (.github/workflows/ios-testflight.yml)

- `EXPO_TOKEN` (secret)
- `APPLE_APP_SPECIFIC_PASSWORD` (secret)

### Environment Deployment Workflows

#### Staging (.github/workflows/deploy-environments.yml)

- `VERCEL_TOKEN` (secret)
- `VERCEL_ORG_ID` (secret)
- `VERCEL_PROJECT_ID` (secret)
- All `STAGING_*` secrets

#### Production (.github/workflows/deploy-environments.yml)

- `VERCEL_TOKEN` (secret)
- `VERCEL_ORG_ID` (secret)
- `VERCEL_PROJECT_ID` (secret)
- All `PROD_*` secrets

### Playwright Cross-Browser Tests (.github/workflows/playwright-cross-browser.yml)

- `WALLET_EXTENSION_PATH` (secret)

### Gitleaks Security Scan (.github/workflows/gitleaks.yml)

- `GITLEAKS_LICENSE` (secret)

## Temporary Workaround

If you need to test workflows without all secrets configured, the workflows are configured to:

1. Use `continue-on-error: true` for steps that require secrets
2. Skip steps gracefully when secrets are missing
3. Allow the workflow to continue even if some steps fail

This means workflows will run even without all secrets configured, but the steps requiring missing secrets will be skipped or fail gracefully. You can still test other parts of the CI/CD pipeline.

## Security Notes

- Never commit secrets to the repository
- Rotate secrets regularly
- Use different secrets for different environments
- Monitor secret usage in GitHub Actions logs
