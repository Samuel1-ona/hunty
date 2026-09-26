# Security Policy

We take the security of our users and the integrity of the Hunty platform seriously. If you have discovered a vulnerability, please report it to us privately.

## Reporting a Vulnerability

### Private Reporting Channels

We encourage you to use the **GitHub Private Vulnerability Reporting** feature. This is the preferred and primary channel for reporting vulnerabilities in our repository.

To report a vulnerability privately, please follow these steps:
1. Navigate to the main page of the repository.
2. Click on the **Security** tab.
3. Click on the **Report a vulnerability** button.
4. Fill out the report form and submit.

## Supported Versions

We currently support and provide security updates for the latest stable release of the Hunty application.

## Scope

This security policy applies to all code within the `Samuel1-ona/hunty` repository.

### In Scope
*   Smart contract interactions and wallet integration logic.
*   API endpoints and backend services.
*   Application authentication and session management.

### Out of Scope
*   Third-party dependencies (we use automated auditing; please report vulnerabilities in dependencies to the respective maintainers. See our Dependency Vulnerability Management section below for how we handle them).
*   Physical security of client infrastructure.
*   Social engineering or phishing attacks against our users.

## Expected Response Time

We strive to respond to all vulnerability reports within **48 hours**. We appreciate your patience and diligence in helping us maintain a secure platform.

## Dependency Vulnerability Management

We use automated dependency scanning with `pnpm audit` in our continuous integration pipeline to detect known vulnerabilities in third-party dependencies. The CI job fails when high or critical severity vulnerabilities are present.

### Accepting a Finding

In some cases, a dependency vulnerability may have no available fix, or the risk may be deemed acceptable due to mitigations. To accept a finding, the following process must be followed:

1. Open a GitHub issue documenting the finding, including the dependency name, version, vulnerability ID (e.g., CVE), and severity.
2. Provide a justification for why the vulnerability is acceptable, including any mitigating factors or the absence of a patched release.
3. The issue must be reviewed and approved by at least one maintainer.
4. Once approved, the issue is linked from the repository’s security audit log or a dedicated tracking issue.

This process ensures that any deviation from the security baseline is documented and intentional.

---
*Note to maintainers: Please ensure that "Private vulnerability reporting" is enabled in your repository settings under Security & analysis.