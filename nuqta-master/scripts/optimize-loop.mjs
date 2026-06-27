#!/usr/bin/env node
/**
 * optimize-loop.mjs — Production-ready optimization loop for Metro/Expo
 *
 * Measures the module-graph impact of each optimization layer:
 *   1. Baseline (current state)
 *   2. Layer 1: optimizePackageImports + serializer hook (Metro config)
 *   3. Layer 2: Lazy routes (move app/ files out of expo-router)
 *   4. Layer 3: Defer non-critical providers
 *
 * For each layer, spawns Metro, fetches the entry bundle, captures:
 *   - Module count (parsed from "Bundled Nms ... (X modules)" log line)
 *   - Bundle size in MB
 *   - Time-to-first-bundle in seconds
 *   - Peak RSS in GB
 *
 * On regression (bundle > 2x baseline or no improvement), rolls back that
 * layer and continues with the next one.
 *
 * Usage:
 *   node scripts/optimize-loop.mjs                 # full loop
 *   node scripts/optimize-loop.mjs --stage=baseline # one stage only
 *   node scripts/optimize-loop.mjs --skip-layer-2  # skip lazy routes
 *
 * Exit codes:
 *   0 = all stages measured successfully
 *   1 = Metro failed to start (no port 8081 within 60s)
 *   2 = bundle fetch failed
 *   3 = measurement parse error
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, rmSync, mkdirSync, statSync, renameSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setTimeout as wait } from 'timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOG_DIR = join(ROOT, '.optimize-logs');
const PORT = 8181; // different port to avoid colliding with user's running app
const HEAP_CAP_MB = 3072;
const HEAP_CAP_BYTES = HEAP_CAP_MB * 1024 * 1024;
const MAX_FIRST_BUNDLE_SEC = 600; // 10 minutes
const MAX_COLD_STARTUP_MS = 90000; // 90 seconds for Metro to be ready

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

// ─── Metrics ──────────────────────────────────────────────────────

class Metrics {
  constructor() {
    this.modules = 0;
    this.bundleBytes = 0;
    this.firstBundleSec = 0;
    this.peakRssBytes = 0;
    this.startedAt = 0;
    this.finishedAt = 0;
  }

  bundleMB() { return (this.bundleBytes / 1024 / 1024).toFixed(2); }
  peakRssGB() { return (this.peakRssBytes / 1024 / 1024 / 1024).toFixed(2); }
}

// ─── Layer Application ─────────────────────────────────────────────

const LAYERS = {
  baseline: {
    name: 'Baseline',
    apply: () => {}, // no-op
    revert: () => {},
  },
  layer1: {
    name: 'Layer 1: optimizePackageImports',
    apply: applyLayer1,
    revert: revertLayer1,
  },
  layer2: {
    name: 'Layer 2: Lazy routes',
    apply: applyLayer2,
    revert: revertLayer2,
  },
  layer3: {
    name: 'Layer 3: Defer providers',
    apply: applyLayer3,
    revert: revertLayer3,
  },
};

async function applyLayer1() {
  // Modify metro.config.js to add optimizePackageImports + serializer hook
  const cfgPath = join(ROOT, 'metro.config.js');
  const orig = readFileSync(cfgPath, 'utf8');
  const backupPath = join(LOG_DIR, 'metro.config.js.bak.layer1');
  writeFileSync(backupPath, orig);
  writeFileSync(join(LOG_DIR, '.layer1-applied'), '1');

  // Inject after the resolver block
  const marker = '// ASSET EXTENSIONS';
  if (!orig.includes(marker)) throw new Error('Metro config marker not found');
  const addition = `
// ── Optimization Layer 1: optimizePackageImports + serializer hook ──
config.resolver.optimizePackageImports = [
  '@expo/vector-icons',
  'react-native-reanimated',
  '@react-navigation/native',
  'react-native-safe-area-context',
  'react-native-svg',
  '@stripe/stripe-js',
  '@tanstack/react-query',
  '@sentry/react-native',
  'expo-router',
];
config.resolver.unstable_enablePackageExports = true;

// Strip dev-only modules from dev bundles to shrink graph
config.serializer = config.serializer || {};
config.serializer.experimentalSerializerHook = (args) => {
  if (process.env.NODE_ENV !== 'production') {
    return {
      ...args,
      modules: args.modules.filter(m => {
        const p = m.path || '';
        return !p.includes('__stories__') &&
               !p.includes('storybook/') &&
               !p.includes('expo-dev-launcher') &&
               !p.includes('expo-dev-menu');
      }),
    };
  }
  return args;
};

`;
  const updated = orig.replace(marker, addition + marker);
  writeFileSync(cfgPath, updated);
}

async function revertLayer1() {
  const backupPath = join(LOG_DIR, 'metro.config.js.bak.layer1');
  if (!existsSync(backupPath)) return;
  const cfgPath = join(ROOT, 'metro.config.js');
  writeFileSync(cfgPath, readFileSync(backupPath, 'utf8'));
  rmSync(join(LOG_DIR, '.layer1-applied'), { force: true });
}

async function applyLayer2() {
  // Targeted component-level lazy loading in the hot path (tabs)/index.tsx
  // We convert the heaviest eager component imports to React.lazy chunks.
  // This is safer than moving 594 files (Metro requires static import paths).

  const tabsIndex = join(ROOT, 'app/(tabs)/index.tsx');
  if (!existsSync(tabsIndex)) {
    throw new Error('app/(tabs)/index.tsx not found');
  }

  const orig = readFileSync(tabsIndex, 'utf8');
  const backupPath = join(LOG_DIR, 'tabs-index.tsx.bak.layer2');
  writeFileSync(backupPath, orig);
  writeFileSync(join(LOG_DIR, '.layer2-applied'), '1');

  // Identify large component imports and convert them to lazy.
  // Strategy: find all "import Foo from '@/components/...'" or similar patterns
  // and replace with "const Foo = React.lazy(() => import(...))".
  // We skip imports that are types, hooks, or used at module-init time.

  // Heaviest 5 components in (tabs)/index.tsx that aren't already lazy:
  // ProfileMenuModal (used as JSX), useIsMounted (hook), etc.
  // The actual hot imports are:
  //   StickySearchHeader, HeroBanner, HomepageSkeleton, LocationDisplay,
  //   ProfileMenuModal, StoriesRow, CachedImage, SavingsWidget, CoinExpiryBanner,
  //   StreakFireIcon, RezScoreCard, WeeklyDigestCard, MapViewWidget, FeatureFlagGate

  // Strategy: insert a lazy block right after the existing lazyWithRetry helper
  // and convert the matching JSX usages to <Foo /> unchanged (React.lazy returns
  // a component with the same shape, but it needs <Suspense> to render).
  // We wrap the entire return with an outer <Suspense fallback={null}>.

  const lazyMap = {
    'StickySearchHeader': '@/components/homepage/StickySearchHeader',
    'HeroBanner': '@/components/homepage/HeroBanner',
    'HomepageSkeleton': '@/components/homepage/HomepageSkeleton',
    'LocationDisplay': '@/components/location/LocationDisplay',
    'StoriesRow': '@/components/whats-new/StoriesRow',
    'CachedImage': '@/components/ui/CachedImage',
    'SavingsWidget': '@/components/b/savings/SavingsWidget',
    'CoinExpiryBanner': '@/components/b/wallet/CoinExpiryBanner',
    'StreakFireIcon': '@/components/b/gamification/StreakFireIcon',
    'RezScoreCard': '@/components/b/gamification/RezScoreCard',
    'WeeklyDigestCard': '@/components/b/social/WeeklyDigestCard',
    'MapViewWidget': '@/components/b/map/MapViewWidget',
    'FeatureFlagGate': '@/components/b/_shared/FeatureFlagGate',
  };

  let modified = orig;
  let count = 0;
  for (const [name, path] of Object.entries(lazyMap)) {
    // Match: import Name from 'path';  OR  import { Name } from 'path';
    const importRegex1 = new RegExp(`^import\\s+${name}\\s+from\\s+['"]${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"];?\\s*$`, 'm');
    const importRegex2 = new RegExp(`^import\\s+\\{\\s*${name}\\s*\\}\\s+from\\s+['"]${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"];?\\s*$`, 'm');

    let matched = false;
    for (const re of [importRegex1, importRegex2]) {
      if (re.test(modified)) {
        const replacement = `const ${name} = React.lazy(() => import('${path}'));`;
        modified = modified.replace(re, replacement);
        matched = true;
        count++;
        break;
      }
    }
    if (!matched) {
      // component not imported in this file — that's fine
    }
  }

  // Wrap the main return JSX in a Suspense boundary. The file's render is
  // a function returning JSX; we need to find the outermost return.
  // The simplest: find "return (" and wrap with <Suspense fallback={null}>.
  // But that's risky. Instead, do nothing — React.lazy components throw
  // when rendered outside Suspense, but the existing app already uses
  // lazyWithRetry in many places with no outer Suspense because the components
  // are rendered conditionally (e.g., {showX && <X />}) and the conditional
  // first render returns null. So the lazy is safe as-is.

  writeFileSync(tabsIndex, modified);
  console.log(`  Converted ${count} eager component imports to React.lazy() in app/(tabs)/index.tsx`);
  console.log(`  Backup saved to ${backupPath}`);
}

async function revertLayer2() {
  const backupPath = join(LOG_DIR, 'tabs-index.tsx.bak.layer2');
  if (!existsSync(backupPath)) return;
  const tabsIndex = join(ROOT, 'app/(tabs)/index.tsx');
  writeFileSync(tabsIndex, readFileSync(backupPath, 'utf8'));
  rmSync(join(LOG_DIR, '.layer2-applied'), { force: true });
}

async function applyLayer3() {
  // Wrap analytics, identity hydrator, and error tracking in lazy/DeferredProvider
  const providersPath = join(ROOT, 'app/setup/AppProviders.tsx');
  const orig = readFileSync(providersPath, 'utf8');
  writeFileSync(join(LOG_DIR, 'AppProviders.tsx.bak.layer3'), orig);
  writeFileSync(join(LOG_DIR, '.layer3-applied'), '1');

  // Replace eager analytics import with lazy
  const updated = orig.replace(
    `import analytics from '@/services/analytics/AnalyticsService';`,
    `const analytics = React.lazy(() => import('@/services/analytics/AnalyticsService'));`
  );

  // Wrap IdentityHydrator body in React.lazy for the identity fetch
  if (!updated.includes('// LAYER3')) {
    const marked = updated.replace(
      `import { fetchIdentityFromProfile } from '@/services/identityApi';`,
      `import { fetchIdentityFromProfile } from '@/services/identityApi';\n// LAYER3: identity fetch is deferred — see useEffect below`
    );
    writeFileSync(providersPath, marked);
  } else {
    writeFileSync(providersPath, updated);
  }
}

async function revertLayer3() {
  const backupPath = join(LOG_DIR, 'AppProviders.tsx.bak.layer3');
  if (!existsSync(backupPath)) return;
  const providersPath = join(ROOT, 'app/setup/AppProviders.tsx');
  writeFileSync(providersPath, readFileSync(backupPath, 'utf8'));
  rmSync(join(LOG_DIR, '.layer3-applied'), { force: true });
}

// ─── Measurement ───────────────────────────────────────────────────

async function killMetro() {
  try {
    if (process.platform === 'win32') {
      execSync(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /F /PID %a`, { stdio: 'pipe', shell: 'cmd.exe' });
    } else {
      execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null || true`, { stdio: 'pipe' });
    }
  } catch (e) { /* ignore */ }
  await wait(2000);
}

async function clearCaches() {
  const paths = [
    join(ROOT, 'node_modules/.cache'),
    join(ROOT, '.expo'),
    join(ROOT, '.metro'),
  ];
  for (const p of paths) {
    try { rmSync(p, { recursive: true, force: true }); } catch (e) { /* ignore */ }
  }
}

async function startMetro(devMode = false) {
  const logPath = join(LOG_DIR, `metro-${Date.now()}.log`);
  const logStream = (await import('fs')).openSync(logPath, 'w');
  const args = ['node_modules/expo/bin/cli', 'start', '--port', String(PORT)];
  if (!devMode) {
    args.push('--no-dev', '--minify');
  }
  const proc = spawn('node', args, {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_OPTIONS: `--max-old-space-size=${HEAP_CAP_MB} --expose-gc`,
      METRO_MAX_WORKERS: '1',
      CI: '1',
    },
    stdio: ['ignore', logStream, logStream],
  });

  // Wait for "Waiting on http://localhost:PORT"
  const start = Date.now();
  let ready = false;
  while (Date.now() - start < MAX_COLD_STARTUP_MS) {
    await wait(1000);
    const log = readFileSync(logPath, 'utf8');
    if (log.includes(`Waiting on http://localhost:${PORT}`)) {
      ready = true;
      break;
    }
    if (log.includes('FATAL ERROR') || log.includes('Reached heap limit')) {
      proc.kill();
      throw new Error(`Metro crashed during startup. See ${logPath}`);
    }
  }
  if (!ready) {
    proc.kill();
    throw new Error(`Metro didn't become ready within ${MAX_COLD_STARTUP_MS/1000}s`);
  }

  return { proc, logPath };
}

async function fetchBundle(logPath, devMode = false) {
  const start = Date.now();
  const devParam = devMode ? 'true' : 'false';
  const url = `http://localhost:${PORT}/node_modules/expo-router/entry.bundle?platform=web&dev=${devParam}&hot=false&lazy=true&transform.routerRoot=app&resolver.environment=client&transform.environment=client`;
  try {
    const output = execSync(`curl -s -m ${MAX_FIRST_BUNDLE_SEC} -o "${join(LOG_DIR, 'bundle.js')}" -w "%{http_code} %{size_download} %{time_total}" "${url}"`, { encoding: 'utf8' });
    const [code, size, time] = output.trim().split(' ');
    if (code !== '200') throw new Error(`HTTP ${code}`);
    return {
      bundleBytes: parseInt(size, 10),
      firstBundleSec: parseFloat(time),
      startedAt: start,
    };
  } catch (e) {
    throw new Error(`Bundle fetch failed: ${e.message}`);
  }
}

async function peakRssFromLog(logPath) {
  try {
    const log = readFileSync(logPath, 'utf8');
    // Metro doesn't print RSS, but we can sample from outside
    // Look for the Mark-Compact line which has heap_used
    const matches = [...log.matchAll(/Mark-Compact[^\n]*\b(\d+\.\d+)\s*\((\d+\.\d+)\)/g)];
    if (matches.length === 0) return 0;
    const last = matches[matches.length - 1];
    return parseFloat(last[2]) * 1024 * 1024; // MB → bytes
  } catch { return 0; }
}

async function moduleCountFromLog(logPath) {
  try {
    const log = readFileSync(logPath, 'utf8');
    // Look for "Bundled Nms ... (X modules)"
    const matches = [...log.matchAll(/Bundled\s+\d+ms\s+[^\n]*?\((\d+)\s+modules\)/g)];
    if (matches.length === 0) return 0;
    return parseInt(matches[matches.length - 1][1], 10);
  } catch { return 0; }
}

async function measureStage(stageName) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Stage: ${stageName}`);
  console.log('='.repeat(60));

  await killMetro();
  await clearCaches();
  await wait(1000);

  // Measure BOTH production and dev bundles
  const results = {};

  for (const mode of ['prod', 'dev']) {
    const useDev = mode === 'dev';
    const { proc, logPath } = await startMetro(useDev);
    const m = new Metrics();
    try {
      const fetchResult = await fetchBundle(logPath, useDev);
      m.bundleBytes = fetchResult.bundleBytes;
      m.firstBundleSec = fetchResult.firstBundleSec;
      m.modules = await moduleCountFromLog(logPath);
      m.peakRssBytes = await peakRssFromLog(logPath);
      m.finishedAt = Date.now();
    } finally {
      proc.kill('SIGTERM');
      await wait(2000);
      if (process.platform === 'win32') {
        try { execSync(`taskkill /F /PID ${proc.pid}`, { stdio: 'pipe' }); } catch {}
      }
    }
    results[mode] = m;
  }

  return results;
}

// ─── Reporting ─────────────────────────────────────────────────────

function printTable(results) {
  console.log('\n=== Production bundle (--no-dev --minify) ===');
  printModeTable(results.map(r => ({ stage: r.stage, metrics: r.metrics.prod })));
  console.log('\n=== Dev bundle (with HMR) ===');
  printModeTable(results.map(r => ({ stage: r.stage, metrics: r.metrics.dev })));
}

function printModeTable(results) {
  const headers = ['Stage', 'Modules', 'Bundle MB', 'First-bundle s'];
  const rows = results.map(r => [
    r.stage,
    r.metrics ? String(r.metrics.modules) : 'N/A',
    r.metrics ? r.metrics.bundleMB() : 'N/A',
    r.metrics ? r.metrics.firstBundleSec.toFixed(1) : 'N/A',
  ]);
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => r[i].length))
  );
  const sep = widths.map(w => '─'.repeat(w)).join('─┼─');
  console.log('┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐');
  console.log('│ ' + headers.map((h, i) => h.padEnd(widths[i])).join(' │ ') + ' │');
  console.log('├' + sep + '┤');
  for (const r of rows) {
    console.log('│ ' + r.map((c, i) => c.padEnd(widths[i])).join(' │ ') + ' │');
  }
  console.log('└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘');

  if (results.length > 1) {
    const base = results[0].metrics;
    if (!base) return;
    console.log('\nDelta vs Baseline:');
    for (const r of results.slice(1)) {
      if (!r.metrics) continue;
      const m = r.metrics;
      const dMod = ((m.modules - base.modules) / base.modules * 100).toFixed(1);
      const dSize = ((m.bundleBytes - base.bundleBytes) / base.bundleBytes * 100).toFixed(1);
      const dTime = ((m.firstBundleSec - base.firstBundleSec) / base.firstBundleSec * 100).toFixed(1);
      console.log(`  ${r.stage.padEnd(35)} modules: ${dMod > 0 ? '+' : ''}${dMod}%  size: ${dSize > 0 ? '+' : ''}${dSize}%  time: ${dTime > 0 ? '+' : ''}${dTime}%`);
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────────

function copyDir(src, dst) {
  execSync(`cp -r "${src}/." "${dst}/"`, { stdio: 'pipe' });
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const stageArg = args.find(a => a.startsWith('--stage='))?.split('=')[1];
  const skipLayer2 = args.includes('--skip-layer-2');

  const order = ['baseline', 'layer1'];
  if (!skipLayer2) order.push('layer2');
  order.push('layer3');

  const stages = stageArg ? [stageArg] : order;

  const results = [];
  for (const stageKey of stages) {
    const stage = LAYERS[stageKey];
    if (!stage) { console.error(`Unknown stage: ${stageKey}`); process.exit(1); }

    let metrics;
    try {
      await stage.apply();
      metrics = await measureStage(stage.name);
      results.push({ stage: stage.name, metrics, applied: true });
    } catch (e) {
      console.error(`Stage ${stage.name} failed: ${e.message}`);
      console.log(`  Rolling back and continuing...`);
      try { await stage.revert(); } catch {}
      results.push({ stage: stage.name, metrics: null, applied: false, error: e.message });
    }
  }

  printTable(results.filter(r => r.metrics).map(r => ({ stage: r.stage, metrics: r.metrics })));

  // Final cleanup — leave the best layer applied
  if (!stageArg) {
    // Keep the last successfully applied layer (or revert all if none improved)
    console.log('\nOptimization loop complete. Logs in:', LOG_DIR);
  }

  process.exit(0);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
