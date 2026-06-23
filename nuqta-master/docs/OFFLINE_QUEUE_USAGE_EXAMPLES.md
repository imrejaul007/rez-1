# Offline Queue System - Usage Examples

## Overview

The offline queue system provides a robust, offline-first approach to bill uploads. Bills are queued locally and automatically synced when the device comes online.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Adding Bills to Queue](#adding-bills-to-queue)
3. [Queue Status & Monitoring](#queue-status--monitoring)
4. [Syncing](#syncing)
5. [Error Handling](#error-handling)
6. [UI Components](#ui-components)
7. [Advanced Usage](#advanced-usage)

---

## Basic Setup

### 1. Wrap App with Provider

```tsx
// app/_layout.tsx
import { OfflineQueueProvider } from '../contexts/OfflineQueueContext';

export default function RootLayout() {
  return (
    <OfflineQueueProvider
      autoSync={true}
      onSyncComplete={(result) => {
        console.log('Sync complete:', result);
      }}
      onSyncError={(error) => {
        console.error('Sync error:', error);
      }}
      onQueueChange={(status) => {
        console.log('Queue status:', status);
      }}
    >
      {/* Your app content */}
    </OfflineQueueProvider>
  );
}
```

### 2. Use Hook in Components

```tsx
import { useOfflineQueue } from '../hooks/useOfflineQueue';

function MyComponent() {
  const {
    queue,
    addToQueue,
    syncQueue,
    hasPendingUploads,
    isOnline
  } = useOfflineQueue();

  // ... component logic
}
```

---

## Adding Bills to Queue

### Basic Upload

```tsx
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import type { BillUploadData } from '../types/billVerification.types';

function BillUploadScreen() {
  const { addToQueue, isOnline } = useOfflineQueue();
  const [loading, setLoading] = useState(false);

  const handleUpload = async (imageUri: string, formData: BillUploadData) => {
    try {
      setLoading(true);

      // Add to queue (works offline!)
      const billId = await addToQueue(formData, imageUri);

      // Show success message
      Alert.alert(
        'Success',
        isOnline
          ? 'Bill added to upload queue and will be processed soon'
          : 'Bill saved offline. Will upload when connection is restored.'
      );

      console.log('Bill queued with ID:', billId);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      {/* Your upload UI */}
    </View>
  );
}
```

### With User Feedback

```tsx
function BillUploadWithFeedback() {
  const {
    addToQueue,
    isOnline,
    pendingCount,
    canSync,
  } = useOfflineQueue();

  const handleUpload = async (imageUri: string, formData: BillUploadData) => {
    try {
      const billId = await addToQueue(formData, imageUri);

      // Show contextual message
      if (!isOnline) {
        Alert.alert(
          'Saved Offline',
          `Bill saved locally. You have ${pendingCount + 1} bills waiting to upload.`,
          [
            { text: 'OK' }
          ]
        );
      } else if (canSync) {
        Alert.alert(
          'Uploading',
          'Bill added to queue and uploading now...',
          [
            { text: 'OK' }
          ]
        );
      }

      return billId;
    } catch (error) {
      if (error.message.includes('Queue is full')) {
        Alert.alert(
          'Queue Full',
          'Please wait for pending uploads to complete before adding more bills.'
        );
      } else {
        Alert.alert('Error', error.message);
      }
      throw error;
    }
  };

  return (
    <View>
      {/* Upload UI */}
    </View>
  );
}
```

---

## Queue Status & Monitoring

### Queue Status Badge

```tsx
function QueueStatusBadge() {
  const {
    pendingCount,
    failedCount,
    uploadingCount,
    isOnline,
    isSyncing,
  } = useOfflineQueue();

  if (pendingCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <View style={styles.badge}>
      {isSyncing && (
        <ActivityIndicator size="small" color="#fff" />
      )}

      <Text style={styles.badgeText}>
        {pendingCount} pending
        {failedCount > 0 && `, ${failedCount} failed`}
      </Text>

      {!isOnline && (
        <Text style={styles.offlineText}>Offline</Text>
      )}
    </View>
  );
}
```

### Queue Summary

```tsx
function QueueSummary() {
  const {
    status,
    syncProgress,
    getSuccessRate,
    getEstimatedSyncTime,
  } = useOfflineQueue();

  if (!status || status.total === 0) {
    return <Text>No bills in queue</Text>;
  }

  return (
    <View style={styles.summary}>
      <Text style={styles.title}>Upload Queue</Text>

      <View style={styles.stats}>
        <StatItem label="Total" value={status.total} />
        <StatItem label="Pending" value={status.pending} />
        <StatItem label="Uploading" value={status.uploading} />
        <StatItem label="Failed" value={status.failed} />
        <StatItem label="Success" value={status.success} />
      </View>

      {status.pending > 0 && (
        <View style={styles.progress}>
          <Text>Progress: {syncProgress}%</Text>
          <ProgressBar progress={syncProgress / 100} />
          <Text>
            Estimated time: {Math.ceil(getEstimatedSyncTime() / 60)} min
          </Text>
        </View>
      )}

      {status.total > 0 && (
        <Text>Success rate: {getSuccessRate()}%</Text>
      )}
    </View>
  );
}
```

### Individual Bill Status

```tsx
import { useBillMonitor } from '../hooks/useOfflineQueue';

function BillStatusCard({ billId }: { billId: string }) {
  const bill = useBillMonitor(billId);

  if (!bill) {
    return <Text>Bill not found</Text>;
  }

  const getStatusColor = () => {
    switch (bill.status) {
      case 'success': return '#4CAF50';
      case 'failed': return '#F44336';
      case 'uploading': return '#2196F3';
      default: return '#FFC107';
    }
  };

  const getStatusIcon = () => {
    switch (bill.status) {
      case 'success': return 'check-circle';
      case 'failed': return 'error';
      case 'uploading': return 'cloud-upload';
      default: return 'pending';
    }
  };

  return (
    <View style={styles.card}>
      <Icon name={getStatusIcon()} color={getStatusColor()} size={24} />

      <View style={styles.info}>
        <Text style={styles.status}>{bill.status.toUpperCase()}</Text>
        <Text style={styles.store}>{bill.formData.storeId}</Text>

        {bill.error && (
          <Text style={styles.error}>{bill.error}</Text>
        )}

        {bill.attempt > 0 && (
          <Text style={styles.attempts}>
            Attempt {bill.attempt} of 3
          </Text>
        )}
      </View>

      {bill.status === 'uploading' && (
        <ActivityIndicator color={getStatusColor()} />
      )}
    </View>
  );
}
```

---

## Syncing

### Manual Sync Button

```tsx
function SyncButton() {
  const {
    syncQueue,
    canSync,
    isSyncing,
    pendingCount,
    isOnline,
  } = useOfflineQueue();

  const handleSync = async () => {
    try {
      const result = await syncQueue();

      Alert.alert(
        'Sync Complete',
        `Successfully uploaded ${result.successful} bills.\n` +
        `Failed: ${result.failed}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Sync Error', error.message);
    }
  };

  if (!isOnline) {
    return (
      <View style={styles.offlineContainer}>
        <Icon name="cloud-off" size={20} color="#999" />
        <Text style={styles.offlineText}>Offline</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.button, !canSync && styles.buttonDisabled]}
      onPress={handleSync}
      disabled={!canSync || isSyncing}
    >
      {isSyncing ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Icon name="sync" size={20} color="#fff" />
          <Text style={styles.buttonText}>
            Sync {pendingCount > 0 ? `(${pendingCount})` : ''}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}
```

### Auto-Sync Indicator

```tsx
function AutoSyncIndicator() {
  const { isSyncing, pendingCount, isOnline } = useOfflineQueue();

  if (!isSyncing) {
    return null;
  }

  return (
    <View style={styles.indicator}>
      <ActivityIndicator size="small" color="#2196F3" />
      <Text style={styles.text}>
        Syncing {pendingCount} bills...
      </Text>
    </View>
  );
}
```

---

## Error Handling

### Retry Failed Uploads

```tsx
function RetryFailedButton() {
  const {
    retryFailed,
    failedCount,
    getFailedBills,
  } = useOfflineQueue();

  if (failedCount === 0) {
    return null;
  }

  const handleRetry = async () => {
    try {
      await retryFailed();

      Alert.alert(
        'Retry Started',
        `Retrying ${failedCount} failed uploads...`
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
      <Icon name="refresh" size={20} color="#fff" />
      <Text style={styles.retryText}>
        Retry {failedCount} Failed
      </Text>
    </TouchableOpacity>
  );
}
```

### Failed Bills List

```tsx
function FailedBillsList() {
  const {
    getFailedBills,
    removeFromQueue,
    canRetry,
  } = useOfflineQueue();

  const failedBills = getFailedBills();

  if (failedBills.length === 0) {
    return null;
  }

  const handleRemove = async (billId: string) => {
    Alert.alert(
      'Remove Bill',
      'Are you sure you want to remove this failed bill?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeFromQueue(billId);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Failed Uploads</Text>

      {failedBills.map(bill => (
        <View key={bill.id} style={styles.billItem}>
          <View style={styles.billInfo}>
            <Text style={styles.storeName}>{bill.formData.storeId}</Text>
            <Text style={styles.error}>{bill.error}</Text>
            <Text style={styles.attempts}>
              Attempts: {bill.attempt} / 3
            </Text>
          </View>

          <View style={styles.actions}>
            {canRetry(bill.id) && (
              <TouchableOpacity style={styles.retryIcon}>
                <Icon name="refresh" size={20} color="#2196F3" />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.removeIcon}
              onPress={() => handleRemove(bill.id)}
            >
              <Icon name="delete" size={20} color="#F44336" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}
```

---

## UI Components

### Queue Management Screen

```tsx
function QueueManagementScreen() {
  const {
    queue,
    status,
    syncQueue,
    retryFailed,
    clearCompleted,
    clearAll,
    isSyncing,
    canSync,
    hasCompletedUploads,
    hasFailedUploads,
  } = useOfflineQueue();

  return (
    <ScrollView style={styles.container}>
      {/* Status Summary */}
      <QueueSummary />

      {/* Action Buttons */}
      <View style={styles.actions}>
        {canSync && (
          <Button
            title={`Sync Now (${status?.pending || 0})`}
            onPress={syncQueue}
            disabled={isSyncing}
          />
        )}

        {hasFailedUploads && (
          <Button
            title="Retry Failed"
            onPress={retryFailed}
            color="#FF9800"
          />
        )}

        {hasCompletedUploads && (
          <Button
            title="Clear Completed"
            onPress={clearCompleted}
            color="#4CAF50"
          />
        )}

        {queue.length > 0 && (
          <Button
            title="Clear All"
            onPress={() => {
              Alert.alert(
                'Clear All',
                'Remove all bills from queue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: clearAll,
                  },
                ]
              );
            }}
            color="#F44336"
          />
        )}
      </View>

      {/* Queue List */}
      <View style={styles.list}>
        {queue.map(bill => (
          <BillStatusCard key={bill.id} billId={bill.id} />
        ))}
      </View>

      {queue.length === 0 && (
        <View style={styles.empty}>
          <Icon name="inbox" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Queue is empty</Text>
        </View>
      )}
    </ScrollView>
  );
}
```

### Network Status Banner

```tsx
function NetworkStatusBanner() {
  const {
    isOnline,
    pendingCount,
    isSyncing,
  } = useOfflineQueue();

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <View style={[
      styles.banner,
      isOnline ? styles.bannerOnline : styles.bannerOffline
    ]}>
      <Icon
        name={isOnline ? 'cloud-queue' : 'cloud-off'}
        size={20}
        color="#fff"
      />

      <Text style={styles.bannerText}>
        {isOnline
          ? isSyncing
            ? 'Syncing bills...'
            : `${pendingCount} bills pending upload`
          : 'Offline - Bills will sync when connection is restored'
        }
      </Text>
    </View>
  );
}
```

---

## Advanced Usage

### Custom Sync Logic

```tsx
function CustomSyncManager() {
  const {
    syncQueue,
    getPendingBills,
    isOnline,
  } = useOfflineQueue();

  // Sync only specific bills
  const syncSpecificBills = async (billIds: string[]) => {
    // This would require extending the service
    // For now, you can filter and sync all
    await syncQueue();
  };

  // Sync only during specific times
  const syncDuringOffPeak = async () => {
    const hour = new Date().getHours();

    // Only sync between 10 PM and 6 AM
    if (hour >= 22 || hour < 6) {
      await syncQueue();
    }
  };

  // Sync with bandwidth check
  const syncWithBandwidthCheck = async () => {
    const connection = await NetInfo.fetch();

    // Only sync on WiFi or 4G/5G
    if (
      connection.type === 'wifi' ||
      connection.details?.cellularGeneration === '4g' ||
      connection.details?.cellularGeneration === '5g'
    ) {
      await syncQueue();
    }
  };

  return null;
}
```

### Queue Analytics

```tsx
function QueueAnalytics() {
  const {
    getSuccessRate,
    getAverageAttempts,
    getOldestPendingAge,
    lastSyncResult,
  } = useOfflineQueue();

  const oldestAge = getOldestPendingAge();

  return (
    <View style={styles.analytics}>
      <Text style={styles.title}>Queue Analytics</Text>

      <View style={styles.metrics}>
        <Metric
          label="Success Rate"
          value={`${getSuccessRate()}%`}
        />

        <Metric
          label="Avg Attempts"
          value={getAverageAttempts().toFixed(1)}
        />

        {oldestAge && (
          <Metric
            label="Oldest Pending"
            value={formatDuration(oldestAge)}
          />
        )}

        {lastSyncResult && (
          <Metric
            label="Last Sync"
            value={`${lastSyncResult.successful} / ${
              lastSyncResult.successful + lastSyncResult.failed
            }`}
          />
        )}
      </View>
    </View>
  );
}
```

### Integration with Existing Bill Upload

```tsx
// app/bill-upload.tsx
import { useOfflineQueue } from '../hooks/useOfflineQueue';

function BillUploadScreen() {
  const { addToQueue, isOnline } = useOfflineQueue();
  const [imageUri, setImageUri] = useState('');
  const [formData, setFormData] = useState<BillUploadData>({
    storeId: '',
    amount: 0,
    date: new Date(),
  });

  const handleSubmit = async () => {
    try {
      // Add to queue instead of direct upload
      const billId = await addToQueue(formData, imageUri);

      // Show appropriate message
      Alert.alert(
        'Success',
        isOnline
          ? 'Bill is being uploaded'
          : 'Bill saved and will upload when online',
        [
          {
            text: 'View Queue',
            onPress: () => navigation.navigate('QueueManagement'),
          },
          { text: 'OK' },
        ]
      );

      // Reset form
      setImageUri('');
      setFormData({ storeId: '', amount: 0, date: new Date() });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Network status banner */}
      <NetworkStatusBanner />

      {/* Upload form */}
      <BillUploadForm
        formData={formData}
        imageUri={imageUri}
        onFormChange={setFormData}
        onImageChange={setImageUri}
        onSubmit={handleSubmit}
      />

      {/* Queue status */}
      <QueueStatusBadge />
    </View>
  );
}
```

---

## Best Practices

1. **Always use the queue for uploads** - Even when online, use the queue for consistency
2. **Show network status** - Let users know when they're offline
3. **Provide feedback** - Show queue status and sync progress
4. **Handle errors gracefully** - Show retry options for failed uploads
5. **Clean up regularly** - Clear completed items to prevent queue bloat
6. **Monitor queue size** - Alert users if queue is getting full
7. **Respect user's network** - Consider syncing only on WiFi for large uploads
8. **Persist state** - The queue persists across app restarts automatically

---

## Troubleshooting

### Queue not syncing automatically

```tsx
// Check auto-sync is enabled
<OfflineQueueProvider autoSync={true}>
```

### Bills stuck in uploading state

```tsx
// This is handled automatically on app restart
// Uploading bills are reset to pending
```

### Queue full error

```tsx
// Clear completed items
await clearCompleted();

// Or adjust max queue size
billUploadQueueService.initialize({
  maxQueueSize: 100, // Increase from default 50
});
```

### Network detection not working

```tsx
// Ensure NetInfo is properly installed
npm install @react-native-community/netinfo
```

---

## API Reference

See the TypeScript interfaces in:
- `services/billUploadQueueService.ts`
- `contexts/OfflineQueueContext.tsx`
- `hooks/useOfflineQueue.ts`

For complete API documentation and examples.
