/**
 * Performance Benchmark Script
 *
 * Measures API endpoint latency and compares against baselines.
 * Used in CI to detect performance regressions.
 *
 * Run: npm run perf:bench
 */

import dotenv from 'dotenv';
import { logger } from '../config/logger';

dotenv.config({ path: '.env.test' });

interface BenchResult {
  endpoint: string;
  runs: number;
  p50: number;
  p95: number;
  p99: number;
  passed: boolean;
  threshold: number;
}

/**
 * Endpoint thresholds (p95 latency in ms)
 * These should be realistic for your infrastructure
 * More critical endpoints have lower thresholds
 */
const THRESHOLDS: Record<string, number> = {
  '/api/health': 50, // Health check should be very fast
  '/api/stores/featured': 200, // Featured stores listing
  '/api/consumer/home-snapshot': 300, // Complex aggregation
  '/api/consumer/deals': 250, // Deal listing
};

/**
 * Measure endpoint latency
 */
async function measureEndpoint(url: string, runs: number = 20): Promise<{ p50: number; p95: number; p99: number }> {
  const times: number[] = [];
  const baseUrl = process.env.PERF_BASE_URL || 'http://localhost:3001';

  for (let i = 0; i < runs; i++) {
    try {
      const start = Date.now();
      const response = await Promise.race([
        fetch(`${baseUrl}${url}`),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
      ]);
      const elapsed = Date.now() - start;

      // Only count successful responses
      if (response instanceof Response && response.ok) {
        times.push(elapsed);
      }
    } catch (err) {
      logger.warn(`Request ${i + 1} failed:`, (err as Error).message);
    }
  }

  if (times.length === 0) {
    throw new Error(`No successful requests for ${url}`);
  }

  times.sort((a, b) => a - b);
  const p50Index = Math.floor(times.length * 0.5);
  const p95Index = Math.floor(times.length * 0.95);
  const p99Index = Math.floor(times.length * 0.99);

  return {
    p50: times[Math.max(0, p50Index)],
    p95: times[Math.max(0, p95Index)],
    p99: times[Math.max(0, p99Index)],
  };
}

/**
 * Main benchmark runner
 */
async function main() {
  const results: BenchResult[] = [];
  let allPassed = true;
  let maxP95 = 0;

  logger.info('Starting performance benchmarks...\n');

  for (const [endpoint, threshold] of Object.entries(THRESHOLDS)) {
    try {
      const { p50, p95, p99 } = await measureEndpoint(endpoint);
      const passed = p95 <= threshold;

      if (!passed) {
        allPassed = false;
      }

      maxP95 = Math.max(maxP95, p95);

      results.push({
        endpoint,
        runs: 20,
        p50,
        p95,
        p99,
        passed,
        threshold,
      });

      const status = passed ? '✅' : '❌';
      logger.info(
        `${status} ${endpoint.padEnd(40)} p50=${p50.toString().padStart(3)}ms p95=${p95
          .toString()
          .padStart(3)}ms p99=${p99.toString().padStart(3)}ms (threshold: ${threshold}ms)`,
      );
    } catch (err) {
      logger.error(`❌ ${endpoint} - Error:`, (err as Error).message);
      allPassed = false;
    }
  }

  // Summary for CI parsing
  logger.info('\n--- Performance Summary ---');
  logger.info(`p95: ${maxP95}ms`);
  logger.info(`Status: ${allPassed ? 'PASS' : 'FAIL'}`);

  // Exit with failure if any endpoint exceeded threshold
  if (!allPassed) {
    logger.info('\nPerformance regression detected. Review the thresholds and optimize.');
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error('Benchmark error:', err);
  process.exit(1);
});
