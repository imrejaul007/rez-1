# Offline Queue System - Visual Guide

## System Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER ACTION                              │
│                    (Upload Bill Button)                          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Component (React Native)                      │
│  const { addToQueue } = useOfflineQueue();                       │
│  await addToQueue(formData, imageUri);                           │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                   useOfflineQueue Hook                           │
│  • Provides queue state and actions                              │
│  • Type-safe interface                                           │
│  • Computed values and utilities                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                  OfflineQueueContext                             │
│  • Manages React state                                           │
│  • Listens to service events                                     │
│  • Monitors network status                                       │
│  • Triggers auto-sync                                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│              billUploadQueueService                              │
│  ┌────────────────────────────────────────────────────┐          │
│  │  1. Validate bill data                             │          │
│  │  2. Check for duplicates                           │          │
│  │  3. Check queue size limit                         │          │
│  │  4. Generate unique bill ID                        │          │
│  │  5. Add to queue array                             │          │
│  │  6. Persist to AsyncStorage                        │          │
│  │  7. Emit 'queue:change' event                      │          │
│  │  8. Trigger auto-sync if online                    │          │
│  └────────────────────────────────────────────────────┘          │
└────────┬──────────────────────────────┬────────────────────┬─────┘
         │                              │                    │
         ▼                              ▼                    ▼
┌────────────────┐          ┌────────────────┐    ┌──────────────┐
│  AsyncStorage  │          │    NetInfo     │    │ Event Emitter│
│   (Persist)    │          │(Network Status)│    │  (Notify UI) │
└────────────────┘          └────────────────┘    └──────────────┘
```

## Queue State Machine

```
                    User uploads bill
                           │
                           ▼
                    ┌─────────────┐
                    │   PENDING   │ ◄────────┐
                    └──────┬──────┘          │
                           │                 │
                Network available            │
                           │            Retry needed
                           ▼            (attempt < 3)
                    ┌─────────────┐          │
                    │  UPLOADING  │──────────┤
                    └──────┬──────┘          │
                           │                 │
                  Upload completes      Upload fails
                           │                 │
                ┌──────────┴──────────┐      │
                ▼                     ▼      │
         ┌─────────────┐       ┌─────────────┐
         │   SUCCESS   │       │   FAILED    │
         └─────────────┘       └──────┬──────┘
                                      │
                                Max attempts?
                                      │
                              ┌───────┴────────┐
                              │                │
                             Yes               No
                              │                │
                              ▼                │
                        Stay FAILED            │
                                               │
                                               └────────┘
```

## Sync Process Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      SYNC TRIGGERED                             │
│  (Auto: network reconnect, periodic check)                      │
│  (Manual: user clicks sync button)                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Check Network  │
                    └────────┬───────┘
                             │
                    ┌────────▼────────┐
                    │  Connected?     │
                    └────┬────────┬───┘
                        NO      YES
                         │       │
                         ▼       ▼
                    ┌────────┐ ┌──────────────────────┐
                    │ Error  │ │ Get pending/failed   │
                    │ Thrown │ │ bills from queue     │
                    └────────┘ └──────┬───────────────┘
                                      │
                                      ▼
                         ┌────────────────────────┐
                         │ Process in batches     │
                         │ (default: 5 at a time) │
                         └────────┬───────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │  For each bill in batch:  │
                    │  1. Set status=uploading  │
                    │  2. Increment attempt     │
                    │  3. Call upload API       │
                    │  4. Wait for response     │
                    └────────┬──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Upload Result  │
                    └────┬───────┬────┘
                       SUCCESS  FAIL
                         │       │
         ┌───────────────┘       └────────────────┐
         ▼                                        ▼
┌─────────────────┐                    ┌──────────────────┐
│ Set SUCCESS     │                    │ Check attempts   │
│ Remove from     │                    └────┬────────┬────┘
│ queue (or mark) │                   < max        ≥ max
└─────────────────┘                        │          │
                                           ▼          ▼
                                  ┌────────────┐ ┌────────┐
                                  │ Set PENDING│ │Set FAIL│
                                  │ for retry  │ │Keep in │
                                  │            │ │queue   │
                                  └────────────┘ └────────┘
                                           │
                    ┌──────────────────────┘
                    │
                    ▼
         ┌────────────────────┐
         │ Next batch?        │
         └────┬──────────┬────┘
             YES        NO
              │          │
              └──┐       ▼
                 │  ┌─────────────────┐
                 │  │ Update lastSync │
                 │  │ Emit 'synced'   │
                 │  │ Return result   │
                 │  └─────────────────┘
                 │
                 └──► (Loop back to process next batch)
```

## Retry Backoff Visualization

```
Attempt 1: ────────────────────────► (2 seconds)
           │                         Upload
           └─ Fail

Attempt 2: ────────────────────────────────────────► (4 seconds)
           │                                         Upload
           └─ Fail

Attempt 3: ────────────────────────────────────────────────────────► (8 seconds)
           │                                                         Upload
           └─ Fail

Result:    FAILED (max attempts reached)

Time:      0s    2s      4s          8s              16s                    24s
           │     │       │           │               │                      │
           └─────┴───────┴───────────┴───────────────┴──────────────────────┘
                        Exponential Backoff
```

## Data Persistence Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    IN-MEMORY QUEUE                              │
│  [Bill1, Bill2, Bill3, Bill4]                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ On every change:
                             │ - Add bill
                             │ - Remove bill
                             │ - Update status
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JSON.stringify()                             │
│  Convert queue array to JSON string                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              AsyncStorage.setItem()                             │
│  Key: '@bill_upload_queue'                                      │
│  Value: '[{"id":"bill_1","status":"pending",...}, ...]'         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ Persisted to disk
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    DEVICE STORAGE                               │
│  Survives app restart, OS updates, etc.                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ On app start
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              AsyncStorage.getItem()                             │
│  Retrieve saved queue                                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JSON.parse()                                 │
│  Convert JSON string back to array                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESTORE QUEUE                                │
│  Queue restored with all pending bills                          │
│  Reset UPLOADING → PENDING (crash recovery)                     │
└─────────────────────────────────────────────────────────────────┘
```

## Network Monitoring Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     App Starts                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│          NetInfo.addEventListener()                             │
│  Subscribe to network state changes                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Network state changes
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   Event Received                                │
│  { isConnected: true/false, type: 'wifi'/'cellular'/etc }      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Was Offline    │
                    │  Now Online?    │
                    └────┬───────┬────┘
                        NO      YES
                         │       │
                         ▼       ▼
                    ┌────────┐ ┌──────────────────────┐
                    │  Skip  │ │ Has pending bills?   │
                    └────────┘ └──────┬───────────────┘
                                     │
                              ┌──────▼──────┐
                              │   YES       │
                              └──────┬──────┘
                                     │
                                     ▼
                    ┌─────────────────────────────┐
                    │  Trigger Auto-Sync          │
                    │  syncQueue()                │
                    └─────────────────────────────┘
```

## Component Integration Pattern

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Root                                 │
│  <OfflineQueueProvider>                                         │
│    <NavigationContainer>                                        │
│      <Stack.Navigator>                                          │
│        ...screens...                                            │
│      </Stack.Navigator>                                         │
│    </NavigationContainer>                                       │
│  </OfflineQueueProvider>                                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ Context available to all children
                             │
            ┌────────────────┼────────────────┐
            │                │                │
            ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Bill Upload  │ │   Wallet     │ │   Account    │
    │   Screen     │ │   Screen     │ │   Screen     │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
           │ useOfflineQueue()              │
           │                │                │
           ▼                ▼                ▼
    ┌──────────────────────────────────────────────┐
    │  Access queue state and actions:             │
    │  - addToQueue()                              │
    │  - syncQueue()                               │
    │  - pendingCount                              │
    │  - isOnline                                  │
    │  - etc.                                      │
    └──────────────────────────────────────────────┘
```

## Queue Memory Structure

```
billUploadQueueService
│
├─ queue: QueuedBill[]
│  │
│  ├─ [0] {
│  │     id: "bill_1234567890_abc123",
│  │     formData: {
│  │       storeId: "store_xyz",
│  │       amount: 99.99,
│  │       date: Date,
│  │       categoryId: "cat_1"
│  │     },
│  │     imageUri: "file:///path/to/image.jpg",
│  │     timestamp: 1704326400000,
│  │     status: "pending",
│  │     attempt: 0
│  │   }
│  │
│  ├─ [1] {
│  │     id: "bill_1234567891_def456",
│  │     formData: { ... },
│  │     imageUri: "file:///path/to/image2.jpg",
│  │     timestamp: 1704326401000,
│  │     status: "uploading",
│  │     attempt: 1,
│  │     lastAttemptTime: 1704326410000
│  │   }
│  │
│  └─ [2] {
│        id: "bill_1234567892_ghi789",
│        formData: { ... },
│        imageUri: "file:///path/to/image3.jpg",
│        timestamp: 1704326402000,
│        status: "failed",
│        attempt: 3,
│        error: "Network timeout",
│        lastAttemptTime: 1704326430000
│      }
│
├─ config: QueueConfig {
│    maxQueueSize: 50,
│    maxRetries: 3,
│    retryDelayMs: 2000,
│    maxRetryDelayMs: 30000,
│    uploadTimeoutMs: 60000,
│    autoSync: true,
│    batchSize: 5
│  }
│
├─ isSyncing: false
│
└─ isInitialized: true
```

## User Journey Examples

### Happy Path (Online)

```
User fills form
       │
       ▼
Clicks Upload
       │
       ▼
Bill added to queue (PENDING)
       │
       ▼
Auto-sync detects online
       │
       ▼
Bill status → UPLOADING
       │
       ▼
API call succeeds
       │
       ▼
Bill status → SUCCESS
       │
       ▼
User sees success message
       │
       ▼
Bill auto-cleared after 1 hour
```

### Offline Path

```
User fills form
       │
       ▼
Clicks Upload
       │
       ▼
App detects offline
       │
       ▼
Bill added to queue (PENDING)
       │
       ▼
User sees "Saved offline" message
       │
       ▼
User continues using app
       │
       │ ... time passes ...
       │
       ▼
Network reconnects
       │
       ▼
Auto-sync triggered
       │
       ▼
Bill status → UPLOADING
       │
       ▼
API call succeeds
       │
       ▼
Bill status → SUCCESS
       │
       ▼
User sees "Bills synced" notification
```

### Retry Path

```
User uploads bill
       │
       ▼
Bill added to queue (PENDING)
       │
       ▼
Sync starts → UPLOADING
       │
       ▼
API call fails (network timeout)
       │
       ▼
Bill status → PENDING (attempt: 1)
       │
       ▼
Wait 2 seconds (backoff)
       │
       ▼
Retry upload → UPLOADING
       │
       ▼
API call fails again
       │
       ▼
Bill status → PENDING (attempt: 2)
       │
       ▼
Wait 4 seconds (backoff)
       │
       ▼
Retry upload → UPLOADING
       │
       ▼
API call succeeds
       │
       ▼
Bill status → SUCCESS
```

## Timeline Example

```
Time    Event                      Queue State                Network
────────────────────────────────────────────────────────────────────
00:00   App starts                 []                         Online
00:05   User uploads bill #1       [pending]                  Online
00:06   Auto-sync starts           [uploading]                Online
00:07   Upload succeeds            [success]                  Online
00:10   User goes offline          [success]                  OFFLINE
00:15   User uploads bill #2       [success, pending]         OFFLINE
00:20   User uploads bill #3       [success, pending, pending]OFFLINE
00:25   Network reconnects         [success, pending, pending]Online
00:26   Auto-sync triggered        [success, uploading, ...]  Online
00:28   Both bills uploaded        [success, success, success]Online
01:00   Auto-cleanup runs          []                         Online
```

## Visual Legend

```
Symbol Meanings:
─────────────────
│      Vertical flow
▼      Flow direction
┌─┐    Container/box
└─┘    Container end
◄──    Flow back/loop
...    Continuation
```

---

This visual guide helps understand the queue system's internal workings and data flow at a glance!
