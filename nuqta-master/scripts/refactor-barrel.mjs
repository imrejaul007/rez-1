#!/usr/bin/env node
/**
 * refactor-barrel.mjs — Replace `@/stores` barrel imports with direct imports
 * from the specific source file (e.g. `@/stores/selectors`, `@/stores/authStore`).
 *
 * Strategy:
 *   1. Parse each file's `@/stores` import block to extract imported symbols
 *   2. For each symbol, look up its actual source in stores/*.ts
 *   3. Group symbols by source file
 *   4. Rewrite the import statement
 *
 * Usage:
 *   node scripts/refactor-barrel.mjs --dry-run    # show what would change
 *   node scripts/refactor-barrel.mjs              # actually rewrite
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = process.cwd();
const dryRun = process.argv.includes('--dry-run');

// ── Step 1: Build symbol → source file map ──────────────────────────
const symbolToSource = new Map();

// Each store file: extract its exports
function getExports(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const exports = new Set();
  // export const Foo
  for (const m of content.matchAll(/export\s+const\s+(\w+)/g)) exports.add(m[1]);
  // export function Foo
  for (const m of content.matchAll(/export\s+function\s+(\w+)/g)) exports.add(m[1]);
  // export class Foo
  for (const m of content.matchAll(/export\s+class\s+(\w+)/g)) exports.add(m[1]);
  // export type Foo
  for (const m of content.matchAll(/export\s+type\s+(\w+)/g)) exports.add(m[1]);
  // export interface Foo
  for (const m of content.matchAll(/export\s+interface\s+(\w+)/g)) exports.add(m[1]);
  // export { Foo, Bar }
  for (const m of content.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const name of m[1].split(',')) {
      const trimmed = name.trim().split(/\s+as\s+/)[0].trim();
      if (trimmed) exports.add(trimmed);
    }
  }
  return exports;
}

const storesDir = join(ROOT, 'stores');
if (existsSync(storesDir)) {
  for (const f of readdirSync(storesDir)) {
    if (!f.endsWith('.ts') || f === 'index.ts') continue;
    const fullPath = join(storesDir, f);
    const exports = getExports(fullPath);
    const relPath = '@/stores/' + f.replace(/\.ts$/, '');
    for (const exp of exports) {
      if (!symbolToSource.has(exp)) {
        symbolToSource.set(exp, relPath);
      } else {
        // Conflict — prefer the more specific file
        // (selectors is more specific than individual store)
      }
    }
  }
}

// Re-apply, giving priority to selectors.ts
const selectorsFile = join(storesDir, 'selectors.ts');
if (existsSync(selectorsFile)) {
  const selExports = getExports(selectorsFile);
  for (const exp of selExports) {
    symbolToSource.set(exp, '@/stores/selectors');
  }
}

console.log(`Built symbol→source map: ${symbolToSource.size} symbols\n`);

// ── Step 2: Find all files using the barrel and rewrite ──────────────

const consumers = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const content = readFileSync(full, 'utf8');
      // Match: import { ... } from '@/stores';
      if (/from\s+['"]@\/stores['"];?/m.test(content)) {
        consumers.push(full);
      }
    }
  }
}

for (const d of ['app', 'components', 'contexts', 'hooks', 'services', 'utils']) {
  walk(join(ROOT, d));
}

console.log(`Found ${consumers.length} consumers of @/stores barrel\n`);

// ── Step 3: Rewrite each consumer's barrel import ────────────────────

let totalChanged = 0;
let totalUnchanged = 0;

for (const file of consumers) {
  let content = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);

  // Find all import { ... } from '@/stores' (could be multiline)
  // Pattern: import { symbols } from '@/stores';
  const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@\/stores['"];?/g;
  let m;
  const newImports = [];
  const changes = [];

  while ((m = importRegex.exec(content)) !== null) {
    const symbols = m[1].split(',').map(s => s.trim()).filter(Boolean);
    // Group by source
    const groups = new Map();
    for (const sym of symbols) {
      // Handle "X as Y" rename
      const parts = sym.split(/\s+as\s+/);
      const name = parts[0].trim();
      const alias = parts[1] ? parts[1].trim() : null;

      const source = symbolToSource.get(name);
      if (!source) {
        changes.push(`  ! ${name}: not found in any store file (skipping)`);
        continue;
      }
      if (!groups.has(source)) groups.set(source, []);
      groups.get(source).push(alias ? `${name} as ${alias}` : name);
    }

    // Build new import statements
    const before = m[0];
    const after = [...groups.entries()].map(([src, syms]) =>
      `import { ${syms.join(', ')} } from '${src}';`
    ).join('\n');

    if (after !== before) {
      changes.push(`  - ${before.substring(0, 60)}...`);
      changes.push(`  + ${after.substring(0, 80)}...`);
      newImports.push({ from: m.index, len: m[0].length, replacement: after });
    } else {
      totalUnchanged++;
    }
  }

  if (newImports.length > 0) {
    if (!dryRun) {
      // Apply replacements in reverse order (so indexes stay valid)
      newImports.sort((a, b) => b.from - a.from);
      for (const { from, len, replacement } of newImports) {
        content = content.substring(0, from) + replacement + content.substring(from + len);
      }
      writeFileSync(file, content);
    }
    totalChanged++;
    console.log(`${dryRun ? '[DRY] ' : ''}✓ ${rel}`);
    for (const c of changes) console.log(c);
  } else {
    console.log(`  (no change) ${rel}`);
  }
}

console.log(`\n${dryRun ? 'Would change' : 'Changed'}: ${totalChanged} files`);
console.log(`Unchanged (single-symbol already direct): ${totalUnchanged}`);
