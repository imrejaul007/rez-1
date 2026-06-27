#!/usr/bin/env node
/**
 * orphan-2pass.mjs — Second-pass orphan analyzer.
 *
 * For each .ts/.tsx in source dirs, find external importers.
 * If 0 → TRULY ORPHAN. If >0 external match → REACHABLE.
 *
 * Special handling:
 *   - Skip files imported by known barrels (earn/sections/index.ts, etc.)
 *   - Check platform variants (.web/.native/.ios/.android)
 */

import { readFileSync, existsSync, statSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname, relative, basename } from 'path';

const ROOT = process.cwd();
const sourceDirs = ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'stores', 'lib', 'types', 'constants', 'config'];

// Known barrel re-export files (these propagate imports to children)
const barrels = [
  'components/earn/sections/index.ts',
  'hooks/queries/playAndEarn/index.ts',
  'components/prive/index.ts',
  'components/ugc/index.ts',
  'components/product/index.ts',
  'components/checkout/index.ts',
  'components/explore/index.ts',
  'components/store-payment/index.ts',
  'components/lazy/index.ts',
  'components/skeletons/index.ts',
  'components/ui/index.ts',
  'components/category/index.ts',
  'components/feed/index.ts',
  'components/homepage/index.ts',
  'components/homepage/cards/index.ts',
  'components/homepage/skeletons/index.ts',
  'components/homepage/lazyGroups/categorySections.ts',
  'components/homepage/lazyGroups/categoryListSections.ts',
  'components/homepage/lazyGroups/dealSections.ts',
  'components/homepage/lazyGroups/discoverySections.ts',
  'components/homepage/lazyGroups/gamificationSections.ts',
  'components/homepage/lazyGroups/storeBrowseSections.ts',
  'components/mall/index.ts',
  'components/mall/cards/index.ts',
  'components/offers/sections/index.ts',
  'components/cash-store/sections/index.ts',
  'components/common/index.ts',
  'components/gamification/index.ts',
  'components/bus/index.ts',
  'components/cab/index.ts',
  'components/food-dining/index.ts',
  'components/how-cash-store-works/index.ts',
  'components/search/index.ts',
  'components/payment/index.ts',
  'components/pay-store-search/index.ts',
  'components/earnPage/index.ts',
  'components/category-pages/index.ts',
  'components/store/index.ts',
  'components/bill-upload/index.ts',
  'hooks/index.ts',
  'hooks/queries/index.ts',
  'hooks/mutations/index.ts',
  'services/index.ts',
  'utils/index.ts',
  'contexts/index.ts',
  'stores/index.ts',
  'app/index.ts',
];

// Build list of all source files
const allFiles = new Set();
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    if (entry.name === '__tests__' || entry.name === 'docs') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) allFiles.add(full.replace(/\\/g, '/'));
  }
}
for (const dir of sourceDirs) walk(join(ROOT, dir));

// Read each file, parse imports, build reverse index: basename (no ext) -> list of (fromFile, spec, importedName)
const importsByBasename = new Map();  // basename -> [{from, spec, name}]
const allImportPaths = new Set();
for (const f of allFiles) {
  let content;
  try { content = readFileSync(f, 'utf8'); } catch { continue; }
  const re = /(?:import\s+(?:[^'"]+?\s+from\s+)?|export\s+(?:[^'"]+?\s+from\s+)?|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const spec = m[1];
    allImportPaths.add(spec);
    const base = spec.split('/').pop().replace(/\.(tsx?|jsx?)$/, '');
    if (base) {
      if (!importsByBasename.has(base)) importsByBasename.set(base, []);
      importsByBasename.get(base).push({ from: f, spec });
    }
  }
}

// Step 1: which files are imported by barrels? (children of barrels = reachable via barrel)
// For each barrel, parse its exports to find what it re-exports, then mark those source files reachable
function resolveImportPath(spec, fromFile) {
  let abs;
  if (spec.startsWith('@/')) abs = ROOT + '/' + spec.substring(2);
  else if (spec.startsWith('.')) {
    const d = dirname(fromFile);
    abs = join(d, spec);
  } else return null;
  // Return relative to ROOT
  return relative(ROOT, abs).replace(/\\/g, '/');
}
function fileExistsWithExt(p) {
  for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
    if (existsSync(p + ext)) return p + ext;
  }
  return null;
}

// reachable = files transitively imported from app/, or imported anywhere as side-effect-free reference
function isReachable(filePath) {
  const rel = relative(ROOT, filePath).replace(/\\/g, '/');
  const relNoExt = rel.replace(/\.(tsx?|jsx?)$/, '');
  const base = relNoExt.split('/').pop();

  // Strategy A: exact path match (any of the import strings project uses)
  const exactCandidates = new Set([
    '@/' + rel,
    '@/' + relNoExt,
    '@/./' + rel,
    '@/./' + relNoExt,
    './' + rel,
    rel,
    relNoExt,
  ]);
  // Platform variants: if file is .web.tsx, the import may be the plain path
  // (Metro/Hermes auto-resolves), or vice versa.
  if (rel.endsWith('.web.tsx') || rel.endsWith('.web.ts')) {
    const plainNoExt = relNoExt.replace(/\.web$/, '');  // strips trailing .web
    exactCandidates.add('@/' + plainNoExt);
    exactCandidates.add(plainNoExt);
    exactCandidates.add('@/' + plainNoExt + '.tsx');
    exactCandidates.add('@/' + plainNoExt + '.ts');
  }
  if (rel.endsWith('.native.tsx') || rel.endsWith('.native.ts')) {
    const plainNoExt = relNoExt.replace(/\.native$/, '');
    exactCandidates.add('@/' + plainNoExt);
    exactCandidates.add(plainNoExt);
    exactCandidates.add('@/' + plainNoExt + '.tsx');
    exactCandidates.add('@/' + plainNoExt + '.ts');
  }
  // Reverse: if file is plain .tsx, check if web/native variant is imported
  if (!rel.includes('.web.') && !rel.includes('.native.')) {
    exactCandidates.add('@/' + relNoExt + '.web');
    exactCandidates.add('@/' + relNoExt + '.native');
    exactCandidates.add(relNoExt + '.web');
    exactCandidates.add(relNoExt + '.native');
  }
  for (const c of exactCandidates) {
    if (allImportPaths.has(c)) return true;
  }

  // Strategy B: basename match — does any import string end with /basename?
  if (importsByBasename.has(base)) {
    for (const { from, spec } of importsByBasename.get(base)) {
      const resolved = resolveImportPath(spec, from);
      if (!resolved) continue;
      const r = resolved.replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '');
      const withExt = ['', '.ts', '.tsx', '.js', '.jsx'];
      const relNoExt = rel.replace(/\.(tsx?|jsx?)$/, '');
      for (const ext of withExt) {
        if (r + ext === rel || r === relNoExt) return true;
      }
      // Also platform variant: if spec was './Foo' but file is ./Foo.web.tsx
      for (const ext of withExt) {
        if (r + ext === rel.replace(/\.web\./, '.')) return true;
        if (r + ext === rel.replace(/\.native\./, '.')) return true;
      }
      // './index' from sibling → barrel re-export case
      if (spec === './index' || spec === '.') {
        const ourDir = dirname(filePath).replace(/\\/g, '/');
        const theirDir = dirname(from).replace(/\\/g, '/');
        if (ourDir === theirDir) return true;  // direct barrel sibling
      }
    }
  }

  return false;
}

// Step 2: also consider that barrel children are reachable via the barrel even if no direct importer
// (the barrel itself is reachable)
const barrelChildren = new Set();
for (const b of barrels) {
  const bp = join(ROOT, b);
  if (!existsSync(bp)) continue;
  let content;
  try { content = readFileSync(bp, 'utf8'); } catch { continue; }
  const re = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const spec = m[1];
    const resolved = resolveImportPath(spec, bp);
    if (!resolved) continue;
    // walk index files
    const candidate = fileExistsWithExt(resolved);
    if (candidate) {
      const r = relative(ROOT, candidate).replace(/\\/g, '/');
      barrelChildren.add(r);
    }
  }
}

// Step 3: walk transitive closures — barrel importers
// For each barrel, check if anything imports the barrel
const barrelPaths = new Set();
for (const b of barrels) {
  barrelPaths.add(b);
  barrelPaths.add(b.replace(/\.(ts|tsx)$/, ''));
  barrelPaths.add(b.replace(/\/index\.(ts|tsx)$/, ''));  // e.g. components/earn/sections
  barrelPaths.add('@/' + b);
  barrelPaths.add('@/' + b.replace(/\.(ts|tsx)$/, ''));
  barrelPaths.add('@/' + b.replace(/\/index\.(ts|tsx)$/, ''));
  // Dynamic imports use the full @/path string
  barrelPaths.add('@/components/homepage/lazyGroups/categorySections');
  barrelPaths.add('@/components/homepage/lazyGroups/categoryListSections');
  barrelPaths.add('@/components/homepage/lazyGroups/dealSections');
  barrelPaths.add('@/components/homepage/lazyGroups/discoverySections');
  barrelPaths.add('@/components/homepage/lazyGroups/gamificationSections');
  barrelPaths.add('@/components/homepage/lazyGroups/storeBrowseSections');
}

const orphans = [];
const reachable = [];
const skipped = [];

// Build initial reachable set
const reachableSet = new Set();
for (const f of allFiles) {
  const rel = relative(ROOT, f).replace(/\\/g, '/');

  // Skip entry points, routes, index files
  if (rel === 'app/_layout.tsx' || rel === 'app/+html.tsx') { skipped.push(rel); continue; }
  if (rel.startsWith('app/')) { skipped.push(rel); continue; }
  if (rel.endsWith('/index.ts') || rel.endsWith('/index.tsx')) { skipped.push(rel); continue; }

  if (barrelChildren.has(rel)) {
    // this file is re-exported by a barrel; mark reachable IF the barrel itself is reachable
    let barrelReachable = false;
    for (const bp of barrelPaths) {
      if (allImportPaths.has(bp)) { barrelReachable = true; break; }
    }
    if (barrelReachable) {
      reachableSet.add(rel);
      reachable.push({ rel, reason: 'barrel-re-export', size: statSync(f).size });
      continue;
    }
  }

  if (isReachable(f)) {
    reachableSet.add(rel);
    reachable.push({ rel, reason: 'direct-import', size: statSync(f).size });
  } else {
    orphans.push({ rel, size: statSync(f).size });
  }
}

// Iterative transitive closure: if a reachable file imports an orphan,
// the orphan becomes reachable. Repeat until fixed point.
// Index files (skipped) count as reachable seeds for transitive closure.
const seedSet = new Set([...reachableSet, ...skipped.filter(s => s.endsWith('/index.ts') || s.endsWith('/index.tsx'))]);
console.log(`Seed set size: ${seedSet.size}`);

let changed = true;
let pass = 0;
while (changed && pass < 30) {
  changed = false; pass++;
  let promotedThisPass = 0;
  for (let i = orphans.length - 1; i >= 0; i--) {
    const o = orphans[i];
    if (reachableSet.has(o.rel)) {
      orphans.splice(i, 1);
      continue;
    }
    // check if any reachable (or seed) file imports this orphan
    const base = o.rel.replace(/\.(tsx?|jsx?)$/, '').split('/').pop();
    const matches = importsByBasename.get(base) || [];
    for (const { from, spec } of matches) {
      const fromRel = relative(ROOT, from).replace(/\\/g, '/');
      if (!seedSet.has(fromRel)) continue;
      // resolve the spec relative to `from`
      const resolved = resolveImportPath(spec, from);
      if (!resolved) continue;
      const r = resolved.replace(/\\/g, '/').replace(/\.(tsx?|jsx?)$/, '');
      const withExt = ['', '.ts', '.tsx', '.js', '.jsx'];
      const oRelNoExt = o.rel.replace(/\.(tsx?|jsx?)$/, '');
      let matched = false;
      for (const ext of withExt) {
        if (r + ext === o.rel || r === oRelNoExt) { matched = true; break; }
      }
      if (matched) {
        reachableSet.add(o.rel);
        seedSet.add(o.rel);
        reachable.push({ rel: o.rel, reason: `transitive-from-${fromRel}`, size: o.size });
        orphans.splice(i, 1);
        changed = true;
        promotedThisPass++;
        break;
      }
    }
  }
  console.log(`Pass ${pass}: promoted ${promotedThisPass} orphans (remaining: ${orphans.length})`);
}

// Output report
const byDir = new Map();
for (const o of orphans) {
  const d = dirname(o.rel);
  if (!byDir.has(d)) byDir.set(d, []);
  byDir.get(d).push(o);
}

console.log(`\n=== 2nd-pass orphan analysis ===`);
console.log(`Total source files: ${allFiles.size}`);
console.log(`Skipped (routes/index): ${skipped.length}`);
console.log(`Reachable: ${reachable.length}`);
console.log(`Orphans: ${orphans.length}`);

let totalOrphanBytes = 0;
for (const o of orphans) totalOrphanBytes += o.size;
console.log(`Orphan size: ${(totalOrphanBytes/1024).toFixed(1)} KB\n`);

for (const [dir, files] of [...byDir.entries()].sort((a, b) => b[1].length - a[1].length)) {
  const totalKB = files.reduce((s, f) => s + f.size, 0) / 1024;
  console.log(`  ${dir}/ (${files.length} files, ${totalKB.toFixed(1)} KB)`);
  for (const f of files.sort((a, b) => b.size - a.size)) {
    console.log(`    ${(f.size/1024).toFixed(1).padStart(7)} KB  ${f.rel}`);
  }
  console.log('');
}

// JSON dump for further analysis
const out = { orphans: orphans.sort((a, b) => b.size - a.size), reachable, skipped };
writeFileSync('/tmp/orphan-2pass.json', JSON.stringify(out, null, 2));
console.log(`\nWrote /tmp/orphan-2pass.json`);