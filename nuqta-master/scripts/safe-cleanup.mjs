#!/usr/bin/env node
/**
 * safe-cleanup.mjs — SAFER version of cleanup-dead-code.mjs.
 *
 * Only flags files as dead if:
 *   1. They are NOT type-only files (types/*.ts)
 *   2. They are NOT in `app/` (which is auto-discovered by expo-router)
 *   3. Their main export is NOT referenced by name in the bundle
 *   4. They are NOT imported as side-effect imports anywhere
 *
 * Also skips "Example" files that may be intentionally dead.
 *
 * Usage:
 *   node scripts/safe-cleanup.mjs --dry-run
 *   node scripts/safe-cleanup.mjs
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
const bundleNoExt = bundle.replace(/\\./g, '');

// Side-effect imports — files imported just for module-load effects
const sideEffectImports = new Set();
for (const dir of ['app', 'components', 'contexts', 'hooks', 'services', 'utils']) {
  function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(tsx?|jsx?)$/.test(e.name)) {
        const content = readFileSync(full, 'utf8');
        // Match: import './path' or import "./path"
        const m = content.matchAll(/import\s+['"]([^'"]+)['"];?/g);
        for (const mm of m) sideEffectImports.add(mm[1]);
      }
    }
  }
  walk(join(ROOT, dir));
}

const projectDirs = ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'stores', 'lib', 'types', 'constants', 'config'];
const allFiles = [];
function walk2(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk2(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) allFiles.push(full);
  }
}
for (const d of projectDirs) {
  const full = join(ROOT, d);
  if (existsSync(full)) walk2(full);
}

// Build a map of: every import path used across the project (full path strings)
const allImportSpecs = new Set();
for (const dir of ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'stores']) {
  function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(tsx?|jsx?)$/.test(e.name)) {
        const content = readFileSync(full, 'utf8');
        const specs = content.matchAll(/from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]/g);
        for (const s of specs) {
          if (s[1]) allImportSpecs.add(s[1]);
          if (s[2]) allImportSpecs.add(s[2]);
        }
      }
    }
  }
  walk(join(ROOT, dir));
}

const deadFiles = [];
const skipped = { type: 0, route: 0, sideEffect: 0, hasIdentifier: 0, example: 0, basenameReference: 0, platform: 0, importPath: 0 };

function isImportedAnywhere(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  const relNoExt = rel.replace(/\.(tsx?|jsx?)$/, '');
  const fileBase = rel.split('/').pop().replace(/\.(tsx?|jsx?)$/, '');

  for (const spec of allImportSpecs) {
    if (spec === '@/' + rel || spec === '@/./' + rel) return true;
    if (spec === '@/' + relNoExt || spec === '@/./' + relNoExt) return true;
    if (spec === './' + rel || spec === './' + relNoExt) return true;
    if (spec.endsWith('/' + fileBase)) return true;
    if (spec.endsWith('/' + fileBase + '.ts') || spec.endsWith('/' + fileBase + '.tsx')) return true;

    const platformMatch = fileBase.match(/^(.+)\.(ios|android|web|native)$/);
    if (platformMatch) {
      const base = platformMatch[1];
      if (spec.endsWith('/' + base) || spec === './' + base) return true;
    }
  }
  return false;
}

// ALSO check: is the file's code in the production bundle?
// A file is "definitely dead" if:
//   1. Not in the bundle (no exported symbol appears)
//   2. Not imported by basename anywhere
//   3. Not a platform-specific file (those may be referenced but not bundled for web)

function isCodeInBundle(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const identifiers = [];
  let m;
  if ((m = content.match(/export\s+default\s+(?:function\s+)?(\w+)/))) identifiers.push(m[1]);
  if ((m = content.match(/export\s+const\s+(\w+)/))) identifiers.push(m[1]);
  if ((m = content.match(/export\s+function\s+(\w+)/))) identifiers.push(m[1]);
  if ((m = content.match(/export\s+class\s+(\w+)/))) identifiers.push(m[1]);
  const funcDecls = [...content.matchAll(/(?:^|\n)\s*(?:export\s+)?function\s+(\w+)/g)].map(x => x[1]);
  identifiers.push(...funcDecls);
  identifiers.sort((a, b) => b.length - a.length);
  for (const id of identifiers.slice(0, 5)) {
    if (id.length < 4) continue;
    if (bundle.includes(id)) return true;
  }
  return false;
}

for (const f of allFiles) {
  const content = readFileSync(f, 'utf8');
  const rel = relative(ROOT, f).replace(/\\/g, '/');
  const baseNoExt = rel.replace(/\.(tsx?|jsx?)$/, '');

  if (rel.startsWith('types/')) { skipped.type++; continue; }
  if (rel.startsWith('app/')) { skipped.route++; continue; }
  if (rel.endsWith('/index.ts') || rel.endsWith('/index.tsx')) continue;
  if (/Example|example\.tsx?$/.test(baseNoExt)) { skipped.example++; continue; }

  // Skip platform-specific files (they may not be in web bundle but still be used)
  if (/\.(ios|android|native)\.tsx?$/.test(rel)) {
    if (isImportedAnywhere(f)) { skipped.platform++; continue; }
    // .web files ARE in the bundle if used, so check both
  }

  if (isImportedAnywhere(f)) { skipped.importPath++; continue; }

  // Final check: is the code actually in the bundle?
  if (isCodeInBundle(f)) { skipped.hasIdentifier++; continue; }

  deadFiles.push({ rel, fullPath: f, size: statSync(f).size });
}

const totalBytes = deadFiles.reduce((a, f) => a + f.size, 0);

console.log(`\n=== Safe cleanup analysis ===\n`);
console.log(`Total source files: ${allFiles.length}`);
console.log(`Truly dead files:    ${deadFiles.length} (${(totalBytes/1024/1024).toFixed(2)} MB)`);
console.log(`Skipped:`);
console.log(`  Type files:          ${skipped.type}`);
console.log(`  Routes (app/):       ${skipped.route}`);
console.log(`  Side-effect imports: ${skipped.sideEffect}`);
console.log(`  Identifier in bundle: ${skipped.hasIdentifier}`);
console.log(`  Example files:       ${skipped.example}`);
console.log('');

if (deadFiles.length === 0) {
  console.log('No truly dead code found.');
  process.exit(0);
}

// Group by directory
const byDir = new Map();
for (const d of deadFiles) {
  const dir = d.rel.includes('/') ? d.rel.substring(0, d.rel.lastIndexOf('/')) : '.';
  if (!byDir.has(dir)) byDir.set(dir, []);
  byDir.get(dir).push(d);
}

console.log('=== Files safe to remove ===\n');
for (const [dir, files] of [...byDir.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30)) {
  const totalSize = files.reduce((a, f) => a + f.size, 0);
  console.log(`  ${dir}/ (${files.length} files, ${(totalSize/1024).toFixed(1)} KB)`);
  for (const f of files.slice(0, 3)) {
    console.log(`    ${(f.size/1024).toFixed(1).padStart(6)} KB  ${f.rel}`);
  }
  if (files.length > 3) console.log(`    ... and ${files.length - 3} more`);
}

if (dryRun) {
  console.log(`\nDRY RUN — would move ${deadFiles.length} files to .trash/`);
  process.exit(0);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const trashSubdir = join(TRASH_DIR, timestamp);
mkdirSync(trashSubdir, { recursive: true });

let moved = 0;
let failed = 0;
for (const f of deadFiles) {
  const dest = join(trashSubdir, f.rel);
  try {
    mkdirSync(dirname(dest), { recursive: true });
    renameSync(f.fullPath, dest);
    moved++;
  } catch (e) {
    failed++;
    console.error(`  Failed: ${f.rel} — ${e.message}`);
  }
}

console.log(`\n✓ Moved ${moved} files to ${trashSubdir.replace(ROOT + '/', '')}`);
if (failed > 0) console.log(`✗ Failed to move ${failed} files`);
console.log(`\nTo restore: mv ${trashSubdir.replace(ROOT + '/', '')}/* <original locations>`);
console.log(`To permanently delete: rm -rf ${trashSubdir.replace(ROOT + '/', '')}`);