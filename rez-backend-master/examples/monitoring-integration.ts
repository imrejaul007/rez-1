/**
 * Complete Monitoring Integration Example
 *
 * This file demonstrates how to integrate all monitoring components
 * into your Express application.
 */

import express, { Express } from 'express';
import mongoose from 'mongoose';

// Logging
import { logger, requestLogger, correlationIdMiddleware } from '../src/config/logger';

// Error Tracking
import {
  initSentry,
  sentryRequestHandler,
  sentryTracingHandler,
  sentryErrorHandler,
  captureException,
  captureMessage
} from '../src/config/sentry';

// Metrics
import {
  metricsMiddleware,
  httpRequestCounter,
  httpRequestDuration,
  dbQueryDuration,
  orderCounter,
  revenueCounter
} from '../src/config/prometheus';

// Performance Monitoring
import { perfMonitor } from '../src/services/PerformanceMonitor';

// Custom Metrics
import { metrics } from '../src/services/MetricsService';

// Middleware
import { loggingMiddleware, slowRequestLogger } from '../src/middleware/logging';
import {
  errorLogger,
  notFoundHandler,
  globalErrorHandler,
  asyncHandler
} from '../src/middleware/errorLogger';

// Routes
import healthRoutes from '../src/merchantroutes/health';
import metricsRoutes from '../src/merchantroutes/metrics';

// Alert System
import { startAlertMonitoring, addAlert } from '../src/config/alerts';

// Initialize Express
const app: Express = express();

// ============================================
// STEP 1: Initialize Sentry (Must be first!)
// ============================================
initSentry(app);

// ============================================
// STEP 2: Sentry Request Handler (Must be early)
// ============================================
app.use(sentryRequestHandler);
app.use(sentryTracingHandler);

// ============================================
// STEP 3: Correlation ID (For request tracing)
// ============================================
app.use(correlationIdMiddleware);

// ============================================
// STEP 4: Logging Middleware
// ============================================
app.use(requestLogger);
app.use(loggingMiddleware);
app.use(slowRequestLogger(1000)); // Alert on requests > 1s

// ============================================
// STEP 5: Metrics Middleware
// ============================================
app.use(metricsMiddleware);

// ============================================
// STEP 6: Body Parser
// ============================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============================================
// STEP 7: Health & Metrics Routes
// ============================================
app.use('/', healthRoutes);
app.use('/', metricsRoutes);

// ============================================
// STEP 8: Your Application Routes
// ============================================

// Example: Order Routes with Monitoring
app.post('/api/orders', asyncHandler(async (req, res) => {
  logger.info('Creating order', {
    correlationId: req.correlationId,
    body: req.body
  });

  // Measure performance
  const order = await perfMonitor.measure('createOrder', async () => {
    // Track database operation
    return await mongoose.model('Order').create(req.body);
  });

  // Track business metrics
  orderCounter.inc({ status: 'created' });
  revenueCounter.inc({ currency: 'INR' }, order.total);
  metrics.increment('orders.created', 1, { type: order.type });

  logger.info('Order created successfully', {
    correlationId: req.correlationId,
    orderId: order._id,
    amount: order.total
  });

  res.status(201).json({
    success: true,
    order
  });
}));

// Example: Payment Processing with Error Tracking
app.post('/api/payments', asyncHandler(async (req, res) => {
  perfMonitor.start('payment.processing');

  try {
    logger.info('Processing payment', {
      correlationId: req.correlationId,
      orderId: req.body.orderId,
      amount: req.body.amount
    });

    // Process payment
    const payment = await processPayment(req.body);

    const duration = perfMonitor.end('payment.processing');
    metrics.timing('payment.processing', duration);

    // Track success
    metrics.increment('payments.success', 1);

    logger.info('Payment processed successfully', {
      correlationId: req.correlationId,
      paymentId: payment.id
    });

    res.json({
      success: true,
      payment
    });

  } catch (error: any) {
    perfMonitor.end('payment.processing');

    // Track failure
    metrics.increment('payments.failed', 1, { reason: error.code });

    // Capture in Sentry
    captureException(error, {
      correlationId: req.correlationId,
      orderId: req.body.orderId,
      amount: req.body.amount
    });

    logger.error('Payment processing failed', {
      correlationId: req.correlationId,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: 'Payment processing failed'
    });
  }
}));

// Example: Database Query with Monitoring
app.get('/api/orders', asyncHandler(async (req, res) => {
  logger.info('Fetching orders', {
    correlationId: req.correlationId,
    userId: req.query.userId
  });

  // Track database query performance
  const orders = await perfMonitor.measure('db.query.orders', async () => {
    const start = Date.now();

    const result = await mongoose.model('Order').find({
      userId: req.query.userId
    }).limit(50);

    // Manual metric tracking
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe(
      { operation: 'find', collection: 'orders' },
      duration
    );

    return result;
  });

  logger.info('Orders fetched', {
    correlationId: req.correlationId,
    count: orders.length
  });

  res.json({
    success: true,
    orders
  });
}));

// Example: Background Job with Monitoring
async function sendDailyReports() {
  const jobId = `job-${Date.now()}`;

  logger.info('Starting daily reports job', { jobId });
  perfMonitor.start('job.daily-reports');

  try {
    const users = await mongoose.model('User').find({ active: true });

    logger.info('Sending reports', {
      jobId,
      userCount: users.length
    });

    for (const user of users) {
      await sendReport(user);
      metrics.increment('reports.sent', 1);
    }

    const duration = perfMonitor.end('job.daily-reports');

    logger.info('Daily reports job completed', {
      jobId,
      duration: `${duration}ms`,
      reportsSent: users.length
    });

  } catch (error: any) {
    perfMonitor.end('job.daily-reports');

    logger.error('Daily reports job failed', {
      jobId,
      error: error.message
    });

    captureException(error, { jobId, jobName: 'daily-reports' });
  }
}

// ============================================
// STEP 9: Error Handling (Must be last!)
// ============================================
app.use(notFoundHandler);
app.use(errorLogger);
app.use(sentryErrorHandler);
app.use(globalErrorHandler);

// ============================================
// STEP 10: Start Server
// ============================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: process.env.NODE_ENV,
    nodeVersion: process.version
  });

  // Start alert monitoring
  startAlertMonitoring();
  logger.info('Alert monitoring started');

  // Add custom alerts
  addAlert({
    name: 'High Order Volume',
    condition: async () => {
      const recentOrders = await mongoose.model('Order').countDocuments({
        createdAt: { $gte: new Date(Date.now() - 60000) }
      });
      return recentOrders > 100;
    },
    message: 'Order volume exceeds 100 per minute',
    severity: 'medium',
    cooldown: 300
  });

  logger.info('Custom alerts configured');
});

// ============================================
// Graceful Shutdown
// ============================================
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');

  // Stop accepting new requests
  // Close database connections
  // Flush logs and metrics

  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise
  });

  captureMessage('Unhandled Promise Rejection', 'error', {
    reason: String(reason)
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack
  });

  captureException(error);

  // Give time for logging to complete
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// ============================================
// Helper Functions
// ============================================

async function processPayment(data: any) {
  // Simulate payment processing
  return {
    id: 'pay_' + Date.now(),
    status: 'success',
    amount: data.amount
  };
}

async function sendReport(user: any) {
  // Simulate sending report
  await new Promise(resolve => setTimeout(resolve, 100));
}

export default app;
