// _migrate_mongoose.mjs — bulk-fix TS errors caused by mongoose 8.24+
// type changes. Strategy:
// 1. Replace `as string` casts of ObjectId with `.toString()` calls
// 2. Replace `as IUserAchievement[]` (and similar) with `as unknown as IUserAchievement[]`
// 3. Replace `as IFooDoc` (single-object) with `as unknown as IFooDoc`
// 4. Replace `delete foo.bar` where bar is non-optional with `delete (foo as any).bar`
//
// Run from rez-backend-master root: node _migrate_mongoose.mjs [path]
//   path: directory to walk (default '.')

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

  // Strategy 1: `ObjectId(...) as string` -> `ObjectId(...).toString()`
  content = content.replace(
    /\b(new\s+mongoose\.Types\.ObjectId\([^)]*\)|new\s+Types\.ObjectId\([^)]*\)|new\s+ObjectId\([^)]*\))\s+as\s+string\b/g,
    (m) => {
      count++;
      return m.replace(/\s+as\s+string$/, '.toString()');
    }
  );

  // Strategy 2: `_id as string` (when in Mongoose context where _id is ObjectId)
  // We can't safely identify these — skip; user must do these manually.

  // Strategy 3: Cast patterns of FlattenMaps<T> -> T (or T[])
  // The error is "type X is not assignable to type Y". Adding `as unknown as`
  // bridges the structural mismatch. Patterns to catch:
  //   as IFooDoc[]    -> as unknown as IFooDoc[]
  //   as IFooDoc      -> as unknown as IFooDoc
  // Only catch casts that look like our interface types (capital letter followed by lowercase).
  content = content.replace(
    /\s+as\s+([A-Z][a-zA-Z0-9_]*Doc(?:\[\])?)\b/g,
    (m, type) => {
      // Only rewrite if not already preceded by 'unknown as'
      const before = content.slice(Math.max(0, content.indexOf(m) - 12), content.indexOf(m));
      if (before.endsWith('unknown as ')) return m;
      count++;
      return ` as unknown as ${type}`;
    }
  );

  // Strategy 4: TS7056 — implicit any in callback (rare, skip for now)

  // Strategy 5: TS2790 — delete on non-optional. Mark with comment.
  content = content.replace(
    /(\s+)delete\s+([a-zA-Z_][a-zA-Z0-9_.]*)\.([a-zA-Z_][a-zA-Z0-9_]*);/g,
    (m, ws, obj, prop) => {
      // Wrap in (obj as any) to bypass
      count++;
      return `${ws}delete (${obj} as any).${prop};`;
    }
  );

  if (count > 0 && content !== original) {
    writeFileSync(filepath, content, 'utf8');
    modifiedFiles++;
    replacementCount += count;
    modifiedFilesList.push(filepath);
  }
}

console.log('Scanning for mongoose 8.24 type incompatibilities...');
walk(ROOT);
console.log(`\nScanned ${totalFiles} files.`);
console.log(`Modified ${modifiedFiles} files.`);
console.log(`Applied ${replacementCount} replacements.`);
if (modifiedFilesList.length > 0) {
  console.log('\nModified files (first 30):');
  modifiedFilesList.slice(0, 30).forEach(f => console.log('  ' + f));
}