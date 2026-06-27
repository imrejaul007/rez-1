#!/usr/bin/env node
/**
 * find-dead-code.mjs — Find source files with 0 importers across the project.
 *
 * For each .ts/.tsx file in app/, components/, contexts/, hooks/, services/,
 * utils/, stores/, lib/, types/, constants/, config/ — check if any other
 * project file imports from its path.
 *
 * Files with 0 importers are candidates for removal. Files imported by the
 * @/stores or @/components/common index files are considered "indirectly used"
 * and excluded.
 *
 * Usage: node scripts/find-dead-code.mjs
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';

const ROOT = process.cwd();
const projectDirs = ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'stores', 'lib', 'types', 'constants', 'config'];

// Build set of all source files
const allFiles = new Set();
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) allFiles.add(full.replace(/\\/g, '/'));
  }
}
for (const dir of projectDirs) walk(join(ROOT, dir));

// Build a set of all import strings used across the project, indexed by basename
const importsByBasename = new Map();
const allImportPaths = new Set();
for (const f of allFiles) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }
  const re = /(?:import\s+(?:[^'"]+\s+from\s+)?|export\s+(?:[^'"]+\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const spec = m[1];
    allImportPaths.add(spec);
    // Get the basename (last path segment, no extension)
    const base = spec.split('/').pop().replace(/\.(tsx?|jsx?)$/, '');
    if (base) {
      if (!importsByBasename.has(base)) importsByBasename.set(base, []);
      importsByBasename.get(base).push({ from: f, spec });
    }
  }
}

// For each file, find its importable paths and check if any of them is in allImports
function isImported(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  // Strip file extension (TypeScript can import without extension)
  const relNoExt = rel.replace(/\.(tsx?|jsx?)$/, '');
  const base = relNoExt.split('/').pop();

  // Strategy 1: exact path match
  const exactCandidates = new Set([
    '@/' + rel,
    '@/' + relNoExt,
    '@/./' + rel,
    './' + rel,
    rel,
    relNoExt,
  ]);
  for (const c of exactCandidates) {
    if (allImportPaths.has(c)) return true;
  }

  // Strategy 2: basename match — does any import string end with the basename?
  // This catches `from './BeautyWellnessSection'` from a sibling file
  if (importsByBasename.has(base)) {
    // Verify the matching import is plausibly for THIS file (not another
    // file with the same basename in a different directory).
    // The importer must be in a directory that can resolve to our path.
    const matches = importsByBasename.get(base);
    for (const { from, spec } of matches) {
      // Resolve the import relative to the importing file
      let resolvedPath;
      if (spec.startsWith('@/')) {
        resolvedPath = ROOT + '/' + spec.substring(2);
      } else if (spec.startsWith('.')) {
        resolvedPath = dirname(from) + '/' + spec;
      } else {
        continue;
      }
      // Normalize and check if it matches our file
      const resolvedNoExt = resolvedPath.replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '');
      const withExt = ['', '.ts', '.tsx', '.js', '.jsx'];
      for (const ext of withExt) {
        if (resolvedNoExt + ext === rel) return true;
      }
      // Also check if importing an index file from this file's directory
      // (e.g. components/lazy/index.ts)
      const ourDir = dirname(filePath).replace(/\\/g, '/');
      const theirDir = dirname(from).replace(/\\/g, '/');
      if (spec === './index' || spec === '.') {
        if (ourDir === theirDir + '/' + base) return true;
      }
    }
  }

  return false;
}

// Categorize
const dead = [];
const used = [];
const skipped = [];

for (const f of allFiles) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');

  // Skip entry points and expo-router files
  if (rel === 'app/_layout.tsx' || rel === 'app/+html.tsx' || rel.startsWith('app/(tabs)/_layout')) {
    skipped.push(rel);
    continue;
  }
  // Skip ALL app/ files (expo-router discovers them by file path, not by import)
  if (rel.startsWith('app/')) {
    skipped.push(rel);
    continue;
  }
  // Skip index files in known directories (re-exports)
  if (rel.endsWith('/index.ts') || rel.endsWith('/index.tsx')) {
    skipped.push(rel);
    continue;
  }
  if (isImported(f)) used.push(rel);
  else dead.push(rel);
}

// Print report
console.log(`\n=== Dead code analysis ===\n`);
console.log(`Total source files: ${allFiles.size}`);
console.log(`Imported (used):    ${used.length}`);
console.log(`Dead (no imports):  ${dead.length}`);
console.log(`Skipped (routes/index): ${skipped.length}\n`);

if (dead.length === 0) {
  console.log('No dead code found!');
} else {
  console.log('=== Files with 0 imports (candidates for removal) ===\n');
  // Group by directory
  const byDir = new Map();
  for (const d of dead) {
    const dir = dirname(d);
    if (!byDir.has(dir)) byDir.set(dir, []);
    byDir.get(dir).push(d);
  }
  for (const [dir, files] of [...byDir.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30)) {
    console.log(`  ${dir}/ (${files.length} files)`);
    for (const f of files.slice(0, 5)) {
      const size = statSync(join(ROOT, f)).size;
      console.log(`    ${(size/1024).toFixed(1).padStart(6)} KB  ${f}`);
    }
    if (files.length > 5) console.log(`    ... and ${files.length - 5} more`);
  }
  console.log('');

  // Also print total dead bytes
  let totalBytes = 0;
  for (const d of dead) {
    try { totalBytes += statSync(join(ROOT, d)).size; } catch {}
  }
  console.log(`Total dead code: ${(totalBytes/1024/1024).toFixed(2)} MB across ${dead.length} files`);
  console.log(`Removing these would reduce the source tree by ${(totalBytes/allFiles.size/statSync(join(ROOT, 'package.json')).size*100).toFixed(1)}% of project size`);
}
