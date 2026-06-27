const { readFileSync, existsSync, readdirSync } = require('fs');
const { join, relative } = require('path');
const ROOT = process.cwd();
const dirs = ['app','components','contexts','hooks','services','utils','stores','lib','types','constants','config'];
const all = new Set();
function walk(d) { if (!existsSync(d)) return; for (const e of readdirSync(d, {withFileTypes:true})) { if (e.name === 'node_modules' || e.name.startsWith('.')) continue; if (e.name === '__tests__' || e.name === 'docs') continue; const f = join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.(tsx?|jsx?)$/.test(e.name)) all.add(f.replace(/\\/g,'/')); } }
for (const d of dirs) walk(join(ROOT, d));
const ib = new Map();
for (const f of all) {
  let c; try { c = readFileSync(f, 'utf8'); } catch { continue; }
  const re = /(?:import\s+(?:[^'"\s]+?\s+from\s+)?|export\s+(?:[^'"\s]+?\s+from\s+)?|require\s*\(\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
  let m; while ((m = re.exec(c)) !== null) { const spec = m[1]; const base = spec.split('/').pop().replace(/\.(tsx?|jsx?)$/, ''); if (base) { if (!ib.has(base)) ib.set(base, []); ib.get(base).push({ from: f, spec }); } }
}
const base = 'ProductImage';
const matches = ib.get(base) || [];
console.log('ProductImage importers:');
for (const m of matches) {
  const fromRel = relative(ROOT, m.from).replace(/\\/g, '/');
  console.log('  ', fromRel, '->', m.spec);
}