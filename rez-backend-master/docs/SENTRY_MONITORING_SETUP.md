# Sentry Monitoring Setup Guide

## Overview

Sentry is already integrated into the application. This guide explains how to configure it for production with error alerts and performance monitoring.

---

## Current Configuration

Sentry is initialized in `src/server.ts`:
- Error tracking enabled
- Performance monitoring enabled
- Request tracing enabled

---

## Setup Instructions

### 1. Get Sentry DSN

1. Go to [Sentry.io](https://sentry.io)
2. Create a project (or use existing)
3. Select **Node.js** as platform
4. Copy the **DSN** (Data Source Name)

### 2. Configure Environment Variables

**Production (.env):**
```env
SENTRY_DSN=https://your-production-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
SENTRY_PROFILES_SAMPLE_RATE=0.1  # 10% of profiles
```

**Staging (.env.staging):**
```env
SENTRY_DSN=https://your-staging-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=staging
SENTRY_TRACES_SAMPLE_RATE=0.5  # 50% for staging
SENTRY_PROFILES_SAMPLE_RATE=0.5
```

### 3. Update Sentry Configuration

The configuration is in `src/config/sentry.ts`. Verify it includes:

```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
  // ... other config
});
```

---

## Error Alerts Setup

### 1. Create Alert Rules in Sentry

1. Go to **Alerts** → **Create Alert Rule**
2. Configure alert conditions:

**Critical Errors (Immediate):**
- **Trigger:** When an issue is seen more than 5 times in 5 minutes
- **Action:** Send email/Slack/PagerDuty notification
- **Filters:** 
  - Level: error, fatal
  - Environment: production

**High Error Rate:**
- **Trigger:** When error rate exceeds 1% in 5 minutes
- **Action:** Send notification
- **Filters:** Environment: production

**New Issue:**
- **Trigger:** When a new issue is created
- **Action:** Send notification
- **Filters:** Environment: production

### 2. Configure Alert Channels

**Email:**
1. Go to **Settings** → **Notifications**
2. Add email addresses
3. Configure notification preferences

**Slack:**
1. Go to **Settings** → **Integrations**
2. Install Slack integration
3. Configure webhook
4. Add to alert rules

**PagerDuty:**
1. Go to **Settings** → **Integrations**
2. Install PagerDuty integration
3. Configure service key
4. Add to alert rules

---

## Performance Monitoring

### 1. Enable Performance Monitoring

Already enabled in the configuration. Verify:

```typescript
tracesSampleRate: 0.1,  // 10% of transactions
profilesSampleRate: 0.1,  // 10% of profiles
```

### 2. Monitor Key Transactions

Key transactions are automatically tracked:
- API requests
- Database queries
- External API calls

### 3. Set Performance Alerts

1. Go to **Performance** → **Alerts**
2. Create alert for:
   - **P95 > 1000ms** - Slow transactions
   - **P99 > 2000ms** - Very slow transactions
   - **Throughput drop** - Significant decrease in requests

---

## Custom Error Context

### Add User Context

```typescript
Sentry.setUser({
  id: user.id,
  email: user.email,
  username: user.name
});
```

### Add Tags

```typescript
Sentry.setTag('merchantId', merchantId);
Sentry.setTag('orderId', orderId);
```

### Add Breadcrumbs

```typescript
Sentry.addBreadcrumb({
  category: 'payment',
  message: 'Payment processing started',
  level: 'info'
});
```

---

## Testing Sentry

### Test Error Reporting

```typescript
// In development, test error reporting
if (process.env.NODE_ENV === 'development') {
  Sentry.captureException(new Error('Test error'));
}
```

### Test Performance Monitoring

```typescript
// Test transaction tracking
const transaction = Sentry.startTransaction({
  op: 'test',
  name: 'Test Transaction'
});

// ... do work ...

transaction.finish();
```

---

## Best Practices

1. **Sample Rates:**
   - Production: 10% (0.1)
   - Staging: 50% (0.5)
   - Development: 100% (1.0)

2. **Error Filtering:**
   - Filter out expected errors
   - Don't report 404s
   - Don't report validation errors

3. **Context:**
   - Always include user context
   - Add relevant tags
   - Include breadcrumbs

4. **Alerts:**
   - Set up alerts for critical errors
   - Monitor error rates
   - Track performance degradation

---

## Monitoring Dashboard

### Key Metrics to Monitor

1. **Error Rate:**
   - Target: < 0.1%
   - Alert if: > 1%

2. **Response Times:**
   - P95: < 500ms
   - P99: < 1000ms

3. **Throughput:**
   - Monitor request volume
   - Alert on significant drops

4. **Top Issues:**
   - Review most frequent errors
   - Prioritize fixes

---

## Troubleshooting

### Errors Not Appearing

1. Check DSN is correct
2. Verify environment variable is set
3. Check Sentry project settings
4. Review server logs

### Performance Data Missing

1. Verify `tracesSampleRate` > 0
2. Check transaction is being tracked
3. Verify Sentry SDK version

### Alerts Not Firing

1. Check alert rule conditions
2. Verify notification channels
3. Test alert manually
4. Check Sentry notification settings

---

## Next Steps

1. ✅ Sentry configuration documented
2. ⏳ Get production DSN
3. ⏳ Configure environment variables
4. ⏳ Set up alert rules
5. ⏳ Configure notification channels
6. ⏳ Test error reporting
7. ⏳ Monitor performance

---

**Status:** ✅ Sentry Setup Guide Complete
**Last Updated:** $(date)

