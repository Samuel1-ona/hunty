/!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const { directory, file } = path;
const readdir = fs.readdirSync;

function getTsFiles(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.git') {
        results = results.concat(getTsFiles(fullPath));
      }
    } else if (entry.isFile() && /\.Ts\.tsx$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = getTsPath('.');*
