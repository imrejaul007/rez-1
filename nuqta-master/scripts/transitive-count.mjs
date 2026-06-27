import { readFileSync, existsSync, statSync, readdirSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';

const ROOT = process.cwd();
const target = process.argv[2] || 'components/profile/ProfileMenuModal.tsx';

const importGraph = new Map();

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      const c = readFileSync(full, 'utf8');
      const deps = new Set();
      const re = /(?:import\s+(?:[^'"]+\s+from\s+)?|export\s+(?:[^'"]+\s+from\s+)?|require\s*\(\s*)['"]([^'"]+)['"]/g;
      let m;
      while ((m = re.exec(c)) !== null) deps.add(m[1]);
      importGraph.set(full.replace(/\\/g, '/'), deps);
    }
  }
}

for (const d of ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'stores', 'lib', 'types', 'constants', 'config']) {
  walk(join(ROOT, d));
}

function resolveSpec(from, spec) {
  if (spec.startsWith('@/')) return (ROOT + '/' + spec.substring(2)).replace(/\\/g, '/');
  if (spec.startsWith('.')) return resolve(dirname(from), spec).replace(/\\/g, '/');
  return null;
}

function countTransitive(start) {
  const visited = new Set();
  function walk(f) {
    if (visited.has(f)) return 0;
    visited.add(f);
    const deps = importGraph.get(f);
    if (!deps) return 1;
    let n = 1;
    for (const spec of deps) {
      const r = resolveSpec(f, spec);
      if (!r) continue;
      const candidates = [r, r+'.ts', r+'.tsx', r+'.js', r+'.jsx', r+'/index.ts', r+'/index.tsx'];
      for (const c of candidates) {
        if (existsSync(c) && statSync(c).isFile()) { n += walk(c); break; }
      }
    }
    return n;
  }
  return walk(start);
}

const t = (ROOT + '/' + target).replace(/\\/g, '/');
console.log(`${target}: ${countTransitive(t)} transitive modules`);