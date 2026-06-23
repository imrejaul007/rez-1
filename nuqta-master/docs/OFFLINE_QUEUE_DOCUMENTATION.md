# Bill Upload Offline Queue System - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation](#installation)
5. [API Reference](#api-reference)
6. [Usage Guide](#usage-guide)
7. [Advanced Topics](#advanced-topics)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Testing](#testing)

---

## Overview

The Bill Upload Offline Queue System provides a robust, production-ready solution for handling bill uploads in offline and unstable network conditions. It ensures that no bill upload is lost, even when the device is offline or network connectivity is poor.

### Key Benefits

- **Offline-First**: Bills are queued locally and synced when online
- **Automatic Retry**: Failed uploads are retried with exponential backoff
- **Persistence**: Queue survives app restarts
- **Network Awareness**: Automatically syncs when connection is restored
- **Production-Ready**: Comprehensive error handling and logging
- **Type-Safe**: Full TypeScript support with detailed interfaces

### How It Works

```
User uploads bill
       ↓
Add to local queue (AsyncStorage)
       ↓
Queue service monitors network
       ↓
When online: Upload bills in batches
       ↓
Retry failed uploads with backoff
       ↓
Remove successful uploads from queue
```

---

## Architecture

### Components

1. **billUploadQueueService** - Core service managing the queue
2. **OfflineQueueContext** - React context providing queue state
3. **useOfflineQueue** - Hook for accessing queue functionality
4. **AsyncStorage** - Persistent storage for queue data
5. **NetInfo** - Network status monitoring

### Data Flow

```
Component
    ↓ (uses)
useOfflineQueue hook
    ↓ (accesses)
OfflineQueueContext
    ↓ (wraps)
billUploadQueueService
    ↓ (persists to)
AsyncStorage
    ↓ (monitors)
NetInfo
```

### Queue Lifecycle

```
PENDING → UPLOADING → SUCCESS
    ↓         ↓
    ↓     FAILED (retry)
    ↓         ↓
    └─────────┘
```

---

## Features

### Core Features

- ✅ **Offline Queueing**: Add bills to queue when offline
- ✅ **Auto-Sync**: Automatically upload when network available
- ✅ **Retry Logic**: Exponential backoff for failed uploads
- ✅ **Deduplication**: Prevent duplicate bill entries
- ✅ **Batch Processing**: Upload multiple bills concurrently
- ✅ **Queue Persistence**: Survive app restarts
- ✅ **Network Monitoring**: React to connectivity changes
- ✅ **Error Recovery**: Handle timeouts and network errors

### Advanced Features

- ✅ **Queue Size Limits**: Prevent unlimited growth
- ✅ **Upload Timeouts**: Cancel slow uploads
- ✅ **Progress Tracking**: Monitor sync progress
- ✅ **Status Reporting**: Detailed queue statistics
- ✅ **Event Emitters**: React to queue changes
- ✅ **Configurable Behavior**: Customize retry logic and limits

---

## Installation

### 1. Install Dependencies

```bash
npm install @react-native-async-storage/async-storage @react-native-community/netinfo
```

### 2. Configure Metro

No additional configuration needed for Expo projects.

### 3. Add Files

All files are already created:

- `services/billUploadQueueService.ts` - Core service
- `contexts/OfflineQueueContext.tsx` - Context provider
- `hooks/useOfflineQueue.ts` - React hook

### 4. Wrap App with Provider

```tsx
// app/_layout.tsx
import { OfflineQueueProvider } from '../contexts/OfflineQueueContext';

export default function RootLayout() {
  return (
    <OfflineQueueProvider autoSync={true}>
      {/* Your app */}
    </OfflineQueueProvider>
  );
}
```

---

## API Reference

### billUploadQueueService

#### Methods

##### `initialize(config?: Partial<QueueConfig>): Promise<void>`

Initialize the queue service.

```typescript
await billUploadQueueService.initialize({
  maxQueueSize: 100,
  maxRetries: 5,
  retryDelayMs: 3000,
  uploadTimeoutMs: 120000,
  autoSync: true,
  batchSize: 10,
});
```

##### `addToQueue(formData: BillUploadData, imageUri: string): Promise<string>`

Add a bill to the queue. Returns the bill ID.

```typescript
const billId = await billUploadQueueService.addToQueue(formData, imageUri);
```

##### `removeFromQueue(billId: string): Promise<void>`

Remove a bill from the queue.

```typescript
await billUploadQueueService.removeFromQueue(billId);
```

##### `getQueue(): Promise<QueuedBill[]>`

Get all bills in the queue.

```typescript
const queue = await billUploadQueueService.getQueue();
```

##### `getStatus(): Promise<QueueStatus>`

Get queue status summary.

```typescript
const status = await billUploadQueueService.getStatus();
// {
//   total: 10,
//   pending: 5,
//   uploading: 2,
//   failed: 2,
//   success: 1,
//   lastSync: Date
// }
```

##### `syncQueue(): Promise<SyncResult>`

Sync all pending/failed bills.

```typescript
const result = await billUploadQueueService.syncQueue();
// {
//   successful: 5,
//   failed: 2,
//   skipped: 0,
//   errors: [{ billId, error }]
// }
```

##### `retryFailed(): Promise<void>`

Retry all failed uploads.

```typescript
await billUploadQueueService.retryFailed();
```

##### `clearCompleted(): Promise<void>`

Clear all successfully uploaded bills.

```typescript
await billUploadQueueService.clearCompleted();
```

##### `clearAll(): Promise<void>`

Clear all bills from queue.

```typescript
await billUploadQueueService.clearAll();
```

##### `getBill(billId: string): Promise<QueuedBill | null>`

Get a specific bill by ID.

```typescript
const bill = await billUploadQueueService.getBill(billId);
```

##### `destroy(): Promise<void>`

Cleanup and destroy the service.

```typescript
await billUploadQueueService.destroy();
```

#### Events

```typescript
// Queue changed
billUploadQueueService.on('queue:change', (event: QueueEvent) => {
  console.log('Queue changed:', event);
});

// Sync completed
billUploadQueueService.on('queue:synced', (event: QueueEvent) => {
  console.log('Sync completed:', event);
});

// Error occurred
billUploadQueueService.on('queue:error', (event: QueueEvent) => {
  console.error('Queue error:', event);
});
```

### useOfflineQueue Hook

#### State

```typescript
const {
  queue,           // QueuedBill[] - All queued bills
  status,          // QueueStatus - Queue summary
  isSyncing,       // boolean - Is sync in progress
  isOnline,        // boolean - Network status
  lastSyncResult,  // SyncResult - Last sync result
  error,           // string | null - Current error
} = useOfflineQueue();
```

#### Computed Values

```typescript
const {
  isEmpty,              // boolean - Queue is empty
  hasPendingUploads,    // boolean - Has pending bills
  hasFailedUploads,     // boolean - Has failed bills
  hasCompletedUploads,  // boolean - Has successful bills
  canSync,              // boolean - Can sync now
  needsSync,            // boolean - Has items to sync
  totalCount,           // number - Total bills
  pendingCount,         // number - Pending bills
  uploadingCount,       // number - Uploading bills
  failedCount,          // number - Failed bills
  successCount,         // number - Successful bills
  syncProgress,         // number - Progress 0-100
} = useOfflineQueue();
```

#### Actions

```typescript
const {
  addToQueue,       // Add bill to queue
  removeFromQueue,  // Remove bill
  syncQueue,        // Sync all pending
  retryFailed,      // Retry failed bills
  clearCompleted,   // Clear successful bills
  clearAll,         // Clear all bills
  getBill,          // Get specific bill
  refreshQueue,     // Refresh queue data
} = useOfflineQueue();
```

#### Utilities

```typescript
const {
  isPending,          // (billId) => boolean
  isUploading,        // (billId) => boolean
  hasFailed,          // (billId) => boolean
  hasSucceeded,       // (billId) => boolean
  getBillStatus,      // (billId) => status
  getBillError,       // (billId) => error
  getBillAttempts,    // (billId) => attempts
  canRetry,           // (billId) => boolean
} = useOfflineQueue();
```

#### Filtering

```typescript
const {
  getPendingBills,     // () => QueuedBill[]
  getUploadingBills,   // () => QueuedBill[]
  getFailedBills,      // () => QueuedBill[]
  getSuccessfulBills,  // () => QueuedBill[]
} = useOfflineQueue();
```

#### Statistics

```typescript
const {
  getSuccessRate,        // () => number (0-100)
  getAverageAttempts,    // () => number
  getOldestPendingAge,   // () => number | null (ms)
  getEstimatedSyncTime,  // () => number (seconds)
} = useOfflineQueue();
```

### TypeScript Interfaces

#### QueuedBill

```typescript
interface QueuedBill {
  id: string;
  formData: BillUploadData;
  imageUri: string;
  timestamp: number;
  status: 'pending' | 'uploading' | 'success' | 'failed';
  attempt: number;
  error?: string;
  lastAttemptTime?: number;
}
```

#### QueueStatus

```typescript
interface QueueStatus {
  total: number;
  pending: number;
  uploading: number;
  failed: number;
  success: number;
  lastSync?: Date;
}
```

#### SyncResult

```typescript
interface SyncResult {
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{ billId: string; error: string }>;
}
```

#### QueueConfig

```typescript
interface QueueConfig {
  maxQueueSize: number;        // Max bills in queue (default: 50)
  maxRetries: number;           // Max retry attempts (default: 3)
  retryDelayMs: number;         // Initial retry delay (default: 2000)
  maxRetryDelayMs: number;      // Max retry delay (default: 30000)
  uploadTimeoutMs: number;      // Upload timeout (default: 60000)
  autoSync: boolean;            // Auto-sync enabled (default: true)
  batchSize: number;            // Concurrent uploads (default: 5)
}
```

---

## Usage Guide

### Basic Usage

See [OFFLINE_QUEUE_QUICK_START.md](./OFFLINE_QUEUE_QUICK_START.md) for quick start guide.

See [OFFLINE_QUEUE_USAGE_EXAMPLES.md](./OFFLINE_QUEUE_USAGE_EXAMPLES.md) for detailed examples.

### Integration Checklist

- [ ] Install dependencies
- [ ] Add provider to app layout
- [ ] Replace direct uploads with `addToQueue()`
- [ ] Add network status indicator
- [ ] Add sync button/indicator
- [ ] Handle queue full errors
- [ ] Add retry UI for failed uploads
- [ ] Test offline scenarios
- [ ] Test app restart scenarios
- [ ] Monitor queue size in production

---

## Advanced Topics

### Custom Retry Logic

```typescript
// Configure retry behavior
await billUploadQueueService.initialize({
  maxRetries: 5,              // Try up to 5 times
  retryDelayMs: 5000,         // Start with 5 seconds
  maxRetryDelayMs: 300000,    // Max 5 minutes between retries
});
```

### Batch Size Optimization

```typescript
// Adjust based on network type
const connection = await NetInfo.fetch();
const batchSize = connection.type === 'wifi' ? 10 : 3;

await billUploadQueueService.initialize({
  batchSize,
});
```

### Custom Sync Triggers

```typescript
// Sync during off-peak hours
const syncDuringOffPeak = async () => {
  const hour = new Date().getHours();
  if (hour >= 22 || hour < 6) {
    await syncQueue();
  }
};

// Sync only on WiFi
const syncOnWiFi = async () => {
  const connection = await NetInfo.fetch();
  if (connection.type === 'wifi') {
    await syncQueue();
  }
};
```

### Queue Size Management

```typescript
// Monitor queue size
useEffect(() => {
  if (totalCount > 40) {
    Alert.alert(
      'Queue Almost Full',
      'Your upload queue is getting full. Please sync soon.'
    );
  }
}, [totalCount]);

// Auto-clear completed
useEffect(() => {
  const interval = setInterval(() => {
    clearCompleted();
  }, 3600000); // Every hour

  return () => clearInterval(interval);
}, []);
```

### Event Monitoring

```typescript
useEffect(() => {
  const handleQueueChange = (event: QueueEvent) => {
    console.log('Queue event:', event);

    if (event.type === 'added') {
      // Track analytics
      analytics.track('bill_queued', { billId: event.billId });
    }
  };

  billUploadQueueService.on('queue:change', handleQueueChange);

  return () => {
    billUploadQueueService.off('queue:change', handleQueueChange);
  };
}, []);
```

---

## Troubleshooting

### Common Issues

#### Queue Not Syncing

**Symptoms**: Bills stay in pending state

**Solutions**:
1. Check network connection
2. Verify `autoSync={true}` in provider
3. Check console for errors
4. Manually trigger sync

```typescript
// Debug logging
const status = await billUploadQueueService.getStatus();
console.log('Queue status:', status);

const networkState = await NetInfo.fetch();
console.log('Network state:', networkState);

// Force sync
await syncQueue();
```

#### Queue Full Errors

**Symptoms**: Cannot add more bills

**Solutions**:
1. Clear completed bills
2. Increase queue size
3. Force sync pending bills

```typescript
// Clear completed
await clearCompleted();

// Or increase limit
await billUploadQueueService.initialize({
  maxQueueSize: 100,
});
```

#### Bills Stuck in Uploading State

**Symptoms**: Bills never complete upload

**Solutions**:
1. Restart app (auto-resets uploading to pending)
2. Check upload timeout
3. Check network stability

```typescript
// Increase timeout
await billUploadQueueService.initialize({
  uploadTimeoutMs: 120000, // 2 minutes
});
```

#### AsyncStorage Errors

**Symptoms**: Queue not persisting

**Solutions**:
1. Check AsyncStorage permissions
2. Check storage space
3. Clear old data

```typescript
// Clear queue storage
await AsyncStorage.removeItem('@bill_upload_queue');
await billUploadQueueService.initialize();
```

### Debug Mode

Enable detailed logging:

```typescript
// The service already logs extensively
// Check console for [BillUploadQueue] messages

// Additional logging
billUploadQueueService.on('queue:change', console.log);
billUploadQueueService.on('queue:synced', console.log);
billUploadQueueService.on('queue:error', console.error);
```

---

## Best Practices

### 1. Always Use Queue for Uploads

Even when online, use the queue for consistency:

```typescript
// ❌ Bad
if (isOnline) {
  await uploadBill(formData, imageUri);
} else {
  await addToQueue(formData, imageUri);
}

// ✅ Good
await addToQueue(formData, imageUri);
// Queue handles online/offline automatically
```

### 2. Show Network Status

Keep users informed:

```typescript
<NetworkStatusBanner isOnline={isOnline} pendingCount={pendingCount} />
```

### 3. Handle Errors Gracefully

Provide retry options:

```typescript
try {
  await addToQueue(formData, imageUri);
} catch (error) {
  if (error.message.includes('Queue is full')) {
    Alert.alert('Queue Full', 'Please sync pending uploads first', [
      { text: 'Sync Now', onPress: syncQueue },
      { text: 'Cancel' },
    ]);
  }
}
```

### 4. Clean Up Regularly

Prevent queue bloat:

```typescript
// Clear completed on app start
useEffect(() => {
  clearCompleted();
}, []);

// Periodic cleanup
useEffect(() => {
  const interval = setInterval(() => {
    clearCompleted();
  }, 3600000); // Hourly

  return () => clearInterval(interval);
}, []);
```

### 5. Monitor Queue Health

Track metrics:

```typescript
useEffect(() => {
  // Log queue metrics
  const { total, pending, failed } = status || {};

  analytics.track('queue_status', {
    total,
    pending,
    failed,
    successRate: getSuccessRate(),
  });
}, [status]);
```

### 6. Test Offline Scenarios

Always test:
- Add bills while offline
- Go offline during upload
- Restart app with pending bills
- Network reconnection
- Queue full scenarios

### 7. Respect User's Network

Consider data usage:

```typescript
// Only sync large uploads on WiFi
const connection = await NetInfo.fetch();
if (connection.type === 'wifi') {
  await syncQueue();
} else {
  Alert.alert(
    'WiFi Recommended',
    'Connect to WiFi for faster uploads'
  );
}
```

---

## Testing

### Unit Tests

See [__tests__/billUploadQueue.test.ts](./__tests__/billUploadQueue.test.ts) for comprehensive test suite.

### Manual Testing

1. **Offline Add**
   - Turn off network
   - Add bill
   - Verify queued locally
   - Turn on network
   - Verify auto-sync

2. **Failed Upload**
   - Mock failed upload
   - Verify retry logic
   - Verify exponential backoff

3. **App Restart**
   - Add bills to queue
   - Kill app
   - Restart
   - Verify queue persisted

4. **Queue Full**
   - Fill queue to limit
   - Try adding more
   - Verify error handling

5. **Network Switch**
   - Start upload on WiFi
   - Switch to cellular
   - Verify continues/pauses

### Integration Testing

```typescript
describe('Queue Integration', () => {
  it('should handle full offline flow', async () => {
    // 1. Add bill offline
    NetInfo.fetch.mockResolvedValue({ isConnected: false });
    const billId = await addToQueue(formData, imageUri);

    // 2. Verify queued
    const bill = await getBill(billId);
    expect(bill.status).toBe('pending');

    // 3. Come online
    NetInfo.fetch.mockResolvedValue({ isConnected: true });

    // 4. Sync
    const result = await syncQueue();
    expect(result.successful).toBe(1);

    // 5. Verify uploaded
    const uploadedBill = await getBill(billId);
    expect(uploadedBill.status).toBe('success');
  });
});
```

---

## Support & Resources

### Files

- **Core Service**: `services/billUploadQueueService.ts`
- **Context**: `contexts/OfflineQueueContext.tsx`
- **Hook**: `hooks/useOfflineQueue.ts`
- **Demo**: `components/bills/BillUploadQueueDemo.tsx`
- **Tests**: `__tests__/billUploadQueue.test.ts`

### Documentation

- **Quick Start**: [OFFLINE_QUEUE_QUICK_START.md](./OFFLINE_QUEUE_QUICK_START.md)
- **Examples**: [OFFLINE_QUEUE_USAGE_EXAMPLES.md](./OFFLINE_QUEUE_USAGE_EXAMPLES.md)
- **This Document**: [OFFLINE_QUEUE_DOCUMENTATION.md](./OFFLINE_QUEUE_DOCUMENTATION.md)

### Dependencies

- `@react-native-async-storage/async-storage` - Persistent storage
- `@react-native-community/netinfo` - Network monitoring

---

## Changelog

### Version 1.0.0 (2025-01-03)

Initial release with:
- ✅ Offline-first queue system
- ✅ Automatic sync and retry
- ✅ Persistent storage
- ✅ Network monitoring
- ✅ Comprehensive error handling
- ✅ TypeScript support
- ✅ Event system
- ✅ Configurable behavior
- ✅ React hooks and context
- ✅ Full test coverage
- ✅ Documentation

---

**Built with ❤️ for reliable offline bill uploads**
