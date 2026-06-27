#!/usr/bin/env node
/**
 * find-bottlenecks.mjs — Find which top-level imports in (tabs)/index.tsx
 * pull in the most transitive modules.
 *
 * Uses static analysis: parses import statements and walks the dependency
 * graph to count unique modules.
 *
 * This is a static analyzer (no Metro running), so it's an estimate.
 * For exact numbers, the optimize-loop.mjs measures the real bundle.
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Step 1: Build a static import graph by parsing source files ──────

const importGraph = new Map(); // path -> Set of paths it imports
const tsConfigPaths = new Set([ROOT]);

function walk(dir, exts = /\.(tsx?|jsx?)$/) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts);
    else if (exts.test(entry.name)) parseImports(full);
  }
}

function parseImports(filePath) {
  let content;
  try { content = readFileSync(filePath, 'utf8'); } catch { return; }
  const deps = new Set();

  // Match: import ... from '...'
  // Match: import '...'
  // Match: require('...')
  // Match: export ... from '...'
  const importRegex = /(?:import\s+(?:[^'"]+\s+from\s+)?|export\s+(?:[^'"]+\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    deps.add(m[1]);
  }
  // Normalize path key to forward-slash form for cross-platform consistency
  importGraph.set(filePath.replace(/\\/g, '/'), deps);
}

// Walk the project
const projectDirs = ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'constants', 'config', 'lib', 'stores', 'types'];
for (const dir of projectDirs) {
  const full = join(ROOT, dir);
  if (existsSync(full)) walk(full);
}

// ── Step 2: Resolve @/ aliases (tsconfig path mapping) ──────────────

const aliasMap = new Map([
  ['@/', `${ROOT}/`],
]);

function resolveImport(fromFile, spec) {
  // Handle @/ alias
  if (spec.startsWith('@/')) {
    return spec.replace('@/', `${ROOT}/`).replace(/\\/g, '/');
  }
  // Relative import
  if (spec.startsWith('.')) {
    return resolve(dirname(fromFile), spec).replace(/\\/g, '/');
  }
  // node_modules — return null (we don't walk those)
  return null;
}

// ── Step 3: For each top-level import in (tabs)/index.tsx, ──────────
//    count unique transitive modules

function transitiveCount(startFile, visited = new Set()) {
  // Normalize the startFile key for cross-platform consistency
  const key = startFile.replace(/\\/g, '/');

  // Count UNIQUE transitive modules reachable from startFile.
  // Cycle protection via visited set.
  if (visited.has(key)) return 0;
  visited.add(key);

  const deps = importGraph.get(key);
  if (!deps) return 1;

  let count = 1; // count self
  for (const spec of deps) {
    const resolved = resolveImport(startFile, spec);
    if (resolved) {
      const normalizedResolved = resolved.replace(/\\/g, '/');
      const candidates = [
        normalizedResolved,
        normalizedResolved + '.ts',
        normalizedResolved + '.tsx',
        normalizedResolved + '.js',
        normalizedResolved + '.jsx',
        normalizedResolved + '/index.ts',
        normalizedResolved + '/index.tsx',
        normalizedResolved + '/index.js',
        normalizedResolved + '/index.jsx',
      ];
      let found = false;
      for (const c of candidates) {
        if (existsSync(c) && statSync(c).isFile()) {
          count += transitiveCount(c, visited);
          found = true;
          break;
        }
      }
      if (!found) { /* external dep — don't count */ }
    }
  }
  return count;
}

const entryFile = join(ROOT, 'app/(tabs)/index.tsx').replace(/\\/g, '/');
if (!existsSync(entryFile)) {
  console.error(`Entry file not found: ${entryFile}`);
  process.exit(1);
}

console.log(`Analyzing transitive imports from: app/(tabs)/index.tsx\n`);

const allDeps = importGraph.get(entryFile);
if (!allDeps) {
  console.error('No imports found in entry file');
  process.exit(1);
}

const results = [];
for (const spec of allDeps) {
  const resolved = resolveImport(entryFile, spec);
  if (!resolved) continue;

  const candidates = [
    resolved,
    resolved + '.ts',
    resolved + '.tsx',
    resolved + '.js',
    resolved + '.jsx',
    resolved + '/index.ts',
    resolved + '/index.tsx',
    resolved + '/index.js',
    resolved + '/index.jsx',
  ];

  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) {
      const count = transitiveCount(c);
      results.push({
        spec,
        resolved: c.substring(ROOT.length + 1).replace(/\\/g, '/'),
        count,
      });
      break;
    }
  }
}

results.sort((a, b) => b.count - a.count);

console.log('=== Top 30 transitive module importers ===\n');
console.log('  Count  Import');
console.log('  -----  ------');
for (const r of results.slice(0, 30)) {
  const countStr = String(r.count).padStart(5);
  const specStr = r.spec.length > 60 ? r.spec.substring(0, 57) + '...' : r.spec.padEnd(60);
  console.log(`  ${countStr}  ${specStr}`);
  console.log(`        → ${r.resolved}`);
}

console.log('\n=== Top 5 lazy-load candidates ===\n');
console.log('These imports have high transitive counts. Converting them to');
console.log('React.lazy(() => import(...)) would remove the most modules from');
console.log('the initial bundle.\n');

for (const r of results.slice(0, 5)) {
  console.log(`  ${r.spec}  (${r.count} modules)`);
  console.log(`    → ${r.resolved}`);
  // Find what it imports that's heavy
  const deps = importGraph.get(join(ROOT, r.resolved));
  if (deps) {
    const heavyDeps = [...deps].filter(d => d.startsWith('@/'));
    if (heavyDeps.length > 0) {
      console.log(`    Imports: ${heavyDeps.slice(0, 5).join(', ')}${heavyDeps.length > 5 ? '...' : ''}`);
    }
  }
  console.log('');
}
