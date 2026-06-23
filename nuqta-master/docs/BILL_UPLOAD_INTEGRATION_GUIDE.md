# Bill Upload Integration Guide

> Quick reference for integrating bill upload functionality into your pages

## Table of Contents

1. [Quick Start](#quick-start)
2. [Hook Usage](#hook-usage)
3. [Service API](#service-api)
4. [Component Integration](#component-integration)
5. [Examples](#examples)

---

## Quick Start

### Basic Integration

```typescript
import { useBillUpload } from '@/hooks/useBillUpload';
import { billUploadService } from '@/services/billUploadService';

function MyComponent() {
  const {
    isUploading,
    percentComplete,
    error,
    startUpload,
    retryUpload,
  } = useBillUpload();

  const handleSubmit = async () => {
    const success = await startUpload({
      billImage: 'file://path/to/image.jpg',
      merchantId: 'merchant-123',
      amount: 1000,
      billDate: new Date(),
    });

    if (success) {
      console.log('Upload successful!');
    }
  };

  return (
    <View>
      <Button onPress={handleSubmit} disabled={isUploading}>
        Upload Bill
      </Button>
      {isUploading && <Text>{percentComplete}% uploaded</Text>}
      {error && <Text>{error.message}</Text>}
    </View>
  );
}
```

---

## Hook Usage

### useBillUpload Hook

#### Import

```typescript
import { useBillUpload } from '@/hooks/useBillUpload';
```

#### Basic Usage

```typescript
const billUpload = useBillUpload({
  maxAttempts: 3,        // Optional: max retry attempts
  initialDelay: 1000,    // Optional: initial retry delay
});
```

#### Available Properties

```typescript
// State
billUpload.isUploading         // boolean: Is upload in progress?
billUpload.uploadState         // UploadState: Current state
billUpload.progress            // UploadProgress | null
billUpload.error               // UploadError | null
billUpload.formData            // BillUploadFormData | null

// Retry state
billUpload.currentAttempt      // number: Current attempt number
billUpload.maxAttempts         // number: Maximum attempts
billUpload.canRetry            // boolean: Can retry upload?

// Metrics
billUpload.uploadSpeed         // string: "1.5 MB/s"
billUpload.timeRemaining       // string: "0:45"
billUpload.percentComplete     // number: 0-100
```

#### Available Methods

```typescript
// Start new upload
await billUpload.startUpload(data);

// Retry failed upload
await billUpload.retryUpload();

// Cancel active upload
billUpload.cancelUpload();

// Form data persistence
await billUpload.saveFormData(formData);
const formData = await billUpload.loadFormData();
await billUpload.clearFormData();

// Reset all state
billUpload.reset();
```

---

## Service API

### billUploadService

#### Import

```typescript
import { billUploadService } from '@/services/billUploadService';
```

#### Upload with Progress

```typescript
const result = await billUploadService.uploadBillWithProgress(
  {
    billImage: 'file://image.jpg',
    merchantId: 'merchant-123',
    amount: 1000,
    billDate: new Date(),
    billNumber: 'INV-001',    // Optional
    notes: 'Monthly shopping', // Optional
  },
  (progress) => {
    console.log(`${progress.percentage}% complete`);
    console.log(`Speed: ${progress.speed} bytes/s`);
    console.log(`ETA: ${progress.timeRemaining}s`);
  }
);

if (result.success) {
  console.log('Bill ID:', result.data._id);
}
```

#### Upload with Auto-Retry

```typescript
const result = await billUploadService.uploadBillWithRetry(
  billData,
  progressCallback,
  {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
  }
);

if (result.success) {
  console.log('Upload successful!');
  console.log('File ID:', result.metadata.fileId);
  console.log('Duration:', result.duration, 'ms');
  console.log('Average speed:', result.averageSpeed, 'bytes/s');
} else {
  console.error('Upload failed:', result.error);
}
```

#### Get Bill History

```typescript
const history = await billUploadService.getBillHistory({
  status: 'approved',       // Optional filter
  merchantId: 'merchant-123', // Optional filter
  limit: 20,                // Optional limit
  page: 1,                  // Optional page
});

if (history.success) {
  history.data.forEach(bill => {
    console.log(bill._id, bill.amount, bill.verificationStatus);
  });
}
```

#### Get Bill by ID

```typescript
const bill = await billUploadService.getBillById('bill-123');

if (bill.success) {
  console.log('Bill:', bill.data);
}
```

#### Resubmit Bill

```typescript
const result = await billUploadService.resubmitBill(
  'bill-123',
  'file://new-image.jpg'
);
```

#### Get Statistics

```typescript
const stats = await billUploadService.getBillStatistics();

if (stats.success) {
  console.log('Total bills:', stats.data.totalBills);
  console.log('Total cashback:', stats.data.totalCashback);
}
```

---

## Component Integration

### Form Validation

```typescript
import {
  validateAmount,
  validateBillDate,
  validateBillNumber,
  validateNotes,
  validateBillForm,
} from '@/utils/billValidation';

// Validate single field
const amountResult = validateAmount('1000');
if (!amountResult.isValid) {
  setError(amountResult.error);
}

// Validate entire form
const formResult = validateBillForm({
  amount: '1000',
  date: new Date(),
  merchant: 'ABC Store',
  billNumber: 'INV-001',
  notes: 'Monthly shopping',
});

if (formResult.isValid) {
  // Submit form
  const values = formResult.values;
} else {
  // Show errors
  setErrors(formResult.errors);
}
```

### Error Handling

```typescript
import {
  BillUploadErrorType,
  getUserErrorMessage,
  getRecoverySuggestions,
  isRetryableError,
} from '@/utils/billUploadErrors';

// Display user-friendly error
const message = getUserErrorMessage(error.code);
setErrorMessage(message);

// Show recovery suggestions
const suggestions = getRecoverySuggestions(error.code);
setSuggestions(suggestions);

// Check if retryable
if (isRetryableError(error.code)) {
  setShowRetryButton(true);
}
```

---

## Examples

### Example 1: Simple Upload Button

```typescript
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useBillUpload } from '@/hooks/useBillUpload';

export function UploadButton({ billData }) {
  const { isUploading, startUpload, error } = useBillUpload();

  const handlePress = async () => {
    const success = await startUpload(billData);
    if (success) {
      alert('Upload successful!');
    }
  };

  return (
    <TouchableOpacity onPress={handlePress} disabled={isUploading}>
      {isUploading ? (
        <ActivityIndicator />
      ) : (
        <Text>Upload Bill</Text>
      )}
      {error && <Text style={{ color: 'red' }}>{error.message}</Text>}
    </TouchableOpacity>
  );
}
```

### Example 2: Progress Indicator

```typescript
import React from 'react';
import { View, Text, ProgressBarAndroid } from 'react-native';
import { useBillUpload } from '@/hooks/useBillUpload';

export function UploadProgress() {
  const {
    isUploading,
    percentComplete,
    uploadSpeed,
    timeRemaining,
  } = useBillUpload();

  if (!isUploading) return null;

  return (
    <View>
      <ProgressBarAndroid
        styleAttr="Horizontal"
        indeterminate={false}
        progress={percentComplete / 100}
      />
      <Text>{percentComplete}% complete</Text>
      <Text>Speed: {uploadSpeed}</Text>
      <Text>Time remaining: {timeRemaining}</Text>
    </View>
  );
}
```

### Example 3: Form with Validation

```typescript
import React, { useState } from 'react';
import { View, TextInput, Button, Text } from 'react-native';
import { useBillUpload } from '@/hooks/useBillUpload';
import { validateAmount, validateBillDate } from '@/utils/billValidation';

export function BillUploadForm() {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [errors, setErrors] = useState({});

  const { startUpload, isUploading } = useBillUpload();

  const handleAmountChange = (value: string) => {
    setAmount(value);
    const result = validateAmount(value);
    if (!result.isValid) {
      setErrors(prev => ({ ...prev, amount: result.error }));
    } else {
      setErrors(prev => ({ ...prev, amount: undefined }));
    }
  };

  const handleSubmit = async () => {
    // Validate all fields
    const amountResult = validateAmount(amount);
    const dateResult = validateBillDate(date);

    if (!amountResult.isValid || !dateResult.isValid) {
      setErrors({
        amount: amountResult.error,
        date: dateResult.error,
      });
      return;
    }

    // Submit
    await startUpload({
      billImage: 'file://image.jpg',
      merchantId: 'merchant-123',
      amount: parseFloat(amount),
      billDate: date,
    });
  };

  return (
    <View>
      <TextInput
        value={amount}
        onChangeText={handleAmountChange}
        placeholder="Enter amount"
        keyboardType="decimal-pad"
      />
      {errors.amount && <Text style={{ color: 'red' }}>{errors.amount}</Text>}

      <Button
        title="Submit"
        onPress={handleSubmit}
        disabled={isUploading || Object.keys(errors).length > 0}
      />
    </View>
  );
}
```

### Example 4: Retry Logic

```typescript
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useBillUpload } from '@/hooks/useBillUpload';

export function RetryExample() {
  const {
    error,
    canRetry,
    currentAttempt,
    maxAttempts,
    retryUpload,
    startUpload,
  } = useBillUpload({ maxAttempts: 3 });

  return (
    <View>
      {error && (
        <View>
          <Text style={{ color: 'red' }}>{error.message}</Text>
          <Text>Attempt {currentAttempt} of {maxAttempts}</Text>

          {canRetry && (
            <Button title="Retry Upload" onPress={retryUpload} />
          )}

          {!canRetry && currentAttempt >= maxAttempts && (
            <Text>Max retry attempts reached</Text>
          )}
        </View>
      )}
    </View>
  );
}
```

### Example 5: Form Persistence

```typescript
import React, { useEffect } from 'react';
import { View, TextInput, Button } from 'react-native';
import { useBillUpload } from '@/hooks/useBillUpload';

export function PersistentForm() {
  const [amount, setAmount] = useState('');
  const { saveFormData, loadFormData, clearFormData } = useBillUpload();

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const loadSavedData = async () => {
    const saved = await loadFormData();
    if (saved) {
      setAmount(saved.amount);
    }
  };

  // Auto-save on change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount) {
        saveFormData({
          amount,
          merchantId: 'merchant-123',
          billDate: new Date(),
          billImage: 'file://image.jpg',
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [amount]);

  const handleSubmit = async () => {
    // Submit logic...
    // Clear saved data on success
    await clearFormData();
  };

  return (
    <View>
      <TextInput
        value={amount}
        onChangeText={setAmount}
        placeholder="Amount (auto-saved)"
      />
      <Button title="Submit" onPress={handleSubmit} />
    </View>
  );
}
```

---

## Component Props Reference

### CashbackCalculator

```typescript
import { CashbackCalculator } from '@/components/bills/CashbackCalculator';

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

```typescript
import Toast from '@/components/common/Toast';

<Toast
  message="Upload successful!"
  type="success"
  duration={3000}
  actions={[
    {
      text: 'View',
      onPress: () => navigateToHistory(),
    },
    {
      text: 'Dismiss',
      onPress: () => setToastVisible(false),
      style: 'cancel',
    },
  ]}
  onDismiss={() => setToastVisible(false)}
/>
```

---

## Type Definitions

### BillUploadData

```typescript
interface BillUploadData {
  billImage: string;           // Required: File URI
  merchantId: string;          // Required: Merchant ID
  amount: number;              // Required: Bill amount
  billDate: Date;              // Required: Bill date
  billNumber?: string;         // Optional: Bill/invoice number
  notes?: string;              // Optional: Additional notes
}
```

### UploadProgress

```typescript
interface UploadProgress {
  loaded: number;              // Bytes uploaded
  total: number;               // Total bytes
  percentage: number;          // Progress (0-100)
  speed: number;               // Upload speed (bytes/sec)
  timeRemaining: number;       // Estimated time (seconds)
  startTime: number;           // Start timestamp
  currentTime: number;         // Current timestamp
}
```

### UploadError

```typescript
interface UploadError {
  code: string;                // Error code
  message: string;             // Error message
  retryable: boolean;          // Can be retried?
  timestamp: number;           // When error occurred
}
```

---

## Best Practices

1. **Always validate** before upload
2. **Handle errors** gracefully with user-friendly messages
3. **Show progress** for better UX
4. **Save form data** to prevent data loss
5. **Clear sensitive data** after successful upload
6. **Implement retry logic** for network errors
7. **Test offline scenarios**
8. **Monitor upload speed** and show feedback
9. **Provide cancel option** for long uploads
10. **Log errors** for debugging

---

**Document Version:** 1.0.0
**Last Updated:** January 2025
