import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { logger } from '../config/logger';

/**
 * Razorpay IP Ranges - Verified from official Razorpay documentation
 * These are the IPs from which Razorpay sends webhook requests
 * https://razorpay.com/docs/webhooks/
 */
const RAZORPAY_IP_RANGES = [
  // Razorpay Primary Data Centers (India)
  '52.66.135.160/27',   // 52.66.135.160 - 52.66.135.191
  '3.6.119.224/27',     // 3.6.119.224 - 3.6.119.255
  '13.232.125.192/27',  // 13.232.125.192 - 13.232.125.223
];

/**
 * Convert IP address string to 32-bit integer
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.');
  return (
    (parseInt(parts[0]) << 24) +
    (parseInt(parts[1]) << 16) +
    (parseInt(parts[2]) << 8) +
    parseInt(parts[3])
  );
}

/**
 * Check if an IP address falls within a CIDR range
 * @param ip - The IP address to check
 * @param cidr - CIDR notation (e.g., "52.66.135.160/27")
 * @returns true if IP is within the CIDR range
 */
function isIPInRange(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/');
    const ipInt = ipToInt(ip);
    const rangeInt = ipToInt(range);
    const mask = -1 << (32 - parseInt(bits));

    return (ipInt & mask) === (rangeInt & mask);
  } catch (error) {
    logger.error(`Error checking IP range: ${error}`);
    return false;
  }
}

/**
 * Middleware to whitelist Razorpay IPs only
 * Extracts client IP from request and validates against Razorpay ranges
 */
export const razorpayIPWhitelist = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Extract client IP - check multiple sources for proxy situations
  const clientIP =
    req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
    req.headers['x-real-ip']?.toString() ||
    req.socket.remoteAddress ||
    req.connection.remoteAddress ||
    'unknown';

  // Check if IP is in Razorpay's whitelisted ranges
  const isAuthorized = RAZORPAY_IP_RANGES.some(range =>
    isIPInRange(clientIP, range)
  );

  if (!isAuthorized) {
    logger.error(
      `[WEBHOOK-SECURITY] Unauthorized webhook attempt from IP: ${clientIP}`,
      {
        timestamp: new Date().toISOString(),
        ip: clientIP,
        headers: {
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip'],
          'user-agent': req.headers['user-agent'],
        },
      }
    );

    res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Request origin not authorized',
    });
    return;
  }

  logger.info(
    `[WEBHOOK-SECURITY] Authorized IP: ${clientIP}`,
    {
      timestamp: new Date().toISOString(),
    }
  );

  next();
};

/**
 * Rate limiter for webhook endpoint
 * Allows max 100 webhook requests per minute per IP
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 100, // Max 100 requests per window
  message: 'Too many webhook requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req: Request) => {
    // Only apply rate limiting to webhook endpoint
    return !req.path.includes('/webhook');
  },
  handler: (req: Request, res: Response) => {
    logger.warn('[WEBHOOK-SECURITY] Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: req.rateLimit?.resetTime,
    });
  },
});

/**
 * Middleware to validate webhook payload structure
 * Ensures all required fields are present and event type is valid
 */
export const validateWebhookPayload = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    const webhookBody = req.body;

    // Check for required fields
    const requiredFields = ['id', 'event', 'created_at', 'payload'];
    const missingFields = requiredFields.filter(field => !webhookBody[field]);

    if (missingFields.length > 0) {
      logger.error(
        `[WEBHOOK-SECURITY] Missing required fields: ${missingFields.join(', ')}`,
        {
          receivedFields: Object.keys(webhookBody),
          timestamp: new Date().toISOString(),
        }
      );

      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Missing required fields: ${missingFields.join(', ')}`,
      });
      return;
    }

    // Validate event type
    const validEventTypes = [
      'subscription.activated',
      'subscription.charged',
      'subscription.completed',
      'subscription.cancelled',
      'subscription.paused',
      'subscription.resumed',
      'subscription.pending',
      'subscription.halted',
      'subscription.updated',
      'invoice.paid',
      'invoice.issued',
      'invoice.failed',
    ];

    if (!validEventTypes.includes(webhookBody.event)) {
      logger.error(
        `[WEBHOOK-SECURITY] Invalid event type: ${webhookBody.event}`,
        {
          timestamp: new Date().toISOString(),
        }
      );

      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: `Invalid event type: ${webhookBody.event}`,
      });
      return;
    }

    // Validate timestamp freshness (within 5 minutes)
    const WEBHOOK_MAX_AGE_SECONDS = 300; // 5 minutes
    const eventTimestamp = webhookBody.created_at;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const webhookAge = currentTimestamp - eventTimestamp;

    if (webhookAge > WEBHOOK_MAX_AGE_SECONDS) {
      logger.error(
        `[WEBHOOK-SECURITY] Webhook too old: ${webhookBody.id}`,
        {
          eventId: webhookBody.id,
          age: webhookAge,
          maxAge: WEBHOOK_MAX_AGE_SECONDS,
          timestamp: new Date().toISOString(),
        }
      );

      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'Webhook expired or too old',
      });
      return;
    }

    // Attach validated payload to request for next middleware
    (req as any).webhookPayload = webhookBody;
    (req as any).webhookValidated = true;

    next();
  } catch (error: any) {
    logger.error(`[WEBHOOK-SECURITY] Payload validation error: ${error.message}`, {
      error: error.message,
      timestamp: new Date().toISOString(),
    });

    res.status(400).json({
      success: false,
      error: 'Bad Request',
      message: 'Invalid webhook payload',
    });
  }
};

/**
 * Middleware to log webhook security events
 * Tracks all webhook attempts for audit purposes
 */
export const logWebhookSecurityEvent = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const webhookBody = (req as any).webhookPayload || req.body;

  logger.info('[WEBHOOK-SECURITY] Webhook received', {
    eventId: webhookBody.id,
    eventType: webhookBody.event,
    ip: req.ip || req.socket.remoteAddress,
    timestamp: new Date().toISOString(),
    signature: (req.headers['x-razorpay-signature'] as string)?.substring(0, 16) + '...',
  });

  next();
};

/**
 * Helper function to create secure webhook error responses
 */
export const sendSecureWebhookError = (
  res: Response,
  statusCode: number,
  errorType: string,
  message: string,
  eventId?: string
): void => {
  logger.error(`[WEBHOOK-SECURITY] ${errorType}`, {
    eventId,
    message,
    timestamp: new Date().toISOString(),
  });

  res.status(statusCode).json({
    success: false,
    error: errorType,
    message,
  });
};

/**
 * Helper function to create secure webhook success responses
 */
export const sendSecureWebhookSuccess = (
  res: Response,
  message: string,
  eventId: string
): void => {
  logger.info('[WEBHOOK-SECURITY] Webhook processed successfully', {
    eventId,
    message,
    timestamp: new Date().toISOString(),
  });

  res.status(200).json({
    success: true,
    message,
    eventId,
  });
};
