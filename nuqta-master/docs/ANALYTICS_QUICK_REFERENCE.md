# Bill Upload Analytics - Quick Reference Guide

## Quick Start

```typescript
import { billUploadAnalytics } from '@/services/billUploadAnalytics';
import { errorReporter } from '@/utils/errorReporter';
import { telemetryService } from '@/services/telemetryService';
```

---

## Common Use Cases

### 1. Track Page Load
```typescript
billUploadAnalytics.trackPageView('bill_upload');
billUploadAnalytics.trackFunnelPageLoad();
```

### 2. Track Image Selection
```typescript
billUploadAnalytics.trackImageSelected('camera', fileSize);
billUploadAnalytics.trackFunnelImageSelected();
```

### 3. Track Upload
```typescript
// Start
billUploadAnalytics.trackUploadStart(billId, fileSize);

// Progress
billUploadAnalytics.trackUploadProgress(billId, {
  loaded: 512000,
  total: 1024000,
  percentage: 50,
  stage: 'uploading'
});

// Success
billUploadAnalytics.trackUploadComplete(billId);

// Failure
billUploadAnalytics.trackUploadFailed(billId, error);
```

### 4. Track Validation Errors
```typescript
billUploadAnalytics.trackValidationError(
  'amount',              // field name
  'INVALID_FORMAT',      // error code
  'Amount must be positive' // error message
);
```

### 5. Track User Actions
```typescript
billUploadAnalytics.trackUserAction('button_clicked', {
  buttonName: 'submit',
  timestamp: Date.now()
});
```

### 6. Track Errors
```typescript
try {
  await uploadBill(data);
} catch (error) {
  errorReporter.captureError(error, {
    context: 'Bill upload',
    component: 'BillUploadForm',
    metadata: { billId }
  });
}
```

### 7. Add Breadcrumbs
```typescript
errorReporter.addBreadcrumb({
  type: 'user_action',
  message: 'User clicked upload button',
  data: { billId: 'bill_123' }
});
```

### 8. Get Metrics
```typescript
const metrics = await billUploadAnalytics.getMetrics();
console.log('Success Rate:', metrics.upload.successRate);
console.log('Conversion Rate:', metrics.conversion.conversionRate);
```

### 9. Get Conversion Funnel
```typescript
const funnel = await billUploadAnalytics.trackConversionFunnel();
console.log('Drop-off at form:', funnel.dropOffPoints.formCompletion);
```

---

## Event Types Reference

| Event | Method | Purpose |
|-------|--------|---------|
| Page Load | `trackPageView('bill_upload')` | User views page |
| Image Selected | `trackImageSelected(source, size)` | Image chosen |
| Upload Started | `trackUploadStart(billId, size)` | Upload begins |
| Upload Progress | `trackUploadProgress(billId, progress)` | Progress update |
| Upload Complete | `trackUploadComplete(billId)` | Upload succeeds |
| Upload Failed | `trackUploadFailed(billId, error)` | Upload fails |
| Validation Error | `trackValidationError(field, code)` | Validation fails |
| Merchant Selected | `trackMerchantSelected(id, name)` | Merchant chosen |
| Form Submitted | `trackFormSubmitted(billId)` | Form sent |
| OCR Complete | `trackOCRResult(billId, success, confidence)` | OCR finishes |
| Retry | `trackRetryAttempt(billId, attempt)` | User retries |
| Offline Detected | `trackOfflineModeDetected()` | Goes offline |
| Sync Complete | `trackSyncCompleted(count)` | Syncs online |

---

## Error Severity Levels

```typescript
'fatal'   // App-breaking errors
'error'   // Significant errors
'warning' // Potential issues
'info'    // Informational
'debug'   // Debug information
```

### Usage
```typescript
errorReporter.captureError(error, context, 'error');
errorReporter.captureMessage('Upload started', 'info');
```

---

## Error Categories

- `network` - Network/connectivity errors
- `validation` - Form validation errors
- `authentication` - Auth errors
- `authorization` - Permission errors
- `storage` - Storage/persistence errors
- `upload` - File upload errors
- `parsing` - Data parsing errors
- `rendering` - UI rendering errors
- `unknown` - Unclassified errors

---

## Breadcrumb Types

```typescript
'navigation'    // Page/screen navigation
'user_action'   // User interactions
'network'       // Network requests
'state_change'  // State updates
'error'         // Error occurrences
```

### Example
```typescript
errorReporter.addBreadcrumb({
  type: 'network',
  message: 'API request started',
  category: 'http',
  data: { endpoint: '/bills/upload', method: 'POST' }
});
```

---

## Telemetry Priority Levels

```typescript
'high'    // Critical events (sent immediately)
'normal'  // Standard events
'low'     // Low priority events
```

### Usage
```typescript
// High priority (flushes immediately)
telemetryService.trackHighPriorityEvent(
  'payment_failed',
  'transactions',
  { amount: 100 }
);

// Normal priority
telemetryService.trackEvent(
  'page_view',
  'navigation',
  { page: 'bill_upload' }
);
```

---

## Storage Keys

### Analytics
- `@billUpload:analytics:events`
- `@billUpload:analytics:metrics`
- `@billUpload:analytics:funnel`

### Errors
- `@errorReporter:errors`
- `@errorReporter:breadcrumbs`

### Telemetry
- `@telemetry:queue`
- `@telemetry:stats`

---

## Configuration

### Update Analytics Config
```typescript
// Auto-flush interval
const FLUSH_INTERVAL = 30000; // 30 seconds

// Batch size
const BATCH_SIZE = 50;

// Max events in memory
const MAX_EVENTS_IN_MEMORY = 100;
```

### Update Telemetry Config
```typescript
telemetryService.updateConfig({
  batchSize: 100,
  flushInterval: 60000, // 1 minute
  maxRetries: 5,
  retryDelay: 2000,
  maxQueueSize: 2000,
  offlineQueueEnabled: true
});
```

### Enable/Disable
```typescript
// Analytics
billUploadAnalytics.stopAutoFlush();  // Disable

// Errors
errorReporter.setEnabled(false);      // Disable
errorReporter.setEnabled(true);       // Enable

// Telemetry
telemetryService.disable();           // Disable
telemetryService.enable();            // Enable
```

---

## Clearing Data

```typescript
// Clear analytics
await billUploadAnalytics.clearAnalytics();

// Clear errors
await errorReporter.clearErrors();
errorReporter.clearBreadcrumbs();

// Clear telemetry queue
await telemetryService.clearQueue();
await telemetryService.resetStats();
```

---

## Getting Stats

### Analytics Stats
```typescript
const metrics = await billUploadAnalytics.getMetrics();

// Upload metrics
metrics.upload.successRate
metrics.upload.averageUploadTime
metrics.upload.totalAttempts

// OCR metrics
metrics.ocr.accuracy
metrics.ocr.averageConfidence

// Error metrics
metrics.errors.totalErrors
metrics.errors.criticalErrors

// Conversion
metrics.conversion.conversionRate
metrics.conversion.dropOffPoints
```

### Error Stats
```typescript
const stats = errorReporter.getErrorStats();

stats.totalErrors
stats.uniqueErrors
stats.errorsBySeverity.error
stats.errorsByCategory.network
stats.recentErrors
```

### Telemetry Stats
```typescript
const stats = telemetryService.getStats();

stats.totalEvents
stats.sentEvents
stats.failedEvents
stats.successRate
stats.averageBatchSize
```

### Queue Status
```typescript
const status = telemetryService.getQueueStatus();

status.batches        // Number of batches
status.events         // Total events
status.priority.high  // High priority events
```

---

## Session Info

```typescript
const session = billUploadAnalytics.getSessionInfo();

session.sessionId
session.startTime
session.duration
session.eventsCount
session.completedUpload
```

---

## Manual Flush

```typescript
// Flush analytics events
await billUploadAnalytics.flushEvents();

// Flush telemetry queue
await telemetryService.flush();

// Send errors to remote service
await errorReporter.sendErrors();
```

---

## Complete Upload Flow Example

```typescript
import { billUploadAnalytics } from '@/services/billUploadAnalytics';
import { errorReporter } from '@/utils/errorReporter';

const BillUploadComponent = () => {
  // 1. Page load
  useEffect(() => {
    billUploadAnalytics.trackPageView('bill_upload');
    billUploadAnalytics.trackFunnelPageLoad();
  }, []);

  // 2. Image selection
  const handleImagePick = async (source: 'camera' | 'gallery') => {
    try {
      errorReporter.addBreadcrumb({
        type: 'user_action',
        message: `User selected ${source}`,
      });

      const result = await pickImage(source);
      const fileSize = await getFileSize(result.uri);

      billUploadAnalytics.trackImageSelected(source, fileSize);
      billUploadAnalytics.trackFunnelImageSelected();

      setImage(result.uri);
    } catch (error) {
      errorReporter.captureError(error, {
        context: 'Image selection',
        component: 'BillUpload',
      });
    }
  };

  // 3. Form submission
  const handleSubmit = async (data: BillData) => {
    const billId = generateBillId();

    try {
      errorReporter.addBreadcrumb({
        type: 'user_action',
        message: 'User submitted form',
        data: { billId },
      });

      // Validate form
      const validationErrors = validateForm(data);
      if (validationErrors.length > 0) {
        validationErrors.forEach(error => {
          billUploadAnalytics.trackValidationError(
            error.field,
            error.code,
            error.message
          );
        });
        return;
      }

      billUploadAnalytics.trackFunnelFormFilled();
      billUploadAnalytics.trackFormSubmitted(billId);

      // Start upload
      billUploadAnalytics.trackUploadStart(billId, fileSize);

      const result = await uploadBill(data, {
        onProgress: (progress) => {
          billUploadAnalytics.trackUploadProgress(billId, progress);
        }
      });

      // Success
      billUploadAnalytics.trackUploadComplete(billId);
      billUploadAnalytics.trackFunnelBillSubmitted();

      // OCR result
      if (result.ocrData) {
        billUploadAnalytics.trackOCRResult(
          billId,
          true,
          result.ocrData.confidence,
          Object.keys(result.ocrData.fields)
        );
      }

    } catch (error) {
      // Failure
      billUploadAnalytics.trackUploadFailed(billId, error);
      errorReporter.captureError(error, {
        context: 'Bill upload',
        component: 'BillUpload',
        metadata: { billId, data },
      }, 'error');
    }
  };

  // 4. Retry
  const handleRetry = async (billId: string, attemptNumber: number) => {
    billUploadAnalytics.trackRetryAttempt(billId, attemptNumber, 'user_initiated');
    // Retry logic...
  };

  return (
    // Your component JSX
  );
};
```

---

## Debug Mode

```typescript
// Enable detailed logging
errorReporter.setEnabled(true);

// Check what's being tracked
const events = billUploadAnalytics.events;
const errors = errorReporter.getErrors();
const queue = telemetryService.getQueueStatus();

console.log('Events:', events.length);
console.log('Errors:', errors.length);
console.log('Queue:', queue.events);
```

---

## Best Practices

1. **Always track page views** on component mount
2. **Add breadcrumbs** before critical operations
3. **Track both success and failure** paths
4. **Use appropriate severity levels** for errors
5. **Include context** with error reports
6. **Update funnel** at each stage
7. **Flush events** before app closes
8. **Clear old data** periodically
9. **Monitor queue size** to prevent memory issues
10. **Test offline behavior** thoroughly

---

## Troubleshooting

### Events not being sent?
```typescript
// Check if enabled
console.log('Enabled:', telemetryService.config.enabled);

// Check network status
console.log('Online:', telemetryService.isOnline);

// Check queue
const status = telemetryService.getQueueStatus();
console.log('Queued events:', status.events);

// Manual flush
await telemetryService.flush();
```

### Errors not being captured?
```typescript
// Check if enabled
errorReporter.setEnabled(true);

// Check error count
const stats = errorReporter.getErrorStats();
console.log('Total errors:', stats.totalErrors);

// View recent errors
console.log('Recent:', stats.recentErrors);
```

### Memory issues?
```typescript
// Clear old data
await billUploadAnalytics.clearAnalytics();
await errorReporter.clearErrors();
await telemetryService.clearQueue();

// Reduce batch size
telemetryService.updateConfig({
  batchSize: 25,
  maxQueueSize: 500
});
```

---

## Performance Tips

1. **Batch events** instead of sending individually
2. **Use appropriate flush intervals** (30-60 seconds)
3. **Clear old data** regularly
4. **Monitor queue size** to prevent memory bloat
5. **Use high priority** sparingly
6. **Compress data** for large payloads
7. **Implement retry limits** to avoid infinite loops
8. **Test with slow networks** to ensure offline queue works

---

## Contact & Support

- File issues in the project repository
- Check implementation guide for detailed documentation
- Review source code comments for method details
- Test thoroughly before production deployment

---

**Version:** 1.0.0
**Last Updated:** 2025-11-03
**Status:** Production Ready ✅
