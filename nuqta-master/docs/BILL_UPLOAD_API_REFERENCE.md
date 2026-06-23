# Bill Upload API Reference

> Complete API documentation for bill upload system

## Table of Contents

1. [Services](#services)
2. [Hooks](#hooks)
3. [Utilities](#utilities)
4. [Components](#components)
5. [Types](#types)

---

## Services

### billUploadService

Main service for handling bill uploads.

#### Methods

##### uploadBillWithProgress()

Upload a bill with progress tracking.

```typescript
uploadBillWithProgress(
  data: BillUploadData,
  onProgress?: (progress: UploadProgress) => void
): Promise<ApiResponse<Bill>>
```

**Parameters:**
- `data` - Bill upload data
- `onProgress` - Optional progress callback

**Returns:**
- Promise resolving to API response with bill data

**Example:**
```typescript
const result = await billUploadService.uploadBillWithProgress(
  {
    billImage: 'file://image.jpg',
    merchantId: 'merchant-123',
    amount: 1000,
    billDate: new Date(),
  },
  (progress) => {
    console.log(`${progress.percentage}% complete`);
  }
);
```

##### uploadBillWithRetry()

Upload with automatic retry logic.

```typescript
uploadBillWithRetry(
  data: BillUploadData,
  onProgress?: (progress: UploadProgress) => void,
  retryConfig?: Partial<RetryConfig>
): Promise<UploadResult>
```

**Parameters:**
- `data` - Bill upload data
- `onProgress` - Optional progress callback
- `retryConfig` - Optional retry configuration

**Returns:**
- Promise resolving to upload result with metadata

**Default Retry Config:**
```typescript
{
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', ...],
}
```

##### cancelUpload()

Cancel an active upload.

```typescript
cancelUpload(uploadId: string): boolean
```

**Parameters:**
- `uploadId` - ID of upload to cancel

**Returns:**
- `true` if cancelled, `false` if not found

##### getBillHistory()

Get user's bill history.

```typescript
getBillHistory(
  filters?: BillHistoryFilters
): Promise<ApiResponse<Bill[]>>
```

**Parameters:**
- `filters` - Optional filters
  - `status` - Filter by status
  - `startDate` - Start date filter
  - `endDate` - End date filter
  - `merchantId` - Filter by merchant
  - `limit` - Results per page
  - `page` - Page number

**Returns:**
- Promise resolving to array of bills

##### getBillById()

Get a specific bill by ID.

```typescript
getBillById(billId: string): Promise<ApiResponse<Bill>>
```

**Parameters:**
- `billId` - Bill ID

**Returns:**
- Promise resolving to bill data

##### resubmitBill()

Resubmit a rejected bill with new photo.

```typescript
resubmitBill(
  billId: string,
  newPhoto: string
): Promise<ApiResponse<Bill>>
```

**Parameters:**
- `billId` - Bill ID to resubmit
- `newPhoto` - New bill image URI

**Returns:**
- Promise resolving to updated bill

##### getBillStatistics()

Get user's bill statistics.

```typescript
getBillStatistics(): Promise<ApiResponse<BillStatistics>>
```

**Returns:**
- Promise resolving to statistics:
  - `totalBills` - Total number of bills
  - `pendingBills` - Pending verification
  - `approvedBills` - Approved bills
  - `rejectedBills` - Rejected bills
  - `totalCashback` - Total cashback earned
  - `pendingCashback` - Pending cashback

---

### billVerificationService

Service for bill verification and OCR.

#### Methods

##### analyzeBillImage()

Analyze bill image quality.

```typescript
analyzeBillImage(
  imageUri: string
): Promise<ApiResponse<BillImageAnalysis>>
```

**Returns:**
- Quality assessment
- Resolution info
- Issues detected
- Improvement suggestions

##### extractBillData()

Extract data from bill using OCR.

```typescript
extractBillData(
  imageUri: string
): Promise<ApiResponse<OCRExtractedData>>
```

**Returns:**
- Merchant name
- Amount
- Date
- Items
- Confidence score

##### findMerchantMatches()

Find matching merchants.

```typescript
findMerchantMatches(
  merchantName: string,
  location?: string
): Promise<ApiResponse<MerchantMatch[]>>
```

**Returns:**
- Array of merchant matches with scores

##### verifyBill()

Verify bill authenticity.

```typescript
verifyBill(data: {
  imageHash: string;
  merchantId: string;
  amount: number;
  billDate: string;
  billNumber?: string;
}): Promise<ApiResponse<BillVerificationResult>>
```

**Returns:**
- Verification result with checks

##### checkFraud()

Check for fraud indicators.

```typescript
checkFraud(data: {
  imageHash: string;
  merchantId: string;
  amount: number;
  billDate: string;
}): Promise<ApiResponse<FraudDetectionResult>>
```

**Returns:**
- Risk level
- Fraud flags
- Submission allowance

##### calculateCashback()

Calculate cashback amount.

```typescript
calculateCashback(data: {
  merchantId: string;
  amount: number;
  category?: string;
  billDate: string;
}): Promise<ApiResponse<CashbackCalculation>>
```

**Returns:**
- Detailed cashback breakdown

---

## Hooks

### useBillUpload

Main hook for managing bill upload state.

```typescript
function useBillUpload(
  retryConfig?: Partial<RetryConfig>
): UseBillUploadReturn
```

**Parameters:**
- `retryConfig` - Optional retry configuration

**Returns Object:**

#### State Properties

```typescript
{
  // Upload state
  isUploading: boolean;
  uploadState: UploadState;
  progress: UploadProgress | null;
  error: UploadError | null;
  formData: BillUploadFormData | null;

  // Retry state
  currentAttempt: number;
  maxAttempts: number;
  canRetry: boolean;

  // Metrics
  uploadSpeed: string;        // e.g., "1.5 MB/s"
  timeRemaining: string;      // e.g., "0:45"
  percentComplete: number;    // 0-100
}
```

#### Methods

```typescript
{
  // Upload control
  startUpload: (data: BillUploadData) => Promise<boolean>;
  retryUpload: () => Promise<boolean>;
  cancelUpload: () => void;
  reset: () => void;

  // Form persistence
  saveFormData: (data: BillUploadFormData) => Promise<void>;
  loadFormData: () => Promise<BillUploadFormData | null>;
  clearFormData: () => Promise<void>;
}
```

**Usage Example:**
```typescript
const billUpload = useBillUpload({ maxAttempts: 3 });

// Start upload
const success = await billUpload.startUpload({
  billImage: 'file://image.jpg',
  merchantId: 'merchant-123',
  amount: 1000,
  billDate: new Date(),
});

if (!success && billUpload.canRetry) {
  await billUpload.retryUpload();
}
```

---

## Utilities

### Validation

#### validateAmount()

Validate bill amount.

```typescript
function validateAmount(
  amount: string | number
): ValidationResult
```

**Rules:**
- Required
- Min: ₹50
- Max: ₹100,000
- Max 2 decimal places
- Numeric only

**Returns:**
```typescript
{
  isValid: boolean;
  error?: string;
  value?: number;
}
```

#### validateBillDate()

Validate bill date.

```typescript
function validateBillDate(
  date: Date | string | null
): ValidationResult
```

**Rules:**
- Required
- Not in future
- Max 30 days old
- Valid date format

#### validateBillNumber()

Validate bill number (optional).

```typescript
function validateBillNumber(
  billNumber: string | null
): ValidationResult
```

**Rules:**
- Optional
- Min 3 characters (if provided)
- Max 50 characters
- Alphanumeric + separators

#### validateNotes()

Validate notes field (optional).

```typescript
function validateNotes(
  notes: string | null
): ValidationResult
```

**Rules:**
- Optional
- Max 500 characters

#### validateMerchant()

Validate merchant name.

```typescript
function validateMerchant(
  merchant: string | null
): ValidationResult
```

**Rules:**
- Required
- Min 2 characters
- Max 100 characters

#### validateBillForm()

Validate entire form.

```typescript
function validateBillForm(
  formData: BillFormData
): BillFormValidation
```

**Returns:**
```typescript
{
  isValid: boolean;
  errors: {
    amount?: string;
    date?: string;
    merchant?: string;
    billNumber?: string;
    notes?: string;
  };
  values: {
    amount?: number;
    date?: Date;
    merchant?: string;
    billNumber?: string | null;
    notes?: string | null;
  };
}
```

#### formatCurrency()

Format amount as currency.

```typescript
function formatCurrency(amount: number): string
```

**Example:**
```typescript
formatCurrency(1000)  // "₹1,000.00"
formatCurrency(50.5)  // "₹50.50"
```

### Error Handling

#### getErrorInfo()

Get complete error information.

```typescript
function getErrorInfo(
  errorType: BillUploadErrorType
): BillUploadErrorInfo
```

**Returns:**
```typescript
{
  type: BillUploadErrorType;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  recoverySuggestions: string[];
  isRetryable: boolean;
  requiresUserAction: boolean;
  technicalDetails?: string;
}
```

#### getUserErrorMessage()

Get user-friendly error message.

```typescript
function getUserErrorMessage(
  errorType: BillUploadErrorType
): string
```

#### getRecoverySuggestions()

Get recovery suggestions for error.

```typescript
function getRecoverySuggestions(
  errorType: BillUploadErrorType
): string[]
```

#### isRetryableError()

Check if error is retryable.

```typescript
function isRetryableError(
  errorType: BillUploadErrorType
): boolean
```

#### mapHttpStatusToError()

Map HTTP status to error type.

```typescript
function mapHttpStatusToError(
  statusCode: number
): BillUploadErrorType
```

---

## Components

### CashbackCalculator

Display cashback breakdown.

**Props:**
```typescript
interface CashbackCalculatorProps {
  calculation: CashbackCalculation;
  expanded?: boolean;
  onToggle?: () => void;
}
```

**Usage:**
```typescript
<CashbackCalculator
  calculation={{
    baseAmount: 1000,
    baseCashbackRate: 5,
    baseCashback: 50,
    bonuses: [],
    totalBonus: 0,
    finalCashbackRate: 5,
    finalCashback: 50,
    caps: {},
    breakdown: [],
  }}
  expanded={true}
  onToggle={() => setExpanded(!expanded)}
/>
```

### Toast

Show notifications.

**Props:**
```typescript
interface ToastProps {
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

**Usage:**
```typescript
<Toast
  message="Upload successful!"
  type="success"
  duration={3000}
  actions={[
    {
      text: 'View',
      onPress: () => navigate('/history'),
    },
  ]}
  onDismiss={() => setShowToast(false)}
/>
```

---

## Types

### Core Types

#### BillUploadData

```typescript
interface BillUploadData {
  billImage: string;           // Required: File URI
  merchantId: string;          // Required: Merchant ID
  amount: number;              // Required: Bill amount (₹)
  billDate: Date;              // Required: Bill date
  billNumber?: string;         // Optional: Bill/invoice number
  notes?: string;              // Optional: Additional notes
  ocrData?: OCRExtractedData;  // Optional: OCR results
  verificationResult?: BillVerificationResult;
  fraudCheck?: FraudDetectionResult;
  cashbackCalculation?: CashbackCalculation;
}
```

#### Bill

```typescript
interface Bill {
  _id: string;
  user: string;
  merchant: {
    _id: string;
    name: string;
    logo?: string;
  };
  billImage: {
    url: string;
    thumbnailUrl?: string;
    cloudinaryId: string;
  };
  extractedData?: OCRExtractedData;
  amount: number;
  billDate: string;
  billNumber?: string;
  notes?: string;
  verificationStatus: 'pending' | 'processing' | 'approved' | 'rejected';
  verificationMethod?: 'automatic' | 'manual';
  rejectionReason?: string;
  cashbackAmount?: number;
  cashbackStatus?: 'pending' | 'credited' | 'failed';
  metadata?: {
    ocrConfidence?: number;
    processingTime?: number;
    verifiedBy?: string;
  };
  createdAt: string;
  updatedAt: string;
}
```

#### UploadProgress

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

#### UploadError

```typescript
interface UploadError {
  code: UploadErrorCode;       // Error code
  message: string;             // Error message
  retryable: boolean;          // Can be retried?
  timestamp: number;           // When error occurred
}
```

#### UploadState

```typescript
type UploadState =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

#### UploadResult

```typescript
interface UploadResult {
  success: boolean;
  metadata?: {
    fileId: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    uploadUrl: string;
    thumbnailUrl?: string;
  };
  error?: UploadError;
  duration: number;
  bytesTransferred: number;
  averageSpeed: number;
}
```

#### ValidationResult

```typescript
interface ValidationResult {
  isValid: boolean;
  error?: string;
  value?: any;
}
```

#### RetryConfig

```typescript
interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: UploadErrorCode[];
}
```

### Verification Types

#### OCRExtractedData

```typescript
interface OCRExtractedData {
  merchantName?: string;
  merchantAddress?: string;
  amount?: number;
  totalAmount?: number;
  subtotal?: number;
  tax?: number;
  date?: string;
  time?: string;
  billNumber?: string;
  invoiceNumber?: string;
  gstNumber?: string;
  phoneNumber?: string;
  items?: OCRExtractedItem[];
  paymentMethod?: string;
  confidence: number;          // 0-100
  rawText?: string;
  language?: string;
}
```

#### CashbackCalculation

```typescript
interface CashbackCalculation {
  baseAmount: number;
  baseCashbackRate: number;
  baseCashback: number;
  bonuses: CashbackBonus[];
  totalBonus: number;
  finalCashbackRate: number;
  finalCashback: number;
  caps: {
    categoryLimit?: number;
    dailyLimit?: number;
    monthlyLimit?: number;
  };
  appliedCap?: {
    type: string;
    limit: number;
    reason: string;
  };
  breakdown: Array<{
    label: string;
    amount: number;
    percentage?: number;
  }>;
}
```

---

## Constants

### Validation Config

```typescript
const VALIDATION_CONFIG = {
  amount: {
    min: 50,
    max: 100000,
    currencySymbol: '₹',
    decimalPlaces: 2,
  },
  date: {
    maxDaysOld: 30,
    allowFuture: false,
  },
  billNumber: {
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9\-\/\_\s]*$/,
  },
  notes: {
    maxLength: 500,
  },
};
```

### Default Retry Config

```typescript
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'NETWORK_TIMEOUT',
    'SERVER_ERROR',
    'UPLOAD_INTERRUPTED',
    'RATE_LIMIT',
  ],
};
```

---

**Document Version:** 1.0.0
**Last Updated:** January 2025
**Maintained By:** Development Team
