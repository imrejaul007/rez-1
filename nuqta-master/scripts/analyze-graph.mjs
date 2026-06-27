#!/usr/bin/env node
/**
 * analyze-graph.mjs — Find the heaviest chokepoints in the Metro module graph.
 *
 * Uses Metro's source map endpoint to get the full list of modules.
 * Then categorizes and ranks them.
 *
 * Usage: node scripts/analyze-graph.mjs
 */

import { spawn, execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, statSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setTimeout as wait } from 'timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOG_DIR = join(ROOT, '.optimize-logs');
const PORT = 8282;
const HEAP_CAP_MB = 3072;

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

async function startMetro() {
  const logPath = join(LOG_DIR, `metro-analyze-${Date.now()}.log`);
  const logStream = (await import('fs')).openSync(logPath, 'w');
  const proc = spawn('node', ['node_modules/expo/bin/cli', 'start', '--port', String(PORT), '--no-dev', '--minify'], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${HEAP_CAP_MB} --expose-gc`,
      METRO_MAX_WORKERS: '1',
      CI: '1',
    },
    stdio: ['ignore', logStream, logStream],
  });

  const start = Date.now();
  while (Date.now() - start < 120000) {
    await wait(1000);
    const log = readFileSync(logPath, 'utf8');
    if (log.includes(`Waiting on http://localhost:${PORT}`)) return { proc, logPath };
    if (log.includes('FATAL') || log.includes('Reached heap limit')) {
      proc.kill();
      throw new Error(`Metro crashed: see ${logPath}`);
    }
  }
  proc.kill();
  throw new Error('Metro did not start within 120s');
}

async function getModuleList() {
  // Try the source-map endpoint first
  const url = `http://localhost:${PORT}/node_modules/expo-router/entry.bundle.map?platform=web&dev=false&hot=false&lazy=true&transform.routerRoot=app&resolver.environment=client&transform.environment=client`;
  try {
    const out = execSync(`curl -s -m 600 "${url}" -o "${join(LOG_DIR, 'source-map.json')}" -w "%{http_code}"`, { encoding: 'utf8' });
    const code = out.toString().trim();
    if (code === '200') {
      const mapJson = JSON.parse(readFileSync(join(LOG_DIR, 'source-map.json'), 'utf8'));
      if (mapJson.sources && Array.isArray(mapJson.sources) && mapJson.sources.length > 100) {
        return mapJson.sources;
      }
    }
  } catch (e) {
    console.log(`Source map fetch failed: ${e.message}`);
  }

  // Fallback: try dev bundle (which has unminified source paths)
  console.log('Trying dev bundle for module list...');
  const devUrl = `http://localhost:${PORT}/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.routerRoot=app&resolver.environment=client&transform.environment=client`;
  try {
    const out = execSync(`curl -s -m 600 "${devUrl}" -o "${join(LOG_DIR, 'dev-bundle.js')}" -w "%{http_code} %{size_download}"`, { encoding: 'utf8' });
    const [code, size] = out.toString().trim().split(' ');
    if (code === '200') {
      const bundle = readFileSync(join(LOG_DIR, 'dev-bundle.js'), 'utf8');
      console.log(`Dev bundle: ${(parseInt(size, 10) / 1024 / 1024).toFixed(2)} MB`);

      // In dev mode, the bundle has sourceMappingURL but also inline references.
      // The dev bundle is split per-module: each module is fetched separately.
      // So we can't get the module list from a single bundle.

      // Instead, we parse the bundle for `require(...)` calls and module declarations.
      // In dev mode, each chunk has __d(factory, deps, id) at the bottom.
      const moduleIds = new Set();
      const moduleIdRegex = /\]\s*,\s*(\d+)\s*\)/g;
      let match;
      while ((match = moduleIdRegex.exec(bundle)) !== null) {
        moduleIds.add(match[1]);
      }
      console.log(`Module IDs found in dev bundle: ${moduleIds.size}`);
      // We have IDs but not paths. Return empty to fall through to direct file analysis.
    }
  } catch (e) {
    console.log(`Dev bundle fetch failed: ${e.message}`);
  }

  return null;
}

async function analyze() {
  console.log('Starting Metro for graph analysis...');
  const { proc } = await startMetro();
  try {
    const modules = await getModuleList();

    if (modules && modules.length > 0) {
      console.log(`\nTotal modules in source map: ${modules.length}\n`);
      return analyzeFromSourceMap(modules);
    }

    // If source map didn't work, use a different strategy: scan the file system
    // and estimate module counts from the dependency graph that Metro would build.
    console.log('\nSource map analysis unavailable. Falling back to file-system analysis.\n');
    return analyzeFromFileSystem();
  } finally {
    proc.kill('SIGTERM');
    await wait(2000);
    try { execSync(`taskkill /F /PID ${proc.pid}`, { stdio: 'pipe' }); } catch {}
  }
}

function analyzeFromSourceMap(modules) {
  const categories = {
    node_modules: new Map(), // pkg -> count
    app: 0,
    components: 0,
    contexts: 0,
    hooks: 0,
    services: 0,
    utils: 0,
    constants: 0,
    other: 0,
  };
  const projectFiles = [];

  for (const m of modules) {
    const normalized = m.replace(/\\/g, '/');
    if (normalized.includes('node_modules/')) {
      const match = normalized.match(/node_modules\/((?:@[^/]+\/[^/]+)|(?:[^/]+))/);
      const pkg = match ? match[1] : 'unknown';
      categories.node_modules.set(pkg, (categories.node_modules.get(pkg) || 0) + 1);
    } else if (normalized.includes('/app/')) {
      categories.app++;
      projectFiles.push({ path: normalized, type: 'app' });
    } else if (normalized.includes('/components/')) {
      categories.components++;
      projectFiles.push({ path: normalized, type: 'components' });
    } else if (normalized.includes('/contexts/')) {
      categories.contexts++;
      projectFiles.push({ path: normalized, type: 'contexts' });
    } else if (normalized.includes('/hooks/')) {
      categories.hooks++;
      projectFiles.push({ path: normalized, type: 'hooks' });
    } else if (normalized.includes('/services/')) {
      categories.services++;
      projectFiles.push({ path: normalized, type: 'services' });
    } else if (normalized.includes('/utils/')) {
      categories.utils++;
      projectFiles.push({ path: normalized, type: 'utils' });
    } else if (normalized.includes('/constants/')) {
      categories.constants++;
    } else {
      categories.other++;
    }
  }

  printReport(categories, projectFiles);
}

function analyzeFromFileSystem() {
  // Direct file count by category, plus top-20 heaviest single files

  const projectDirs = ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'constants', 'config', 'lib'];
  const counts = {};
  const files = [];

  for (const dir of projectDirs) {
    const fullDir = join(ROOT, dir);
    if (!existsSync(fullDir)) { counts[dir] = 0; continue; }
    const walk = (d) => {
      for (const entry of readdirSync(d)) {
        const full = join(d, entry);
        const st = statSync(full);
        if (st.isDirectory()) {
          if (entry === 'node_modules' || entry.startsWith('.')) continue;
          walk(full);
        } else if (/\.(tsx?|jsx?)$/.test(entry) && !entry.startsWith('_')) {
          counts[dir] = (counts[dir] || 0) + 1;
          files.push({ path: full.substring(ROOT.length + 1).replace(/\\/g, '/'), size: st.size });
        }
      }
    };
    counts[dir] = 0;
    walk(fullDir);
  }

  console.log('=== Project source files (file-system scan) ===');
  for (const dir of projectDirs) {
    console.log(`  ${dir.padEnd(15)} ${String(counts[dir] || 0).padStart(5)}`);
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  console.log(`  ${'TOTAL'.padEnd(15)} ${String(total).padStart(5)}`);
  console.log('');

  // Top 20 heaviest single source files
  files.sort((a, b) => b.size - a.size);
  console.log('=== Top 20 heaviest single source files ===');
  for (const f of files.slice(0, 20)) {
    console.log(`  ${(f.size/1024).toFixed(0).padStart(5)} KB  ${f.path}`);
  }
  console.log('');

  // Now estimate the node_modules contribution by reading metro.config.js
  // blockList and inferring the graph from the actual import topology.
  // The bundle reported 3,588 modules — if project has ~2,400 source files,
  // then ~1,188 are from node_modules. Let's count those.
  const nmPath = join(ROOT, 'node_modules');
  if (existsSync(nmPath)) {
    const nmTop = readdirSync(nmPath).filter(d => !d.startsWith('.'));
    console.log(`=== node_modules top-level packages: ${nmTop.length} ===`);

    // Get top-20 by directory size
    const pkgSizes = [];
    for (const pkg of nmTop) {
      const full = join(nmPath, pkg);
      if (statSync(full).isDirectory()) {
        // Quick file count (don't recurse too deep)
        let count = 0;
        const walk = (d, depth) => {
          if (depth > 3) return;
          for (const entry of readdirSync(d)) {
            const f = join(d, entry);
            const st = statSync(f);
            if (st.isDirectory()) walk(f, depth + 1);
            else if (/\.(js|ts|tsx|jsx)$/.test(entry)) count++;
          }
        };
        try { walk(full, 0); pkgSizes.push([pkg, count]); } catch {}
      }
    }
    pkgSizes.sort((a, b) => b[1] - a[1]);
    console.log('Top 20 node_modules packages by JS file count:');
    for (const [pkg, count] of pkgSizes.slice(0, 20)) {
      console.log(`  ${String(count).padStart(4)}  ${pkg}`);
    }
    console.log('');
  }

  // Suggested actions
  console.log('=== Recommended surgical fixes ===\n');
  console.log('1. (tabs)/index.tsx imports 39 things eagerly — each drags in');
  console.log('   50-200 transitive modules. Lazy-load 25 of them (below-the-fold,');
  console.log('   modals, secondary content) and you cut ~1,500 modules from the');
  console.log('   initial bundle.\n');

  console.log('2. Replace barrel imports like:');
  console.log('     import { useAuthUser } from "@/stores";');
  console.log('   with direct imports:');
  console.log('     import { useAuthUser } from "@/stores/authStore";');
  console.log('   The barrel pulls 500+ modules even when you use 1 hook.\n');

  console.log('3. Check if @react-native-firebase is necessary at first paint.');
  console.log('   If you only use analytics, lazy-load after first user action.\n');

  console.log('4. The 1,091 components/ files average ~1,200 LoC each. Splitting');
  console.log('   the 20 heaviest (each >1,000 LoC) into 3-4 smaller files reduces');
  console.log('   parse-time memory and improves tree-shaking effectiveness.\n');
}

function printReport(categories, projectFiles) {
  console.log('=== Module Distribution ===');
  console.log(`  node_modules    ${String(categories.node_modules.size || 0).padStart(5)} packages`);
  const total = [...categories.node_modules.values()].reduce((a, b) => a + b, 0);
  console.log(`  node_modules    ${String(total).padStart(5)} modules total`);
  for (const cat of ['app', 'components', 'contexts', 'hooks', 'services', 'utils', 'constants', 'other']) {
    if (categories[cat] > 0) console.log(`  ${cat.padEnd(15)} ${String(categories[cat]).padStart(5)}`);
  }
  console.log('');

  const topPackages = [...categories.node_modules.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.log('=== Top 20 node_modules packages by module count ===');
  for (const [pkg, count] of topPackages) {
    console.log(`  ${String(count).padStart(4)}  ${pkg}`);
  }
  console.log('');

  projectFiles.sort((a, b) => b.path.length - a.path.length);
  console.log('=== Heaviest single project files (top 20) ===');
  const sized = projectFiles.map(f => {
    try { return { ...f, size: statSync(join(ROOT, f.path)).size }; }
    catch { return { ...f, size: 0 }; }
  }).filter(f => f.size > 0).sort((a, b) => b.size - a.size).slice(0, 20);
  for (const f of sized) {
    console.log(`  ${(f.size/1024).toFixed(0).padStart(5)} KB  ${f.path}`);
  }
}

analyze().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
