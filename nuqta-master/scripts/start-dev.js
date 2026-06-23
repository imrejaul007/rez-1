#!/usr/bin/env node
/**
 * Development server starter with memory management
 * Run with: node --expose-gc --max-old-space-size=2048 scripts/start-dev.js
 */

const { spawn } = require('child_process');
const path = require('path');

// Memory monitoring interval (every 2 minutes)
const MEMORY_CHECK_INTERVAL = 2 * 60 * 1000;

// Memory threshold for warning (1.5GB)
const MEMORY_WARNING_THRESHOLD = 1.5 * 1024 * 1024 * 1024;

// Track start time
const startTime = Date.now();

// Format bytes to human readable
function formatBytes(bytes) {
  const gb = bytes / (1024 * 1024 * 1024);
  return `${gb.toFixed(2)} GB`;
}

// Format uptime
function formatUptime(ms) {
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}

// Run garbage collection if available
function runGC() {
  if (global.gc) {
    const before = process.memoryUsage().heapUsed;
    global.gc();
    const after = process.memoryUsage().heapUsed;
    const freed = before - after;
    if (freed > 0) {
      console.log(`\x1b[36m[Memory] GC freed ${formatBytes(freed)}\x1b[0m`);
    }
  }
}

// Memory monitor
function startMemoryMonitor() {
  setInterval(() => {
    const usage = process.memoryUsage();
    const uptime = formatUptime(Date.now() - startTime);

    console.log(`\x1b[36m[Memory] Heap: ${formatBytes(usage.heapUsed)} / ${formatBytes(usage.heapTotal)} | RSS: ${formatBytes(usage.rss)} | Uptime: ${uptime}\x1b[0m`);

    // Run GC periodically
    runGC();

    // Warn if memory is high
    if (usage.heapUsed > MEMORY_WARNING_THRESHOLD) {
      console.log(`\x1b[33m[Memory] ⚠️  High memory usage! Consider restarting the bundler.\x1b[0m`);
    }
  }, MEMORY_CHECK_INTERVAL);
}

// Get command line args (skip node and script path)
const args = process.argv.slice(2);
const shouldClear = args.includes('--clear') || args.includes('-c');

// Build expo command
const expoArgs = ['start'];
if (shouldClear) {
  expoArgs.push('--clear');
}

// Start memory monitor
startMemoryMonitor();

console.log('\x1b[32m[Dev Server] Starting with memory management...\x1b[0m');
console.log(`\x1b[32m[Dev Server] GC available: ${typeof global.gc === 'function' ? 'Yes ✓' : 'No (run with --expose-gc)'}\x1b[0m`);

// Run initial GC
runGC();

// Spawn expo process
const expo = spawn('npx', ['expo', ...expoArgs], {
  stdio: 'inherit',
  shell: true,
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    FORCE_COLOR: '1',
    NODE_OPTIONS: '--max-old-space-size=16384',
  },
});

// Handle exit
expo.on('close', (code) => {
  console.log(`\x1b[33m[Dev Server] Exited with code ${code}\x1b[0m`);
  process.exit(code);
});

// Handle errors
expo.on('error', (err) => {
  console.error('\x1b[31m[Dev Server] Failed to start:\x1b[0m', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\x1b[33m[Dev Server] Shutting down...\x1b[0m');
  expo.kill('SIGINT');
});

process.on('SIGTERM', () => {
  expo.kill('SIGTERM');
});
