# Git History Rewrite Decision - Security Issue #855

## Context

On 2026-07-30, it was discovered that three environment files containing secrets were committed to the repository:

- `apps/web/.env.development`
- `apps/web/.env.production`
- `apps/web/.env.staging`

These files contained the following secrets that must be treated as compromised:

- `DATABASE_URL` - Database credentials (user:password@host:port/db)
- `PINATA_JWT` - JWT token for Pinata IPFS service
- `RESEND_API_KEY` - API key for Resend email service

## Immediate Actions Taken

1. ✅ Audited all three files and classified variables as public vs secret
2. ✅ Updated `.gitignore` to prevent future .env file commits
3. ✅ Untracked the three files from git using `git rm --cached`
4. ✅ Added Gitleaks CI check to prevent future secret commits
5. ⏳ Secret rotation (requires manual action by maintainers)

## History Rewrite Analysis

### Option 1: Rewrite Git History (BFG Repo-Cleaner or git-filter-repo)

**Pros:**

- Removes secrets from public git history
- Prevents future accidental exposure through git history browsing
- Cleaner repository state

**Cons:**

- **Breaks all existing clones** - contributors must re-clone
- **Breaks pull requests** - if any PRs reference the old commits
- **Breaks deployments** - if any deployment systems reference specific commit SHAs
- **Complex rollback process** - if something goes wrong
- **False sense of security** - secrets may already be:
  - Cached by GitHub's internal systems
  - Downloaded by forks and clones
  - Exposed in GitHub's API logs
  - Backed up by GitHub's disaster recovery systems

### Option 2: Do Not Rewrite History (Recommended)

**Pros:**

- No disruption to existing contributors or deployment workflows
- Maintains git history integrity
- Recognizes that the damage is already done - secrets are already exposed
- Focuses on actual remediation (rotation) rather than cosmetic cleanup

**Cons:**

- Secrets remain in git history (readable by anyone with repository access)
- Requires ongoing vigilance about the exposure

## Recommendation

**Do NOT rewrite git history.**

The security damage is already done - the secrets have been exposed to:

- Anyone with repository access (including forks)
- GitHub's internal systems and caches
- Anyone who cloned the repository before this fix

History rewriting provides a false sense of security while causing significant operational disruption. The effective remediation is:

1. **Immediate secret rotation** (P0):

   - Rotate all database credentials in `DATABASE_URL`
   - Rotate all Pinata JWT tokens in `PINATA_JWT`
   - Rotate all Resend API keys in `RESEND_API_KEY`

2. **Move secrets to secure storage**:

   - Configure Vercel environment variables for production/staging
   - Use local `.env` files for development (already in `.gitignore`)
   - Ensure secrets are never committed again

3. **Prevent future occurrences**:
   - ✅ Updated `.gitignore`
   - ✅ Added Gitleaks CI check
   - Consider adding pre-commit hooks for secret detection

## Required Actions for Maintainers

1. **Rotate database credentials immediately:**

   - Change database passwords for all three environments
   - Update deployment platform secrets (Vercel environment variables)
   - Update local development `.env` files (not committed)

2. **Rotate Pinata JWT tokens:**

   - Generate new JWT tokens in Pinata dashboard
   - Update deployment platform secrets
   - Update local development `.env` files

3. **Rotate Resend API keys:**

   - Generate new API keys in Resend dashboard
   - Update deployment platform secrets
   - Update local development `.env` files

4. **Verify no other secrets exist:**
   - Run `gitleaks detect` locally on the repository
   - Review commit history for other potential secrets
   - Audit GitHub deploy keys and tokens

## Timeline

- **Immediate (P0):** Rotate all secrets mentioned above
- **Within 24 hours:** Verify no other secrets exist in repository
- **Ongoing:** Monitor Gitleaks CI check results

## References

- GitHub Security Advisory: https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning
- Gitleaks Documentation: https://github.com/gitleaks/gitleaks
- OWASP Secret Management: https://owasp.org/www-community/Secrets_Management_Cheat_Sheet
