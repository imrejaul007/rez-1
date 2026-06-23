# Bill Upload Queue Service - Quick Reference

## Quick Start

```typescript
import { billUploadQueueService } from './services/billUploadQueueService';

// Add bill to queue (works offline!)
const billId = await billUploadQueueService.addToQueue(billData, imageUri);

// Get queue status
const status = await billUploadQueueService.getDetailedStatus();

// Manually trigger sync
const result = await billUploadQueueService.syncQueue();
```

---

## Key Features

### ✅ Offline-First
- Bills are queued when offline
- Auto-sync when network returns
- Network checks before every operation

### ✅ Duplicate Prevention
- Checks merchantId, timestamp, and image URI
- Prevents same bill from being queued multiple times

### ✅ Smart Retry Logic
- Exponential backoff (2s, 4s, 8s, ...)
- Max 3 retries by default
- Network errors don't count against retry limit

### ✅ Batch Processing
- Uploads 5 bills at a time (configurable)
- 1-second delay between batches
- Network check before each batch

---

## API Reference

### Initialize (Optional)
```typescript
await billUploadQueueService.initialize({
  maxQueueSize: 100,        // Max bills in queue
  maxRetries: 3,            // Retry attempts per bill
  retryDelayMs: 2000,       // Initial retry delay
  maxRetryDelayMs: 30000,   // Max retry delay
  uploadTimeoutMs: 60000,   // Upload timeout
  autoSync: true,           // Auto-sync on network
  batchSize: 5,             // Bills per batch
});
```

### Add Bill to Queue
```typescript
const billId = await billUploadQueueService.addToQueue(
  {
    merchantId: 'merchant_123',
    amount: 1000,
    billDate: new Date(),
    billNumber: 'BILL-001',
    notes: 'Optional notes',
  },
  'file:///path/to/image.jpg'
);
```

### Get Queue Status
```typescript
// Basic status
const status = await billUploadQueueService.getStatus();
// {
//   total: 5,
//   pending: 3,
//   uploading: 1,
//   failed: 1,
//   success: 0,
//   lastSync: Date
// }

// Detailed status (includes network info)
const detailed = await billUploadQueueService.getDetailedStatus();
// {
//   ...status,
//   isOnline: true,
//   isSyncing: false
// }
```

### Sync Queue
```typescript
try {
  const result = await billUploadQueueService.syncQueue();
  console.log(`Success: ${result.successful}, Failed: ${result.failed}`);
} catch (error) {
  if (error.message.includes('No network connection')) {
    // Handle offline error
  }
}
```

### Event Listeners
```typescript
// Queue changed (added, removed, updated)
billUploadQueueService.on('queue:change', (event) => {
  console.log('Queue changed:', event.type, event.billId);
  updateUI(event.status);
});

// Sync completed
billUploadQueueService.on('queue:synced', (event) => {
  console.log('Sync complete:', event.status);
});

// Error occurred
billUploadQueueService.on('queue:error', (event) => {
  console.error('Queue error:', event.error);
});
```

### Other Methods
```typescript
// Get all queued bills
const bills = await billUploadQueueService.getQueue();

// Get specific bill
const bill = await billUploadQueueService.getBill(billId);

// Remove bill from queue
await billUploadQueueService.removeFromQueue(billId);

// Retry all failed bills
await billUploadQueueService.retryFailed();

// Clear completed bills
await billUploadQueueService.clearCompleted();

// Clear all bills
await billUploadQueueService.clearAll();

// Check if online
const isOnline = await billUploadQueueService.isOnline();

// Cleanup service
await billUploadQueueService.destroy();
```

---

## Error Handling

### Common Errors

#### Queue Full
```typescript
try {
  await billUploadQueueService.addToQueue(billData, imageUri);
} catch (error) {
  if (error.message.includes('Queue is full')) {
    // Clear completed bills or wait for sync
    await billUploadQueueService.clearCompleted();
  }
}
```

#### Offline Error
```typescript
try {
  await billUploadQueueService.syncQueue();
} catch (error) {
  if (error.message.includes('No network connection')) {
    // Show offline message
    showToast('You\'re offline. Bills will sync when online.');
  }
}
```

#### Duplicate Bill
```typescript
// Returns existing bill ID if duplicate detected
const billId = await billUploadQueueService.addToQueue(billData, imageUri);
// billId might be from existing bill
```

---

## React Native Integration

### Hook Example
```typescript
import { useState, useEffect } from 'react';
import { billUploadQueueService } from './services/billUploadQueueService';

export function useBillQueue() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const updateStatus = async () => {
      const s = await billUploadQueueService.getDetailedStatus();
      setStatus(s);
    };

    updateStatus();

    const onChange = () => updateStatus();
    billUploadQueueService.on('queue:change', onChange);
    billUploadQueueService.on('queue:synced', onChange);

    return () => {
      billUploadQueueService.off('queue:change', onChange);
      billUploadQueueService.off('queue:synced', onChange);
    };
  }, []);

  return {
    status,
    addBill: billUploadQueueService.addToQueue.bind(billUploadQueueService),
    syncQueue: billUploadQueueService.syncQueue.bind(billUploadQueueService),
  };
}
```

### Component Example
```typescript
function BillUploadScreen() {
  const { status, addBill } = useBillQueue();

  const handleUpload = async (billData, imageUri) => {
    try {
      const billId = await addBill(billData, imageUri);

      if (status?.isOnline) {
        showToast('Bill uploaded successfully!');
      } else {
        showToast('Bill queued. Will upload when online.');
      }
    } catch (error) {
      showError(error.message);
    }
  };

  return (
    <View>
      {!status?.isOnline && (
        <OfflineBanner>
          {status?.pending} bills queued. Will sync when online.
        </OfflineBanner>
      )}

      {status?.isSyncing && (
        <SyncingIndicator>
          Syncing {status.pending} bills...
        </SyncingIndicator>
      )}

      <Button onPress={() => handleUpload(data, uri)}>
        Upload Bill
      </Button>
    </View>
  );
}
```

---

## Troubleshooting

### Bills Not Syncing
1. Check network: `await billUploadQueueService.isOnline()`
2. Check auto-sync enabled: Initialize with `autoSync: true`
3. Manually trigger: `await billUploadQueueService.syncQueue()`
4. Check queue status: `await billUploadQueueService.getStatus()`

### Duplicates Getting Through
1. Ensure image URIs are consistent
2. Check merchantId is being set correctly
3. Consider implementing advanced image hashing

### Queue Getting Full
1. Clear completed: `await billUploadQueueService.clearCompleted()`
2. Increase size: Initialize with larger `maxQueueSize`
3. Set up auto-cleanup of old completed bills

### Upload Timeout Errors
1. Increase timeout: Initialize with larger `uploadTimeoutMs`
2. Check network speed
3. Reduce image size before upload

---

## Best Practices

### ✅ DO
- Let auto-sync handle uploads (set `autoSync: true`)
- Clear completed bills periodically
- Handle offline gracefully
- Show queue status to users
- Listen to queue events for UI updates

### ❌ DON'T
- Don't call `syncQueue()` too frequently (auto-sync handles it)
- Don't ignore duplicate bill IDs
- Don't upload huge images (compress first)
- Don't forget to handle errors
- Don't remove bills manually unless needed

---

## Performance Tips

1. **Compress images before queuing**
   ```typescript
   import * as ImageManipulator from 'expo-image-manipulator';

   const compressed = await ImageManipulator.manipulateAsync(
     imageUri,
     [{ resize: { width: 1200 } }],
     { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
   );

   await billUploadQueueService.addToQueue(billData, compressed.uri);
   ```

2. **Clear completed bills regularly**
   ```typescript
   // Clear completed bills older than 7 days
   setInterval(async () => {
     await billUploadQueueService.clearCompleted();
   }, 24 * 60 * 60 * 1000); // Daily
   ```

3. **Monitor queue size**
   ```typescript
   const status = await billUploadQueueService.getStatus();
   if (status.total > 80) {
     // Warn user queue is getting full
     showWarning('Queue is almost full. Please sync or clear completed bills.');
   }
   ```

---

## Configuration Recommendations

### Development
```typescript
await billUploadQueueService.initialize({
  maxQueueSize: 50,
  maxRetries: 5,
  retryDelayMs: 1000,
  autoSync: true,
  batchSize: 3,
});
```

### Production
```typescript
await billUploadQueueService.initialize({
  maxQueueSize: 100,
  maxRetries: 3,
  retryDelayMs: 2000,
  maxRetryDelayMs: 30000,
  uploadTimeoutMs: 60000,
  autoSync: true,
  batchSize: 5,
});
```

### Low-bandwidth Areas
```typescript
await billUploadQueueService.initialize({
  maxQueueSize: 200,
  maxRetries: 5,
  retryDelayMs: 5000,
  maxRetryDelayMs: 60000,
  uploadTimeoutMs: 120000,
  autoSync: true,
  batchSize: 2,
});
```
