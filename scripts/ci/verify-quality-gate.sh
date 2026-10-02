#!/usr/bin/env bash
# scripts/ci/verify-quality-gate.sh
#
# Verification script for issue #1367: confirms that the Quality Gate
# required check catches deliberate TypeScript syntax errors.
#
# Usage (run locally or in a throwaway branch — do NOT merge this change):
#
#   1. Create a test branch:
#        git checkout -b test/quality-gate-verification
#
#   2. Introduce a deliberate syntax error:
#        echo "const x: string = 42  // type error" > apps/web/app/__test_broken.ts
#
#   3. Commit and push:
#        git add -A && git commit -m "test: deliberate breakage for quality-gate" && git push origin test/quality-gate-verification
#
#   4. Open a PR against main and verify:
#        - "Quality — @hunty/web" shows ❌
#        - "Quality Gate"          shows ❌
#        - The PR cannot be merged (once branch protection is enabled)
#
#   5. Clean up:
#        git checkout main && git branch -D test/quality-gate-verification
#        git push origin --delete test/quality-gate-verification
#
# This script automates steps 2–3 for convenience.
set -euo pipefail

BRANCH="test/quality-gate-verification"
BROKEN_FILE="apps/web/app/__test_broken.ts"

echo "🔧 Creating branch: $BRANCH"
git checkout -b "$BRANCH" 2>/dev/null || git checkout "$BRANCH"

echo "💥 Introducing deliberate type error in $BROKEN_FILE"
cat > "$BROKEN_FILE" << 'EOF'
// Deliberate type error to verify Quality Gate catches it (issue #1367)
const brokenVariable: string = 42;
export default brokenVariable;
EOF

echo "📦 Committing..."
git add "$BROKEN_FILE"
git commit -m "test: deliberate type error to verify quality-gate (issue #1367)

DO NOT MERGE — this commit intentionally breaks typecheck to confirm
that the Quality Gate required check blocks the PR."

echo ""
echo "✅ Ready! Now push and open a PR:"
echo "   git push origin $BRANCH"
echo "   Then open a PR against main and verify the Quality Gate check fails."
echo ""
echo "🧹 To clean up afterwards:"
echo "   git checkout main && git branch -D $BRANCH"
echo "   git push origin --delete $BRANCH"
