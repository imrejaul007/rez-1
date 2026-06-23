# Logging Guide

## Overview
Comprehensive guide for logging in the REZ Merchant Backend application.

---

## Table of Contents
1. [Quick Start](#quick-start)
2. [Log Levels](#log-levels)
3. [Structured Logging](#structured-logging)
4. [Best Practices](#best-practices)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Basic Usage
```typescript
import { logger } from './config/logger';

// Simple log
logger.info('Application started');

// Log with context
logger.info('User logged in', { userId: '123', ip: '192.168.1.1' });

// Log error
logger.error('Payment failed', {
  error: error.message,
  stack: error.stack,
  orderId: order.id
});
```

### In Request Handlers
```typescript
app.get('/api/orders', async (req, res) => {
  logger.info('Fetching orders', {
    correlationId: req.correlationId,
    userId: req.user.id
  });

  try {
    const orders = await Order.find({ userId: req.user.id });

    logger.info('Orders fetched successfully', {
      correlationId: req.correlationId,
      count: orders.length
    });

    res.json(orders);
  } catch (error) {
    logger.error('Failed to fetch orders', {
      correlationId: req.correlationId,
      error: error.message,
      stack: error.stack,
      userId: req.user.id
    });

    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});
```

---

## Log Levels

### Available Levels
- **error** (0): Error events that might still allow the application to continue running
- **warn** (1): Warning events that might require attention
- **info** (2): Informational messages about application progress
- **http** (3): HTTP request/response logging
- **debug** (4): Detailed information for debugging

### When to Use Each Level

#### ERROR
Use for:
- Exceptions and errors
- Failed operations
- Database connection issues
- Payment failures
- Authentication errors

```typescript
logger.error('Database connection failed', {
  error: error.message,
  host: dbConfig.host
});
```

#### WARN
Use for:
- Deprecated API usage
- Configuration issues
- Performance degradation
- Retry attempts
- Rate limiting

```typescript
logger.warn('API rate limit approaching', {
  currentRate: 95,
  limit: 100,
  userId: user.id
});
```

#### INFO
Use for:
- Application lifecycle events
- User actions
- Business events
- Successful operations

```typescript
logger.info('Order created', {
  orderId: order.id,
  amount: order.total,
  customerId: order.customerId
});
```

#### HTTP
Use for:
- HTTP requests/responses
- API calls
- Request duration
- Status codes

```typescript
logger.http('GET /api/orders', {
  status: 200,
  duration: '150ms',
  ip: req.ip
});
```

#### DEBUG
Use for:
- Development debugging
- Variable values
- Function entry/exit
- Detailed flow tracing

```typescript
logger.debug('Processing payment', {
  amount: payment.amount,
  method: payment.method,
  provider: payment.provider
});
```

---

## Structured Logging

### Always Include Context
```typescript
// ❌ Bad
logger.info('User created');

// ✅ Good
logger.info('User created', {
  userId: user.id,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt
});
```

### Use Correlation IDs
```typescript
// Middleware adds correlationId to all requests
logger.info('Processing order', {
  correlationId: req.correlationId,
  orderId: order.id
});

// Later in the flow
logger.info('Payment processed', {
  correlationId: req.correlationId,
  paymentId: payment.id
});

// Trace entire request flow with same correlationId
```

### Sanitize Sensitive Data
```typescript
import { sanitizeLog } from './config/logger';

// Automatically removes password, token, etc.
logger.info('User registration', sanitizeLog({
  email: user.email,
  password: user.password, // Will be redacted
  name: user.name
}));
```

---

## Best Practices

### DO ✅

1. **Include Relevant Context**
```typescript
logger.info('Order shipped', {
  orderId: order.id,
  trackingNumber: shipment.trackingNumber,
  carrier: shipment.carrier,
  estimatedDelivery: shipment.estimatedDelivery
});
```

2. **Log Errors with Stack Traces**
```typescript
logger.error('Payment processing failed', {
  error: error.message,
  stack: error.stack,
  orderId: order.id,
  amount: order.total
});
```

3. **Use Consistent Message Format**
```typescript
// Good: Action + Result
logger.info('Database connected');
logger.info('Order created');
logger.info('Email sent');
```

4. **Log at Appropriate Levels**
```typescript
logger.error('Database query failed'); // Error
logger.warn('Slow query detected'); // Warning
logger.info('Query executed successfully'); // Info
logger.debug('Query parameters', { params }); // Debug
```

5. **Include Timestamps (Automatic)**
```typescript
// Winston automatically adds timestamps
logger.info('Event occurred');
// Output: 2024-01-15 10:30:45 [info]: Event occurred
```

### DON'T ❌

1. **Don't Log Sensitive Data**
```typescript
// ❌ Bad
logger.info('User login', {
  password: user.password,
  token: jwt.token,
  creditCard: user.card
});

// ✅ Good
logger.info('User login', {
  userId: user.id,
  email: user.email
});
```

2. **Don't Log in Tight Loops**
```typescript
// ❌ Bad
orders.forEach(order => {
  logger.debug('Processing order', { orderId: order.id });
  processOrder(order);
});

// ✅ Good
logger.info('Processing orders', { count: orders.length });
orders.forEach(order => processOrder(order));
logger.info('Orders processed', { count: orders.length });
```

3. **Don't Use console.log**
```typescript
// ❌ Bad
console.log('User created:', user);

// ✅ Good
logger.info('User created', { userId: user.id });
```

4. **Don't Log Redundant Information**
```typescript
// ❌ Bad
logger.info('Fetching user from database');
logger.info('User fetched from database');
logger.info('Returning user data');

// ✅ Good
logger.info('User fetched', { userId: user.id });
```

---

## Common Patterns

### Authentication
```typescript
// Login success
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent']
});

// Login failure
logger.warn('Login failed', {
  email: credentials.email,
  reason: 'Invalid password',
  ip: req.ip,
  attempts: user.loginAttempts
});
```

### Database Operations
```typescript
// Query start
logger.debug('Executing query', {
  collection: 'orders',
  operation: 'find',
  filters: sanitizeLog(filters)
});

// Query success
logger.info('Query executed', {
  collection: 'orders',
  operation: 'find',
  duration: '45ms',
  resultCount: results.length
});

// Query error
logger.error('Query failed', {
  collection: 'orders',
  operation: 'find',
  error: error.message,
  stack: error.stack
});
```

### Payment Processing
```typescript
// Payment initiated
logger.info('Payment initiated', {
  orderId: order.id,
  amount: payment.amount,
  method: payment.method,
  provider: payment.provider
});

// Payment success
logger.info('Payment successful', {
  paymentId: payment.id,
  orderId: order.id,
  amount: payment.amount,
  transactionId: response.transactionId
});

// Payment failure
logger.error('Payment failed', {
  orderId: order.id,
  amount: payment.amount,
  error: error.message,
  providerError: response.error
});
```

### API Integrations
```typescript
// API call start
logger.info('Calling external API', {
  service: 'PaymentGateway',
  endpoint: '/charge',
  method: 'POST'
});

// API call success
logger.info('External API call successful', {
  service: 'PaymentGateway',
  endpoint: '/charge',
  status: response.status,
  duration: '320ms'
});

// API call failure
logger.error('External API call failed', {
  service: 'PaymentGateway',
  endpoint: '/charge',
  status: response.status,
  error: error.message
});
```

### Background Jobs
```typescript
// Job start
logger.info('Background job started', {
  jobName: 'SendDailyReport',
  jobId: job.id,
  scheduledTime: job.scheduledAt
});

// Job progress
logger.info('Job progress', {
  jobName: 'SendDailyReport',
  jobId: job.id,
  progress: '50%',
  processed: 500,
  total: 1000
});

// Job complete
logger.info('Background job completed', {
  jobName: 'SendDailyReport',
  jobId: job.id,
  duration: '5m 32s',
  result: 'success'
});
```

---

## Log Files

### File Structure
```
logs/
├── combined-2024-01-15.log    # All logs
├── error-2024-01-15.log       # Error logs only
├── http-2024-01-15.log        # HTTP logs only
├── exceptions-2024-01-15.log  # Uncaught exceptions
└── rejections-2024-01-15.log  # Unhandled rejections
```

### Retention Policy
- Combined logs: 14 days
- Error logs: 30 days
- HTTP logs: 7 days
- Exception logs: 30 days

### Log Rotation
- Automatically rotates daily
- Max file size: 20MB
- Compressed after rotation

---

## Viewing Logs

### Tail Logs
```bash
# All logs
tail -f logs/combined-$(date +%Y-%m-%d).log

# Error logs only
tail -f logs/error-$(date +%Y-%m-%d).log

# HTTP logs only
tail -f logs/http-$(date +%Y-%m-%d).log
```

### Search Logs
```bash
# Search for specific user
grep "userId.*123" logs/combined-*.log

# Search for errors
grep "level.*error" logs/combined-*.log

# Search by correlation ID
grep "correlationId.*abc-123" logs/combined-*.log
```

### Pretty Print JSON Logs
```bash
tail -f logs/combined-$(date +%Y-%m-%d).log | jq .
```

---

## Troubleshooting

### Logs Not Appearing

**Check 1: Log Directory**
```bash
ls -la logs/
# Should show log files with write permissions
```

**Check 2: Log Level**
```bash
echo $LOG_LEVEL
# Should be 'debug' for development, 'info' for production
```

**Check 3: Winston Configuration**
```typescript
// Verify logger is initialized
import { logger } from './config/logger';
logger.info('Test log'); // Should appear in logs
```

### Too Many Logs

**Solution 1: Increase Log Level**
```bash
# .env
LOG_LEVEL=warn  # Only warn and error
```

**Solution 2: Filter Specific Loggers**
```typescript
// Disable debug logs in production
if (process.env.NODE_ENV === 'production') {
  logger.level = 'info';
}
```

### Logs Not Rotating

**Check Rotation Settings**
```typescript
// In logger.ts
new DailyRotateFile({
  filename: 'logs/combined-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d'
});
```

---

## Integration with ELK Stack

### Logstash Pipeline
Logs are automatically shipped to Logstash and indexed in Elasticsearch.

### Kibana Queries
```
# Search logs by level
level:error

# Search by correlation ID
correlationId:"abc-123"

# Search by user
userId:"123"

# Search by time range
@timestamp:[now-1h TO now]

# Combine filters
level:error AND userId:"123" AND @timestamp:[now-1h TO now]
```

---

## Performance Considerations

### Log Volume
- Info level: ~1000 logs/minute
- Debug level: ~10000 logs/minute
- Use appropriate level for environment

### Log Size
- Structured logs: ~500 bytes/log
- With stack trace: ~2KB/log
- Monitor disk space

### Async Logging
- Winston writes asynchronously
- No performance impact on requests
- Logs buffered in memory

---

## Monitoring Log Health

### Check Log Rate
```bash
# Count logs per minute
wc -l logs/combined-$(date +%Y-%m-%d).log
```

### Check Error Rate
```bash
# Count errors
grep "level.*error" logs/combined-*.log | wc -l
```

### Check Disk Usage
```bash
du -sh logs/
```

---

## Additional Resources

- [Winston GitHub](https://github.com/winstonjs/winston)
- [Winston Daily Rotate](https://github.com/winstonjs/winston-daily-rotate-file)
- [Structured Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)
