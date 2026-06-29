/**
 * Custom Prometheus metrics for rez-auth-service
 * Provides observability into HTTP requests, database operations, and authentication events
 */

import client from 'prom-client';

// Create a custom registry to isolate this service's metrics
export const register = new client.Registry();

// Add default metrics (memory, CPU, event loop, etc.)
client.collectDefaultMetrics({ register });

// ── HTTP Request Metrics ────────────────────────────────────────────────────────

/**
 * Histogram of HTTP request durations in seconds
 * Buckets optimized for typical web request latency patterns
 */
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Counter for total HTTP requests
 */
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

/**
 * Gauge for concurrent HTTP requests
 */
export const httpRequestsInFlight = new client.Gauge({
  name: 'http_requests_in_flight',
  help: 'Number of HTTP requests currently being processed',
  registers: [register],
});

// ── Database Connection Pool Metrics ──────────────────────────────────────────

/**
 * Gauge for MongoDB connection pool size
 */
export const dbConnectionPool = new client.Gauge({
  name: 'mongodb_connection_pool_size',
  help: 'Current MongoDB connection pool size',
  labelNames: ['state'],
  registers: [register],
});

// ── Redis Metrics ─────────────────────────────────────────────────────────────

/**
 * Gauge for Redis connection status
 */
export const redisConnectionStatus = new client.Gauge({
  name: 'redis_connection_status',
  help: 'Redis connection status (1 = connected, 0 = disconnected)',
  registers: [register],
});

// ── BullMQ Queue Metrics ───────────────────────────────────────────────────────

/**
 * Counter for BullMQ jobs processed
 */
export const bullQueueJobsTotal = new client.Counter({
  name: 'bull_queue_jobs_total',
  help: 'Total BullMQ jobs processed',
  labelNames: ['queue', 'status'],
  registers: [register],
});

/**
 * Histogram for BullMQ job processing duration
 */
export const bullQueueJobDuration = new client.Histogram({
  name: 'bull_queue_job_duration_seconds',
  help: 'BullMQ job processing duration in seconds',
  labelNames: ['queue', 'job_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  registers: [register],
});

/**
 * Gauge for BullMQ queue size
 */
export const bullQueueSize = new client.Gauge({
  name: 'bull_queue_size',
  help: 'Current BullMQ queue size',
  labelNames: ['queue'],
  registers: [register],
});

// ── Authentication Metrics ────────────────────────────────────────────────────

/**
 * Counter for authentication attempts
 */
export const authAttemptsTotal = new client.Counter({
  name: 'auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['method', 'status'],
  registers: [register],
});

/**
 * Counter for OTP requests
 */
export const otpRequestsTotal = new client.Counter({
  name: 'otp_requests_total',
  help: 'Total OTP requests',
  labelNames: ['channel', 'status'],
  registers: [register],
});

/**
 * Counter for MFA operations
 */
export const mfaOperationsTotal = new client.Counter({
  name: 'mfa_operations_total',
  help: 'Total MFA operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

// ── Business Operation Metrics ────────────────────────────────────────────────

/**
 * Counter for generic business operations
 */
export const businessOperationTotal = new client.Counter({
  name: 'business_operation_total',
  help: 'Business operations count',
  labelNames: ['operation', 'status'],
  registers: [register],
});

/**
 * Histogram for business operation durations
 */
export const businessOperationDuration = new client.Histogram({
  name: 'business_operation_duration_seconds',
  help: 'Business operation duration in seconds',
  labelNames: ['operation'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register],
});

// ── Metrics Middleware Helper ─────────────────────────────────────────────────

/**
 * Express middleware to track HTTP request metrics
 * Usage: app.use(metricsMiddleware)
 */
export function metricsMiddleware(
  req: { method: string; path: string; route?: { path: string } },
  res: { on: (event: string, cb: () => void) => void; statusCode: number },
  next: () => void,
): void {
  const start = Date.now();
  httpRequestsInFlight.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';

    httpRequestDuration.observe(
      { method: req.method, route, status_code: res.statusCode },
      duration,
    );

    httpRequestsTotal.inc({
      method: req.method,
      route,
      status_code: res.statusCode,
    });

    httpRequestsInFlight.dec();
  });

  next();
}

/**
 * Get metrics endpoint handler for Express
 * Usage: app.get('/metrics', getMetricsHandler)
 */
export async function getMetricsHandler(_req: unknown, res: { set: (header: string, value: string) => void; end: (data: string) => void }): Promise<void> {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}
