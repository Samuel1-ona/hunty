#!/usr/bin/env node
/**
 * Validates that all required store assets and metadata are present before
 * running `eas submit`. Exits 0 on success, 1 on any failure.
 *
 * Usage:
 *   node scripts/validate-store-metadata.js
 *   pnpm store:validate
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
let ok = true;

function fail(msg) {
  console.error(`  FAIL  ${msg}`);
  ok = false;
}

function pass(msg) {
  console.log(`  ok    ${msg}`);
}

// ---------------------------------------------------------------------------
// 1. Required JSON files (parseable)
// ---------------------------------------------------------------------------
console.log('\n[1] Required JSON files');

const jsonFiles = ['eas.json', 'store.config.json', 'app.json'];
for (const file of jsonFiles) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) {
    fail(`${file} is missing`);
    continue;
  }
  try {
    JSON.parse(fs.readFileSync(full, 'utf8'));
    pass(file);
  } catch (err) {
    fail(`${file} — invalid JSON: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// 2. store.config.json metadata completeness
// ---------------------------------------------------------------------------
console.log('\n[2] store.config.json metadata');

let storeConfig;
try {
  storeConfig = JSON.parse(fs.readFileSync(path.join(root, 'store.config.json'), 'utf8'));
} catch (_) {
  storeConfig = null;
}

if (storeConfig) {
  const appleInfo = storeConfig.apple?.info?.['en-US'];
  const androidInfo = storeConfig.android?.info?.['en-US'];

  const appleFields = ['title', 'subtitle', 'description', 'keywords', 'privacyPolicyUrl', 'supportUrl', 'marketingUrl'];
  for (const field of appleFields) {
    if (appleInfo?.[field]) pass(`apple.info.en-US.${field}`);
    else fail(`apple.info.en-US.${field} is missing or empty`);
  }

  const androidFields = ['title', 'shortDescription', 'fullDescription'];
  for (const field of androidFields) {
    if (androidInfo?.[field]) pass(`android.info.en-US.${field}`);
    else fail(`android.info.en-US.${field} is missing or empty`);
  }
}

// ---------------------------------------------------------------------------
// 3. App icon source files
// ---------------------------------------------------------------------------
console.log('\n[3] App icon source files');

const icons = [
  ['assets/icon.png', '1024×1024 app icon (source for EAS)'],
  ['assets/adaptive-icon.png', 'Android adaptive icon foreground'],
  ['assets/splash-icon.png', 'Splash screen image'],
];

for (const [rel, label] of icons) {
  const full = path.join(root, rel);
  if (fs.existsSync(full)) pass(`${rel}  — ${label}`);
  else fail(`${rel} is missing  (${label})`);
}

// ---------------------------------------------------------------------------
// 4. Screenshots
// ---------------------------------------------------------------------------
console.log('\n[4] Screenshots');

const SCREENS = [
  '01-hunts-feed',
  '02-hunt-detail',
  '03-wallet-connect',
  '04-profile',
  '05-map-play',
];

const screenshotDirs = [
  { dir: 'store/ios/iphone-67', label: 'iPhone 6.7"' },
  { dir: 'store/ios/iphone-65', label: 'iPhone 6.5"' },
  { dir: 'store/ios/ipad-129',  label: 'iPad Pro 12.9"' },
  { dir: 'store/android/phone', label: 'Android Phone' },
];

let screenshotsMissing = 0;
for (const { dir, label } of screenshotDirs) {
  const fullDir = path.join(root, dir);
  const pngs = SCREENS.map(s => path.join(fullDir, `${s}.png`));
  const present = pngs.filter(p => fs.existsSync(p));
  if (present.length === SCREENS.length) {
    pass(`${dir}/  (${label}) — ${present.length} screenshots`);
  } else {
    const missing = pngs.filter(p => !fs.existsSync(p)).map(p => path.basename(p));
    fail(`${dir}/  (${label}) — missing: ${missing.join(', ')}`);
    screenshotsMissing++;
  }
}

if (screenshotsMissing > 0) {
  console.log('  hint  Run `pnpm store:generate` to create placeholder PNGs, then replace with real screenshots.');
}

// ---------------------------------------------------------------------------
// 5. Play Store feature graphic
// ---------------------------------------------------------------------------
console.log('\n[5] Play Store feature graphic');

const featureGraphic = path.join(root, 'store/android/feature-graphic.png');
if (fs.existsSync(featureGraphic)) pass('store/android/feature-graphic.png  (1024×500)');
else {
  fail('store/android/feature-graphic.png is missing');
  console.log('  hint  Run `pnpm store:generate` to create a placeholder, then replace with branded art.');
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------
console.log('');
if (ok) {
  console.log('Store assets validation passed.\n');
  process.exit(0);
} else {
  console.log('Store assets validation FAILED. Fix the errors above before submitting.\n');
  process.exit(1);
}
