import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const allFiles = new Set();
function walk(dir) {
  if (!existsSync(dir)) return;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const f = join(dir, e.name);
    if (e.isDirectory()) walk(f);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) allFiles.add(f.replace(/\\/g, '/'));
  }
}
for (const d of ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'stores', 'lib', 'types', 'constants', 'config']) walk(join(ROOT, d));

const set = new Set();
for (const f of allFiles) {
  let c; try { c = readFileSync(f, 'utf8'); } catch { continue; }
  const re = /from\s+['"]([^'"]+)['"]/g; let m;
  while ((m = re.exec(c)) !== null) set.add(m[1]);
}

const earn = [...set].filter(s => s.includes('earn/sections'));
console.log('Imports of earn/sections:', earn);
console.log('Has @/components/earn/sections:', set.has('@/components/earn/sections'));
console.log('Has components/earn/sections:', set.has('components/earn/sections'));

const play = [...set].filter(s => s.includes('playAndEarn'));
console.log('Imports of playAndEarn:', play);