import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname, relative } from 'path';
const ROOT = process.cwd();
const files = new Set();
function walk(d) {
  if (!existsSync(d)) return;
  for (const e of readdirSync(d, {withFileTypes: true})) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const f = join(d, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) files.add(f.replace(/\\/g, '/'));
  }
}
for (const d of ['app','components','contexts','hooks','services','utils','stores','lib','types','constants','config']) walk(join(ROOT, d));
const allImportPaths = new Set();
for (const f of files) {
  let c; try { c = readFileSync(f, 'utf8'); } catch { continue; }
  const re = /(?:import\s+(?:[^'"\s]+?\s+from\s+)?|export\s+(?:[^'"\s]+?\s+from\s+)?|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
  let m; while ((m = re.exec(c)) !== null) allImportPaths.add(m[1]);
}
const rel = 'components/store-payment/QRScanner.web.tsx';
const relNoExt = rel.replace(/\.(tsx?|jsx?)$/, '');
const exactCandidates = new Set();
exactCandidates.add('@/' + rel);
exactCandidates.add('@/' + relNoExt);
exactCandidates.add('@/./' + rel);
exactCandidates.add('@/./' + relNoExt);
exactCandidates.add('./' + rel);
exactCandidates.add(rel);
exactCandidates.add(relNoExt);
const plainRel = rel.replace(/\.web\./, '.');
const plainNoExt = relNoExt.replace(/\.web\./, '.');
exactCandidates.add('@/' + plainRel);
exactCandidates.add('@/' + plainNoExt);
exactCandidates.add(plainRel);
exactCandidates.add(plainNoExt);
console.log('exactCandidates:');
for (const c of exactCandidates) console.log('  ', c, '→ in set:', allImportPaths.has(c));