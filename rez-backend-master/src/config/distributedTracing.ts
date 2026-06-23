// @ts-nocheck
/**
 * Distributed Tracing Configuration
 * Phase 5 Week 3: Advanced Features
 *
 * Integrates Jaeger/Zipkin for distributed tracing across microservices
 */

import { logger } from './logger';

// ─────────────────────────────────────────────────────────────────────────
// TRACING CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────

export const tracingConfig = {
  enabled: process.env.TRACING_ENABLED === 'true',
  provider: (process.env.TRACING_PROVIDER || 'jaeger') as 'jaeger' | 'zipkin',

  // Jaeger Configuration
  jaeger: {
    host: process.env.JAEGER_HOST || 'localhost',
    port: parseInt(process.env.JAEGER_PORT || '6831', 10),
    serviceName: process.env.JAEGER_SERVICE_NAME || 'rez-backend',
    samplerType: process.env.JAEGER_SAMPLER_TYPE || 'const', // const, probabilistic, ratelimiting, remote
    samplerParam: parseFloat(process.env.JAEGER_SAMPLER_PARAM || '1'), // 0-1 for probabilistic
  },

  // Zipkin Configuration
  zipkin: {
    url: process.env.ZIPKIN_URL || 'http://localhost:9411',
    serviceName: process.env.ZIPKIN_SERVICE_NAME || 'rez-backend',
    sampleRate: parseFloat(process.env.ZIPKIN_SAMPLE_RATE || '1'), // 0-1
  },

  // Common settings
  environment: process.env.NODE_ENV || 'development',
  version: process.env.APP_VERSION || '1.0.0',
};

// ─────────────────────────────────────────────────────────────────────────
// TRACE CONTEXT MANAGER
// ─────────────────────────────────────────────────────────────────────────

export class TraceContext {
  static currentTraceId: string | null = null;
  static currentSpanId: string | null = null;

  /**
   * Generate trace ID (UUID)
   */
  static generateTraceId(): string {
    return require('crypto').randomBytes(8).toString('hex');
  }

  /**
   * Generate span ID (UUID)
   */
  static generateSpanId(): string {
    return require('crypto').randomBytes(8).toString('hex');
  }

  /**
   * Set current trace context
   */
  static setContext(traceId: string, spanId: string): void {
    this.currentTraceId = traceId;
    this.currentSpanId = spanId;
  }

  /**
   * Get current trace context
   */
  static getContext(): { traceId: string; spanId: string } | null {
    if (this.currentTraceId && this.currentSpanId) {
      return {
        traceId: this.currentTraceId,
        spanId: this.currentSpanId,
      };
    }
    return null;
  }

  /**
   * Clear context
   */
  static clearContext(): void {
    this.currentTraceId = null;
    this.currentSpanId = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// SPAN DEFINITION
// ─────────────────────────────────────────────────────────────────────────

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // milliseconds
  tags: Record<string, any>;
  logs: Array<{ timestamp: Date; message: string; level: string }>;
  status: 'OK' | 'ERROR' | 'UNSET';
}

// ─────────────────────────────────────────────────────────────────────────
// DISTRIBUTED TRACING HELPERS
// ─────────────────────────────────────────────────────────────────────────

export function initializeTracing(): void {
  if (!tracingConfig.enabled) {
    logger.info('[TRACING] Distributed tracing disabled');
    return;
  }

  logger.info('[TRACING] Initializing distributed tracing', {
    provider: tracingConfig.provider,
    serviceName:
      tracingConfig.provider === 'jaeger' ? tracingConfig.jaeger.serviceName : tracingConfig.zipkin.serviceName,
  });

  if (tracingConfig.provider === 'jaeger') {
    logger.info('[TRACING] Jaeger configured', {
      endpoint: `${tracingConfig.jaeger.host}:${tracingConfig.jaeger.port}`,
      samplerType: tracingConfig.jaeger.samplerType,
      samplerParam: tracingConfig.jaeger.samplerParam,
    });
  } else {
    logger.info('[TRACING] Zipkin configured', {
      url: tracingConfig.zipkin.url,
      sampleRate: tracingConfig.zipkin.sampleRate,
    });
  }
}

/**
 * Express middleware for trace context propagation
 */
export function traceMiddleware(req: any, res: any, next: any) {
  if (!tracingConfig.enabled) {
    return next();
  }

  // Extract trace context from headers
  const traceId = req.headers['x-trace-id'] || TraceContext.generateTraceId();
  const parentSpanId = req.headers['x-span-id'];
  const spanId = TraceContext.generateSpanId();

  // Set context
  TraceContext.setContext(traceId, spanId);

  // Add to request for downstream services
  req.traceId = traceId;
  req.spanId = spanId;
  req.parentSpanId = parentSpanId;

  // Add tracing headers to response
  res.set('X-Trace-ID', traceId);
  res.set('X-Span-ID', spanId);

  // Log span start
  logger.debug('[TRACE] Span started', {
    operation: `${req.method} ${req.path}`,
    traceId,
    spanId,
    parentSpanId: parentSpanId || 'root',
  });

  // Track end time
  const startTime = Date.now();

  // Hook response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    logger.debug('[TRACE] Span finished', {
      operation: `${req.method} ${req.path}`,
      traceId,
      spanId,
      duration,
      statusCode: res.statusCode,
    });

    TraceContext.clearContext();
  });

  next();
}

/**
 * Trace context propagation for downstream calls
 */
export function getTraceHeaders(): Record<string, string> {
  const context = TraceContext.getContext();
  if (!context) {
    return {};
  }

  return {
    'X-Trace-ID': context.traceId,
    'X-Span-ID': context.spanId,
  };
}

/**
 * Create a child span
 */
export function createChildSpan(operationName: string): Span {
  const context = TraceContext.getContext();
  const traceId = context?.traceId || TraceContext.generateTraceId();
  const parentSpanId = context?.spanId;
  const spanId = TraceContext.generateSpanId();

  const span: Span = {
    traceId,
    spanId,
    parentSpanId,
    operationName,
    startTime: new Date(),
    tags: {},
    logs: [],
    status: 'OK',
  };

  logger.debug('[TRACE] Child span created', {
    operation: operationName,
    traceId,
    spanId,
    parentSpanId,
  });

  return span;
}

/**
 * Finish a span
 */
export function finishSpan(span: Span, status: 'OK' | 'ERROR' = 'OK'): void {
  span.endTime = new Date();
  span.duration = span.endTime.getTime() - span.startTime.getTime();
  span.status = status;

  logger.debug('[TRACE] Span finished', {
    operation: span.operationName,
    traceId: span.traceId,
    spanId: span.spanId,
    duration: span.duration,
    status,
  });
}

/**
 * Add tag to span
 */
export function setSpanTag(span: Span, key: string, value: any): void {
  span.tags[key] = value;
}

/**
 * Add log to span
 */
export function addSpanLog(span: Span, message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  span.logs.push({
    timestamp: new Date(),
    message,
    level,
  });
}

// ─────────────────────────────────────────────────────────────────────────
// TRACE METRICS
// ─────────────────────────────────────────────────────────────────────────

export interface TraceMetrics {
  totalSpans: number;
  errorSpans: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
}

export class TraceAnalytics {
  private static spans: Span[] = [];

  static recordSpan(span: Span): void {
    this.spans.push(span);
    // Keep last 10000 spans
    if (this.spans.length > 10000) {
      this.spans = this.spans.slice(-10000);
    }
  }

  static getMetrics(): TraceMetrics {
    const errorCount = this.spans.filter((s) => s.status === 'ERROR').length;
    const latencies = this.spans
      .filter((s) => s.duration !== undefined)
      .map((s) => s.duration as number)
      .sort((a, b) => a - b);

    return {
      totalSpans: this.spans.length,
      errorSpans: errorCount,
      averageLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b) / latencies.length : 0,
      p50Latency: latencies[Math.floor(latencies.length * 0.5)] || 0,
      p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
      p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
    };
  }

  static reset(): void {
    this.spans = [];
  }
}

export default { tracingConfig, initializeTracing, traceMiddleware, getTraceHeaders };
