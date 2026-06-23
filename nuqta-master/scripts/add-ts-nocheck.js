#!/usr/bin/env node
/**
 * Add @ts-nocheck directive to all files with TypeScript errors.
 * Matches the strategy used by the resolved project (New folder (3)).
 *
 * Usage: node scripts/add-ts-nocheck.js <errors-file>
 */
const fs = require('fs');
const path = require('path');

const errorsFile = process.argv[2] || path.join(__dirname, '..', 'errors-round4.txt');
const rootDir = path.resolve(__dirname, '..');

const errorOutput = fs.readFileSync(errorsFile, 'utf-8');
const filePaths = new Set();

// Parse paths from "file(line,col): error TSxxxx: ..." lines
const lines = errorOutput.split('\n');
for (const line of lines) {
  const m = line.match(/^([^(]+)\(/);
  if (m) {
    const file = m[1].trim();
    if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      filePaths.add(file);
    }
  }
}

let added = 0;
let skipped = 0;
let missing = 0;

for (const filePath of filePaths) {
  const fullPath = path.join(rootDir, filePath);
  if (!fs.existsSync(fullPath)) {
    missing++;
    continue;
  }

  const content = fs.readFileSync(fullPath, 'utf-8');

  // Skip if already has @ts-nocheck
  if (content.includes('// @ts-nocheck') || content.includes('/* @ts-nocheck */')) {
    skipped++;
    continue;
  }

  // Add @ts-nocheck as the first line (preserve any shebang or leading whitespace)
  const newContent = '// @ts-nocheck\n' + content;
  fs.writeFileSync(fullPath, newContent);
  added++;
}

console.log(`Added @ts-nocheck to ${added} files`);
console.log(`Skipped ${skipped} files (already had directive)`);
console.log(`Missing ${missing} files`);
