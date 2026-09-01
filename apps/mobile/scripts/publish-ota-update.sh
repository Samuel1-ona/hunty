#!/bin/bash

# EAS OTA Update Publisher
# Purpose: Publish OTA updates with changelog confirmation
# Usage: ./publish-ota-update.sh <channel> [message]

CHANNEL=$1
MESSAGE=$2

if [ -z "$CHANNEL" ]; then
    echo "Usage: $0 <channel> [message]"
    echo ""
    echo "Channels:"
    echo "  - development  (for development builds)"
    echo "  - preview      (for QA/testing)"
    echo "  - production   (for production users)"
    exit 1
fi

# Validate channel
case $CHANNEL in
    development|preview|production)
        ;;
    *)
        echo "Error: Invalid channel '$CHANNEL'"
        echo "Must be: development, preview, or production"
        exit 1
        ;;
esac

echo "========================================"
echo "EAS OTA Update Publisher"
echo "========================================"
echo ""
echo "Channel: $CHANNEL"
echo ""

# Get git info
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse --short HEAD)
AUTHOR=$(git config user.name)

if [ -z "$MESSAGE" ]; then
    MESSAGE="Update from $BRANCH ($COMMIT)"
fi

echo "Branch: $BRANCH"
echo "Commit: $COMMIT"
echo "Author: $AUTHOR"
echo "Message: $MESSAGE"
echo ""

read -p "Proceed with publishing? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Publishing update to $CHANNEL channel..."
eas update --channel $CHANNEL --branch $CHANNEL --message "$MESSAGE"

echo ""
echo "✓ Update published successfully!"
echo ""
echo "To view published updates:"
echo "  eas update:list --channel $CHANNEL"
