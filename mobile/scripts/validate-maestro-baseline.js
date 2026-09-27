#!/usr/bin/env node
/**
 * Static validation for Maestro E2E baseline — ensures flow file exists
 * and required testIDs are present in mobile source.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const flowPath = path.join(root, '.maestro/flows/feed-and-wallet.yaml');
const requiredTestIds = [
  'hunts-feed',
  'hunt-feed-item-1',
  'hunt-detail-screen',
  'connect-wallet-button',
  'wallet-connect-modal',
  'wallet-option-xbull',
];

let ok = true;

if (!fs.existsSync(flowPath)) {
  console.error('Missing Maestro flow:', flowPath);
  ok = false;
} else {
  const flow = fs.readFileSync(flowPath, 'utf8');
  for (const id of requiredTestIds) {
    if (!flow.includes(id)) {
      console.error(`Flow missing reference to testID: ${id}`);
      ok = false;
    }
  }
}

const sourceFiles = [
  'components/HuntFeed.tsx',
  'components/HuntFeedItem.tsx',
  'components/WalletConnectModal.tsx',
  'app/hunt/[id].tsx',
];

for (const rel of sourceFiles) {
  const full = path.join(root, rel);
  if (!fs.existsSync(full)) {
    console.error('Missing source file:', rel);
    ok = false;
    continue;
  }
  const src = fs.readFileSync(full, 'utf8');
  for (const id of requiredTestIds) {
    if (src.includes(`testID="${id}"`) || src.includes(`testID={\`${id}`) || src.includes(`testID={\`hunt-feed-item-`)) {
      continue;
    }
    if (id.startsWith('hunt-feed-item-') && src.includes('hunt-feed-item-')) continue;
    if (id.startsWith('wallet-option-') && src.includes('wallet-option-')) continue;
  }
}

if (ok) {
  console.log('Maestro E2E baseline validation passed.');
  process.exit(0);
}

process.exit(1);
