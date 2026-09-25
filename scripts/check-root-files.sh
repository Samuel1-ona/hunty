#!/usr/bin/env bash
set -euo pipefail

cd -- "$(git rev-parse --show-toplevel)"

actual_files() {
  git ls-files --cached --others --exclude-standard |
    awk 'index($0, "/") == 0' |
    LC_ALL=C sort -u
}

allowed_files() {
  cat <<'EOF' | LC_ALL=C sort -u
.dockerignore
.env.example
.gitignore
.npmrc
.prettierignore
.prettierrc.json
.tool-versions
AGENTS.md
BUGS_FIXED.md
CONTRIBUTING.md
DEPLOYMENT_CHECKLIST.md
DEPLOYMENT_NOTES_EMAIL_DIGEST.md
DEVELOPMENT.md
FEATURE_EMAIL_DIGEST_SUMMARY.md
IMPLEMENTATION_CHECKLIST_EMAIL_DIGEST.md
IMPLEMENTATION_STATUS.md
NETWORK_MIGRATION.md
NETWORK_QUICK_REFERENCE.md
NETWORK_SWITCHING_GUIDE.md
NETWORK_SWITCHING_IMPLEMENTATION_SUMMARY.md
PR_DESCRIPTION_862.md
PR_DESCRIPTION_EMAIL_DIGEST.md
README.md
SECURITY.md
SECURITY_HISTORY_REWRITE_DECISION.md
SOROBAN_HELPERS_IMPLEMENTATION.md
TEST_NETWORK_SWITCHING.md
commitlint.config.mjs
docker-compose.yml
eslint.config.mjs
package.json
pnpm-lock.yaml
pnpm-workspace.yaml
renovate.json
turbo.json
EOF
}

unexpected="$(comm -23 <(actual_files) <(allowed_files))"

if [[ -n "$unexpected" ]]; then
  while IFS= read -r file; do
    printf '::error file=%s::Unexpected repository-root file. Move scripts to scripts/ and documentation to docs/, or explicitly update the root-file allowlist.\n' "$file"
  done <<< "$unexpected"
  exit 1
fi

echo "Repository root file allowlist is valid."
