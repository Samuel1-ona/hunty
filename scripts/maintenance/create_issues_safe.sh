#!/bin/bash

# Array of issues: "Title|Body|Labels"
ISSUES=(
    "[UI/UX] Implement Dark Mode Support|Add a theme switcher using next-themes and define dark mode variants for all components to improve readability in low-light environments.|enhancement,ui/ux"
    "[UI/UX] Add Skeleton Loaders for Hunt List|Replace \"Loading...\" text with animated skeleton components for a smoother data fetching experience while hunts are being retrieved from the blockchain.|enhancement,ui/ux"
    "[Feature] Integrate Freighter Wallet|Complete the wallet connection flow using @stellar/freighter-api and update the walletAdapter.ts to support seamless user onboarding.|feature,blockchain"
    "[Feature] Hunt Discovery Search & Filter|Add a search bar and category filters (e.g., Active, Expired, Prize Amount) to the main hunt list to help users find relevant challenges.|feature,ui/ux"
    "[Profile] User Dashboard Page|Create a /profile page showing the user's joined hunts, completed hunts, and earned NFT rewards to track personal progress.|feature,ui/ux"
    "[Game] Real-time Hunt Completion Notifications|Use sonner and Stellar event streaming to notify users via toast messages when someone completes a hunt, enhancing the competitive feel.|feature,blockchain"
    "[NFT] NFT Gallery Component|Implement a specialized viewer for the scavenger hunt trophies, displaying metadata and high-quality images fetched from IPFS.|feature,ui/ux"
    "[Onboarding] Interactive Tutorial for New Players|Use react-joyride to guide first-time users through the core loop: connecting a wallet, finding a hunt, and submitting a clue.|enhancement,onboarding"
    "[Forms] Advanced Validation for Hunt Creation|Use zod and react-hook-form to ensure all hunt parameters (clue count, reward amounts, expiry dates) are valid before on-chain submission.|bug,quality"
    "[UX] Success Confetti on Completion|Trigger a celebratory canvas-confetti animation when a user successfully completes a hunt or solves a particularly difficult clue.|enhancement,ui/ux"
    "[Tech] Implement Gasless Transactions|Integrate with a Stellar paymaster service (using Soroban SDK) to allow users to play without needing to hold XLM for initial gas fees.|feature,blockchain"
    "[Refactor] Centralize Blockchain Error Handling|Improve stellarErrors.ts to provide human-readable, actionable messages for common Soroban transaction failures (e.g., insufficient funds, timeout).|refactor,quality"
    "[Tech] Add Unit Tests for Hunt Store|Write comprehensive tests for lib/huntStore.ts using vitest to ensure state management and local caching remain robust.|testing,quality"
    "[Tech] E2E Test for Core Game Loop|Implement a Playwright test covering the entire user journey: registration, clue submission, and hunt completion.|testing,quality"
    "[Docs] API Reference for Soroban Interactivity|Create detailed documentation for the methods in lib/soroban/ explaining how the frontend interacts with the smart contracts.|documentation"
    "[SEO] Optimize Metadata for Social Sharing|Add OpenGraph tags and dynamic meta descriptions for individual hunt pages to improve click-through rates from social media.|enhancement,seo"
    "[UX] Download Certificate/NFT as Image|Enhance lib/downloadAsImage.ts to allow users to generate and share a customized achievement image on Twitter/X or Farcaster.|enhancement,ui/ux"
    "[UI] Responsive Design Audit & Fixes|Ensure all interactive elements are accessible and correctly sized on mobile screens, performing a full audit across common device breakpoints.|bug,ui/ux"
    "[Performance] Image Optimization for IPFS Assets|Implement a Next.js Image loader or proxy to optimize and cache hunt-related images stored on IPFS for faster loading.|performance,quality"
    "[DevOps] Setup GitHub Actions for CI/CD|Configure a GitHub Actions workflow to run linting, vitest suites, and Next.js build checks on every pull request and push to main.|devops,quality"
)

# Loop through the array and create issues
for issue in "${ISSUES[@]}"; do
    IFS="|" read -r title body labels <<< "$issue"
    
    # Check if issue already exists
    if gh issue list --state all --json title | jq -e ".[] | select(.title == \"$title\")" > /dev/null; then
        echo "Issue already exists: $title"
        continue
    fi
    
    echo "Creating issue: $title"
    # Create without labels first to avoid failure, handles labels later
    gh issue create --title "$title" --body "$body"
done

echo "Finished creating issues."
