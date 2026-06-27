#!/usr/bin/env node
/**
 * parse-bundle.mjs — Parse the minified production bundle to extract:
 *   1. Total module count
 *   2. Module dependency graph (id → [dep ids])
 *   3. Most-depended-on modules (in-degree)
 *   4. Largest modules (by source content size in bundle)
 *
 * Bundle format: __d(factoryBody, [dep1, dep2, ...], MODULE_ID)
 *
 * Usage: node scripts/parse-bundle.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const BUNDLE_PATH = join(ROOT, '.optimize-logs/bundle.js');

if (!existsSync(BUNDLE_PATH)) {
  console.error('Bundle not found at .optimize-logs/bundle.js');
  process.exit(1);
}

const bundle = readFileSync(BUNDLE_PATH, 'utf8');
console.log(`Bundle: ${(bundle.length / 1024 / 1024).toFixed(2)} MB\n`);

// Parse __d(factory, deps, id) calls.
// In minified bundles, these look like: },ID,[...]); at the end of each module
// Strategy: find each `__d(` and walk to find the matching `)`.

// Simpler: match the pattern `},NUM,[...]);` which is unique
const moduleEndRegex = /\}\s*,\s*(\d+)\s*,\s*\[([^\]]*)\]\s*\)\s*;?/g;
const modules = new Map(); // id -> [deps]
const moduleSizes = new Map(); // id -> bytes between this module's start and next

let match;
let lastEnd = 0;
let lastMatch = null;
while ((match = moduleEndRegex.exec(bundle)) !== null) {
  const id = parseInt(match[1], 10);
  const deps = match[2].split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  modules.set(id, deps);

  if (lastMatch !== null) {
    // Estimate size of previous module
    const size = match.index - lastMatch.index;
    moduleSizes.set(lastMatch.id, size);
  }
  lastMatch = { id, index: match.index };
}

console.log(`Modules parsed: ${modules.size}`);

// Compute in-degree (number of modules that depend on each)
const inDegree = new Map();
for (const [id, deps] of modules) {
  for (const dep of deps) {
    inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
  }
}

const topDepended = [...inDegree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log(`\n=== Top 30 most-depended-on modules ===\n`);
console.log('  In-degree  Module ID');
for (const [id, deg] of topDepended) {
  console.log(`  ${String(deg).padStart(6)}     ${id}`);
}

// Largest modules by size
const topSizes = [...moduleSizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
console.log(`\n=== Top 20 largest modules by bundle size ===\n`);
for (const [id, size] of topSizes) {
  const deps = modules.get(id) || [];
  console.log(`  ${(size/1024).toFixed(1).padStart(7)} KB  module ${id}  (${deps.length} deps)`);
}

// Modules with no dependencies (leaves)
const leaves = [...modules.entries()].filter(([id, deps]) => deps.length === 0);
console.log(`\n=== Modules with no dependencies: ${leaves.length} ===`);

// Total dependency edges
let totalEdges = 0;
for (const deps of modules.values()) totalEdges += deps.length;
console.log(`Total dependency edges: ${totalEdges}`);
console.log(`Average dependencies per module: ${(totalEdges / modules.size).toFixed(1)}`);

// Distribution of module sizes
const sizes = [...moduleSizes.values()].sort((a, b) => a - b);
if (sizes.length > 0) {
  console.log(`\n=== Module size distribution ===`);
  console.log(`  Median: ${(sizes[Math.floor(sizes.length/2)]/1024).toFixed(1)} KB`);
  console.log(`  P75:    ${(sizes[Math.floor(sizes.length*0.75)]/1024).toFixed(1)} KB`);
  console.log(`  P90:    ${(sizes[Math.floor(sizes.length*0.90)]/1024).toFixed(1)} KB`);
  console.log(`  P99:    ${(sizes[Math.floor(sizes.length*0.99)]/1024).toFixed(1)} KB`);
  console.log(`  Max:    ${(sizes[sizes.length-1]/1024).toFixed(1)} KB`);
}