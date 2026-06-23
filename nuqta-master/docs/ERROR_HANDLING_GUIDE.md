# Error Handling Guide

Complete guide for implementing robust error handling and retry logic throughout the application.

## Table of Contents

- [Overview](#overview)
- [Error Handling Components](#error-handling-components)
- [Retry Logic](#retry-logic)
- [Network Error Handling](#network-error-handling)
- [Error Reporting](#error-reporting)
- [Best Practices](#best-practices)
- [Testing Error Scenarios](#testing-error-scenarios)
- [Examples](#examples)

## Overview

The app implements a comprehensive error handling system with:

- **Error Boundaries** - Catch React rendering errors
- **Retry Logic** - Automatic retry with exponential backoff
- **Network Detection** - Monitor and respond to connectivity changes
- **Error Classification** - Categorize and handle different error types
- **User-Friendly Messages** - Display actionable error information
- **Error Reporting** - Track and analyze errors in production

## Error Handling Components

### 1. ErrorBoundary

Catches React component errors and displays fallback UI.

```tsx
import ErrorBoundary from '@/components/common/ErrorBoundary';

<ErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Component error:', error);
  }}
>
  <MyComponent />
</ErrorBoundary>
```

**Features:**
- Catches rendering errors
- Shows friendly error UI
- "Try Again" button to reset
- Logs errors to console/service

### 2. GlobalErrorBoundary

Wraps the entire app to catch all unhandled errors.

```tsx
import GlobalErrorBoundary from '@/components/common/GlobalErrorBoundary';

<GlobalErrorBoundary>
  <App />
</GlobalErrorBoundary>
```

**Features:**
- Different UI for dev vs production
- Detailed error info in development
- Generic message in production
- Error reporting integration

### 3. ErrorState

Generic error display component for showing errors inline.

```tsx
import { ErrorState } from '@/components/common/ErrorState';

<ErrorState
  message="Failed to load products"
  onRetry={() => fetchProducts()}
  icon="alert-circle"
/>
```

**Features:**
- Flexible layouts (full-screen, inline, banner)
- Customizable icons and messages
- Retry button with callback
- Accessibility support

### 4. OfflineBanner

Shows connectivity status banner.

```tsx
import { OfflineBanner } from '@/components/common/OfflineBanner';

<OfflineBanner
  position="top"
  showWhenOffline={true}
  showWhenOnline={true}
  autoHide={true}
/>
```

**Features:**
- Auto-shows when offline
- Auto-hides when back online
- Sliding animation
- Connection quality indicator

### 5. RetryButton

Reusable retry button with loading state.

```tsx
import { RetryButton } from '@/components/common/RetryButton';

<RetryButton
  onRetry={handleRetry}
  label="Try Again"
  variant="primary"
  size="medium"
/>
```

**Features:**
- Loading state during retry
- Haptic feedback
- Multiple variants and sizes
- Disabled state

## Retry Logic

### retryWithExponentialBackoff

Retry a function with exponential backoff strategy.

```typescript
import { retryWithExponentialBackoff } from '@/utils/retryLogic';

const result = await retryWithExponentialBackoff(
  async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  {
    maxRetries: 3,
    baseDelay: 1000,
    backoffFactor: 2,
    onRetry: (error, attempt, delay) => {
      console.log(`Retry attempt ${attempt} after ${delay}ms`);
    },
  }
);
```

**Retry Delays:**
- Attempt 1: 1s
- Attempt 2: 2s
- Attempt 3: 4s
- Attempt 4: 8s

### retryWithLinearBackoff

Retry with linear delay increase.

```typescript
import { retryWithLinearBackoff } from '@/utils/retryLogic';

const result = await retryWithLinearBackoff(
  async () => apiCall(),
  {
    maxRetries: 3,
    baseDelay: 1000,
  }
);
```

**Retry Delays:**
- Attempt 1: 1s
- Attempt 2: 2s
- Attempt 3: 3s

### retryWithConstantDelay

Retry with constant delay.

```typescript
import { retryWithConstantDelay } from '@/utils/retryLogic';

const result = await retryWithConstantDelay(
  async () => apiCall(),
  {
    maxRetries: 3,
    baseDelay: 2000,
  }
);
```

**Retry Delays:**
- Every attempt: 2s

### Retry Predicates

Helper functions to determine if errors should be retried:

```typescript
import {
  isRetryableError,
  isRateLimitError,
  isServerError,
  isClientError,
  isAuthError,
} from '@/utils/retryLogic';

// Check if error should be retried
if (isRetryableError(error)) {
  // Retry the operation
}

// Check for specific error types
if (isRateLimitError(error)) {
  // Wait longer before retrying
}

if (isServerError(error)) {
  // Server error (5xx) - retry
}

if (isClientError(error)) {
  // Client error (4xx) - don't retry
}

if (isAuthError(error)) {
  // Auth error (401/403) - don't retry, redirect to login
}
```

## Network Error Handling

### handleNetworkError

Classify and handle network errors with user-friendly messages.

```typescript
import { handleNetworkError } from '@/utils/networkErrorHandler';

try {
  const response = await fetch('/api/data');
  const data = await response.json();
} catch (error) {
  const errorInfo = handleNetworkError(error);

  console.log('Type:', errorInfo.type);
  console.log('Message:', errorInfo.userMessage);
  console.log('Suggestions:', errorInfo.suggestions);
  console.log('Retryable:', errorInfo.isRetryable);
}
```

**Error Types:**
- `NO_INTERNET` - No internet connection
- `TIMEOUT` - Request timed out
- `SERVER_ERROR` - Server error (5xx)
- `CLIENT_ERROR` - Client error (4xx)
- `RATE_LIMIT` - Too many requests (429)
- `UNAUTHORIZED` - Authentication required (401)
- `FORBIDDEN` - Permission denied (403)
- `NOT_FOUND` - Resource not found (404)
- `BAD_REQUEST` - Invalid request (400)
- `CONFLICT` - Conflict (409)
- `VALIDATION_ERROR` - Validation failed (422)
- `UNKNOWN` - Unknown error

### Error Messages

Centralized error messages in `constants/errorMessages.ts`:

```typescript
import { ERROR_MESSAGES } from '@/constants/errorMessages';
import { NETWORK_ERRORS, AUTH_ERRORS } from '@/constants/errorMessages';

// Use predefined messages
alert(ERROR_MESSAGES.NETWORK_ERROR);
alert(NETWORK_ERRORS.TIMEOUT.message);
alert(AUTH_ERRORS.UNAUTHORIZED.message);
```

**Categories:**
- Network Errors
- Authentication Errors
- Validation Errors
- Resource Errors
- Cart Errors
- Payment Errors
- Upload Errors
- Location Errors
- Generic Errors

## Error Reporting

### errorReporter

Track and report errors for monitoring and debugging.

```typescript
import { errorReporter } from '@/utils/errorReporter';

// Capture error
try {
  await riskyOperation();
} catch (error) {
  errorReporter.captureError(
    error instanceof Error ? error : new Error(String(error)),
    {
      context: 'MyComponent',
      component: 'ProductList',
      action: 'fetchProducts',
      metadata: {
        productId: '123',
        userId: currentUser.id,
      },
    },
    'error' // severity: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  );
}

// Add breadcrumb for context
errorReporter.addBreadcrumb({
  type: 'user_action',
  message: 'User clicked add to cart',
  data: {
    productId: '123',
    quantity: 2,
  },
});

// Get error stats
const stats = errorReporter.getErrorStats();
console.log('Total errors:', stats.totalErrors);
console.log('Errors by severity:', stats.errorsBySeverity);
console.log('Errors by category:', stats.errorsByCategory);
```

**Features:**
- Error capturing and categorization
- Breadcrumb tracking
- Severity levels
- Error fingerprinting
- User context
- Offline storage
- Batch reporting

## Best Practices

### 1. Always Use Try-Catch

Wrap async operations in try-catch blocks:

```typescript
// ❌ Bad
const products = await api.getProducts();

// ✅ Good
try {
  const products = await api.getProducts();
  setProducts(products);
} catch (error) {
  const errorInfo = handleNetworkError(error);
  showError(errorInfo.userMessage);
}
```

### 2. Use Error Boundaries

Wrap components with error boundaries:

```tsx
// ❌ Bad
<ProductList />

// ✅ Good
<ErrorBoundary>
  <ProductList />
</ErrorBoundary>
```

### 3. Provide User-Friendly Messages

Use error messages from constants:

```typescript
// ❌ Bad
alert('Error: Network request failed');

// ✅ Good
import { NETWORK_ERRORS } from '@/constants/errorMessages';
alert(NETWORK_ERRORS.NO_CONNECTION.message);
```

### 4. Enable Retry for Network Operations

Use retry logic for API calls:

```typescript
// ❌ Bad
const data = await fetch('/api/data');

// ✅ Good
const data = await retryWithExponentialBackoff(
  () => fetch('/api/data'),
  { maxRetries: 3 }
);
```

### 5. Track Errors

Add error tracking for debugging:

```typescript
// ❌ Bad
console.error('Error:', error);

// ✅ Good
errorReporter.captureError(error, {
  context: 'ProductPage',
  metadata: { productId },
});
```

### 6. Show Error State UI

Display error state instead of blank screens:

```tsx
// ❌ Bad
{error && <Text>Error</Text>}

// ✅ Good
{error && (
  <ErrorState
    message="Failed to load products"
    onRetry={() => refetch()}
  />
)}
```

## Testing Error Scenarios

### 1. Network Errors

```typescript
// Simulate network error
jest.mock('@/services/apiClient', () => ({
  get: jest.fn().mockRejectedValue(new Error('Network error')),
}));

// Test component handles error
const { getByText } = render(<ProductList />);
await waitFor(() => {
  expect(getByText('Failed to load products')).toBeTruthy();
  expect(getByText('Try Again')).toBeTruthy();
});
```

### 2. Retry Logic

```typescript
// Test retry attempts
const mockFetch = jest.fn()
  .mockRejectedValueOnce(new Error('Network error'))
  .mockRejectedValueOnce(new Error('Network error'))
  .mockResolvedValueOnce({ data: 'success' });

const result = await retryWithExponentialBackoff(
  mockFetch,
  { maxRetries: 3 }
);

expect(mockFetch).toHaveBeenCalledTimes(3);
expect(result.data).toBe('success');
```

### 3. Error Boundaries

```typescript
// Test error boundary catches error
const ThrowError = () => {
  throw new Error('Test error');
};

const { getByText } = render(
  <ErrorBoundary>
    <ThrowError />
  </ErrorBoundary>
);

expect(getByText('Something went wrong')).toBeTruthy();
expect(getByText('Try Again')).toBeTruthy();
```

### 4. Offline Scenarios

```typescript
// Simulate offline
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: false,
    isInternetReachable: false,
  })),
}));

// Test offline banner shows
const { getByText } = render(<OfflineBanner />);
await waitFor(() => {
  expect(getByText('No internet connection')).toBeTruthy();
});
```

## Examples

### Example 1: API Call with Retry

```typescript
import { retryWithExponentialBackoff } from '@/utils/retryLogic';
import { handleNetworkError } from '@/utils/networkErrorHandler';
import apiClient from '@/services/apiClient';

async function fetchProducts() {
  try {
    const response = await retryWithExponentialBackoff(
      () => apiClient.get('/products'),
      {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (error, attempt) => {
          console.log(`Retrying... Attempt ${attempt}`);
        },
      }
    );

    if (response.success) {
      return response.data;
    } else {
      throw new Error(response.error);
    }
  } catch (error) {
    const errorInfo = handleNetworkError(error);
    throw new Error(errorInfo.userMessage);
  }
}
```

### Example 2: Component with Error State

```tsx
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import ErrorBoundary from '@/components/common/ErrorBoundary';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchProducts}
      />
    );
  }

  return (
    <ErrorBoundary>
      <View>
        {/* Render products */}
      </View>
    </ErrorBoundary>
  );
}
```

### Example 3: Form with Validation Errors

```tsx
import React, { useState } from 'react';
import { View, TextInput, Text } from 'react-native';
import { RetryButton } from '@/components/common/RetryButton';
import { VALIDATION_ERRORS } from '@/constants/errorMessages';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!email) {
      newErrors.email = VALIDATION_ERRORS.REQUIRED_FIELD;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = VALIDATION_ERRORS.INVALID_EMAIL;
    }

    if (!password) {
      newErrors.password = VALIDATION_ERRORS.REQUIRED_FIELD;
    } else if (password.length < 8) {
      newErrors.password = VALIDATION_ERRORS.INVALID_PASSWORD;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      const errorInfo = handleNetworkError(error);
      setErrors({ form: errorInfo.userMessage });
    }
  };

  return (
    <View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      {errors.email && <Text style={{ color: 'red' }}>{errors.email}</Text>}

      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      {errors.password && <Text style={{ color: 'red' }}>{errors.password}</Text>}

      {errors.form && <Text style={{ color: 'red' }}>{errors.form}</Text>}

      <RetryButton
        onRetry={handleSubmit}
        label="Sign In"
        variant="primary"
      />
    </View>
  );
}
```

---

## Integration Checklist

- [ ] Replace `apiClient.ts` with `apiClient.enhanced.ts`
- [ ] Wrap app with `GlobalErrorBoundary` in `_layout.tsx`
- [ ] Add `OfflineBanner` to root layout
- [ ] Wrap critical components with `ErrorBoundary`
- [ ] Use `ErrorState` for loading failures
- [ ] Add retry logic to all API calls
- [ ] Use centralized error messages
- [ ] Add error tracking breadcrumbs
- [ ] Test offline scenarios
- [ ] Test error boundaries
- [ ] Test retry logic
- [ ] Add error monitoring service (optional)

## Resources

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [Exponential Backoff](https://en.wikipedia.org/wiki/Exponential_backoff)
- [Network Information API](https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API)
- [Sentry Error Tracking](https://sentry.io/)
- [Bugsnag Error Monitoring](https://www.bugsnag.com/)

---

**Last Updated:** 2025-01-12
**Version:** 1.0.0
