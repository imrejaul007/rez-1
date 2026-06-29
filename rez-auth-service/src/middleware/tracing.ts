import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Augment Express Response.locals with custom tracing fields
declare module 'express' {
  interface Response {
    locals: Response['locals'] & {
      traceId?: string;
      spanId?: string;
      requestId?: string;
    };
  }
}

/**
 * Lightweight W3C traceparent propagation middleware.
 * Reads `traceparent` from incoming requests and propagates a trace ID
 * through the service without requiring @opentelemetry/* packages.
 *
 * Format: 00-{traceId 32hex}-{spanId 16hex}-{flags 2hex}
 * Spec:   https://www.w3.org/TR/trace-context/
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['traceparent'] as string | undefined;

  let traceId: string;
  if (incoming) {
    // Extract traceId from existing W3C traceparent header
    const parts = incoming.split('-');
    traceId = parts.length >= 2 && parts[1].length === 32 ? parts[1] : generateTraceId();
  } else {
    // Fall back to x-trace-id or x-correlation-id forwarded by nginx
    const xTrace = (req.headers['x-trace-id'] || req.headers['x-correlation-id']) as string | undefined;
    traceId = xTrace ? xTrace.replace(/-/g, '').substring(0, 32).padEnd(32, '0') : generateTraceId();
  }

  const spanId = crypto.randomBytes(8).toString('hex');

  // Attach to res.locals for use in route handlers and loggers
  res.locals.traceId = traceId;
  res.locals.spanId = spanId;
  res.locals.requestId = traceId; // alias for cross-service compatibility

  // Propagate W3C traceparent on the response
  res.setHeader('traceparent', `00-${traceId}-${spanId}-01`);

  next();
}

function generateTraceId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}
