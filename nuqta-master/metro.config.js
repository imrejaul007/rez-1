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

// Fix: @tanstack/react-query v5.90+ with "type":"module" breaks Metro 0.80 resolution
const tanstackReactQueryEntry = path.resolve(
  __dirname, 'node_modules/@tanstack/react-query/build/legacy/index.cjs'
);
const tanstackQueryCoreEntry = path.resolve(
  __dirname, 'node_modules/@tanstack/query-core/build/legacy/index.cjs'
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
