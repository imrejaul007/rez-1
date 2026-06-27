import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';

const ROOT = process.cwd();
const sourceDirs = ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'stores', 'lib', 'types', 'constants', 'config'];
const barrels = [
  'components/earn/sections/index.ts',
  'hooks/queries/playAndEarn/index.ts',
  'components/prive/index.ts',
  'components/ugc/index.ts',
  'components/product/index.ts',
  'components/checkout/index.ts',
  'components/explore/index.ts',
];

const allFiles = new Set();
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    if (e.name === '__tests__' || e.name === 'docs') continue;
    const f = join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) allFiles.add(f.replace(/\\/g, '/'));
  }
}
for (const d of sourceDirs) walk(join(ROOT, d));

const importsByBasename = new Map();
const allImportPaths = new Set();
for (const f of allFiles) {
  let c; try { c = readFileSync(f, 'utf8'); } catch { continue; }
  const re = /(?:import\s+(?:[^'"]+?\s+from\s+)?|export\s+(?:[^'"]+?\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(c)) !== null) {
    const spec = m[1];
    allImportPaths.add(spec);
    const base = spec.split('/').pop().replace(/\.(tsx?|jsx?)$/, '');
    if (base) {
      if (!importsByBasename.has(base)) importsByBasename.set(base, []);
      importsByBasename.get(base).push({ from: f, spec });
    }
  }
}

function fileExistsWithExt(p) {
  for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']) {
    if (existsSync(p + ext)) return p + ext;
  }
  return null;
}
function resolveImportPath(spec, fromFile) {
  if (spec.startsWith('@/')) return ROOT + '/' + spec.substring(2);
  if (spec.startsWith('.')) {
    const d = dirname(fromFile);
    return join(d, spec).replace(/\\/g, '/');
  }
  return null;
}

// Build barrelChildren set
const barrelChildren = new Set();
for (const b of barrels) {
  const bp = join(ROOT, b);
  if (!existsSync(bp)) { console.log('Missing barrel:', b); continue; }
  let c; try { c = readFileSync(bp, 'utf8'); } catch { continue; }
  const re = /from\s+['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(c)) !== null) {
    const spec = m[1];
    const resolved = resolveImportPath(spec, bp);
    if (!resolved) continue;
    const candidate = fileExistsWithExt(resolved);
    if (candidate) {
      const r = relative(ROOT, candidate).replace(/\\/g, '/');
      barrelChildren.add(r);
    }
  }
}
console.log('barrelChildren count:', barrelChildren.size);
console.log('Sample:', [...barrelChildren].slice(0, 5));

// Check if barrel paths have external importers
const barrelPathVariants = new Set();
for (const b of barrels) {
  barrelPathVariants.add(b);
  barrelPathVariants.add(b.replace(/\.(ts|tsx)$/, ''));
  barrelPathVariants.add('@/' + b);
  barrelPathVariants.add('@/' + b.replace(/\.(ts|tsx)$/, ''));
}
const importedBarrels = [...barrelPathVariants].filter(b => allImportPaths.has(b));
console.log('Imported barrels:', importedBarrels);

// Test if WalletSummarySection is in barrelChildren
const wssPath = 'components/earn/sections/WalletSummarySection.tsx';
console.log('WalletSummarySection in barrelChildren:', barrelChildren.has(wssPath));
console.log('WalletSummarySection direct importers:', importsByBasename.get('WalletSummarySection'));