#!/usr/bin/env node
/**
 * Static validation for Maestro E2E flows — ensures flow files exist, are
 * registered in .maestro/config.yaml, and reference testIDs that are present
 * in mobile source.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const maestroDir = path.join(root, '.maestro');

let ok = true;
const fail = (...args) => {
  console.error(...args);
  ok = false;
};

// ─── Baseline feed & wallet flow ────────────────────────────────────────────

const flowPath = path.join(maestroDir, 'flows/feed-and-wallet.yaml');
const requiredTestIds = [
  'hunts-feed',
  'hunt-feed-item-1',
  'hunt-detail-screen',
  'connect-wallet-button',
  'wallet-connect-modal',
  'wallet-option-xbull',
];

if (!fs.existsSync(flowPath)) {
  fail('Missing Maestro flow:', flowPath);
} else {
  const flow = fs.readFileSync(flowPath, 'utf8');
  for (const id of requiredTestIds) {
    if (!flow.includes(id)) {
      fail(`Flow missing reference to testID: ${id}`);
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
  if (!fs.existsSync(path.join(root, rel))) {
    fail('Missing source file:', rel);
  }
}

// ─── Flows whose testIDs are checked against source ─────────────────────────

const sourceCheckedFlows = ['flows/scan-qr-clue.yaml'];

function listSourceFiles(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(full));
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

/** testIDs declared in source: exact ids plus prefixes of template-literal ids. */
function collectSourceTestIds() {
  const exact = new Set();
  const prefixes = new Set();
  const files = ['app', 'components'].flatMap((dir) => listSourceFiles(path.join(root, dir)));
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const match of src.matchAll(/testID=(?:"([^"]+)"|\{'([^']+)'\}|\{"([^"]+)"\})/g)) {
      exact.add(match[1] ?? match[2] ?? match[3]);
    }
    for (const match of src.matchAll(/testID=\{`([^`$]*)\$\{/g)) {
      prefixes.add(match[1]);
    }
  }
  return { exact, prefixes };
}

const configPath = path.join(maestroDir, 'config.yaml');
const config = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
const sourceIds = collectSourceTestIds();

for (const rel of sourceCheckedFlows) {
  const full = path.join(maestroDir, rel);
  if (!fs.existsSync(full)) {
    fail('Missing Maestro flow:', full);
    continue;
  }
  if (!config.includes(rel)) {
    fail(`Flow not registered in .maestro/config.yaml: ${rel}`);
  }

  const flow = fs.readFileSync(full, 'utf8');
  const ids = [...flow.matchAll(/^\s*id:\s*['"]?([\w-]+)['"]?\s*$/gm)].map((m) => m[1]);
  if (ids.length === 0) {
    fail(`Flow references no testIDs: ${rel}`);
  }
  for (const id of new Set(ids)) {
    const declared =
      sourceIds.exact.has(id) || [...sourceIds.prefixes].some((prefix) => id.startsWith(prefix));
    if (!declared) {
      fail(`${rel}: testID "${id}" is not declared in app/ or components/`);
    }
  }
}

if (ok) {
  console.log('Maestro E2E baseline validation passed.');
  process.exit(0);
}

process.exit(1);
