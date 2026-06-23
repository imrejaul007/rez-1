/**
 * scripts/loadTest.ts
 *
 * Sprint 15 load test script using Node.js built-in http/https modules.
 * Artillery is available in devDependencies but this script uses built-ins
 * so it runs without a running dev server config — just `ts-node scripts/loadTest.ts`.
 *
 * Configuration via environment variables:
 *   BASE_URL          — target base URL (default: http://localhost:5000)
 *   CONCURRENCY       — parallel virtual users (default: 50)
 *   DURATION_SECONDS  — test duration in seconds (default: 30)
 */

import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

// ── Configuration ────────────────────────────────────────────────────────────

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const CONCURRENCY = parseInt(process.env.CONCURRENCY || '50', 10);
const DURATION_SECONDS = parseInt(process.env.DURATION_SECONDS || '30', 10);

const ENDPOINTS: string[] = [
  '/health',
  '/api/stores/feed?lat=28.6&lng=77.2',
  '/api/offers?lat=28.6&lng=77.2&radius=2000',
  '/api/user/savings/best-nearby?lat=28.6&lng=77.2',
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface RequestResult {
  latencyMs: number;
  statusCode: number;
  error: boolean;
}

interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
}

interface EndpointSummary {
  endpoint: string;
  totalRequests: number;
  errorCount: number;
  requestsPerSec: number;
  latency: PercentileStats;
  minMs: number;
  maxMs: number;
  avgMs: number;
}

interface LoadTestSummary {
  config: {
    baseUrl: string;
    concurrency: number;
    durationSeconds: number;
    endpoints: string[];
  };
  startedAt: string;
  completedAt: string;
  totalDurationMs: number;
  overall: {
    totalRequests: number;
    totalErrors: number;
    errorRate: string;
    requestsPerSec: number;
    latency: PercentileStats;
  };
  byEndpoint: EndpointSummary[];
}

// ── HTTP request helper ───────────────────────────────────────────────────────

function makeRequest(targetUrl: string): Promise<RequestResult> {
  return new Promise((resolve) => {
    const parsed = url.parse(targetUrl);
    const transport = parsed.protocol === 'https:' ? https : http;

    const options: http.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path || '/',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'REZ-LoadTest/1.0',
      },
      timeout: 10000,
    };

    const start = Date.now();

    const req = transport.request(options, (res) => {
      // Drain the response body so the socket is released
      res.on('data', () => {});
      res.on('end', () => {
        resolve({
          latencyMs: Date.now() - start,
          statusCode: res.statusCode || 0,
          error: (res.statusCode || 0) >= 500,
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        latencyMs: Date.now() - start,
        statusCode: 0,
        error: true,
      });
    });

    req.on('error', () => {
      resolve({
        latencyMs: Date.now() - start,
        statusCode: 0,
        error: true,
      });
    });

    req.end();
  });
}

// ── Statistics helpers ────────────────────────────────────────────────────────

function percentile(sortedLatencies: number[], p: number): number {
  if (sortedLatencies.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sortedLatencies.length) - 1;
  return sortedLatencies[Math.max(0, idx)];
}

function calcStats(results: RequestResult[]): {
  latency: PercentileStats;
  minMs: number;
  maxMs: number;
  avgMs: number;
  errorCount: number;
} {
  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  const errorCount = results.filter((r) => r.error).length;

  if (latencies.length === 0) {
    return {
      latency: { p50: 0, p95: 0, p99: 0 },
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      errorCount,
    };
  }

  const sum = latencies.reduce((acc, v) => acc + v, 0);

  return {
    latency: {
      p50: percentile(latencies, 50),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
    },
    minMs: latencies[0],
    maxMs: latencies[latencies.length - 1],
    avgMs: Math.round(sum / latencies.length),
    errorCount,
  };
}

// ── Load test runner ──────────────────────────────────────────────────────────

async function runEndpointWorker(
  endpoint: string,
  results: RequestResult[],
  stopAt: number,
): Promise<void> {
  const fullUrl = `${BASE_URL}${endpoint}`;
  while (Date.now() < stopAt) {
    const result = await makeRequest(fullUrl);
    results.push(result);
  }
}

async function runLoadTest(): Promise<void> {
  console.log('');
  console.log('REZ Load Test — Sprint 15');
  console.log('='.repeat(50));
  console.log(`Base URL    : ${BASE_URL}`);
  console.log(`Concurrency : ${CONCURRENCY} virtual users`);
  console.log(`Duration    : ${DURATION_SECONDS}s`);
  console.log(`Endpoints   : ${ENDPOINTS.length}`);
  console.log('='.repeat(50));
  console.log('');

  const startedAt = new Date().toISOString();
  const testStart = Date.now();
  const stopAt = testStart + DURATION_SECONDS * 1000;

  // Collect results per endpoint
  const resultsByEndpoint = new Map<string, RequestResult[]>();
  for (const ep of ENDPOINTS) {
    resultsByEndpoint.set(ep, []);
  }

  // Distribute CONCURRENCY workers round-robin across endpoints
  const workers: Promise<void>[] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    const ep = ENDPOINTS[i % ENDPOINTS.length];
    const results = resultsByEndpoint.get(ep)!;
    workers.push(runEndpointWorker(ep, results, stopAt));
  }

  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - testStart) / 1000);
    const totalSoFar = [...resultsByEndpoint.values()].reduce((acc, r) => acc + r.length, 0);
    process.stdout.write(`\r  Elapsed: ${elapsed}s / ${DURATION_SECONDS}s  |  Requests: ${totalSoFar}`);
  }, 500);

  await Promise.all(workers);
  clearInterval(progressInterval);
  console.log('');

  const completedAt = new Date().toISOString();
  const totalDurationMs = Date.now() - testStart;
  const actualDurationSec = totalDurationMs / 1000;

  // Build per-endpoint summaries
  const byEndpoint: EndpointSummary[] = [];
  const allResults: RequestResult[] = [];

  for (const ep of ENDPOINTS) {
    const results = resultsByEndpoint.get(ep)!;
    allResults.push(...results);

    const stats = calcStats(results);
    byEndpoint.push({
      endpoint: ep,
      totalRequests: results.length,
      errorCount: stats.errorCount,
      requestsPerSec: parseFloat((results.length / actualDurationSec).toFixed(2)),
      latency: stats.latency,
      minMs: stats.minMs,
      maxMs: stats.maxMs,
      avgMs: stats.avgMs,
    });
  }

  // Overall stats
  const overallStats = calcStats(allResults);
  const totalRequests = allResults.length;
  const totalErrors = overallStats.errorCount;
  const overallRps = parseFloat((totalRequests / actualDurationSec).toFixed(2));

  const summary: LoadTestSummary = {
    config: {
      baseUrl: BASE_URL,
      concurrency: CONCURRENCY,
      durationSeconds: DURATION_SECONDS,
      endpoints: ENDPOINTS,
    },
    startedAt,
    completedAt,
    totalDurationMs,
    overall: {
      totalRequests,
      totalErrors,
      errorRate: `${((totalErrors / Math.max(totalRequests, 1)) * 100).toFixed(2)}%`,
      requestsPerSec: overallRps,
      latency: overallStats.latency,
    },
    byEndpoint,
  };

  // ── Print report ──────────────────────────────────────────────────────────
  console.log('');
  console.log('RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Requests  : ${totalRequests}`);
  console.log(`Total Errors    : ${totalErrors}  (${summary.overall.errorRate})`);
  console.log(`Requests/sec    : ${overallRps}`);
  console.log(`Latency p50     : ${overallStats.latency.p50}ms`);
  console.log(`Latency p95     : ${overallStats.latency.p95}ms`);
  console.log(`Latency p99     : ${overallStats.latency.p99}ms`);
  console.log('');
  console.log('Per-Endpoint Breakdown:');
  console.log('-'.repeat(50));

  for (const ep of byEndpoint) {
    console.log(`  ${ep.endpoint}`);
    console.log(`    Requests : ${ep.totalRequests}  |  Errors: ${ep.errorCount}  |  RPS: ${ep.requestsPerSec}`);
    console.log(`    Latency  : p50=${ep.latency.p50}ms  p95=${ep.latency.p95}ms  p99=${ep.latency.p99}ms`);
    console.log(`    Min/Max  : ${ep.minMs}ms / ${ep.maxMs}ms`);
  }

  console.log('='.repeat(50));

  // ── Write JSON summary ────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, 'load-test-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\nSummary written to: ${outputPath}`);
  console.log('');
}

runLoadTest().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
