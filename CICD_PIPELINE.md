# CI/CD Pipeline Documentation

This document describes the comprehensive CI/CD pipeline set up using GitHub Actions for the Hunty project.

## Overview

The CI/CD pipeline automates testing, building, and deployment to ensure code quality and reliability. It runs on every pull request and push to main/develop branches.

## Pipeline Stages

### 1. Continuous Integration (CI)
The main CI workflow (`ci.yml`) runs the following jobs in parallel for speed:

#### Lint and Type Check
- **Trigger**: Every PR and push to main/develop
- **Tasks**:
  - ESLint: Checks code quality and style
  - TypeScript: Performs type checking without emitting files
- **Status**: Blocks merging if failed

#### Unit Tests & Coverage
- **Trigger**: Every PR and push to main/develop
- **Tasks**:
  - Runs Vitest test suite
  - Generates coverage reports (HTML, LCOV, JSON formats)
  - Uploads coverage to Codecov (optional, continues on error)
- **Status**: Blocks merging if failed

#### Build Verification
- **Trigger**: Every PR and push to main/develop
- **Tasks**:
  - Builds the Next.js application
  - Ensures production build succeeds
- **Status**: Blocks merging if failed

#### E2E Tests
- **Trigger**: Every PR and push to main/develop
- **Tasks**:
  - Installs Playwright browsers
  - Runs end-to-end tests using Playwright
  - Uploads test artifacts and reports
- **Status**: Continues on error (informational)

#### CI Summary
- **Trigger**: After all CI jobs complete
- **Tasks**:
  - Verifies all jobs passed
  - Reports overall CI status

### 2. Staging Deployment
Workflow: `deploy-staging.yml`

- **Trigger**: Automatic on merge to `develop` branch
- **Environment**: Staging
- **Tasks**:
  - Builds the application
  - Deploys to staging environment
  - Creates deployment status
  - Sends notifications

**Setup Required**:
- Configure your deployment provider (e.g., Vercel, custom server)
- Add environment secrets for staging deployment
- Update the deployment step in the workflow

### 3. Production Deployment
Workflow: `deploy-production.yml`

- **Trigger**: Manual via GitHub Actions UI (`workflow_dispatch`)
- **Environment**: Production
- **Tasks**:
  - Ensures deployment is from `main` branch
  - Runs full test suite
  - Builds application
  - Deploys to production
  - Creates GitHub release
  - Sends notifications

**Setup Required**:
- Configure your deployment provider
- Add environment secrets for production deployment
- Set up required approval/environment protection rules
- Specify version during manual trigger

## Configuration

### Node.js and Dependencies
- **Node.js Version**: 20 (LTS)
- **Package Manager**: npm
- **Cache**: Enabled for faster builds

### Test Coverage
Coverage reports are generated in multiple formats:
- `text`: Console output
- `json`: Machine-readable format
- `html`: Visual HTML reports in `coverage/` directory
- `lcov`: For Codecov integration

### Artifact Retention
- Playwright test artifacts: 30 days
- Coverage reports: Latest only

## Local Development

To run the same checks locally before pushing:

```bash
# Lint and type check
npm run lint
npx tsc --noEmit

# Run unit tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e
npm run test:e2e:ui  # Interactive UI mode

# Build verification
npm run build
```

## Deployment Setup

### For Vercel
1. Get Vercel tokens from vercel.com
2. Add secrets to GitHub repository:
   - `VERCEL_TOKEN`: Your Vercel API token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID

3. Uncomment Vercel steps in deployment workflows

### For Custom Deployment
1. Create deployment scripts in `scripts/` directory
2. Update workflow steps to call your scripts
3. Add necessary secrets to GitHub repository
4. Ensure server SSH keys or credentials are configured

## Monitoring and Troubleshooting

### Check Workflow Status
1. Go to repository → Actions tab
2. Click on specific workflow run to view details
3. Expand job logs to see detailed output

### Common Issues

**Tests Failing Locally but Passing in CI**
- Check Node.js version matches (v20)
- Clear node_modules and reinstall: `rm -rf node_modules && npm ci`
- Check for environment-specific code

**Coverage not Uploading**
- Ensure Codecov integration is set up
- Check coverage files are being generated in CI

**Deployment Failing**
- Verify all required secrets are set in repository settings
- Check deployment provider credentials are valid
- Review deployment logs in workflow run details

## Performance Optimization

The pipeline is optimized for speed:
- **Parallel Jobs**: Lint, test, build, and E2E run simultaneously
- **Caching**: npm dependencies are cached between runs
- **Conditional Steps**: E2E tests continue on error (informational)

Typical CI runtime: 3-5 minutes for all parallel jobs

## Security

- Secrets are stored in GitHub encrypted secrets
- Deployments are limited to specific environments
- Production deployments require manual trigger
- All workflows run with minimal required permissions

## Future Improvements

- [ ] Performance metrics dashboard
- [ ] Slack/email notifications for failures
- [ ] Automated security scanning (SAST)
- [ ] Docker image builds and registry pushes
- [ ] Dependency updates (Dependabot)
- [ ] Automated rollback on failed deployments
