const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const os = require('os');

const config = getDefaultConfig(__dirname);

// =============================================================================
// WORKER CONFIGURATION
// =============================================================================

// Cap workers to limit memory — each worker holds its own AST cache.
// On memory-constrained dev boxes (16GB Windows), a single worker keeps peak
// heap under control; with 2 workers Metro + 2 Babel workers routinely
// pushed the bundler past 3.5GB during cold transforms.
const cpuCount = os.cpus().length;
config.maxWorkers = process.env.METRO_MAX_WORKERS
  ? Math.max(1, parseInt(process.env.METRO_MAX_WORKERS, 10))
  : 1; // Default to 1 worker — set METRO_MAX_WORKERS=2 if you have 32GB+ RAM.

// =============================================================================
// RESOLVER — force NodeWatcher to break the rebundle loop
// =============================================================================
// `config.resolver.useWatchman = false` tells metro-file-map to use its
// NodeWatcher instead of WatchmanWatcher. NodeWatcher debounces FS events
// with a 100ms timer (`DEBOUNCE_MS` in metro-file-map/src/watchers/NodeWatcher.js)
// and falls back to recursive fs.watch on every directory — robust on Windows
// + OneDrive where Watchman/native FSEvents cascade into feedback loops that
// drove Metro into an infinite rebundle cycle (OOM at 10 GB). This setting is
// consumed in `metro/src/node-haste/DependencyGraph/createFileMap.js:120`.
// Set USE_WATCHMAN=1 to revert.
if (process.env.USE_WATCHMAN !== '1') {
  config.resolver.useWatchman = false;
}

// =============================================================================
// CACHE SETTINGS
// =============================================================================

// resetCache:false prevents accidental cache wipes that would force Metro to
// re-transform the entire 3700+ module graph from scratch (which can spike
// the heap past 4 GB). See the FileStore discussion in the CACHE STORES
// section below for the persistent-cache vs. in-memory trade-off.
config.resetCache = false;

// =============================================================================
// TRANSFORMER OPTIMIZATIONS
// =============================================================================

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      reduce_funcs: true,
      reduce_vars: true,
    },
  },
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      // Use Metro 0.80+'s 'metro' value for inline requires — it's a more
      // aggressive inlining strategy than the boolean `true` form. It wraps
      // every top-level `require()` in a thunk so the module body doesn't
      // execute (and allocate its closure scope) until the require is
      // actually called. Critical for keeping the 3700+ module graph's
      // transform-pass memory under 2 GB.
      inlineRequires: 'metro',
    },
  }),
};

// =============================================================================
// WATCHER OPTIMIZATIONS (Critical for Windows + OneDrive)
// =============================================================================

config.watcher = {
  ...config.watcher,
  healthCheck: {
    enabled: false,
  },
  // Disable worker threads for watcher — fixes startup timeout on Windows + OneDrive
  unstable_workerThreads: false,
  additionalExts: [],
  // Increase watcher timeout for Windows + OneDrive (default 5s is too short)
  watchman: {
    deferStates: ['hg.update'],
  },
};

// Increase file map watcher timeout (default is too aggressive for OneDrive)
process.env.METRO_FILE_MAP_WATCHER_HEALTH_CHECK_TIMEOUT = '120000';

// =============================================================================
// RESOLVER OPTIMIZATIONS
// =============================================================================

config.resolver = {
  ...config.resolver,
  blockList: [
    // VCS / OS noise
    /\.git\/.*/,
    /\.tmp$/,
    /~\$/,
    /\.onedrive/,
    // Native build artifacts
    /android\/\.gradle\/.*/,
    /ios\/Pods\/.*/,
    /\.kotlin\/.*/,
    // Test/mock/example/backup files (never needed at runtime)
    /__tests__\/.*/,
    /__mocks__\/.*/,
    /\.test\.(js|jsx|ts|tsx)$/,
    /\.spec\.(js|jsx|ts|tsx)$/,
    /\.example\.(js|jsx|ts|tsx)$/,
    /\.LAZY_LOADING_EXAMPLE\.(js|jsx|ts|tsx)$/,
    /tests\.bak/,
    /examples\/.*/,
    // Build tooling that should never be in the JS graph
    /scripts\/.*/,
    /e2e\/.*/,
    /\.maestro\/.*/,
    /detox\/.*/,
    // CI / IDE / tooling folders (root-level only — match both /<x> and /<x>/...)
    /^\.\/?\.github\/.*/,
    /^\.\/?\.vscode\/.*/,
    /^\.\/?\.claude\/.*/,
    // Documentation / audit / coverage (11 MB of markdown + 6.8 MB of HTML/JSON
    // that Metro was hashing on every startup — major heap pressure source)
    /^\.\/?docs\/.*/,
    /^\.\/?database-audit-reports\/.*/,
    /^\.\/?coverage\/.*/,
    /^\.\/?\.maestro\/.*/,
    /^\.\/?\.expo\/.*/,
    // Generated reports that change on every run
    /eslint-full-report\.json$/,
    /run_.*\.log$/,
    /.*\.(log|tmp)$/,
    /.*\.tsbuildinfo$/,
    // Storybook (if present)
    /\.storybook\/.*/,
    /\.stories\.(js|jsx|ts|tsx)$/,
    // ── Dev-only tooling (from analysis: 1,707+ files pulled in by Metro) ──
    // ESLint, TypeScript ESLint, jest preset, and their transitive deps
    // are in devDependencies but Metro still scans them. Block the whole trees.
    /node_modules\/eslint\/.*/,
    /node_modules\/eslint-config-expo\/.*/,
    /node_modules\/eslint-plugin-react\/.*/,
    /node_modules\/eslint-plugin-react-hooks\/.*/,
    /node_modules\/eslint-plugin-react-native\/.*/,
    /node_modules\/@eslint\/.*/,
    /node_modules\/@typescript-eslint\/.*/,
    /node_modules\/@babel\/eslint-parser\/.*/,
    /node_modules\/ts-jest\/.*/,
    /node_modules\/jest\/.*/,
    /node_modules\/jest-.*\/.*/,
    /node_modules\/@jest\/.*/,
    /node_modules\/@types\/jest\/.*/,
    /node_modules\/expect\/.*/,
    /node_modules\/pretty-format\/.*/,
    /node_modules\/@sinonjs\/.*/,
    /node_modules\/sinon\/.*/,
    /node_modules\/istanbul\/.*/,
    /node_modules\/nyc\/.*/,
    /node_modules\/babel-jest\/.*/,
    /node_modules\/babel-plugin-jest-hoist\/.*/,
    /node_modules\/babel-preset-jest\/.*/,
    // Type-checking helpers (only used by tsc, not at runtime)
    /node_modules\/typescript\/lib\/tsc\.js$/,
    /node_modules\/typescript\/lib\/tsserver\.js$/,
    /node_modules\/typescript\/lib\/typescript\.js$/,
    // Huge lookup-table packages we don't need
    /node_modules\/caniuse-lite\/data\/.*/,  // 5+ MB of browser compat data
    /node_modules\/regenerate-unicode-properties\/.*/,  // 1.5 MB of unicode data
    /node_modules\/es-abstract\/.*/,  // 2,472 files of ECMAScript spec helpers — used by lodash etc but Metro scans them all
    /node_modules\/lodash\/.*/,  // 1,048 files; only used by @expo/cli (dev tool) and jest-expo
    /node_modules\/lodash-es\/.*/,
    // JSON schema validators (often only used by build tools)
    /node_modules\/ajv\/.*/,  // 319 files, transitively required by some build tools
    /node_modules\/ajv-formats\/.*/,
    /node_modules\/json-schema-deref-sync\/.*/,  // brings lodash
  ],
  hasteImplModulePath: undefined,
  // Map nested node_modules so Metro can resolve markdown-it's entities@2 correctly
  extraNodeModules: {
    ...config.resolver.extraNodeModules,
  },
};

// Fix: markdown-it@10 needs entities@2 (with lib/maps/entities.json),
// but Metro hoists entities@6 which lacks that file. Add the nested path to watchFolders
// so Metro can track and hash the file.
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, 'node_modules/markdown-it/node_modules/entities'),
];

// =============================================================================
// CACHE STORES
// =============================================================================
// The previous setup used FileStore, which grew to 545 MB on this project
// (3000+ modules × ~150 KB of cached AST/source-maps per module). On startup
// Metro had to mmap all of that back into the process, which alone consumed
// ~1.5 GB of RSS before any transform ran — pushing us over the 4 GB heap
// cap on Windows boxes with 16 GB total RAM.
//
// Switch to Metro's default in-memory cache. It still keeps the per-session
// cache hot (so incremental rebuilds inside one `expo start` are fast), but
// nothing is persisted to disk between restarts, so each session starts
// from a clean slate. Trade-off: first cold start is slower (~30-60s) but
// peak memory is bounded and you never hit the 4 GB OOM.
//
// If you're on a 32 GB+ box and want maximum cache speed, set
// USE_FILE_STORE_CACHE=1 before starting metro.
if (process.env.USE_FILE_STORE_CACHE === '1') {
  try {
    const { FileStore } = require('metro-cache');
    config.cacheStores = [
      new FileStore({
        root: path.join(__dirname, 'node_modules/.cache/metro'),
      }),
    ];
  } catch (error) {
    console.warn('metro-cache not available, using default cache');
    config.cacheStores = [];
  }
} else {
  // Empty array = Metro uses its built-in in-memory cache (default behavior)
  config.cacheStores = [];
}

// =============================================================================
// ASSET EXTENSIONS
// =============================================================================

config.resolver.assetExts.push('svg');

// =============================================================================
// WEB SHIMS CONFIGURATION (only applies to platform === 'web')
// =============================================================================

const shimPath = path.resolve(__dirname, 'web-shims');
const rnWebExports = path.resolve(__dirname, 'node_modules/react-native-web/dist/exports');

// Pre-build lookup maps for O(1) resolution instead of O(n) iteration
const webShimMap = new Map([
  ['Utilities/Platform', path.join(rnWebExports, 'Platform/index.js')],
  ['PlatformColorValueTypes', path.join(shimPath, 'PlatformColorValueTypes.js')],
  ['RendererProxy', path.join(shimPath, 'RendererProxy.js')],
  ['BaseViewConfig', path.join(shimPath, 'BaseViewConfig.js')],
  ['PlatformBaseViewConfig', path.join(shimPath, 'BaseViewConfig.js')],
  ['ReactNativeTypes', path.join(shimPath, 'ReactNativeTypes.js')],
  ['NativeComponent', path.join(shimPath, 'empty.js')],
  ['TextInputState', path.join(shimPath, 'TextInputState.js')],
]);

const webPackageShimPrefix = '@stripe/stripe-react-native';
const stripeShimPath = path.join(shimPath, 'stripe-react-native.js');

const markdownItEntitiesJson = path.resolve(
  __dirname, 'node_modules/markdown-it/node_modules/entities/lib/maps/entities.json'
);

// Fix: @tanstack/react-query v5.90+ with "type":"module" breaks Metro 0.80 resolution.
// v5.6+ removed build/legacy/index.cjs; use build/modern/index.js (or package main).
const tanstackReactQueryEntry = path.resolve(
  __dirname, 'node_modules/@tanstack/react-query/build/modern/index.js'
);
const tanstackQueryCoreEntry = path.resolve(
  __dirname, 'node_modules/@tanstack/query-core/build/modern/index.js'
);

const localforageFilePath = path.resolve(
  __dirname, 'node_modules/localforage/dist/localforage.js'
);

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Fix: @sentry/integrations requires localforage whose dist file Metro can't resolve
  if (moduleName === 'localforage') {
    return { filePath: localforageFilePath, type: 'sourceFile' };
  }

  // Fix: redirect entities/lib/maps/entities.json to markdown-it's nested entities@2
  // (top-level entities@6 removed this file)
  if (moduleName === 'entities/lib/maps/entities.json') {
    return { filePath: markdownItEntitiesJson, type: 'sourceFile' };
  }

  // Fix: @tanstack/react-query v5.90+ uses "type":"module" which breaks Metro 0.80
  if (moduleName === '@tanstack/react-query') {
    return { filePath: tanstackReactQueryEntry, type: 'sourceFile' };
  }
  if (moduleName === '@tanstack/query-core') {
    return { filePath: tanstackQueryCoreEntry, type: 'sourceFile' };
  }

  // SHORT-CIRCUIT: Skip all shim logic for non-web platforms
  if (platform === 'web') {
    // Check package shim (single string check, not a loop)
    if (moduleName === webPackageShimPrefix || moduleName.startsWith(webPackageShimPrefix + '/')) {
      return { filePath: stripeShimPath, type: 'sourceFile' };
    }
    // Check internal module shims using Map for O(1) lookup
    for (const [pattern, shimFile] of webShimMap) {
      if (moduleName.includes(pattern)) {
        return { filePath: shimFile, type: 'sourceFile' };
      }
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// =============================================================================
// SERVER CONFIGURATION
// =============================================================================

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => middleware,
};

// =============================================================================
// SUPPRESS KNOWN HARMLESS WARNINGS (bundler-level only)
// =============================================================================

const originalWarn = console.warn;
const suppressedPrefixes = [
  'Require cycle:',
  '"shadow*" style props are deprecated',
  '"textShadow*" style props are deprecated',
  'props.pointerEvents is deprecated',
];

console.warn = (...args) => {
  if (typeof args[0] === 'string') {
    for (const prefix of suppressedPrefixes) {
      if (args[0].includes(prefix)) return;
    }
  }
  originalWarn.apply(console, args);
};

module.exports = config;
