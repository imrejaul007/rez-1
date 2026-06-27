#!/usr/bin/env node
/**
 * bundle-vs-source.mjs — Find project source files whose code does NOT
 * appear in the production bundle.
 *
 * Strategy: For each .tsx/.ts file, extract a unique string from it (a
 * distinctive variable or function name) and check if that string appears
 * in the bundle.
 *
 * This is heuristic but reliable for "totally unused" files.
 *
 * Usage: node scripts/bundle-vs-source.mjs
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const BUNDLE_PATH = join(ROOT, '.optimize-logs/bundle.js');

if (!existsSync(BUNDLE_PATH)) {
  console.error('Bundle not found at .optimize-logs/bundle.js');
  console.error('Run `node scripts/optimize-loop.mjs --stage=baseline` first.');
  process.exit(1);
}

const bundle = readFileSync(BUNDLE_PATH, 'utf8');
console.log(`Bundle size: ${(bundle.length / 1024 / 1024).toFixed(2)} MB`);

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

console.log(`Source files: ${allFiles.length}\n`);

// For each file, extract identifiers and check
let deadFiles = [];
let usedFiles = [];

for (const f of allFiles) {
  const content = readFileSync(f, 'utf8');
  const rel = relative(ROOT, f).replace(/\\/g, '/');

  // Extract identifiers: function/component names, export names, distinct strings
  const identifiers = [];

  // export default Foo
  let m = content.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  if (m) identifiers.push(m[1]);
  // export const Foo
  m = content.match(/export\s+const\s+(\w+)/);
  if (m) identifiers.push(m[1]);
  // export function Foo
  m = content.match(/export\s+function\s+(\w+)/);
  if (m) identifiers.push(m[1]);
  // export class Foo
  m = content.match(/export\s+class\s+(\w+)/);
  if (m) identifiers.push(m[1]);

  // For non-default exports, also try { Foo }
  const namedExports = [...content.matchAll(/export\s+(?:const|function|class)\s+(\w+)/g)].map(x => x[1]);

  // For function declarations not exported
  const funcDecls = [...content.matchAll(/(?:^|\n)\s*(?:export\s+)?function\s+(\w+)/g)].map(x => x[1]);
  identifiers.push(...funcDecls);

  // Heuristic: pick the longest, most distinctive identifier
  identifiers.sort((a, b) => b.length - a.length);

  // Check if any of the top 3 identifiers appear in the bundle
  let found = false;
  const checkedIds = identifiers.slice(0, 5);
  for (const id of checkedIds) {
    if (id.length < 4) continue; // too short, false positive risk
    if (bundle.includes(id)) {
      found = true;
      break;
    }
  }

  if (found) usedFiles.push({ rel, ids: checkedIds });
  else deadFiles.push({ rel, ids: checkedIds, size: statSync(f).size });
}

console.log(`Files with code in bundle: ${usedFiles.length}`);
console.log(`Files NOT in bundle:       ${deadFiles.length}`);
console.log('');

if (deadFiles.length === 0) {
  console.log('No dead code found!');
} else {
  // Group by directory
  const byDir = new Map();
  for (const d of deadFiles) {
    const dir = d.rel.includes('/') ? d.rel.substring(0, d.rel.lastIndexOf('/')) : '.';
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(d);
  }

  console.log('=== Files whose code is NOT in the production bundle ===\n');
  for (const [dir, files] of [...byDir.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 40)) {
    const totalSize = files.reduce((a, f) => a + f.size, 0);
    console.log(`  ${dir}/ (${files.length} files, ${(totalSize/1024).toFixed(1)} KB)`);
    for (const f of files.slice(0, 3)) {
      const ids = f.ids.filter(Boolean).slice(0, 2).join(', ') || '(no identifiers)';
      console.log(`    ${(f.size/1024).toFixed(1).padStart(6)} KB  ${f.rel}`);
      console.log(`             tried identifiers: ${ids}`);
    }
    if (files.length > 3) console.log(`    ... and ${files.length - 3} more`);
  }

  const totalDead = deadFiles.reduce((a, f) => a + f.size, 0);
  console.log(`\nTotal dead code: ${(totalDead/1024/1024).toFixed(2)} MB across ${deadFiles.length} files`);
  console.log('NOTE: This includes expo-router files (in app/) and barrel re-exports.');
  console.log('      Run again after excluding app/ for a more accurate count.');
}