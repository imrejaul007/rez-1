# Offline Queue System - Quick Start Guide

## 5-Minute Integration

### Step 1: Install Dependencies (if not already installed)

```bash
npm install @react-native-async-storage/async-storage @react-native-community/netinfo
```

### Step 2: Add Provider to App Layout

```tsx
// app/_layout.tsx
import { OfflineQueueProvider } from '../contexts/OfflineQueueContext';

export default function RootLayout() {
  return (
    <OfflineQueueProvider autoSync={true}>
      <Stack>
        {/* Your screens */}
      </Stack>
    </OfflineQueueProvider>
  );
}
```

### Step 3: Use in Bill Upload Screen

```tsx
// app/bill-upload.tsx
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export default function BillUploadScreen() {
  const { addToQueue, isOnline } = useOfflineQueue();

  const handleUpload = async (formData, imageUri) => {
    try {
      const billId = await addToQueue(formData, imageUri);

      Alert.alert(
        'Success',
        isOnline
          ? 'Bill is being uploaded'
          : 'Bill saved offline. Will sync when online.'
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View>
      {/* Your upload form */}
      <Button title="Upload Bill" onPress={handleUpload} />
    </View>
  );
}
```

### Step 4: Add Queue Status Indicator (Optional)

```tsx
// components/QueueStatusBadge.tsx
import { useOfflineQueue } from '../hooks/useOfflineQueue';

export function QueueStatusBadge() {
  const { pendingCount, failedCount, isOnline } = useOfflineQueue();

  if (pendingCount === 0 && failedCount === 0) return null;

  return (
    <View style={styles.badge}>
      <Text>{pendingCount} pending</Text>
      {!isOnline && <Text>Offline</Text>}
    </View>
  );
}
```

## That's It!

Your app now has:
- ✅ Offline bill upload support
- ✅ Automatic sync when online
- ✅ Queue persistence across app restarts
- ✅ Retry logic for failed uploads
- ✅ Network status monitoring

## Key Features

### Automatic Sync
Bills sync automatically when:
- Network becomes available
- App comes to foreground (if pending items exist)
- Periodic checks (every 5 minutes)

### Queue Limits
- Max 50 bills in queue (configurable)
- Max 3 retry attempts per bill
- Exponential backoff for retries

### Error Handling
- Network errors: Retry automatically
- Timeout errors: Retry with backoff
- Duplicate detection: Prevent same bill twice
- Queue full: Alert user to sync first

## Advanced Usage

### Manual Sync

```tsx
const { syncQueue, canSync } = useOfflineQueue();

if (canSync) {
  await syncQueue();
}
```

### Queue Management

```tsx
const {
  retryFailed,
  clearCompleted,
  clearAll,
} = useOfflineQueue();

// Retry all failed uploads
await retryFailed();

// Clear successful uploads
await clearCompleted();

// Clear everything
await clearAll();
```

### Status Monitoring

```tsx
const {
  status,
  isSyncing,
  pendingCount,
  failedCount,
} = useOfflineQueue();

console.log(`
  Total: ${status.total}
  Pending: ${pendingCount}
  Failed: ${failedCount}
  Syncing: ${isSyncing}
`);
```

## Configuration Options

```tsx
<OfflineQueueProvider
  autoSync={true}                    // Auto-sync when online
  onSyncComplete={(result) => {      // Sync success callback
    console.log('Synced:', result.successful);
  }}
  onSyncError={(error) => {          // Sync error callback
    console.error('Sync failed:', error);
  }}
  onQueueChange={(status) => {       // Queue status callback
    console.log('Queue status:', status);
  }}
>
```

## Service Configuration

```tsx
import { billUploadQueueService } from '../services/billUploadQueueService';

await billUploadQueueService.initialize({
  maxQueueSize: 100,         // Max bills in queue (default: 50)
  maxRetries: 5,             // Max retry attempts (default: 3)
  retryDelayMs: 3000,        // Initial retry delay (default: 2000)
  maxRetryDelayMs: 60000,    // Max retry delay (default: 30000)
  uploadTimeoutMs: 120000,   // Upload timeout (default: 60000)
  autoSync: true,            // Auto-sync enabled (default: true)
  batchSize: 10,             // Concurrent uploads (default: 5)
});
```

## Common Patterns

### Show Network Status

```tsx
const { isOnline, pendingCount } = useOfflineQueue();

return (
  <View>
    {!isOnline && (
      <Banner>
        Offline - {pendingCount} bills waiting to upload
      </Banner>
    )}
  </View>
);
```

### Sync Button

```tsx
const { syncQueue, canSync, isSyncing } = useOfflineQueue();

<Button
  title={isSyncing ? 'Syncing...' : 'Sync Now'}
  onPress={syncQueue}
  disabled={!canSync || isSyncing}
/>
```

### Failed Bills Alert

```tsx
const { failedCount, retryFailed } = useOfflineQueue();

useEffect(() => {
  if (failedCount > 0) {
    Alert.alert(
      'Upload Failed',
      `${failedCount} bills failed to upload`,
      [
        { text: 'Retry', onPress: retryFailed },
        { text: 'Later', style: 'cancel' },
      ]
    );
  }
}, [failedCount]);
```

## Troubleshooting

### Queue not syncing?
1. Check network connection
2. Verify `autoSync={true}` in provider
3. Check pending count > 0

### Bills stuck in uploading?
- App restart automatically resets uploading to pending
- No manual intervention needed

### Queue full error?
```tsx
await clearCompleted(); // Clear successful uploads
```

### Need more storage?
```tsx
billUploadQueueService.initialize({
  maxQueueSize: 100, // Increase limit
});
```

## Performance Tips

1. **Clear completed regularly**
   ```tsx
   // Run on app start
   useEffect(() => {
     clearCompleted();
   }, []);
   ```

2. **Adjust batch size for network**
   ```tsx
   // WiFi: larger batches
   // Cellular: smaller batches
   billUploadQueueService.initialize({
     batchSize: isWiFi ? 10 : 3,
   });
   ```

3. **Monitor queue size**
   ```tsx
   if (totalCount > 40) {
     Alert.alert('Queue almost full', 'Please sync soon');
   }
   ```

## Next Steps

- See [OFFLINE_QUEUE_USAGE_EXAMPLES.md](./OFFLINE_QUEUE_USAGE_EXAMPLES.md) for detailed examples
- Check [billUploadQueueService.ts](./services/billUploadQueueService.ts) for API reference
- Review [__tests__/billUploadQueue.test.ts](./__tests__/billUploadQueue.test.ts) for test examples

## Support

For issues or questions:
1. Check console logs for `[BillUploadQueue]` messages
2. Verify AsyncStorage and NetInfo are working
3. Test with mock data first
4. Check network permissions in app manifest

---

**Remember**: The queue system is designed to "just work" - add bills to the queue and forget about connectivity issues!
