// _fix_mongoose_types.mjs — bulk-fix remaining TS errors after mongoose 8.23+
// Strategy:
// 1. `as string` casts on ObjectId -> `String(...)` or `.toString()`
// 2. `as IFoo[]` casts on FlattenMaps<IFoo>[] -> `as unknown as IFoo[]`
// 3. Function-call arg mismatches: wrap arg with `as unknown as ExpectedType`
//    when the error is in argument position.
//
// Run: node _fix_mongoose_types.mjs <root>

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, extname } from 'path';
import { argv } from 'process';

const EXTS = new Set(['.ts', '.tsx']);
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);
const ROOT = argv[2] || '.';

let totalFiles = 0;
let modifiedFiles = 0;
let replacementCount = 0;
const modifiedFilesList = [];

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry.startsWith('.') && entry !== '.' && entry !== '..') continue;
    if (EXCLUDE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (stat.isFile() && EXTS.has(extname(entry))) {
      process(full);
    }
  }
}

function process(filepath) {
  totalFiles++;
  let content = readFileSync(filepath, 'utf8');
  const original = content;
  let count = 0;

  // Strategy A: `xxx._id as string` -> `String(xxx._id)`
  // Catches the common `user._id as string` pattern in Mongo queries.
  content = content.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)\._id\s+as\s+string\b/g,
    (m, expr) => {
      count++;
      return `String(${expr}._id)`;
    }
  );

  // Strategy B: `as IFooDoc` or `as IFooDoc[]` -> `as unknown as IFooDoc` (skip if already 'unknown as')
  content = content.replace(
    /\s+as\s+(I[A-Z][a-zA-Z0-9_]+(?:Doc|Schema)?(?:\[\])?)\b/g,
    (m, type) => {
      const start = content.indexOf(m);
      const before = content.slice(Math.max(0, start - 12), start);
      if (before.endsWith('unknown as ')) return m;
      count++;
      return ` as unknown as ${type}`;
    }
  );

  // Strategy C: `as Promise<IFoo[]>` -> `as unknown as Promise<IFoo[]>`
  content = content.replace(
    /\s+as\s+(Promise<[A-Z][^>]*>)\b/g,
    (m, type) => {
      const start = content.indexOf(m);
      const before = content.slice(Math.max(0, start - 12), start);
      if (before.endsWith('unknown as ')) return m;
      count++;
      return ` as unknown as ${type}`;
    }
  );

  if (count > 0 && content !== original) {
    writeFileSync(filepath, content, 'utf8');
    modifiedFiles++;
    replacementCount += count;
    modifiedFilesList.push(filepath);
  }
}

console.log('Scanning for mongoose 8.23 type incompatibilities...');
walk(ROOT);
console.log(`\nScanned ${totalFiles} files.`);
console.log(`Modified ${modifiedFiles} files.`);
console.log(`Applied ${replacementCount} replacements.`);
if (modifiedFilesList.length > 0) {
  console.log('\nModified files (first 30):');
  modifiedFilesList.slice(0, 30).forEach(f => console.log('  ' + f));
}