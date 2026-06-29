/**
 * Prometheus Metrics Middleware
 * Exposes metrics endpoint and tracks HTTP request metrics
 *
 * Usage:
 *   import { metricsRouter, httpRequestDuration, httpRequestsTotal } from './middleware/metrics';
 *   app.use(metricsRouter);
 */

import { Router, Request, Response, NextFunction } from 'express';

// Metric counters and histograms
const httpRequestsTotal = new Map<string, number>();
const httpRequestDurations = new Map<string, number[]>();

/**
 * Record an HTTP request
 */
export function recordRequest(method: string, path: string, status: number, durationMs: number): void {
  const key = `${method}:${path}:${status}`;
  httpRequestsTotal.set(key, (httpRequestsTotal.get(key) || 0) + 1);

  // Store duration for percentile calculation
  const durations = httpRequestDurations.get(key) || [];
  durations.push(durationMs);
  if (durations.length > 1000) durations.shift();
  httpRequestDurations.set(key, durations);
}

/**
 * Calculate percentile from sorted array
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Format metrics in Prometheus exposition format
 */
function formatPrometheusMetrics(): string {
  const lines: string[] = [];
  const now = Math.floor(Date.now() / 1000);

  lines.push('# HELP http_requests_total Total HTTP requests');
  lines.push('# TYPE http_requests_total counter');

  for (const [key, count] of httpRequestsTotal) {
    const [method, path, status] = key.split(':');
    lines.push(`http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`);
  }

  lines.push('');
  lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
  lines.push('# TYPE http_request_duration_seconds histogram');

  for (const [key, durations] of httpRequestDurations) {
    if (durations.length === 0) continue;

    const [method, path, status] = key.split(':');

    for (const p of [50, 90, 95, 99]) {
      const value = percentile(durations, p) / 1000;
      lines.push(`http_request_duration_seconds{quantile="${p / 100}",method="${method}",path="${path}",status="${status}"} ${value}`);
    }

    const sum = durations.reduce((a, b) => a + b, 0) / 1000;
    lines.push(`http_request_duration_seconds_sum{method="${method}",path="${path}",status="${status}"} ${sum}`);
    lines.push(`http_request_duration_seconds_count{method="${method}",path="${path}",status="${status}"} ${durations.length}`);
  }

  lines.push('');
  lines.push(`# HELP process_up Whether the process is up (1 = up, 0 = down)`);
  lines.push(`# TYPE process_up gauge`);
  lines.push('process_up 1');

  lines.push('');
  lines.push(`# HELP process_start_time_seconds Start time of the process since unix epoch`);
  lines.push(`# TYPE process_start_time_seconds gauge`);
  lines.push(`process_start_time_seconds ${process.uptime() ? now - process.uptime() : now}`);

  lines.push('');
  lines.push(`# HELP nodejs_version_info Node.js version info`);
  lines.push(`# TYPE nodejs_version_info gauge`);
  lines.push(`nodejs_version_info{version="${process.version}"} 1`);

  return lines.join('\n') + '\n';
}

/**
 * Express middleware to track request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // Normalize path to prevent high cardinality
    const normalizedPath = normalizePath(req.path);
    recordRequest(req.method, normalizedPath, res.statusCode, duration);
  });

  next();
}

/**
 * Normalize paths to prevent high cardinality
 * Replaces dynamic segments (IDs) with placeholders
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[a-f0-9]{24}/gi, '/:id')  // MongoDB ObjectIDs
    .replace(/\/\d+/g, '/:id')             // Numeric IDs
    .replace(/\/[a-zA-Z0-9_-]{36}/g, '/:uuid')  // UUIDs
    .replace(/\/\d+/g, '/:num');            // Any remaining numbers
}

/**
 * Create metrics router for /metrics endpoint
 */
export function createMetricsRouter(): Router {
  const router = Router();

  router.get('/metrics', (_req: Request, res: Response) => {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(formatPrometheusMetrics());
  });

  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'metrics' });
  });

  return router;
}

// Export for use in services
export { formatPrometheusMetrics };

// Default router instance
export const metricsRouter = createMetricsRouter();
