#!/bin/bash

# EAS Build Status Checker
# Purpose: Check status of recent EAS builds
# Usage: ./check-build-status.sh [limit]

LIMIT=${1:-10}

echo "========================================"
echo "Recent EAS Builds"
echo "========================================"
echo ""

eas build:list --limit $LIMIT --json | jq -r '.[]
  | "\(.id) | \(.platform) | \(.status) | \(.createdAt | sub("T.*"; ""))"
  | @tsv
' | column -t -s $'\t' -N "BUILD_ID,PLATFORM,STATUS,DATE"

echo ""
echo "To see full details:"
echo "  eas build:view <build-id>"
echo ""
echo "To download build artifact:"
echo "  eas build:download <build-id>"
