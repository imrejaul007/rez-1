# Bill Upload Analytics - System Architecture

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Bill Upload Component                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Image Picker │  │ Form Handler │  │Upload Handler│          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                  │
│                            │                                      │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │      Analytics Integration Layer        │
        └────────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                     │
        ▼                    ▼                     ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│billUpload     │  │errorReporter    │  │telemetryService  │
│Analytics      │  │                 │  │                  │
│               │  │                 │  │                  │
│- Track Events │  │- Capture Errors │  │- Batch Events    │
│- Calculate    │  │- Add Breadcrumbs│  │- Send to Backend │
│  Metrics      │  │- Categorize     │  │- Offline Queue   │
│- Conversion   │  │- Report         │  │- Retry Logic     │
│  Funnel       │  │                 │  │                  │
└───────┬───────┘  └────────┬────────┘  └────────┬─────────┘
        │                   │                      │
        │                   │                      │
        ▼                   ▼                      ▼
┌───────────────────────────────────────────────────────────┐
│                    AsyncStorage                            │
│                                                            │
│  Events  │  Metrics  │  Funnel  │  Errors  │  Queue      │
└───────────────────────────────────────────────────────────┘
                             │
                             ▼
                   ┌──────────────────┐
                   │  Backend API     │
                   │  /api/telemetry  │
                   └──────────────────┘
```

---

## Component Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                                  │
└─────────────────────────────────────────────────────────────────┘

1. Page Load
   ↓
   trackPageView() → trackFunnelPageLoad()
   │
   └→ Analytics Event: "bill_upload_page_loaded"

2. Select Image (Camera/Gallery)
   ↓
   trackImageSelected() → trackFunnelImageSelected()
   │
   ├→ Analytics Event: "image_selected"
   └→ Breadcrumb: "User selected camera"

3. Fill Form
   ↓
   trackMerchantSelected() → trackAmountValidated() → trackDateValidated()
   │
   ├→ Analytics Event: "merchant_selected"
   ├→ Analytics Event: "amount_validated"
   ├→ Analytics Event: "date_validated"
   └→ trackFunnelFormFilled()

4. Validate Form
   ↓
   If errors:
     trackValidationError() for each field
     │
     └→ Analytics Event: "validation_error"

5. Submit & Upload
   ↓
   trackFormSubmitted() → trackUploadStart()
   │
   ├→ Analytics Event: "form_submitted"
   ├→ Analytics Event: "image_upload_started"
   └→ Breadcrumb: "Upload started"

   During Upload:
     trackUploadProgress() (at 25%, 50%, 75%, 100%)
     │
     └→ Analytics Events: "image_upload_progress_*"

6. Success or Failure
   ↓
   Success:
     trackUploadComplete() → trackOCRResult() → trackFunnelBillSubmitted()
     │
     ├→ Analytics Event: "upload_success"
     ├→ Analytics Event: "ocr_completed"
     └→ High Priority Telemetry Event

   Failure:
     trackUploadFailed() → captureError()
     │
     ├→ Analytics Event: "upload_failed"
     ├→ Error Report with full context
     ├→ High Priority Telemetry Event
     └→ Option to Retry

7. Retry (if failed)
   ↓
   trackRetryAttempt() → Go back to step 5
   │
   └→ Analytics Event: "retry_attempted"
```

---

## Data Flow Diagram

```
┌──────────────┐
│  Component   │
│   Action     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│ Analytics Method     │
│ - trackEvent()       │
│ - trackError()       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Create Event Object  │
│ {                    │
│   type: string       │
│   billId: string     │
│   metadata: object   │
│   timestamp: number  │
│   sessionId: string  │
│   userId: string     │
│ }                    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Add to Event Queue   │
│ (in-memory array)    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ Check Queue Size     │
│ >= BATCH_SIZE?       │
└──────┬───────────────┘
       │
       ├─ Yes ─► Flush Immediately
       │
       └─ No ──► Wait for Auto-Flush (30s)
                 │
                 ▼
       ┌──────────────────────┐
       │ Flush Events         │
       │ - Save to Storage    │
       │ - Send to Telemetry  │
       └──────┬───────────────┘
              │
              ▼
       ┌──────────────────────┐
       │ Telemetry Service    │
       │ - Batch Events       │
       │ - Check Network      │
       └──────┬───────────────┘
              │
              ├─ Online ─┐
              │          ▼
              │   ┌──────────────────┐
              │   │ Send to Backend  │
              │   │ POST /telemetry  │
              │   └──────┬───────────┘
              │          │
              │          ├─ Success ─► Remove from Queue
              │          │
              │          └─ Failure ─► Retry with Backoff
              │
              └─ Offline ─► Add to Queue (save to storage)
```

---

## Error Handling Flow

```
┌──────────────┐
│   try {      │
│  Operation   │
│   }          │
└──────┬───────┘
       │
       ▼ Error occurs
┌──────────────────────────┐
│ catch (error) {          │
│   errorReporter.         │
│   captureError()         │
│ }                        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Categorize Error         │
│ - network                │
│ - validation             │
│ - authentication         │
│ - etc.                   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Create Error Object      │
│ {                        │
│   id: string             │
│   message: string        │
│   category: string       │
│   severity: string       │
│   breadcrumbs: []        │
│   context: object        │
│   fingerprint: string    │
│ }                        │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Store Error              │
│ - Add to errors array    │
│ - Save to AsyncStorage   │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Log to Console           │
│ - console.error()        │
│ - console.warn()         │
└──────┬───────────────────┘
       │
       ▼
┌──────────────────────────┐
│ Send to Remote Service   │
│ (Sentry, Bugsnag, etc.)  │
└──────────────────────────┘
```

---

## Conversion Funnel Tracking

```
Stage 1: Page Load
   ↓
   trackFunnelPageLoad()
   │
   └─► initialLoad++
       └─► Stored in AsyncStorage

Stage 2: Image Selected
   ↓
   trackFunnelImageSelected()
   │
   └─► imageSelected++
       └─► Calculate drop-off: initialLoad - imageSelected

Stage 3: Form Filled
   ↓
   trackFunnelFormFilled()
   │
   └─► formFilled++
       └─► Calculate drop-off: imageSelected - formFilled

Stage 4: Bill Submitted
   ↓
   trackFunnelBillSubmitted()
   │
   └─► billSubmitted++
       └─► Calculate drop-off: formFilled - billSubmitted

Stage 5: Bill Approved
   ↓
   trackFunnelBillApproved()
   │
   └─► billApproved++
       └─► Calculate drop-off: billSubmitted - billApproved
       └─► Calculate conversion rate: (billApproved / initialLoad) * 100

Result:
┌─────────────────────────────┐
│ ConversionFunnel {          │
│   initialLoad: 1000         │
│   imageSelected: 850        │  (150 dropped)
│   formFilled: 700           │  (150 dropped)
│   billSubmitted: 650        │  (50 dropped)
│   billApproved: 600         │  (50 dropped)
│   conversionRate: 60%       │
│   dropOffPoints: {          │
│     imageSelection: 150     │
│     formCompletion: 150     │
│     submission: 50          │
│     approval: 50            │
│   }                         │
│ }                           │
└─────────────────────────────┘
```

---

## Metrics Calculation Pipeline

```
┌──────────────────┐
│ getMetrics()     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────┐
│ Load All Events          │
│ from AsyncStorage        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Calculate Upload Metrics │
│ - Filter upload events   │
│ - Count attempts         │
│ - Count successes        │
│ - Calculate averages     │
│ - Calculate rates        │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Calculate Validation     │
│ Metrics                  │
│ - Filter validation errs │
│ - Group by field         │
│ - Group by type          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Calculate OCR Metrics    │
│ - Filter OCR events      │
│ - Calculate accuracy     │
│ - Calculate confidence   │
│ - Count extracted fields │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Calculate Error Metrics  │
│ - Filter error events    │
│ - Group by type          │
│ - Group by context       │
│ - Count critical errors  │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Get Conversion Funnel    │
│ - Load from storage      │
│ - Calculate rates        │
│ - Calculate drop-offs    │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Calculate Session        │
│ Metrics                  │
│ - Group by sessionId     │
│ - Calculate duration     │
│ - Count events           │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Combine All Metrics      │
│ Return {                 │
│   upload: {...}          │
│   validation: {...}      │
│   ocr: {...}             │
│   errors: {...}          │
│   conversion: {...}      │
│   sessions: [...]        │
│ }                        │
└──────────────────────────┘
```

---

## Storage Structure

```
AsyncStorage
│
├─ @billUpload:analytics:events
│  └─ [
│       { type: 'upload_started', billId: '123', ... },
│       { type: 'upload_progress', billId: '123', ... },
│       { type: 'upload_complete', billId: '123', ... }
│     ]
│
├─ @billUpload:analytics:metrics
│  └─ {
│       upload: { successRate: 85, ... },
│       validation: { totalErrors: 12, ... },
│       ocr: { accuracy: 92, ... },
│       errors: { totalErrors: 5, ... },
│       conversion: { conversionRate: 60, ... }
│     }
│
├─ @billUpload:analytics:funnel
│  └─ {
│       initialLoad: 1000,
│       imageSelected: 850,
│       formFilled: 700,
│       billSubmitted: 650,
│       billApproved: 600
│     }
│
├─ @errorReporter:errors
│  └─ [
│       {
│         id: 'error_123',
│         message: 'Network failed',
│         category: 'network',
│         severity: 'error',
│         breadcrumbs: [...],
│         ...
│       }
│     ]
│
├─ @errorReporter:breadcrumbs
│  └─ [
│       { type: 'navigation', message: 'User entered page', ... },
│       { type: 'user_action', message: 'Button clicked', ... },
│       { type: 'network', message: 'API request', ... }
│     ]
│
└─ @telemetry:queue
   └─ [
        {
          id: 'batch_123',
          events: [...],
          priority: 'normal',
          retryCount: 0,
          timestamp: 1699000000000
        }
      ]
```

---

## Service Dependencies

```
┌─────────────────────────────┐
│  billUploadAnalytics.ts     │
│                             │
│  Depends on:                │
│  ├─ AsyncStorage            │
│  ├─ telemetryService        │
│  └─ errorReporter           │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│  telemetryService.ts        │
│                             │
│  Depends on:                │
│  ├─ AsyncStorage            │
│  ├─ NetInfo                 │
│  └─ apiClient               │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│  errorReporter.ts           │
│                             │
│  Depends on:                │
│  ├─ AsyncStorage            │
│  └─ Platform                │
└─────────────────────────────┘
```

---

## Auto-Flush Mechanism

```
┌──────────────────────┐
│ Analytics Service    │
│ Initialized          │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ startAutoFlush()     │
│ - Create timer       │
│ - Interval: 30s      │
└──────┬───────────────┘
       │
       │ Every 30 seconds:
       │
       ▼
┌──────────────────────┐
│ flushEvents()        │
└──────┬───────────────┘
       │
       ├─► Save events to AsyncStorage
       │
       ├─► Send batches to telemetry
       │   │
       │   ▼
       │   ┌──────────────────────┐
       │   │ telemetryService     │
       │   │ .sendBatch()         │
       │   └──────┬───────────────┘
       │          │
       │          ├─► Check network
       │          │
       │          ├─► Batch events
       │          │
       │          └─► Send to backend
       │
       └─► Clear in-memory events
```

---

## Network-Aware Sending

```
┌──────────────────────┐
│ telemetryService     │
│ - Monitor network    │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│ NetInfo.addEventListener
│ - Listen for changes │
└──────┬───────────────┘
       │
       ├─ Online ────┐
       │             ▼
       │    ┌──────────────────┐
       │    │ Was offline?     │
       │    └──────┬───────────┘
       │           │
       │           ├─ Yes ─► Auto-flush queue
       │           │
       │           └─ No ──► Continue normal operation
       │
       └─ Offline ──┐
                    ▼
           ┌──────────────────┐
           │ Queue events     │
           │ - Save to storage│
           │ - Wait for online│
           └──────────────────┘
```

---

## Priority Queue System

```
High Priority
   │
   ├─► Critical events (payment failures, auth errors)
   ├─► Sent immediately (bypass auto-flush)
   └─► Retry aggressively
       │
       ▼
┌──────────────────────┐
│ Send immediately     │
└──────────────────────┘

Normal Priority
   │
   ├─► Standard events (page views, button clicks)
   ├─► Batched (50 events)
   └─► Auto-flush (30s)
       │
       ▼
┌──────────────────────┐
│ Send in next batch   │
└──────────────────────┘

Low Priority
   │
   ├─► Background events (analytics, metrics)
   ├─► Batched (50 events)
   └─► Auto-flush (30s)
       │
       ▼
┌──────────────────────┐
│ Send when network    │
│ conditions are good  │
└──────────────────────┘
```

---

## Retry Logic with Exponential Backoff

```
Attempt 1
   │
   ├─► Send to backend
   │
   ├─ Success ─► Remove from queue ✓
   │
   └─ Failure ─┐
              ▼
   ┌──────────────────┐
   │ Wait 1 second    │
   └──────┬───────────┘
          │
Attempt 2 │
   │      │
   ├──────┘
   ├─► Send to backend
   │
   ├─ Success ─► Remove from queue ✓
   │
   └─ Failure ─┐
              ▼
   ┌──────────────────┐
   │ Wait 2 seconds   │  (exponential: 2^1)
   └──────┬───────────┘
          │
Attempt 3 │
   │      │
   ├──────┘
   ├─► Send to backend
   │
   ├─ Success ─► Remove from queue ✓
   │
   └─ Failure ─┐
              ▼
   ┌──────────────────┐
   │ Wait 4 seconds   │  (exponential: 2^2)
   └──────┬───────────┘
          │
Attempt 4 │
   │      │
   ├──────┘
   ├─► Max retries exceeded
   │
   └─► Remove from queue ✗
       Mark as failed
```

---

## Complete Integration Example

```
Component Mount
   │
   ├─► trackPageView()
   ├─► trackFunnelPageLoad()
   └─► addBreadcrumb('Page loaded')
       │
       ▼
User Actions
   │
   ├─► Click camera button
   │   ├─► trackUserAction('camera_button_clicked')
   │   └─► addBreadcrumb('Camera button clicked')
   │
   ├─► Select image
   │   ├─► trackImageSelected('camera', fileSize)
   │   ├─► trackFunnelImageSelected()
   │   └─► addBreadcrumb('Image selected')
   │
   ├─► Fill form
   │   ├─► trackMerchantSelected(id, name)
   │   ├─► trackAmountValidated(amount, true)
   │   ├─► trackDateValidated(date, true)
   │   ├─► trackFunnelFormFilled()
   │   └─► addBreadcrumb('Form completed')
   │
   └─► Submit form
       │
       ├─► trackFormSubmitted(billId)
       ├─► trackUploadStart(billId, fileSize)
       └─► addBreadcrumb('Upload started')
           │
           ▼
   ┌─────────────────┐
   │  Upload Process │
   └─────┬───────────┘
         │
         ├─► Progress updates
         │   ├─► trackUploadProgress(billId, 25%)
         │   ├─► trackUploadProgress(billId, 50%)
         │   ├─► trackUploadProgress(billId, 75%)
         │   └─► trackUploadProgress(billId, 100%)
         │
         ├─ Success ─┐
         │           ▼
         │   ┌─────────────────────────┐
         │   │ trackUploadComplete()   │
         │   │ trackOCRResult()        │
         │   │ trackFunnelSubmitted()  │
         │   │ High priority telemetry │
         │   └─────────────────────────┘
         │
         └─ Failure ─┐
                     ▼
            ┌─────────────────────────┐
            │ trackUploadFailed()     │
            │ captureError()          │
            │ High priority telemetry │
            │ Show retry option       │
            └─────────────────────────┘
```

---

This architecture provides a complete, production-ready analytics system with comprehensive error tracking, efficient batching, offline support, and detailed conversion funnel analysis.
