#!/usr/bin/env node
/**
 * Generates placeholder store assets (screenshots and feature graphic) at the
 * correct pixel dimensions. Run once to scaffold the directory, then replace
 * each file with real captures from the running app.
 *
 * Usage:
 *   node scripts/generate-store-assets.js [--force]
 *
 * --force  Overwrite existing files (default: skip existing).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const FORCE = process.argv.includes('--force');
const root = path.join(__dirname, '..');

// ---------------------------------------------------------------------------
// Minimal PNG writer (no external deps)
// ---------------------------------------------------------------------------

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c;
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(d.length);
  const crcInput = Buffer.concat([t, d]);
  const c = Buffer.allocUnsafe(4);
  c.writeUInt32BE(crc32(crcInput));
  return Buffer.concat([len, t, d, c]);
}

/**
 * Creates a solid-color PNG placeholder.
 * @param {number} width
 * @param {number} height
 * @param {[number,number,number]} rgb  Background colour (default: Hunty dark #1f2937)
 */
function makePng(width, height, [r, g, b] = [0x1f, 0x29, 0x37]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour RGB
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  // Build one row and repeat it — solid colour compresses to near-zero bytes.
  const row = Buffer.allocUnsafe(1 + width * 3);
  row[0] = 0; // filter type: None
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = r;
    row[2 + x * 3] = g;
    row[3 + x * 3] = b;
  }
  const scanlines = Buffer.concat(Array.from({ length: height }, () => row));

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(scanlines, { level: 1 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(filePath, buf) {
  if (fs.existsSync(filePath) && !FORCE) {
    console.log(`  skip  ${path.relative(root, filePath)}  (exists — use --force to overwrite)`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buf);
  console.log(`  wrote ${path.relative(root, filePath)}`);
}

// ---------------------------------------------------------------------------
// Asset manifest
// ---------------------------------------------------------------------------

const SCREENSHOTS = [
  // iOS — App Store Connect required sizes
  { dir: 'store/ios/iphone-67', w: 1290, h: 2796, label: 'iPhone 6.7"' },
  { dir: 'store/ios/iphone-65', w: 1284, h: 2778, label: 'iPhone 6.5"' },
  { dir: 'store/ios/ipad-129',  w: 2048, h: 2732, label: 'iPad Pro 12.9"' },

  // Android — Google Play minimum 1080×1920 for phone
  { dir: 'store/android/phone', w: 1080, h: 1920, label: 'Android Phone' },
];

const SCREENS = [
  '01-hunts-feed',
  '02-hunt-detail',
  '03-wallet-connect',
  '04-profile',
  '05-map-play',
];

// App Store Connect preview video is a separate capture; log a reminder only.
const VIDEO_REMINDER = `
App Store Preview Video (required for 6.7" slot):
  • Format : H.264, up to 500 MB
  • Duration: 15–30 seconds
  • Resolution: 886×1920 (portrait) or 1920×886 (landscape)
  Record from a device or simulator and upload via App Store Connect.
  Path to reference: store/ios/iphone-67/preview.mp4 (not committed — upload directly)
`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

console.log('\nGenerating placeholder store assets…\n');

for (const { dir, w, h, label } of SCREENSHOTS) {
  console.log(`${label} (${w}×${h}):`);
  for (const name of SCREENS) {
    write(path.join(root, dir, `${name}.png`), makePng(w, h));
  }
}

// Play Store feature graphic (required, 1024×500)
console.log('\nPlay Store feature graphic (1024×500):');
write(path.join(root, 'store/android/feature-graphic.png'), makePng(1024, 500, [0x37, 0x37, 0xa4]));

console.log(VIDEO_REMINDER);
console.log('Done. Replace placeholder PNGs with real screenshots before submitting.\n');
