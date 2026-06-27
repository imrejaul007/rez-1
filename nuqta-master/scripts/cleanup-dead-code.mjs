#!/usr/bin/env node
/**
 * cleanup-dead-code.mjs — Remove files whose code is not in the production bundle.
 *
 * Strategy:
 *   1. Run scripts/bundle-vs-source.mjs to find dead files
 *   2. Move them to .trash/<timestamp>/ instead of deleting (recoverable)
 *   3. Print what was moved
 *
 * Usage:
 *   node scripts/cleanup-dead-code.mjs --dry-run    # list without moving
 *   node scripts/cleanup-dead-code.mjs              # move to .trash
 *
 * To restore: mv .trash/<timestamp>/* back to original locations
 */

import { readFileSync, existsSync, readdirSync, statSync, mkdirSync, renameSync } from 'fs';
import { join, relative, dirname } from 'path';

const ROOT = process.cwd();
const BUNDLE_PATH = join(ROOT, '.optimize-logs/bundle.js');
const TRASH_DIR = join(ROOT, '.trash');

const dryRun = process.argv.includes('--dry-run');

if (!existsSync(BUNDLE_PATH)) {
  console.error('Bundle not found at .optimize-logs/bundle.js');
  console.error('Run `node scripts/optimize-loop.mjs --stage=baseline` first.');
  process.exit(1);
}

const bundle = readFileSync(BUNDLE_PATH, 'utf8');

const projectDirs = ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'stores', 'lib', 'types', 'constants', 'config'];
const allFiles = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) allFiles.push(full);
  }
}
for (const d of projectDirs) {
  const full = join(ROOT, d);
  if (existsSync(full)) walk(full);
}

// Same logic as bundle-vs-source.mjs
const deadFiles = [];

for (const f of allFiles) {
  const content = readFileSync(f, 'utf8');
  const rel = relative(ROOT, f).replace(/\\/g, '/');

  const identifiers = [];
  let m;
  if ((m = content.match(/export\s+default\s+(?:function\s+)?(\w+)/))) identifiers.push(m[1]);
  if ((m = content.match(/export\s+const\s+(\w+)/))) identifiers.push(m[1]);
  if ((m = content.match(/export\s+function\s+(\w+)/))) identifiers.push(m[1]);
  if ((m = content.match(/export\s+class\s+(\w+)/))) identifiers.push(m[1]);
  const funcDecls = [...content.matchAll(/(?:^|\n)\s*(?:export\s+)?function\s+(\w+)/g)].map(x => x[1]);
  identifiers.push(...funcDecls);
  identifiers.sort((a, b) => b.length - a.length);

  let found = false;
  for (const id of identifiers.slice(0, 5)) {
    if (id.length < 4) continue;
    if (bundle.includes(id)) { found = true; break; }
  }

  if (!found) {
    deadFiles.push({ rel, fullPath: f, size: statSync(f).size });
  }
}

if (deadFiles.length === 0) {
  console.log('No dead code found.');
  process.exit(0);
}

const totalBytes = deadFiles.reduce((a, f) => a + f.size, 0);
console.log(`\n=== ${deadFiles.length} dead files (${(totalBytes/1024/1024).toFixed(2)} MB) ===\n`);

if (dryRun) {
  console.log('DRY RUN — would move to .trash/ :\n');
  for (const f of deadFiles) {
    console.log(`  ${(f.size/1024).toFixed(1).padStart(7)} KB  ${f.rel}`);
  }
  console.log(`\nTotal: ${(totalBytes/1024/1024).toFixed(2)} MB across ${deadFiles.length} files`);
  process.exit(0);
}

// Move to .trash with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const trashSubdir = join(TRASH_DIR, timestamp);
mkdirSync(trashSubdir, { recursive: true });

let moved = 0;
let failed = 0;
for (const f of deadFiles) {
  const dest = join(trashSubdir, f.rel);
  mkdirSync(dirname(dest), { recursive: true });
  try {
    renameSync(f.fullPath, dest);
    moved++;
  } catch (e) {
    failed++;
    console.error(`  Failed: ${f.rel} — ${e.message}`);
  }
}

console.log(`✓ Moved ${moved} files to ${trashSubdir.replace(ROOT, '.')}`);
if (failed > 0) console.log(`✗ Failed to move ${failed} files`);
console.log(`\nTo restore: mv ${trashSubdir.replace(ROOT, '.')}/* .`);
console.log(`To delete permanently: rm -rf ${trashSubdir.replace(ROOT, '.')}`);
