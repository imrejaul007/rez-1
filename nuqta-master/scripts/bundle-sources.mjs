#!/usr/bin/env node
/**
 * bundle-sources.mjs — Parse the source map to identify which modules
 * are in the bundle, and group them by source location.
 *
 * Usage: node scripts/bundle-sources.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const MAP_PATH = process.argv[2] || join(ROOT, '.optimize-logs/bundle.map');

if (!existsSync(MAP_PATH)) {
  console.error(`Source map not found at ${MAP_PATH}`);
  console.error('Fetch it with:');
  console.error('  curl -o .optimize-logs/bundle.map "http://localhost:8181/node_modules/expo-router/entry.map?platform=web&dev=true&hot=false&lazy=true&transform.routerRoot=app&resolver.environment=client&transform.environment=client"');
  process.exit(1);
}

console.log(`Reading ${MAP_PATH}...`);
const mapJson = JSON.parse(readFileSync(MAP_PATH, 'utf8'));
const sources = mapJson.sources || [];
console.log(`Total modules in source map: ${sources.length}\n`);

// Categorize each module
const projectFiles = [];
const nodeModulesByPkg = new Map();
const polyfills = [];

for (const s of sources) {
  if (typeof s !== 'string') continue;

  if (s === '__prelude__' || s.startsWith('polyfill:')) {
    polyfills.push(s);
    continue;
  }

  // Normalize separators
  const normalized = s.replace(/\\/g, '/');
  const isNodeModule = normalized.includes('/node_modules/');

  if (isNodeModule) {
    // Extract package name
    const m = normalized.match(/\/node_modules\/(?:(@[^/]+\/[^/]+)|(?:[^/]+))/);
    const pkg = m ? m[1] : 'unknown';
    if (!nodeModulesByPkg.has(pkg)) nodeModulesByPkg.set(pkg, []);
    nodeModulesByPkg.get(pkg).push(s);
  } else {
    // Project file
    const m = normalized.match(/\/rez-backend-master\/nuqta-master\/(.+)$/);
    const rel = m ? m[1] : normalized;
    projectFiles.push(rel);
  }
}

console.log('=== Module distribution ===');
console.log(`  Polyfills:          ${polyfills.length}`);
console.log(`  Project files:      ${projectFiles.length}`);
console.log(`  node_modules total: ${[...nodeModulesByPkg.values()].reduce((a, b) => a + b.length, 0)}`);
console.log(`  Unique packages:    ${nodeModulesByPkg.size}`);
console.log('');

// Top 30 packages by module count
const topPackages = [...nodeModulesByPkg.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 30);
console.log('=== Top 30 node_modules packages by module count ===');
for (const [pkg, files] of topPackages) {
  console.log(`  ${String(files.length).padStart(4)}  ${pkg}`);
}
console.log('');

// Top 30 project files in bundle
const topProject = projectFiles.slice(0, 30);
console.log('=== First 30 project files in bundle ===');
for (const f of topProject) {
  console.log(`  ${f}`);
}
console.log('');

// Group project files by directory
const projectByDir = new Map();
for (const f of projectFiles) {
  const dir = f.includes('/') ? f.substring(0, f.lastIndexOf('/')) : '.';
  if (!projectByDir.has(dir)) projectByDir.set(dir, []);
  projectByDir.get(dir).push(f);
}
console.log('=== Project modules per top-level directory ===');
const sortedDirs = [...projectByDir.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [dir, files] of sortedDirs.slice(0, 15)) {
  console.log(`  ${String(files.length).padStart(4)}  ${dir}/`);
}