#!/usr/bin/env node
/**
 * bundle-modules.mjs — Extract the list of modules included in the production
 * bundle by parsing the source map.
 *
 * The minified bundle has __d(factory, deps, moduleId) calls. Each moduleId
 * corresponds to a source file. We can recover the source paths from the
 * bundle by looking at the require() calls inside each factory.
 *
 * For a more reliable approach, we use the dev bundle which has readable
 * source paths in its sourceMappingURL + comments.
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const BUNDLE_PATH = join(ROOT, '.optimize-logs/bundle.js');

if (!existsSync(BUNDLE_PATH)) {
  console.error('Bundle not found. Run scripts/optimize-loop.mjs first.');
  process.exit(1);
}

const bundle = readFileSync(BUNDLE_PATH, 'utf8');
console.log(`Bundle: ${(bundle.length / 1024 / 1024).toFixed(2)} MB\n`);

// Find all __d calls and extract their module IDs
// Pattern: __d(function... , [...deps], MODULE_ID)
// In a minified bundle, the format is consistent.
const moduleIdRegex = /\]\s*,\s*(\d+)\)/g;
const moduleIds = new Set();
let match;
while ((match = moduleIdRegex.exec(bundle)) !== null) {
  moduleIds.add(parseInt(match[1], 10));
}
console.log(`Unique module IDs in bundle: ${moduleIds.size}`);

// Find require() calls and their numeric arguments
// __r(N) or require(N) where N is a module ID
const requireRegex = /(?:__r|require)\s*\(\s*(\d+)\s*\)/g;
const referencedIds = new Set();
while ((match = requireRegex.exec(bundle)) !== null) {
  referencedIds.add(parseInt(match[1], 10));
}
console.log(`Referenced module IDs: ${referencedIds.size}`);

// Find any string literals that look like file paths in the bundle
// The minified bundle typically has require() with the actual file path baked in
// for external modules (node_modules)
const pathRegex = /["']([a-zA-Z0-9_@/\-\.\+]+\.(?:js|ts|tsx|jsx|json))["']/g;
const paths = new Set();
while ((match = pathRegex.exec(bundle)) !== null) {
  paths.add(match[1]);
}

const projectPaths = [...paths].filter(p => p.includes('rez-backend') || p.includes('nuqta'));
const nmPaths = [...paths].filter(p => p.includes('node_modules'));
const otherPaths = [...paths].filter(p => !p.includes('rez-backend') && !p.includes('nuqta') && !p.includes('node_modules'));

console.log(`\n=== Paths found in bundle ===`);
console.log(`Project paths: ${projectPaths.length}`);
console.log(`node_modules: ${nmPaths.length}`);
console.log(`Other: ${otherPaths.length}`);

console.log(`\n=== Top 30 node_modules packages by reference count ===`);
const nmCounts = new Map();
for (const p of nmPaths) {
  const m = p.match(/node_modules\/((?:@[^/]+\/[^/]+)|(?:[^/]+))/);
  const pkg = m ? m[1] : 'unknown';
  nmCounts.set(pkg, (nmCounts.get(pkg) || 0) + 1);
}
const top = [...nmCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
for (const [pkg, count] of top) {
  console.log(`  ${String(count).padStart(4)}  ${pkg}`);
}
