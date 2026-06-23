import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import { Request, Response } from 'express';

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register });

// HTTP request counter
export const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// HTTP request duration
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

// Database query duration
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query duration in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

// Database connection pool
export const dbConnectionsActive = new Gauge({
  name: 'db_connections_active',
  help: 'Number of active database connections'
});

// Cache hit/miss counter
export const cacheCounter = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'result']
});

// Active users gauge
export const activeUsers = new Gauge({
  name: 'active_users',
  help: 'Number of currently active users'
});

// Queue size gauge
export const queueSize = new Gauge({
  name: 'queue_size',
  help: 'Number of items in queue',
  labelNames: ['queue_name']
});

// Error counter
export const errorCounter = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'code']
});

// Business metrics
export const orderCounter = new Counter({
  name: 'orders_total',
  help: 'Total number of orders',
  labelNames: ['status']
});

export const revenueCounter = new Counter({
  name: 'revenue_total',
  help: 'Total revenue',
  labelNames: ['currency']
});

export const bookingCounter = new Counter({
  name: 'bookings_total',
  help: 'Total number of bookings',
  labelNames: ['status', 'type']
});

// Export metrics endpoint
export const metricsEndpoint = (req: Request, res: Response) => {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
};

// Metrics middleware
export const metricsMiddleware = (req: Request, res: Response, next: any) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;

    // Increment request counter
    httpRequestCounter.inc({
      method: req.method,
      route,
      status: res.statusCode.toString()
    });

    // Observe request duration
    httpRequestDuration.observe({
      method: req.method,
      route,
      status: res.statusCode.toString()
    }, duration);

    // Track errors
    if (res.statusCode >= 400) {
      errorCounter.inc({
        type: res.statusCode >= 500 ? 'server' : 'client',
        code: res.statusCode.toString()
      });
    }
  });

  next();
};

// Helper to track database operations
export const trackDbOperation = async <T>(
  operation: string,
  collection: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, collection }, duration);
    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ operation, collection }, duration);
    throw error;
  }
};

// Reset all metrics (useful for testing)
export const resetMetrics = () => {
  register.resetMetrics();
};

// Phase 4 stub replacement: real prom-client metrics. Same `.inc()` / `.set()` API as the stubs.
export const aggregatorSyncConflicts = new Counter({
  name: 'aggregator_sync_conflicts_total',
  help: 'Total number of aggregator sync conflicts (across integrations)',
  labelNames: ['platform', 'field'],
});

export const readModelStaleness = new Gauge({
  name: 'read_model_staleness_seconds',
  help: 'Seconds since the read model was last refreshed (per model)',
  labelNames: ['model'],
});

export const merchantEventQueueBacklog = new Gauge({
  name: 'merchant_event_queue_backlog',
  help: 'Number of pending jobs in the merchant-event queue',
  labelNames: ['queue'],
});
