#!/bin/bash

# Create remaining labels
gh label create seo --color "B60205" --description "Search Engine Optimization" || true
gh label create performance --color "5319E7" --description "Performance optimizations" || true
gh label create devops --color "006B75" --description "CI/CD and deployment tasks" || true

# Map issue titles to labels
declare -A ISSUE_LABELS
ISSUE_LABELS["[UI/UX] Implement Dark Mode Support"]="enhancement,ui/ux"
ISSUE_LABELS["[UI/UX] Add Skeleton Loaders for Hunt List"]="enhancement,ui/ux"
ISSUE_LABELS["[Feature] Integrate Freighter Wallet"]="feature,blockchain"
ISSUE_LABELS["[Feature] Hunt Discovery Search & Filter"]="feature,ui/ux"
ISSUE_LABELS["[Profile] User Dashboard Page"]="feature,ui/ux"
ISSUE_LABELS["[Game] Real-time Hunt Completion Notifications"]="feature,blockchain"
ISSUE_LABELS["[NFT] NFT Gallery Component"]="feature,ui/ux"
ISSUE_LABELS["[Onboarding] Interactive Tutorial for New Players"]="enhancement,onboarding"
ISSUE_LABELS["[Forms] Advanced Validation for Hunt Creation"]="bug,quality"
ISSUE_LABELS["[UX] Success Confetti on Completion"]="enhancement,ui/ux"
ISSUE_LABELS["[Tech] Implement Gasless Transactions"]="feature,blockchain"
ISSUE_LABELS["[Refactor] Centralize Blockchain Error Handling"]="refactor,quality"
ISSUE_LABELS["[Tech] Add Unit Tests for Hunt Store"]="testing,quality"
ISSUE_LABELS["[Tech] E2E Test for Core Game Loop"]="testing,quality"
ISSUE_LABELS["[Docs] API Reference for Soroban Interactivity"]="documentation"
ISSUE_LABELS["[SEO] Optimize Metadata for Social Sharing"]="enhancement,seo"
ISSUE_LABELS["[UX] Download Certificate/NFT as Image"]="enhancement,ui/ux"
ISSUE_LABELS["[UI] Responsive Design Audit & Fixes"]="bug,ui/ux"
ISSUE_LABELS["[Performance] Image Optimization for IPFS Assets"]="performance,quality"
ISSUE_LABELS["[DevOps] Setup GitHub Actions for CI/CD"]="devops,quality"

# Get the last 20 issues and update them
gh issue list --limit 30 --json number,title | jq -c '.[]' | while read -r issue; do
    number=$(echo "$issue" | jq -r '.number')
    title=$(echo "$issue" | jq -r '.title')
    
    if [[ -n "${ISSUE_LABELS[$title]}" ]]; then
        echo "Updating issue #$number: $title with labels: ${ISSUE_LABELS[$title]}"
        gh issue edit "$number" --add-label "${ISSUE_LABELS[$title]}"
    fi
done
