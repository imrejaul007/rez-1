#!/usr/bin/env node
/**
 * memory-trace.mjs — Start Metro with memory monitoring and identify
 * what causes the heap to grow during bundling.
 *
 * Runs Metro, samples RSS + heap every 5s during the bundling process,
 * and identifies the biggest memory consumers.
 *
 * Usage: node scripts/memory-trace.mjs [--no-clear]
 */

import { spawn, execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { setTimeout as wait } from 'timers/promises';

const ROOT = process.cwd();
const PORT = 8282;
const HEAP_CAP_MB = 3072;
const LOG_DIR = join(ROOT, '.optimize-logs');

if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

async function startMetroWithMemoryTrace() {
  const logPath = join(LOG_DIR, `metro-memtrace-${Date.now()}.log`);
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

  console.log(`Metro PID: ${proc.pid}`);
  console.log(`Log: ${logPath}`);
  console.log('Sampling memory every 5s...\n');

  const samples = [];
  const startTime = Date.now();

  // Sample memory in background
  const sampleInterval = setInterval(async () => {
    try {
      const output = execSync(`tasklist /FI "PID eq ${proc.pid}" /FO CSV /NH 2>&1`, { encoding: 'utf8' });
      const lines = output.trim().split('\n');
      for (const line of lines) {
        const parts = line.split(',');
        if (parts.length >= 5 && parts[1] === String(proc.pid)) {
          // Windows memory in KB (5th field after "PID,Name,Session,Mem,...")
          const memKb = parseInt(parts[4].replace(/[",\s]/g, ''), 10);
          if (!isNaN(memKb)) {
            const memGb = (memKb / 1024 / 1024).toFixed(3);
            const uptime = Math.floor((Date.now() - startTime) / 1000);
            samples.push({ t: uptime, rssGb: parseFloat(memGb), ts: Date.now() });
            process.stdout.write(`t=${uptime}s  RSS=${memGb} GB\n`);
          }
        }
      }
    } catch {}
  }, 5000);

  // Wait for ready
  const readyStart = Date.now();
  let ready = false;
  while (Date.now() - readyStart < 90000) {
    await wait(2000);
    const log = readFileSync(logPath, 'utf8');
    if (log.includes(`Waiting on http://localhost:${PORT}`)) {
      ready = true;
      console.log(`\n✓ Metro ready after ${Math.floor((Date.now() - readyStart)/1000)}s`);
      break;
    }
    if (log.includes('FATAL') || log.includes('Reached heap')) {
      clearInterval(sampleInterval);
      proc.kill();
      console.error(`Metro crashed. See ${logPath}`);
      process.exit(1);
    }
  }

  if (!ready) {
    clearInterval(sampleInterval);
    proc.kill();
    console.error('Metro did not become ready in 90s');
    process.exit(1);
  }

  // Trigger a bundle to see memory pressure
  console.log('\nTriggering bundle request...');
  const bundleStart = Date.now();
  try {
    execSync(`curl -s -m 600 -o "${join(LOG_DIR, 'memtrace-bundle.js')}" -w "HTTP %{http_code} size=%{size_download} time=%{time_total}" "http://localhost:${PORT}/node_modules/expo-router/entry.bundle?platform=web&dev=false&hot=false&lazy=true&transform.routerRoot=app&resolver.environment=client&transform.environment=client"`, { encoding: 'utf8', stdio: 'inherit' });
  } catch (e) {
    console.error(`Bundle failed: ${e.message}`);
  }
  const bundleTime = Math.floor((Date.now() - bundleStart) / 1000);
  console.log(`\nBundle complete in ${bundleTime}s`);

  // Sample for 30 more seconds to see memory release
  console.log('\nSampling for 30s after bundle...');
  await wait(30000);
  clearInterval(sampleInterval);

  // Print analysis
  console.log('\n=== Memory Analysis ===');
  if (samples.length === 0) {
    console.log('No samples collected');
  } else {
    const peak = Math.max(...samples.map(s => s.rssGb));
    const min = Math.min(...samples.map(s => s.rssGb));
    const final = samples[samples.length - 1].rssGb;
    console.log(`  Peak RSS: ${peak.toFixed(2)} GB`);
    console.log(`  Min RSS:  ${min.toFixed(2)} GB`);
    console.log(`  Final RSS: ${final.toFixed(2)} GB`);
    console.log(`  Memory growth: ${(final - samples[0].rssGb).toFixed(2)} GB`);
    console.log(`  Bundle time: ${bundleTime}s`);
    console.log(`  Heap cap: ${HEAP_CAP_MB} MB`);
  }

  // Kill metro
  try {
    execSync(`taskkill //F //PID ${proc.pid}`, { stdio: 'pipe' });
  } catch {}

  // Try to also dump the bundle's V8 heap stats from the log
  const log = readFileSync(logPath, 'utf8');
  const heapMatches = [...log.matchAll(/Mark-Compact[^\n]*\((\d+\.\d+)\)/g)];
  if (heapMatches.length > 0) {
    console.log(`\n=== V8 Heap Stats (from Metro log) ===`);
    const last = heapMatches[heapMatches.length - 1];
    console.log(`  Last Mark-Compact peak: ${last[1]} MB`);
  }
}

startMetroWithMemoryTrace().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});