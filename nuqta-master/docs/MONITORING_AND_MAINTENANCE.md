# REZ App - Monitoring and Maintenance Guide

## Table of Contents
1. [Application Monitoring](#application-monitoring)
2. [Performance Monitoring](#performance-monitoring)
3. [Error Tracking](#error-tracking)
4. [User Analytics](#user-analytics)
5. [Server Monitoring](#server-monitoring)
6. [Database Monitoring](#database-monitoring)
7. [Alert Configuration](#alert-configuration)
8. [Incident Response Plan](#incident-response-plan)
9. [Backup and Disaster Recovery](#backup-and-disaster-recovery)
10. [Update and Patch Management](#update-and-patch-management)

---

## Application Monitoring

### Sentry Integration

#### Setup Sentry for Frontend

```bash
# Install Sentry
cd frontend
npm install @sentry/react-native sentry-expo
```

Create `frontend/config/sentry.ts`:

```typescript
import * as Sentry from '@sentry/react-native';
import { isProduction } from './env';

export const initSentry = () => {
  if (!isProduction()) {
    console.log('Sentry disabled in development');
    return;
  }

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_ENVIRONMENT,
    enableInExpoDevelopment: false,
    debug: false,

    // Performance Monitoring
    tracesSampleRate: 1.0,
    tracingOrigins: ['localhost', 'api.rezapp.com', /^\//],

    // Release tracking
    release: `rezapp-mobile@${process.env.EXPO_PUBLIC_APP_VERSION}`,

    // User context
    beforeSend(event, hint) {
      // Filter sensitive data
      if (event.request) {
        delete event.request.cookies;
      }
      return event;
    },

    integrations: [
      new Sentry.ReactNativeTracing({
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
        tracingOrigins: ['localhost', 'api.rezapp.com', /^\//],
      }),
    ],
  });
};

export const logError = (error: Error, context?: Record<string, any>) => {
  Sentry.captureException(error, {
    contexts: { extra: context },
  });
};

export const logMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  Sentry.captureMessage(message, level);
};

export const setUser = (user: { id: string; email: string; username: string }) => {
  Sentry.setUser(user);
};

export const clearUser = () => {
  Sentry.setUser(null);
};

export const addBreadcrumb = (breadcrumb: Sentry.Breadcrumb) => {
  Sentry.addBreadcrumb(breadcrumb);
};
```

Update `app/_layout.tsx`:

```typescript
import { initSentry } from '../config/sentry';

export default function RootLayout() {
  useEffect(() => {
    initSentry();
  }, []);

  // ... rest of layout
}
```

#### Setup Sentry for Backend

```bash
# Install Sentry
cd user-backend
npm install @sentry/node @sentry/tracing
```

Create `user-backend/src/config/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import { Express } from 'express';

export const initSentry = (app: Express) => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
  });

  // Request handler must be first middleware
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
};

export const sentryErrorHandler = (app: Express) => {
  // Error handler must be before any other error middleware
  app.use(Sentry.Handlers.errorHandler());
};
```

Update `user-backend/src/server.ts`:

```typescript
import { initSentry, sentryErrorHandler } from './config/sentry';

const app = express();

// Initialize Sentry
initSentry(app);

// ... middleware and routes

// Sentry error handler (before other error handlers)
sentryErrorHandler(app);

// ... other error handlers
```

### DataDog Integration

#### Install DataDog

```bash
# Frontend
npm install @datadog/browser-rum @datadog/browser-logs

# Backend
npm install dd-trace
```

#### Configure DataDog RUM (Frontend)

Create `frontend/config/datadog.ts`:

```typescript
import { datadogRum } from '@datadog/browser-rum';
import { datadogLogs } from '@datadog/browser-logs';

export const initDatadog = () => {
  // Real User Monitoring
  datadogRum.init({
    applicationId: process.env.EXPO_PUBLIC_DATADOG_APP_ID!,
    clientToken: process.env.EXPO_PUBLIC_DATADOG_CLIENT_TOKEN!,
    site: 'datadoghq.com',
    service: 'rezapp-mobile',
    env: process.env.EXPO_PUBLIC_ENVIRONMENT,
    version: process.env.EXPO_PUBLIC_APP_VERSION,
    sessionSampleRate: 100,
    sessionReplaySampleRate: 20,
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input',
  });

  // Logs
  datadogLogs.init({
    clientToken: process.env.EXPO_PUBLIC_DATADOG_CLIENT_TOKEN!,
    site: 'datadoghq.com',
    forwardErrorsToLogs: true,
    sessionSampleRate: 100,
  });

  datadogRum.startSessionReplayRecording();
};
```

#### Configure DataDog APM (Backend)

Create `user-backend/src/config/datadog.ts`:

```typescript
import tracer from 'dd-trace';

export const initDatadogAPM = () => {
  tracer.init({
    logInjection: true,
    analytics: true,
    runtimeMetrics: true,
    profiling: true,
  });
};

// Call this as early as possible
// user-backend/src/server.ts (first line)
import './config/datadog';
```

### New Relic Integration

#### Setup New Relic for Backend

```bash
npm install newrelic
```

Create `user-backend/newrelic.js`:

```javascript
'use strict';

exports.config = {
  app_name: ['REZ API'],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  logging: {
    level: 'info'
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      'request.headers.cookie',
      'request.headers.authorization',
      'request.headers.proxyAuthorization',
      'request.headers.setCookie*',
      'request.headers.x*',
      'response.headers.cookie',
      'response.headers.authorization',
      'response.headers.proxyAuthorization',
      'response.headers.setCookie*',
      'response.headers.x*'
    ]
  }
};
```

Update `user-backend/src/server.ts`:

```typescript
// Must be first line
require('newrelic');

import express from 'express';
// ... rest of imports
```

---

## Performance Monitoring

### Frontend Performance Tracking

Create `frontend/utils/performance.ts`:

```typescript
import { Performance } from 'react-native-performance';
import * as Sentry from '@sentry/react-native';

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Track screen load time
  trackScreenLoad(screenName: string) {
    const startTime = Date.now();

    return () => {
      const loadTime = Date.now() - startTime;
      this.metrics.set(`screen_${screenName}_load`, loadTime);

      // Log to Sentry
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `${screenName} loaded`,
        level: 'info',
        data: { loadTime },
      });

      // Warn if slow
      if (loadTime > 3000) {
        console.warn(`Slow screen load: ${screenName} took ${loadTime}ms`);
      }
    };
  }

  // Track API calls
  trackAPICall(endpoint: string, startTime: number) {
    const duration = Date.now() - startTime;
    this.metrics.set(`api_${endpoint}`, duration);

    // Track in Sentry
    Sentry.addBreadcrumb({
      category: 'api',
      message: `API call to ${endpoint}`,
      level: 'info',
      data: { duration },
    });

    // Warn if slow
    if (duration > 5000) {
      console.warn(`Slow API call: ${endpoint} took ${duration}ms`);
      Sentry.captureMessage(`Slow API: ${endpoint}`, {
        level: 'warning',
        contexts: {
          performance: {
            duration,
            endpoint,
          },
        },
      });
    }

    return duration;
  }

  // Track image loading
  trackImageLoad(imageUrl: string, startTime: number) {
    const duration = Date.now() - startTime;

    if (duration > 2000) {
      console.warn(`Slow image load: ${imageUrl} took ${duration}ms`);
    }
  }

  // Get all metrics
  getMetrics() {
    return Object.fromEntries(this.metrics);
  }

  // Clear metrics
  clearMetrics() {
    this.metrics.clear();
  }

  // Track user interaction
  trackInteraction(action: string, component: string) {
    Sentry.addBreadcrumb({
      category: 'user.action',
      message: `${action} on ${component}`,
      level: 'info',
    });
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Usage in components:
// const endTracking = performanceMonitor.trackScreenLoad('HomePage');
// useEffect(() => {
//   endTracking();
// }, []);
```

### Backend Performance Tracking

Create `user-backend/src/middleware/performanceMonitor.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

interface PerformanceMetric {
  endpoint: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;

  logMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // Keep only last MAX_METRICS
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }

    // Warn on slow requests
    if (metric.duration > 1000) {
      logger.warn('Slow request detected', {
        endpoint: metric.endpoint,
        duration: metric.duration,
        method: metric.method,
      });
    }
  }

  getAverageResponseTime(endpoint: string): number {
    const endpointMetrics = this.metrics.filter(m => m.endpoint === endpoint);
    if (endpointMetrics.length === 0) return 0;

    const total = endpointMetrics.reduce((sum, m) => sum + m.duration, 0);
    return total / endpointMetrics.length;
  }

  getMetrics() {
    return this.metrics;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Capture response
  res.on('finish', () => {
    const duration = Date.now() - startTime;

    performanceMonitor.logMetric({
      endpoint: req.path,
      method: req.method,
      duration,
      statusCode: res.statusCode,
      timestamp: new Date(),
    });

    // Log request details
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};
```

### Database Query Performance

Create `user-backend/src/utils/queryMonitor.ts`:

```typescript
import mongoose from 'mongoose';
import logger from '../config/logger';

export const setupQueryMonitoring = () => {
  // Monitor slow queries
  mongoose.set('debug', (collectionName: string, method: string, query: any, doc: any) => {
    const startTime = Date.now();

    // Log query execution time
    process.nextTick(() => {
      const duration = Date.now() - startTime;

      if (duration > 100) {
        logger.warn('Slow database query', {
          collection: collectionName,
          method,
          duration,
          query: JSON.stringify(query),
        });
      }
    });
  });

  // Connection monitoring
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('disconnected', () => {
    logger.error('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err });
  });
};

// Query profiling wrapper
export const profileQuery = async <T>(
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - startTime;

    if (duration > 500) {
      logger.warn('Slow query execution', {
        queryName,
        duration,
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Query execution failed', {
      queryName,
      duration,
      error,
    });
    throw error;
  }
};
```

---

## Error Tracking

### Custom Error Handling

Create `frontend/utils/errorHandler.ts`:

```typescript
import * as Sentry from '@sentry/react-native';
import { Alert } from 'react-native';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = (
  error: Error | AppError,
  showAlert: boolean = true
) => {
  // Log to console in development
  if (__DEV__) {
    console.error('Error:', error);
  }

  // Determine if this is a critical error
  const isCritical = error instanceof AppError &&
    error.severity === ErrorSeverity.CRITICAL;

  // Log to Sentry
  Sentry.captureException(error, {
    level: isCritical ? 'fatal' : 'error',
    contexts: {
      error: {
        code: error instanceof AppError ? error.code : 'UNKNOWN',
        severity: error instanceof AppError ? error.severity : ErrorSeverity.MEDIUM,
        ...(error instanceof AppError && error.context),
      },
    },
  });

  // Show user-friendly alert
  if (showAlert) {
    const message = getUserFriendlyMessage(error);
    Alert.alert('Error', message, [
      { text: 'OK' },
      { text: 'Report', onPress: () => reportError(error) },
    ]);
  }
};

const getUserFriendlyMessage = (error: Error | AppError): string => {
  if (error instanceof AppError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Unable to connect. Please check your internet connection.';
      case 'AUTH_ERROR':
        return 'Authentication failed. Please log in again.';
      case 'PAYMENT_ERROR':
        return 'Payment processing failed. Please try again.';
      default:
        return error.message;
    }
  }
  return 'An unexpected error occurred. Please try again.';
};

const reportError = (error: Error) => {
  // Open in-app error reporting form
  // Or send to support email
};

// Network error handler
export const handleNetworkError = (error: any) => {
  if (!error.response) {
    throw new AppError(
      'Network connection failed',
      'NETWORK_ERROR',
      ErrorSeverity.HIGH,
      { originalError: error.message }
    );
  }

  const status = error.response.status;
  const data = error.response.data;

  switch (status) {
    case 401:
      throw new AppError(
        'Please log in to continue',
        'AUTH_ERROR',
        ErrorSeverity.MEDIUM,
        { status, data }
      );
    case 403:
      throw new AppError(
        'You do not have permission to perform this action',
        'PERMISSION_ERROR',
        ErrorSeverity.MEDIUM,
        { status, data }
      );
    case 404:
      throw new AppError(
        'Requested resource not found',
        'NOT_FOUND_ERROR',
        ErrorSeverity.LOW,
        { status, data }
      );
    case 500:
      throw new AppError(
        'Server error. Please try again later.',
        'SERVER_ERROR',
        ErrorSeverity.HIGH,
        { status, data }
      );
    default:
      throw new AppError(
        data?.message || 'Request failed',
        'API_ERROR',
        ErrorSeverity.MEDIUM,
        { status, data }
      );
  }
};
```

### Backend Error Tracking

Create `user-backend/src/middleware/errorHandler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import * as Sentry from '@sentry/node';

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let error = err;

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    error = new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR'
    );
  }

  // Mongoose duplicate key errors
  if (err.name === 'MongoError' && (err as any).code === 11000) {
    error = new AppError(
      'Duplicate entry',
      409,
      'DUPLICATE_ERROR'
    );
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError(
      'Invalid token',
      401,
      'AUTH_ERROR'
    );
  }

  if (err.name === 'TokenExpiredError') {
    error = new AppError(
      'Token expired',
      401,
      'TOKEN_EXPIRED'
    );
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code = error instanceof AppError ? error.code : 'INTERNAL_ERROR';
  const isOperational = error instanceof AppError ? error.isOperational : false;

  // Log error
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    code,
    statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
  });

  // Send to Sentry if not operational
  if (!isOperational) {
    Sentry.captureException(error, {
      contexts: {
        request: {
          url: req.url,
          method: req.method,
          headers: req.headers,
          body: req.body,
        },
      },
    });
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    error: {
      message: error.message,
      code,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    },
  });
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found`,
    404,
    'NOT_FOUND'
  );
  next(error);
};
```

---

## User Analytics

### Google Analytics Setup

Install dependencies:

```bash
npm install @react-native-firebase/analytics
```

Create `frontend/utils/analytics.ts`:

```typescript
import analytics from '@react-native-firebase/analytics';
import { isProduction } from '../config/env';

class Analytics {
  private enabled: boolean = isProduction();

  // Screen view tracking
  async logScreenView(screenName: string, screenClass?: string) {
    if (!this.enabled) return;

    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  }

  // Event tracking
  async logEvent(eventName: string, params?: Record<string, any>) {
    if (!this.enabled) return;

    await analytics().logEvent(eventName, params);
  }

  // User properties
  async setUserProperty(name: string, value: string) {
    if (!this.enabled) return;

    await analytics().setUserProperty(name, value);
  }

  // User ID
  async setUserId(userId: string) {
    if (!this.enabled) return;

    await analytics().setUserId(userId);
  }

  // E-commerce events
  async logPurchase(params: {
    transactionId: string;
    value: number;
    currency: string;
    items: any[];
  }) {
    if (!this.enabled) return;

    await analytics().logPurchase(params);
  }

  async logAddToCart(item: { id: string; name: string; price: number }) {
    if (!this.enabled) return;

    await analytics().logAddToCart({
      items: [item],
      value: item.price,
      currency: 'INR',
    });
  }

  async logRemoveFromCart(item: { id: string; name: string; price: number }) {
    if (!this.enabled) return;

    await analytics().logEvent('remove_from_cart', {
      items: [item],
      value: item.price,
      currency: 'INR',
    });
  }

  async logBeginCheckout(value: number, items: any[]) {
    if (!this.enabled) return;

    await analytics().logBeginCheckout({
      value,
      currency: 'INR',
      items,
    });
  }

  // Search tracking
  async logSearch(searchTerm: string) {
    if (!this.enabled) return;

    await analytics().logSearch({
      search_term: searchTerm,
    });
  }

  // Share tracking
  async logShare(contentType: string, itemId: string) {
    if (!this.enabled) return;

    await analytics().logShare({
      content_type: contentType,
      item_id: itemId,
      method: 'share',
    });
  }

  // Custom events
  async logSignUp(method: string) {
    await this.logEvent('sign_up', { method });
  }

  async logLogin(method: string) {
    await this.logEvent('login', { method });
  }

  async logStoreView(storeId: string, storeName: string) {
    await this.logEvent('view_store', {
      store_id: storeId,
      store_name: storeName,
    });
  }

  async logProductView(productId: string, productName: string, price: number) {
    await this.logEvent('view_item', {
      items: [{
        item_id: productId,
        item_name: productName,
        price,
      }],
    });
  }

  async logBillUpload(amount: number) {
    await this.logEvent('bill_upload', { amount });
  }

  async logCashbackEarned(amount: number) {
    await this.logEvent('cashback_earned', { amount });
  }

  async logReferralSent() {
    await this.logEvent('referral_sent');
  }

  // Enable/disable analytics
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    analytics().setAnalyticsCollectionEnabled(enabled);
  }
}

export const analyticsService = new Analytics();
```

### Mixpanel Integration

```bash
npm install mixpanel-react-native
```

Create `frontend/utils/mixpanel.ts`:

```typescript
import { Mixpanel } from 'mixpanel-react-native';

class MixpanelService {
  private mixpanel: Mixpanel | null = null;

  async initialize() {
    const token = process.env.EXPO_PUBLIC_MIXPANEL_TOKEN;
    if (!token) return;

    this.mixpanel = new Mixpanel(token, true);
    await this.mixpanel.init();
  }

  track(eventName: string, properties?: Record<string, any>) {
    this.mixpanel?.track(eventName, properties);
  }

  identify(userId: string) {
    this.mixpanel?.identify(userId);
  }

  setUserProperties(properties: Record<string, any>) {
    this.mixpanel?.getPeople().set(properties);
  }

  incrementUserProperty(property: string, by: number = 1) {
    this.mixpanel?.getPeople().increment(property, by);
  }

  trackRevenue(amount: number) {
    this.mixpanel?.getPeople().trackCharge(amount);
  }

  reset() {
    this.mixpanel?.reset();
  }
}

export const mixpanelService = new MixpanelService();
```

---

## Server Monitoring

### System Metrics Monitoring

Create monitoring dashboard script `scripts/system-monitor.sh`:

```bash
#!/bin/bash

# System Monitoring Script
# Run this via cron every 5 minutes

# Configuration
LOG_FILE="/var/log/rezapp/system-metrics.log"
ALERT_EMAIL="devops@rezapp.com"
CPU_THRESHOLD=80
MEMORY_THRESHOLD=80
DISK_THRESHOLD=85

# Get current metrics
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
DISK_USAGE=$(df -h / | tail -1 | awk '{print $5}' | sed 's/%//')

# Log metrics
echo "$(date '+%Y-%m-%d %H:%M:%S') - CPU: ${CPU_USAGE}% | Memory: ${MEMORY_USAGE}% | Disk: ${DISK_USAGE}%" >> $LOG_FILE

# Check thresholds and alert
if (( $(echo "$CPU_USAGE > $CPU_THRESHOLD" | bc -l) )); then
  echo "High CPU usage: ${CPU_USAGE}%" | mail -s "REZ API Alert: High CPU Usage" $ALERT_EMAIL
fi

if (( $(echo "$MEMORY_USAGE > $MEMORY_THRESHOLD" | bc -l) )); then
  echo "High memory usage: ${MEMORY_USAGE}%" | mail -s "REZ API Alert: High Memory Usage" $ALERT_EMAIL
fi

if [ "$DISK_USAGE" -gt "$DISK_THRESHOLD" ]; then
  echo "High disk usage: ${DISK_USAGE}%" | mail -s "REZ API Alert: High Disk Usage" $ALERT_EMAIL
fi

# Check service health
if ! systemctl is-active --quiet nginx; then
  echo "NGINX is down!" | mail -s "REZ API CRITICAL: NGINX Down" $ALERT_EMAIL
  systemctl restart nginx
fi

if ! docker ps | grep -q rezapp-api; then
  echo "REZ API container is down!" | mail -s "REZ API CRITICAL: API Down" $ALERT_EMAIL
  cd /app/rezapp-backend && docker-compose restart api
fi

# Network monitoring
CONNECTIONS=$(netstat -an | grep :5001 | wc -l)
if [ "$CONNECTIONS" -gt 1000 ]; then
  echo "High number of connections: ${CONNECTIONS}" | mail -s "REZ API Warning: High Connections" $ALERT_EMAIL
fi
```

### CloudWatch Monitoring (AWS)

Create `scripts/setup-cloudwatch.sh`:

```bash
#!/bin/bash

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb

# Create configuration
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json << EOF
{
  "metrics": {
    "namespace": "REZ/API",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          {"name": "cpu_usage_idle", "rename": "CPU_IDLE", "unit": "Percent"},
          {"name": "cpu_usage_iowait", "rename": "CPU_IOWAIT", "unit": "Percent"},
          "cpu_time_guest"
        ],
        "metrics_collection_interval": 60,
        "totalcpu": false
      },
      "disk": {
        "measurement": [
          {"name": "used_percent", "rename": "DISK_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60,
        "resources": ["*"]
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent", "rename": "MEMORY_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60
      },
      "netstat": {
        "measurement": [
          "tcp_established",
          "tcp_time_wait"
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/rezapp/api.log",
            "log_group_name": "/rezapp/api",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/rezapp/nginx-error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

### Uptime Monitoring

Use external services:

```yaml
Recommended Services:
  - UptimeRobot: https://uptimerobot.com
  - Pingdom: https://www.pingdom.com
  - StatusCake: https://www.statuscake.com

Endpoints to Monitor:
  - https://api.rezapp.com/api/health (every 1 minute)
  - https://www.rezapp.com (every 5 minutes)
  - https://api.rezapp.com/api/auth/health (every 5 minutes)

Alert Channels:
  - Email: devops@rezapp.com
  - SMS: +91-XXXXXXXXXX
  - Slack: #production-alerts
  - PagerDuty: Integration key
```

---

## Database Monitoring

### MongoDB Atlas Monitoring

Configure alerts in MongoDB Atlas:

```yaml
Performance Alerts:
  - High CPU Usage (> 80% for 5 minutes)
  - High Memory Usage (> 85% for 5 minutes)
  - Connections approaching limit (> 80% of max)
  - Slow queries (> 100ms)
  - Replication lag (> 10 seconds)

Availability Alerts:
  - Primary election occurred
  - Node down
  - Disk space low (< 20% free)

Integration:
  - Email: database@rezapp.com
  - PagerDuty: Integration key
  - Slack: #database-alerts
```

### Query Performance Monitoring

Create `user-backend/src/utils/databaseMonitor.ts`:

```typescript
import mongoose from 'mongoose';
import logger from '../config/logger';

export const setupDatabaseMonitoring = () => {
  // Connection pool monitoring
  setInterval(() => {
    const poolSize = mongoose.connection.db?.serverConfig?.s?.poolSize || 0;
    const availableConnections = mongoose.connection.db?.serverConfig?.s?.availableConnections || 0;

    logger.info('Database connection pool status', {
      poolSize,
      availableConnections,
      inUse: poolSize - availableConnections,
    });

    if (availableConnections < poolSize * 0.2) {
      logger.warn('Low available database connections', {
        availableConnections,
        poolSize,
      });
    }
  }, 60000); // Every minute

  // Track collection stats
  const trackCollectionStats = async () => {
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();

      for (const collection of collections) {
        const stats = await mongoose.connection.db.collection(collection.name).stats();

        logger.info('Collection stats', {
          collection: collection.name,
          count: stats.count,
          size: stats.size,
          avgObjSize: stats.avgObjSize,
          storageSize: stats.storageSize,
          indexes: stats.nindexes,
        });

        // Alert on large collections
        if (stats.count > 1000000) {
          logger.warn('Large collection detected', {
            collection: collection.name,
            count: stats.count,
          });
        }
      }
    } catch (error) {
      logger.error('Error tracking collection stats', { error });
    }
  };

  // Run every hour
  setInterval(trackCollectionStats, 3600000);
};
```

---

## Alert Configuration

### PagerDuty Integration

Create `user-backend/src/services/alertService.ts`:

```typescript
import axios from 'axios';
import logger from '../config/logger';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

class AlertService {
  private pagerDutyKey: string;
  private slackWebhook: string;

  constructor() {
    this.pagerDutyKey = process.env.PAGERDUTY_INTEGRATION_KEY || '';
    this.slackWebhook = process.env.SLACK_WEBHOOK_URL || '';
  }

  async sendAlert(
    severity: AlertSeverity,
    title: string,
    description: string,
    details?: Record<string, any>
  ) {
    logger.warn('Alert triggered', { severity, title, description, details });

    // Send to PagerDuty for critical alerts
    if (severity === AlertSeverity.CRITICAL) {
      await this.sendPagerDutyAlert(title, description, details);
    }

    // Send to Slack for all alerts
    await this.sendSlackAlert(severity, title, description, details);
  }

  private async sendPagerDutyAlert(
    title: string,
    description: string,
    details?: Record<string, any>
  ) {
    if (!this.pagerDutyKey) return;

    try {
      await axios.post('https://events.pagerduty.com/v2/enqueue', {
        routing_key: this.pagerDutyKey,
        event_action: 'trigger',
        payload: {
          summary: title,
          severity: 'critical',
          source: 'rezapp-api',
          custom_details: details,
        },
      });
    } catch (error) {
      logger.error('Failed to send PagerDuty alert', { error });
    }
  }

  private async sendSlackAlert(
    severity: AlertSeverity,
    title: string,
    description: string,
    details?: Record<string, any>
  ) {
    if (!this.slackWebhook) return;

    const color = {
      [AlertSeverity.INFO]: '#36a64f',
      [AlertSeverity.WARNING]: '#ff9800',
      [AlertSeverity.ERROR]: '#f44336',
      [AlertSeverity.CRITICAL]: '#d32f2f',
    }[severity];

    try {
      await axios.post(this.slackWebhook, {
        attachments: [{
          color,
          title,
          text: description,
          fields: details ? Object.entries(details).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true,
          })) : [],
          footer: 'REZ API Monitoring',
          ts: Math.floor(Date.now() / 1000),
        }],
      });
    } catch (error) {
      logger.error('Failed to send Slack alert', { error });
    }
  }
}

export const alertService = new AlertService();

// Usage examples:
// alertService.sendAlert(
//   AlertSeverity.CRITICAL,
//   'Database Connection Lost',
//   'Unable to connect to MongoDB',
//   { attempts: 3, lastError: 'Connection timeout' }
// );
```

### Health Check Endpoints

Create `user-backend/src/routes/health.ts`:

```typescript
import express from 'express';
import mongoose from 'mongoose';
import redis from '../config/redis';

const router = express.Router();

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    },
  };

  try {
    // Check MongoDB
    if (mongoose.connection.readyState === 1) {
      health.services.database = 'healthy';
    } else {
      health.services.database = 'unhealthy';
      health.status = 'degraded';
    }

    // Check Redis
    try {
      await redis.ping();
      health.services.redis = 'healthy';
    } catch (error) {
      health.services.redis = 'unhealthy';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

router.get('/health/detailed', async (req, res) => {
  const detailed = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
    },
    services: {
      database: {
        status: 'unknown',
        stats: null,
      },
      redis: {
        status: 'unknown',
        stats: null,
      },
    },
  };

  try {
    // Detailed database check
    if (mongoose.connection.readyState === 1) {
      const dbStats = await mongoose.connection.db.stats();
      detailed.services.database = {
        status: 'healthy',
        stats: {
          collections: dbStats.collections,
          dataSize: dbStats.dataSize,
          indexes: dbStats.indexes,
        },
      };
    }

    // Detailed Redis check
    try {
      const redisInfo = await redis.info();
      detailed.services.redis = {
        status: 'healthy',
        stats: redisInfo,
      };
    } catch (error) {
      detailed.services.redis.status = 'unhealthy';
    }

    res.json(detailed);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

export default router;
```

---

## Incident Response Plan

### Incident Severity Levels

```yaml
P0 - Critical:
  Definition: Complete service outage
  Examples:
    - API completely down
    - Database inaccessible
    - Payment processing failed
  Response Time: Immediate (< 15 minutes)
  Resolution SLA: 1 hour
  Escalation: Immediate to CTO

P1 - High:
  Definition: Major feature broken
  Examples:
    - Login not working
    - Checkout failing
    - Major data loss
  Response Time: 30 minutes
  Resolution SLA: 4 hours
  Escalation: Team lead after 1 hour

P2 - Medium:
  Definition: Feature degraded
  Examples:
    - Slow response times
    - Partial feature failure
    - Minor data inconsistency
  Response Time: 2 hours
  Resolution SLA: 24 hours
  Escalation: Team lead after 4 hours

P3 - Low:
  Definition: Minor issue
  Examples:
    - UI glitches
    - Non-critical bug
    - Enhancement request
  Response Time: Next business day
  Resolution SLA: 1 week
  Escalation: None
```

### Incident Response Procedure

```markdown
1. Detection (0-5 minutes)
   - Automated monitoring alerts
   - User reports
   - Internal discovery

2. Acknowledgment (5-15 minutes)
   - On-call engineer acknowledges
   - Create incident ticket
   - Notify team via Slack #incidents

3. Assessment (15-30 minutes)
   - Determine severity
   - Identify affected users
   - Estimate impact
   - Assign incident commander

4. Communication (Ongoing)
   - Update status page
   - Notify stakeholders
   - Regular updates every 30 minutes

5. Mitigation (Immediate)
   - Implement temporary fix
   - Redirect traffic if needed
   - Rollback if necessary

6. Resolution (Varies by severity)
   - Implement permanent fix
   - Verify fix in staging
   - Deploy to production
   - Monitor for issues

7. Post-Incident (24-48 hours)
   - Write post-mortem
   - Identify root cause
   - Create action items
   - Update runbooks
```

### Incident Communication Template

```markdown
# Incident Report

## Incident Details
- **Incident ID**: INC-2025-001
- **Severity**: P1
- **Status**: Investigating
- **Started**: 2025-10-27 14:30 UTC
- **Commander**: John Doe

## Impact
- **Affected Users**: ~1,000 users
- **Affected Services**: Payment processing
- **Business Impact**: Unable to complete purchases

## Timeline
- 14:30 - Issue detected via monitoring
- 14:32 - Incident acknowledged
- 14:35 - Team assembled
- 14:40 - Root cause identified
- 14:45 - Fix deployed to staging
- 14:50 - Fix deployed to production
- 14:55 - Verification complete
- 15:00 - Incident resolved

## Root Cause
Stripe webhook endpoint was returning 500 errors due to database connection timeout.

## Resolution
- Increased database connection pool size
- Added retry logic to webhook handler
- Implemented circuit breaker pattern

## Action Items
- [ ] Add monitoring for webhook failures
- [ ] Increase database capacity
- [ ] Update runbook
- [ ] Schedule post-mortem meeting
```

---

## Backup and Disaster Recovery

### Backup Strategy

```yaml
Database Backups:
  Frequency:
    - Continuous: Point-in-time recovery (MongoDB Atlas)
    - Daily: Full snapshot at 2 AM UTC
    - Weekly: Full backup retained for 4 weeks
    - Monthly: Full backup retained for 1 year

  Storage:
    - Primary: MongoDB Atlas
    - Secondary: AWS S3 (encrypted)
    - Tertiary: Google Cloud Storage (geo-redundant)

  Retention:
    - Daily backups: 7 days
    - Weekly backups: 4 weeks
    - Monthly backups: 12 months
    - Yearly backups: 5 years

Application Backups:
  - Source code: GitHub (protected branches)
  - Configuration: Encrypted in S3
  - Environment variables: Encrypted in Secrets Manager
  - Docker images: ECR with retention policy

User Data:
  - Media files: Cloudinary + S3
  - Documents: S3 with versioning
  - Logs: CloudWatch Logs (30-day retention)
```

### Disaster Recovery Plan

Create `scripts/disaster-recovery.sh`:

```bash
#!/bin/bash

# Disaster Recovery Script
# Use this script to restore services in case of complete failure

echo "=== REZ APP DISASTER RECOVERY ==="
echo "WARNING: This will restore from backups"
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# Step 1: Restore Database
echo "Step 1: Restoring database..."
LATEST_BACKUP=$(aws s3 ls s3://rezapp-production-backups/mongodb/ | sort | tail -n 1 | awk '{print $4}')
aws s3 cp "s3://rezapp-production-backups/mongodb/$LATEST_BACKUP" /tmp/backup.tar.gz
tar -xzf /tmp/backup.tar.gz -C /tmp/
mongorestore --uri="$MONGODB_URI" /tmp/backup/

# Step 2: Restore Redis
echo "Step 2: Restoring Redis cache..."
# Redis doesn't need restore for cache, it will rebuild

# Step 3: Deploy Application
echo "Step 3: Deploying application..."
cd /app/rezapp-backend
docker-compose down
docker pull rezapp-api:latest
docker-compose up -d

# Step 4: Restore NGINX configuration
echo "Step 4: Restoring NGINX..."
aws s3 cp s3://rezapp-production-backups/nginx/nginx.conf /etc/nginx/nginx.conf
systemctl restart nginx

# Step 5: Verify health
echo "Step 5: Verifying services..."
sleep 10
curl -f https://api.rezapp.com/api/health || {
  echo "Health check failed!"
  exit 1
}

echo "=== RECOVERY COMPLETE ==="
echo "Please verify all services manually"
```

### Recovery Time Objectives (RTO)

```yaml
Service Recovery Targets:
  Database:
    RTO: 1 hour
    RPO: 5 minutes (point-in-time recovery)

  Application Servers:
    RTO: 30 minutes
    RPO: 0 (stateless, deploy from container registry)

  Load Balancer:
    RTO: 15 minutes
    RPO: 0 (configuration in version control)

  File Storage:
    RTO: 2 hours
    RPO: 24 hours (daily snapshots)

Complete System:
  RTO: 4 hours (full disaster recovery)
  RPO: 1 hour (worst case data loss)
```

---

## Update and Patch Management

### Security Patch Schedule

```yaml
Critical Security Updates:
  - Evaluation: Within 24 hours
  - Testing: Within 48 hours
  - Deployment: Within 72 hours

High Priority Updates:
  - Evaluation: Within 1 week
  - Testing: Within 2 weeks
  - Deployment: Within 1 month

Regular Updates:
  - Evaluation: Monthly
  - Testing: Quarterly
  - Deployment: Quarterly

Dependency Updates:
  - npm audit: Weekly
  - Automated PRs: Dependabot
  - Review and merge: Bi-weekly
```

### Update Procedure

Create `scripts/update-dependencies.sh`:

```bash
#!/bin/bash

echo "Checking for dependency updates..."

# Frontend
cd frontend
echo "Frontend dependencies:"
npm outdated
npm audit

# Update patch versions
npm update

# Check for major updates
npx npm-check-updates

# Backend
cd ../user-backend
echo "Backend dependencies:"
npm outdated
npm audit

# Update patch versions
npm update

# Generate update report
echo "Update report generated"
echo "Review changes and test before deploying"
```

### Maintenance Windows

```yaml
Scheduled Maintenance:
  Frequency: Monthly (first Sunday, 2 AM - 4 AM UTC)
  Duration: 2 hours maximum
  Notification: 7 days advance notice

Emergency Maintenance:
  Criteria: Critical security issues
  Notification: Minimum 4 hours notice
  Duration: As needed

Zero-Downtime Updates:
  - Rolling deployments
  - Blue-green deployment
  - Database migrations during off-peak
```

---

## Monitoring Dashboard

### Grafana Dashboard Setup

Create `grafana/dashboard.json`:

```json
{
  "dashboard": {
    "title": "REZ App Production Monitoring",
    "panels": [
      {
        "title": "API Response Time",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ]
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])"
          }
        ]
      },
      {
        "title": "Active Users",
        "targets": [
          {
            "expr": "websocket_connections_total"
          }
        ]
      },
      {
        "title": "Database Queries",
        "targets": [
          {
            "expr": "rate(mongodb_queries_total[5m])"
          }
        ]
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(redis_hits_total[5m]) / rate(redis_commands_total[5m])"
          }
        ]
      },
      {
        "title": "Payment Success Rate",
        "targets": [
          {
            "expr": "rate(payments_successful[5m]) / rate(payments_total[5m])"
          }
        ]
      }
    ]
  }
}
```

---

## Maintenance Checklist

### Daily Tasks
- [ ] Review error logs
- [ ] Check monitoring dashboards
- [ ] Verify backup completion
- [ ] Review performance metrics
- [ ] Check disk space
- [ ] Monitor API response times

### Weekly Tasks
- [ ] Review security alerts
- [ ] Update dependencies (patch versions)
- [ ] Review user feedback
- [ ] Check database performance
- [ ] Analyze error trends
- [ ] Review and update documentation

### Monthly Tasks
- [ ] Scheduled maintenance window
- [ ] Security audit
- [ ] Performance optimization review
- [ ] Capacity planning review
- [ ] Update SSL certificates (if expiring)
- [ ] Review and update monitoring alerts
- [ ] Test disaster recovery procedures
- [ ] Review and update runbooks

### Quarterly Tasks
- [ ] Major dependency updates
- [ ] Security penetration testing
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Infrastructure cost review
- [ ] Team training on new tools
- [ ] Update emergency contacts
- [ ] Review SLA compliance

---

This monitoring and maintenance guide provides comprehensive coverage for keeping the REZ app running smoothly in production. Customize alert thresholds, monitoring intervals, and procedures based on your specific requirements and infrastructure.
