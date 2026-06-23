// _scrub_creds.mjs — replace hard-coded MongoDB Atlas creds across the repo.
// Iter 10 update: original scrubber (iter 2) only ran against
// rez-backend-master/scripts/*.js. After a fresh audit in iter 10, 55 files
// across rez-backend-master/src/scripts/*.{js,ts} still contained hard-coded
// credentials. This version walks the entire repo (with sensible excludes)
// and replaces any hard-coded mongodb:// or mongodb+srv:// connection string
// with a `process.env.MONGODB_URI` reference.
//
// Run from the rez-backend-master root: node _scrub_creds.mjs

import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { join, extname } from 'path';

const ROOT = '.';
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.expo',
  '.next-build',
]);

// Match any of (these are *examples* of what we want to catch):
//   EXAMPLE_A: const X = 'CRED';
//   EXAMPLE_B: const X = ENV || 'CRED';
//   EXAMPLE_C: await mongoose.connect('CRED');
// (Use EXAMPLE_A/B/C names instead of literal code to prevent self-matching
//  during walk() — the scrubber's regex would otherwise transform its own comments.)
const CRED_RE = /(['"`])(mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+@[^\s'"`]+)\1/;
const FILE_EXTS = new Set(['.js', '.ts', '.mjs', '.cjs']);

const REPLACEMENTS = {
  MONGODB_URI: `(process.env.MONGODB_URI as string);\nif (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1); }`,
  MONGO_URI:   `(process.env.MONGO_URI as string);\nif (!MONGO_URI) { console.error('MONGO_URI not set'); process.exit(1); }`,
  mongoUri:    `(process.env.MONGODB_URI || process.env.MONGO_URI) as string;\nif (!mongoUri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); }`,
  mongoURI:    `(process.env.MONGODB_URI || process.env.MONGO_URI) as string;\nif (!mongoURI) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); }`,
  mongo_uri:   `(process.env.MONGODB_URI || process.env.MONGO_URI) as string;\nif (!mongo_uri) { console.error('MONGODB_URI or MONGO_URI not set'); process.exit(1); }`,
};

let totalScanned = 0;
let totalMatched = 0;
let totalReplaced = 0;
const matchedFiles = [];

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (entry.startsWith('.') && entry !== '.' && entry !== '..') continue;
    if (EXCLUDE_DIRS.has(entry)) continue;
    // Skip the scrubber script itself to avoid self-modification.
    if (entry === '_scrub_creds.mjs' || entry === '_debug_scrubber.mjs') continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (stat.isFile() && FILE_EXTS.has(extname(entry))) {
      totalScanned++;
      try {
        const content = readFileSync(full, 'utf8');
        if (CRED_RE.test(content)) {
          totalMatched++;
          matchedFiles.push(full);
          const replaced = replaceCreds(content, full);
          if (replaced) {
            writeFileSync(full, replaced, 'utf8');
            totalReplaced++;
          }
        }
      } catch (err) {
        // Skip unreadable files
      }
    }
  }
}

function replaceCreds(content, filename) {
  let modified = content;
  let count = 0;

  // Strategy 1: replace declarations like `const X = 'mongodb+srv://...'`
  //              or `const X = process.env.Y || 'mongodb+srv://...'`
  // The credential string may be on a continuation line, so allow newlines
  // (but not semicolons, which would mean we hit the next statement).
  modified = modified.replace(
    /((?:const|let|var)\s+)(MONGODB_URI|MONGO_URI|mongoUri|mongoURI|mongo_uri)(\s*[:=][^;]*?)(['"`])(mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+@[^\s'"`]+)\4/g,
    (m, decl, varName, sep, _q, _cred) => {
      const replacement = REPLACEMENTS[varName] || REPLACEMENTS.MONGODB_URI;
      count++;
      return `${decl}${varName}${sep}${replacement}`;
    }
  );

  // Strategy 2: replace inline `mongoose.connect('mongodb+srv://...')`
  modified = modified.replace(
    /(mongoose\.connect\s*\(\s*|mongoose\.createConnection\s*\(\s*)(['"`])(mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+@[^\s'"`]+)\2/g,
    (m, prefix, q, _cred) => {
      count++;
      return `${prefix}${q}process.env.MONGODB_URI${q}`;
    }
  );

  if (count > 0) {
    // Add a comment header if the file didn't already have one explaining the
    // dependency on MONGODB_URI env var.
    if (!modified.includes('MONGODB_URI not set')) {
      modified =
        '// SECURITY: hard-coded MongoDB credentials replaced with env-var reference.\n' +
        '// Set MONGODB_URI in your environment before running this script.\n\n' +
        modified;
    }
  }

  return count > 0 ? modified : null;
}

console.log(`Scanning ${ROOT} for hard-coded MongoDB credentials...`);
walk(ROOT);
console.log(`\nScanned ${totalScanned} files.`);
console.log(`Found credentials in ${totalMatched} files.`);
console.log(`Modified ${totalReplaced} files.`);

if (matchedFiles.length > 0) {
  console.log('\nMatched files:');
  matchedFiles.forEach(f => console.log('  ' + f));
}
