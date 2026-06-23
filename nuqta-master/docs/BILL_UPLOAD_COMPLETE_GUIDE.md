# Bill Upload System - Complete Guide

> **Version:** 2.0.0
> **Last Updated:** January 2025
> **Status:** Production Ready

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Features](#features)
4. [Component Hierarchy](#component-hierarchy)
5. [Data Flow](#data-flow)
6. [User Journey](#user-journey)
7. [Technical Specifications](#technical-specifications)
8. [Error Handling](#error-handling)
9. [Performance Optimization](#performance-optimization)
10. [Security & Privacy](#security--privacy)

---

## Overview

The Bill Upload System is a comprehensive, production-ready solution for capturing, validating, and processing offline bill uploads for cashback rewards. It provides an intuitive user experience with robust error handling, offline support, and real-time progress tracking.

### Key Capabilities

- **📷 Image Capture & Upload**: Camera integration and gallery selection
- **✅ Real-time Validation**: Field-level validation with immediate feedback
- **🔍 OCR Integration**: Automatic bill data extraction (planned)
- **💰 Cashback Preview**: Real-time cashback calculation
- **🔄 Retry Logic**: Automatic retry with exponential backoff
- **💾 Offline Support**: Form persistence and queue management
- **📊 Progress Tracking**: Real-time upload progress with speed/ETA
- **🛡️ Fraud Detection**: Multi-layer security checks

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Bill Upload System                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │              │    │              │    │              │  │
│  │  UI Layer    │◄───┤  State Mgmt  │◄───┤   Services   │  │
│  │              │    │              │    │              │  │
│  │ - BillUpload │    │ - useBillUp  │    │ - Upload     │  │
│  │   Page       │    │   load       │    │   Service    │  │
│  │ - Modals     │    │ - Form State │    │ - Verfic.    │  │
│  │ - Forms      │    │ - Progress   │    │   Service    │  │
│  │              │    │   Tracking   │    │ - Storage    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                    │                    │          │
│         └────────────────────┼────────────────────┘          │
│                              │                               │
│                    ┌─────────▼──────────┐                   │
│                    │                    │                   │
│                    │   API Layer        │                   │
│                    │                    │                   │
│                    │ - Bill Upload API  │                   │
│                    │ - Stores API       │                   │
│                    │ - Verification API │                   │
│                    │                    │                   │
│                    └────────────────────┘                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
BillUploadPage
│
├── Header
│   ├── BackButton
│   ├── Title
│   └── InfoButton
│
├── ScrollView
│   ├── InfoBanner
│   │   └── Cashback Message
│   │
│   ├── Image Upload Section
│   │   ├── Camera Capture
│   │   ├── Gallery Selection
│   │   └── Image Preview
│   │
│   ├── Form Fields
│   │   ├── Merchant Selector
│   │   ├── Amount Input
│   │   ├── Date Input
│   │   ├── Bill Number Input (Optional)
│   │   └── Notes Input (Optional)
│   │
│   ├── Cashback Preview
│   │   └── CashbackCalculator
│   │
│   └── Submit Button
│
└── Modals
    ├── Camera View
    ├── Merchant Selector
    ├── Progress Modal
    ├── Info Modal
    └── Toast Notifications
```

---

## Features

### 1. Image Capture & Upload

#### Camera Capture
- **Native camera integration** using expo-camera
- **Real-time preview** with framing guidelines
- **Flash control** and camera switching
- **Quality settings** (0.8 compression for optimal size)
- **Orientation handling**

#### Gallery Selection
- **Image picker** integration
- **Image editing** support (crop, rotate)
- **Multi-format support** (JPG, PNG, HEIC)
- **Size validation** (max 5MB)

#### Image Preview
- **Full-size preview** with zoom capability
- **Retake option** for easy re-capture
- **Remove functionality**
- **Quality indicator**

### 2. Form Validation

#### Real-time Validation
```typescript
// Amount validation
- Required field
- Minimum: ₹50
- Maximum: ₹100,000
- Max 2 decimal places
- Numeric only

// Date validation
- Required field
- Not in future
- Max 30 days old
- Valid date format

// Bill Number (Optional)
- Min 3 characters
- Max 50 characters
- Alphanumeric + hyphens/slashes/underscores

// Notes (Optional)
- Max 500 characters
```

#### Field-Level Feedback
- **Instant validation** on blur
- **Clear error messages**
- **Helpful tooltips**
- **Success indicators**

### 3. Merchant Selection

#### Smart Search
- **Fuzzy matching** for merchant names
- **Category filtering**
- **Recent merchants** quick access
- **Cashback rate display**

#### Merchant Display
- **Logo preview**
- **Cashback percentage**
- **Category badge**
- **Address information**

### 4. Cashback Preview

#### Real-time Calculation
```typescript
interface CashbackCalculation {
  baseAmount: number;          // Original bill amount
  baseCashbackRate: number;    // Merchant's base rate
  baseCashback: number;        // Base cashback amount
  bonuses: CashbackBonus[];    // Additional bonuses
  totalBonus: number;          // Sum of all bonuses
  finalCashbackRate: number;   // Total rate including bonuses
  finalCashback: number;       // Final cashback amount
  caps: {                      // Cashback limits
    dailyLimit?: number;
    monthlyLimit?: number;
  };
  breakdown: Array<{           // Detailed breakdown
    label: string;
    amount: number;
    percentage?: number;
  }>;
}
```

#### Breakdown Display
- **Base cashback** calculation
- **Bonus categories** (category, promotional, tier)
- **Cap information** (daily/monthly limits)
- **Visual breakdown** with percentages

### 5. Progress Tracking

#### Upload Metrics
```typescript
interface UploadProgress {
  loaded: number;              // Bytes uploaded
  total: number;               // Total bytes
  percentage: number;          // Progress percentage (0-100)
  speed: number;               // Upload speed (bytes/sec)
  timeRemaining: number;       // Estimated time (seconds)
  startTime: number;           // Upload start timestamp
  currentTime: number;         // Current timestamp
}
```

#### Progress Display
- **Progress bar** with percentage
- **Upload speed** in MB/s or KB/s
- **Time remaining** in MM:SS format
- **Cancel option**

### 6. Error Handling

#### Error Types
```typescript
enum BillUploadErrorType {
  // File errors
  FILE_TOO_LARGE,
  INVALID_FORMAT,
  IMAGE_QUALITY_LOW,
  CORRUPT_FILE,

  // Validation errors
  MERCHANT_INVALID,
  AMOUNT_INVALID,
  DATE_INVALID,

  // Network errors
  NETWORK_TIMEOUT,
  NETWORK_ERROR,
  NO_INTERNET,

  // Server errors
  SERVER_ERROR,
  AUTHENTICATION_FAILED,
  RATE_LIMIT,

  // Business errors
  DUPLICATE_BILL,
  BILL_TOO_OLD,
  MERCHANT_NOT_ELIGIBLE,
}
```

#### Error Recovery
- **Automatic retry** for retryable errors
- **User-friendly messages**
- **Recovery suggestions**
- **Manual retry option**

### 7. Offline Support

#### Form Persistence
- **Auto-save** every 1 second
- **AsyncStorage** backed
- **Restore on reload**
- **Clear on success**

#### Upload Queue
- **Queue pending uploads** when offline
- **Auto-retry** when online
- **Priority management**
- **Status tracking**

---

## Component Hierarchy

### Main Components

#### 1. BillUploadPage (`app/bill-upload.tsx`)
**Purpose:** Main container component

**State Management:**
```typescript
interface ComponentState {
  // Camera
  hasPermission: boolean | null;
  showCamera: boolean;
  cameraType: 'back' | 'front';

  // Form
  formData: FormData;
  errors: FormErrors;
  touched: Record<string, boolean>;

  // Merchant
  merchants: Store[];
  showMerchantSelector: boolean;
  merchantSearchQuery: string;

  // Cashback
  cashbackCalculation: CashbackCalculation | null;
  showCashbackPreview: boolean;

  // UI
  showProgressModal: boolean;
  toast: ToastConfig;
}
```

#### 2. CashbackCalculator (`components/bills/CashbackCalculator.tsx`)
**Purpose:** Display cashback breakdown

**Props:**
```typescript
interface Props {
  calculation: CashbackCalculation;
  expanded?: boolean;
  onToggle?: () => void;
}
```

#### 3. Toast (`components/common/Toast.tsx`)
**Purpose:** Show notifications and alerts

**Props:**
```typescript
interface Props {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  actions?: Array<{
    text: string;
    onPress: () => void;
    style?: 'default' | 'cancel';
  }>;
  onDismiss: () => void;
}
```

### Services

#### 1. billUploadService
**Purpose:** Handle bill upload API calls

**Methods:**
```typescript
class BillUploadService {
  uploadBillWithProgress(
    data: BillUploadData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<ApiResponse<Bill>>;

  uploadBillWithRetry(
    data: BillUploadData,
    onProgress?: (progress: UploadProgress) => void,
    retryConfig?: Partial<RetryConfig>
  ): Promise<UploadResult>;

  cancelUpload(uploadId: string): boolean;

  getBillHistory(
    filters?: BillHistoryFilters
  ): Promise<ApiResponse<Bill[]>>;

  getBillById(billId: string): Promise<ApiResponse<Bill>>;

  resubmitBill(
    billId: string,
    newPhoto: string
  ): Promise<ApiResponse<Bill>>;

  getBillStatistics(): Promise<ApiResponse<BillStatistics>>;
}
```

#### 2. billVerificationService
**Purpose:** Handle verification and OCR

**Methods:**
```typescript
class BillVerificationService {
  analyzeBillImage(
    imageUri: string
  ): Promise<ApiResponse<BillImageAnalysis>>;

  extractBillData(
    imageUri: string
  ): Promise<ApiResponse<OCRExtractedData>>;

  findMerchantMatches(
    merchantName: string,
    location?: string
  ): Promise<ApiResponse<MerchantMatch[]>>;

  verifyBill(data: {
    imageHash: string;
    merchantId: string;
    amount: number;
    billDate: string;
    billNumber?: string;
  }): Promise<ApiResponse<BillVerificationResult>>;

  checkFraud(data: {
    imageHash: string;
    merchantId: string;
    amount: number;
    billDate: string;
  }): Promise<ApiResponse<FraudDetectionResult>>;

  calculateCashback(data: {
    merchantId: string;
    amount: number;
    category?: string;
    billDate: string;
  }): Promise<ApiResponse<CashbackCalculation>>;
}
```

### Hooks

#### useBillUpload
**Purpose:** Manage upload state and logic

**Returns:**
```typescript
interface UseBillUploadReturn {
  // State
  isUploading: boolean;
  uploadState: UploadState;
  progress: UploadProgress | null;
  error: UploadError | null;
  formData: BillUploadFormData | null;

  // Retry
  currentAttempt: number;
  maxAttempts: number;
  canRetry: boolean;

  // Metrics
  uploadSpeed: string;
  timeRemaining: string;
  percentComplete: number;

  // Methods
  startUpload: (data: BillUploadData) => Promise<boolean>;
  retryUpload: () => Promise<boolean>;
  cancelUpload: () => void;
  saveFormData: (data: BillUploadFormData) => Promise<void>;
  loadFormData: () => Promise<BillUploadFormData | null>;
  clearFormData: () => Promise<void>;
  reset: () => void;
}
```

---

## Data Flow

### Upload Flow Diagram

```
┌─────────────┐
│   User      │
│  Actions    │
└──────┬──────┘
       │
       │ 1. Fill Form
       ▼
┌─────────────────────┐
│  Form Validation    │
│  - Real-time checks │
│  - Field-level      │
└──────┬──────────────┘
       │
       │ 2. Validate
       ▼
┌─────────────────────┐
│  Submit Handler     │
│  - Validate all     │
│  - Prepare data     │
└──────┬──────────────┘
       │
       │ 3. Start Upload
       ▼
┌─────────────────────┐
│  useBillUpload Hook │
│  - State management │
│  - Progress track   │
└──────┬──────────────┘
       │
       │ 4. Upload Request
       ▼
┌─────────────────────┐
│ billUploadService   │
│ - XMLHttpRequest    │
│ - Progress events   │
│ - Retry logic       │
└──────┬──────────────┘
       │
       │ 5. API Call
       ▼
┌─────────────────────┐
│  Backend API        │
│ - Process image     │
│ - Verify bill       │
│ - Calculate cashback│
└──────┬──────────────┘
       │
       │ 6. Response
       ▼
┌─────────────────────┐
│  Response Handler   │
│ - Update state      │
│ - Clear form        │
│ - Show feedback     │
└─────────────────────┘
```

### State Management Flow

```typescript
// Initial State
{
  uploadState: 'idle',
  isUploading: false,
  progress: null,
  error: null
}

// On Start Upload
{
  uploadState: 'preparing',
  isUploading: true,
  progress: null,
  error: null
}

// During Upload
{
  uploadState: 'uploading',
  isUploading: true,
  progress: {
    percentage: 45,
    loaded: 450000,
    total: 1000000,
    speed: 102400,
    timeRemaining: 5.4
  },
  error: null
}

// On Success
{
  uploadState: 'completed',
  isUploading: false,
  progress: {
    percentage: 100,
    ...
  },
  error: null
}

// On Error
{
  uploadState: 'failed',
  isUploading: false,
  progress: {
    percentage: 67,
    ...
  },
  error: {
    code: 'NETWORK_ERROR',
    message: 'Network error occurred',
    retryable: true
  }
}
```

---

## User Journey

### Happy Path

1. **Landing** → User navigates to bill upload page
2. **Capture** → User takes photo or selects from gallery
3. **Preview** → Image preview shows with retake option
4. **Merchant** → User selects merchant from searchable list
5. **Amount** → User enters bill amount (validated in real-time)
6. **Date** → Bill date is auto-filled to today (editable)
7. **Optional** → User can add bill number and notes
8. **Preview** → Cashback calculation shows estimated reward
9. **Submit** → User submits form
10. **Progress** → Upload progress shown with percentage and ETA
11. **Success** → Success message with options to view history or upload another

### Error Path (Network Error)

1. User fills form and submits
2. Upload starts, reaches 45%
3. Network error occurs
4. Error toast shows: "Network error occurred. Retrying..."
5. Automatic retry with exponential backoff
6. Retry succeeds
7. Upload completes successfully

### Offline Path

1. User fills form while offline
2. Form data auto-saved to AsyncStorage
3. User tries to submit
4. "No internet" message shows
5. Upload queued for when online
6. User closes app
7. User reopens app (now online)
8. Queued upload automatically retries
9. Success notification

---

## Technical Specifications

### Performance Requirements

```typescript
// Target Metrics
{
  initialLoad: '<2s',           // Page load time
  validation: '<100ms',         // Field validation
  imagePreview: '<500ms',       // Image preview render
  merchantSearch: '<300ms',     // Search response time
  cashbackCalc: '<200ms',       // Calculation speed
  uploadSpeed: '>500KB/s',      // Minimum upload speed
  formSave: '<50ms',            // Auto-save latency
}
```

### File Size Limits

```typescript
const FILE_LIMITS = {
  maxSize: 5 * 1024 * 1024,     // 5MB
  minSize: 10 * 1024,           // 10KB
  maxDimension: 4096,           // 4096px
  minDimension: 640,            // 640px
  compressionQuality: 0.8,      // 80%
  formats: ['jpg', 'jpeg', 'png', 'heic'],
};
```

### Retry Configuration

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,           // 1 second
  maxDelay: 10000,              // 10 seconds
  backoffMultiplier: 2,         // Exponential backoff
  retryableErrors: [
    'NETWORK_ERROR',
    'NETWORK_TIMEOUT',
    'SERVER_ERROR',
    'UPLOAD_INTERRUPTED',
  ],
};
```

---

## Error Handling

### Error Severity Levels

```typescript
enum ErrorSeverity {
  LOW,        // User can ignore and continue
  MEDIUM,     // User should fix but can retry
  HIGH,       // Blocks progress, requires action
  CRITICAL,   // System-level issue
}
```

### Error Messages

All error messages follow this structure:

```typescript
interface ErrorMessage {
  type: BillUploadErrorType;
  severity: ErrorSeverity;
  userMessage: string;          // User-friendly message
  technicalDetails?: string;    // For debugging
  recoverySuggestions: string[]; // How to fix
  isRetryable: boolean;
  requiresUserAction: boolean;
}
```

### Example Error Handling

```typescript
try {
  await uploadBill(data);
} catch (error) {
  const billError = mapToBillUploadError(error);

  showToast({
    message: billError.userMessage,
    type: billError.severity === 'CRITICAL' ? 'error' : 'warning',
    actions: billError.isRetryable ? [
      { text: 'Retry', onPress: retryUpload },
      { text: 'Cancel', onPress: dismiss },
    ] : undefined,
  });

  if (billError.requiresUserAction) {
    showRecoverySuggestions(billError.recoverySuggestions);
  }
}
```

---

## Performance Optimization

### Image Optimization

```typescript
// Before upload
const optimizedImage = await optimizeImage(originalImage, {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'jpeg',
});
```

### Debouncing

```typescript
// Amount validation (debounced)
const debouncedValidation = useMemo(
  () => debounce(validateAmount, 300),
  []
);
```

### Lazy Loading

```typescript
// Load merchants only when needed
const loadMerchants = useCallback(async () => {
  if (merchants.length > 0) return;
  setIsLoading(true);
  const result = await storesApi.getStores();
  setMerchants(result.data);
  setIsLoading(false);
}, [merchants]);
```

### Memoization

```typescript
// Memoize cashback calculation
const calculatedCashback = useMemo(() => {
  if (!amount || !merchantId) return null;
  return calculateCashback(amount, merchantId);
}, [amount, merchantId]);
```

---

## Security & Privacy

### Data Protection

1. **Transport Security**
   - All uploads use HTTPS
   - TLS 1.2 minimum
   - Certificate pinning

2. **Image Security**
   - No EXIF data transmitted
   - GPS coordinates stripped
   - File hash validation

3. **Authentication**
   - JWT tokens
   - Token refresh
   - Automatic logout on expiry

### Privacy Measures

1. **Data Minimization**
   - Only required fields collected
   - Optional fields clearly marked
   - Data retention policies

2. **User Control**
   - Delete uploaded bills
   - View upload history
   - Data export option

3. **Encryption**
   - At-rest encryption (AsyncStorage)
   - In-transit encryption (HTTPS)
   - Secure key management

---

## Appendix

### Validation Rules Reference

| Field | Required | Min | Max | Format | Notes |
|-------|----------|-----|-----|--------|-------|
| Bill Image | Yes | 10KB | 5MB | JPG/PNG/HEIC | Quality check |
| Merchant | Yes | - | - | - | From list only |
| Amount | Yes | ₹50 | ₹100,000 | Decimal(2) | Positive only |
| Date | Yes | -30 days | Today | YYYY-MM-DD | Not future |
| Bill Number | No | 3 | 50 | Alphanumeric | Optional |
| Notes | No | - | 500 | Text | Optional |

### API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/bills/upload` | POST | Upload new bill |
| `/bills` | GET | Get bill history |
| `/bills/:id` | GET | Get bill details |
| `/bills/:id/resubmit` | POST | Resubmit rejected bill |
| `/bills/statistics` | GET | Get user statistics |
| `/stores` | GET | Get merchant list |

### Status Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | Success | Bill uploaded successfully |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Authentication failed |
| 409 | Conflict | Duplicate bill |
| 413 | Payload Too Large | File too large |
| 422 | Unprocessable | Verification failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

---

**Document Version:** 2.0.0
**Last Updated:** January 2025
**Maintained By:** Development Team
**Contact:** support@example.com
