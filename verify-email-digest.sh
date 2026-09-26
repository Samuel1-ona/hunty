#!/bin/bash

# Email Digest Feature - Deployment Verification Script
# 
# Run this script after deploying to verify the email digest feature is working.
# Usage: chmod +x verify-email-digest.sh && ./verify-email-digest.sh
#
# Set these environment variables before running:
#   BASE_URL - the base URL of your application (default: http://localhost:3000)
#   ADMIN_TOKEN - the admin API token for digest send endpoint
#   TEST_WALLET - test wallet address (default: GTEST123XXX...)
#   TEST_EMAIL - test email address (default: test@hunty.test)

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
TEST_WALLET="${TEST_WALLET:-GTESTXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX}"
TEST_EMAIL="${TEST_EMAIL:-test@hunty.test}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
test_start() {
  echo -e "\n${YELLOW}Testing: $1${NC}"
}

test_pass() {
  echo -e "${GREEN}✓ PASS${NC}: $1"
  ((TESTS_PASSED++))
}

test_fail() {
  echo -e "${RED}✗ FAIL${NC}: $1"
  ((TESTS_FAILED++))
}

# ────────────────────────────────────────────────────────────────────────────
# TEST 1: Subscribe to Email Digest
# ────────────────────────────────────────────────────────────────────────────

test_start "Subscribe player to email digest"

SUBSCRIBE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/email-preferences" \
  -H "Content-Type: application/json" \
  -d "{
    \"walletAddress\": \"$TEST_WALLET\",
    \"email\": \"$TEST_EMAIL\",
    \"digestSubscribed\": true
  }")

if echo "$SUBSCRIBE_RESPONSE" | grep -q "digestSubscribed"; then
  test_pass "POST /api/v1/email-preferences succeeds"
  
  if echo "$SUBSCRIBE_RESPONSE" | grep -q "\"digestSubscribed\":true"; then
    test_pass "Player is subscribed to digest"
  else
    test_fail "Player should be subscribed to digest"
  fi
else
  test_fail "POST /api/v1/email-preferences returned invalid response"
  echo "Response: $SUBSCRIBE_RESPONSE"
fi

# ────────────────────────────────────────────────────────────────────────────
# TEST 2: Retrieve Preferences
# ────────────────────────────────────────────────────────────────────────────

test_start "Retrieve player email preferences"

GET_RESPONSE=$(curl -s "$BASE_URL/api/v1/email-preferences?wallet=$TEST_WALLET")

if echo "$GET_RESPONSE" | grep -q "digestSubscribed"; then
  test_pass "GET /api/v1/email-preferences succeeds"
  
  if echo "$GET_RESPONSE" | grep -q "$TEST_EMAIL"; then
    test_pass "Retrieved email matches subscribed email"
  else
    test_fail "Retrieved email does not match"
  fi
else
  test_fail "GET /api/v1/email-preferences returned invalid response"
  echo "Response: $GET_RESPONSE"
fi

# ────────────────────────────────────────────────────────────────────────────
# TEST 3: Send Digest Batch (Dry Run)
# ────────────────────────────────────────────────────────────────────────────

test_start "Send digest batch (dry run)"

if [ -z "$ADMIN_TOKEN" ]; then
  echo -e "${YELLOW}⊘ SKIP${NC}: ADMIN_TOKEN not set. Set ADMIN_TOKEN environment variable to test."
else
  SEND_RESPONSE=$(curl -s -X POST "$BASE_URL/api/v1/email-digest/send?dryRun=true" \
    -H "X-Admin-Token: $ADMIN_TOKEN")

  if echo "$SEND_RESPONSE" | grep -q "dryRun"; then
    test_pass "POST /api/v1/email-digest/send succeeds (admin endpoint)"
    
    if echo "$SEND_RESPONSE" | grep -q "\"dryRun\":true"; then
      test_pass "Dry run flag is set (no emails actually sent)"
    else
      test_fail "Dry run flag should be true"
    fi
  else
    test_fail "POST /api/v1/email-digest/send returned invalid response"
    echo "Response: $SEND_RESPONSE"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# TEST 4: Unsubscribe with Invalid Token
# ────────────────────────────────────────────────────────────────────────────

test_start "Unsubscribe with invalid token (should fail gracefully)"

UNSUBSCRIBE_RESPONSE=$(curl -s "$BASE_URL/api/v1/email-digest/unsubscribe?token=invalid-token-123")

if echo "$UNSUBSCRIBE_RESPONSE" | grep -q "success"; then
  test_pass "GET /api/v1/email-digest/unsubscribe responds to requests"
  
  if echo "$UNSUBSCRIBE_RESPONSE" | grep -q "\"success\":false"; then
    test_pass "Invalid token is rejected"
  else
    test_fail "Invalid token should return success: false"
  fi
else
  test_fail "GET /api/v1/email-digest/unsubscribe returned invalid response"
  echo "Response: $UNSUBSCRIBE_RESPONSE"
fi

# ────────────────────────────────────────────────────────────────────────────
# TEST 5: Unsubscribe a Player
# ────────────────────────────────────────────────────────────────────────────

test_start "Unsubscribe player from digest"

UNSUBSCRIBE_BODY=$(curl -s -X POST "$BASE_URL/api/v1/email-preferences" \
  -H "Content-Type: application/json" \
  -d "{
    \"walletAddress\": \"$TEST_WALLET\",
    \"email\": \"$TEST_EMAIL\",
    \"digestSubscribed\": false
  }")

if echo "$UNSUBSCRIBE_BODY" | grep -q "digestSubscribed"; then
  if echo "$UNSUBSCRIBE_BODY" | grep -q "\"digestSubscribed\":false"; then
    test_pass "Player successfully unsubscribed"
  else
    test_fail "Player should be unsubscribed"
  fi
else
  test_fail "Unsubscribe request returned invalid response"
  echo "Response: $UNSUBSCRIBE_BODY"
fi

# ────────────────────────────────────────────────────────────────────────────
# TEST 6: Verify Unsubscription
# ────────────────────────────────────────────────────────────────────────────

test_start "Verify player is unsubscribed"

VERIFY_RESPONSE=$(curl -s "$BASE_URL/api/v1/email-preferences?wallet=$TEST_WALLET")

if echo "$VERIFY_RESPONSE" | grep -q "\"digestSubscribed\":false"; then
  test_pass "Subscription status is correctly updated to false"
else
  test_fail "Subscription status should be false"
fi

# ────────────────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────────────────

TOTAL=$((TESTS_PASSED + TESTS_FAILED))

echo -e "\n${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}Test Summary${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════${NC}"
echo -e "Total:    $TOTAL"
echo -e "${GREEN}Passed:   $TESTS_PASSED${NC}"
echo -e "${RED}Failed:   $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  echo -e "\n${YELLOW}Next steps:${NC}"
  echo -e "  1. Run integration tests: pnpm test:e2e"
  echo -e "  2. Review email template in Resend dashboard"
  echo -e "  3. Set up cron job for digest sends"
  echo -e "  4. See: docs/EMAIL_DIGEST_IMPLEMENTATION.md"
  exit 0
else
  echo -e "\n${RED}✗ Some tests failed.${NC}"
  echo -e "\n${YELLOW}Troubleshooting:${NC}"
  echo -e "  • Verify BASE_URL is correct: $BASE_URL"
  echo -e "  • Check that the app is running"
  echo -e "  • Review recent error logs"
  echo -e "  • See: docs/EMAIL_DIGEST_IMPLEMENTATION.md#troubleshooting"
  exit 1
fi
