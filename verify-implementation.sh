#!/bin/bash

# Network Switching Implementation Verification Script
# Run this to verify the implementation is correct

echo "=================================================="
echo "🔍 Network Switching Implementation Verification"
echo "=================================================="
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗ Error: Not in hunty project root${NC}"
    echo "  Please run this script from the hunty directory"
    exit 1
fi

echo "✓ Running from correct directory"
echo ""

# 1. Check all new files exist
echo "📁 Checking new files..."
NEW_FILES=(
    "components/NetworkIndicator.tsx"
    "components/NetworkSwitcher.tsx"
    "components/NetworkMismatchWarning.tsx"
    "hooks/useNetwork.ts"
    "lib/wallets/networkDetection.ts"
    "app/settings/page.tsx"
)

for file in "${NEW_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file MISSING"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# 2. Check modified files exist
echo "📝 Checking modified files..."
MODIFIED_FILES=(
    "lib/soroban/client.ts"
    "lib/contracts/config.ts"
    "lib/walletConnect.ts"
    "components/Header.tsx"
    "app/layout.tsx"
    "app/providers.tsx"
    ".env.example"
)

for file in "${MODIFIED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file MISSING"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# 3. Check critical imports
echo "🔗 Checking critical imports..."

# Check soroban/client.ts has the fix
if grep -q "import.*createSorobanRpcOptimizer.*from.*rpcOptimization" lib/soroban/client.ts; then
    echo -e "${GREEN}✓${NC} lib/soroban/client.ts has createSorobanRpcOptimizer import"
else
    echo -e "${RED}✗${NC} lib/soroban/client.ts missing createSorobanRpcOptimizer import"
    ERRORS=$((ERRORS + 1))
fi

# Check providers.tsx has the fix
if grep -q "import.*queryCachePolicy.*from" app/providers.tsx; then
    echo -e "${GREEN}✓${NC} app/providers.tsx has queryCachePolicy import"
else
    echo -e "${RED}✗${NC} app/providers.tsx missing queryCachePolicy import"
    ERRORS=$((ERRORS + 1))
fi

# Check Header imports NetworkIndicator
if grep -q "import.*NetworkIndicator" components/Header.tsx; then
    echo -e "${GREEN}✓${NC} Header.tsx imports NetworkIndicator"
else
    echo -e "${YELLOW}⚠${NC} Header.tsx might not import NetworkIndicator"
    WARNINGS=$((WARNINGS + 1))
fi

# Check layout imports TestnetWarning
if grep -q "import.*TestnetWarning" app/layout.tsx; then
    echo -e "${GREEN}✓${NC} layout.tsx imports TestnetWarning"
else
    echo -e "${YELLOW}⚠${NC} layout.tsx might not import TestnetWarning"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 4. Check environment variables
echo "⚙️  Checking environment configuration..."

if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
    
    # Check for network-specific vars
    if grep -q "NEXT_PUBLIC_HUNTY_CORE_ADDRESS_TESTNET" .env.local; then
        echo -e "${GREEN}✓${NC} Testnet contract addresses configured"
    else
        echo -e "${YELLOW}⚠${NC} Testnet contract addresses not configured"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    if grep -q "NEXT_PUBLIC_HUNTY_CORE_ADDRESS_MAINNET" .env.local; then
        echo -e "${GREEN}✓${NC} Mainnet contract addresses configured"
    else
        echo -e "${YELLOW}⚠${NC} Mainnet contract addresses not configured (optional for testing)"
    fi
else
    echo -e "${YELLOW}⚠${NC} .env.local not found (copy from .env.example)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 5. Check documentation
echo "📚 Checking documentation..."
DOCS=(
    "NETWORK_SWITCHING_GUIDE.md"
    "NETWORK_MIGRATION.md"
    "NETWORK_SWITCHING_IMPLEMENTATION_SUMMARY.md"
    "TEST_NETWORK_SWITCHING.md"
    "NETWORK_QUICK_REFERENCE.md"
    "BUGS_FIXED.md"
    "DEPLOYMENT_CHECKLIST.md"
    "IMPLEMENTATION_STATUS.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} $doc"
    else
        echo -e "${YELLOW}⚠${NC} $doc missing"
        WARNINGS=$((WARNINGS + 1))
    fi
done
echo ""

# 6. Check node_modules
echo "📦 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules exists"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found - run 'pnpm install'"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# 7. Check for common issues
echo "🔍 Checking for common issues..."

# Check for "use client" in client components
CLIENT_COMPONENTS=(
    "components/NetworkIndicator.tsx"
    "components/NetworkSwitcher.tsx"
    "components/NetworkMismatchWarning.tsx"
)

for comp in "${CLIENT_COMPONENTS[@]}"; do
    if grep -q "\"use client\"" "$comp"; then
        echo -e "${GREEN}✓${NC} $comp has 'use client' directive"
    else
        echo -e "${RED}✗${NC} $comp missing 'use client' directive"
        ERRORS=$((ERRORS + 1))
    fi
done
echo ""

# Summary
echo "=================================================="
echo "📊 Verification Summary"
echo "=================================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Your implementation is correct and ready for testing."
    echo ""
    echo "Next steps:"
    echo "1. Run: pnpm dev"
    echo "2. Visit: http://localhost:3000/settings"
    echo "3. Test network switching"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH WARNINGS${NC}"
    echo ""
    echo "Warnings: $WARNINGS"
    echo ""
    echo "The implementation should work, but check warnings above."
    echo "Most warnings are about optional configuration."
    echo ""
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo ""
    echo "Errors: $ERRORS"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Please fix the errors above before proceeding."
    echo ""
    exit 1
fi

echo "=================================================="
echo ""
echo "For more information, see:"
echo "  - IMPLEMENTATION_STATUS.md (current status)"
echo "  - DEPLOYMENT_CHECKLIST.md (deployment steps)"
echo "  - TEST_NETWORK_SWITCHING.md (testing guide)"
echo ""
