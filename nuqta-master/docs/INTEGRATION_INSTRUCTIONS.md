# Error Handling Integration Instructions

Step-by-step instructions to integrate the error handling system into the app.

## Quick Start (5 Minutes)

### 1. Replace API Client

```bash
# Navigate to services directory
cd services

# Backup current API client
mv apiClient.ts apiClient.backup.ts

# Rename enhanced version
mv apiClient.enhanced.ts apiClient.ts

# Verify the change
cat apiClient.ts | head -5
```

### 2. Update Root Layout

Open `app/_layout.tsx` and make these changes:

#### Add Imports

```typescript
// Add these imports at the top
import GlobalErrorBoundary from '@/components/common/GlobalErrorBoundary';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { View } from 'react-native';
```

#### Wrap App

Replace the current ErrorBoundary wrapper:

```tsx
// Before
export default function RootLayout() {
  return (
    <ErrorBoundary onError={handleErrorBoundaryError}>
      <CrossPlatformAlertProvider>
        {/* ... rest of providers */}
      </CrossPlatformAlertProvider>
    </ErrorBoundary>
  );
}

// After
export default function RootLayout() {
  return (
    <GlobalErrorBoundary>
      <ErrorBoundary onError={handleErrorBoundaryError}>
        <CrossPlatformAlertProvider>
          <OfflineQueueProvider>
            {/* ... rest of providers */}
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <View style={{ flex: 1 }}>
                <OfflineBanner position="top" />
                <Stack>
                  {/* ... all screens */}
                </Stack>
                <StatusBar style="auto" />
                <ToastManager />
                <BottomNavigation />
              </View>
            </ThemeProvider>
          </OfflineQueueProvider>
        </CrossPlatformAlertProvider>
      </ErrorBoundary>
    </GlobalErrorBoundary>
  );
}
```

### 3. Test the Integration

Run the app and test:

```bash
# Start the app
npm start

# Test scenarios:
# 1. Turn off internet - should see offline banner
# 2. Turn on internet - should see "Back online" banner
# 3. Make API calls - should auto-retry on failure
# 4. Force an error - should see error boundary UI
```

---

## Detailed Integration Steps

### Step 1: API Services

Update all API service files to use error handling:

#### Example: `services/productsApi.ts`

```typescript
// Before
import apiClient from './apiClient';

export const productsApi = {
  async getProducts() {
    const response = await apiClient.get('/products');
    return response.data;
  },
};

// After
import apiClient from './apiClient';
import { handleNetworkError } from '@/utils/networkErrorHandler';
import { errorReporter } from '@/utils/errorReporter';

export const productsApi = {
  async getProducts() {
    try {
      const response = await apiClient.get('/products');

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch products');
      }
    } catch (error) {
      // Classify error
      const errorInfo = handleNetworkError(error);

      // Log error
      errorReporter.captureError(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: 'productsApi.getProducts',
          metadata: {
            errorType: errorInfo.type,
          },
        }
      );

      // Throw user-friendly error
      throw new Error(errorInfo.userMessage);
    }
  },

  async getProductById(id: string) {
    try {
      const response = await apiClient.get(`/products/${id}`);

      if (response.success) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to fetch product');
      }
    } catch (error) {
      const errorInfo = handleNetworkError(error);

      errorReporter.captureError(
        error instanceof Error ? error : new Error(String(error)),
        {
          context: 'productsApi.getProductById',
          metadata: {
            productId: id,
            errorType: errorInfo.type,
          },
        }
      );

      throw new Error(errorInfo.userMessage);
    }
  },
};
```

### Step 2: Components

Update components to show error states:

#### Example: `app/MainStorePage.tsx`

```tsx
// Add imports
import { useState, useEffect } from 'react';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { productsApi } from '@/services/productsApi';

function MainStorePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await productsApi.getProducts();
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

  // Loading state
  if (loading) {
    return <LoadingState message="Loading products..." />;
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={fetchProducts}
        icon="alert-circle"
      />
    );
  }

  // Success state - wrap with error boundary
  return (
    <ErrorBoundary>
      <View>
        {/* Render products */}
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </View>
    </ErrorBoundary>
  );
}
```

### Step 3: Forms

Add validation error handling to forms:

#### Example: Login Form

```tsx
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { RetryButton } from '@/components/common/RetryButton';
import { VALIDATION_ERRORS, AUTH_ERRORS } from '@/constants/errorMessages';
import { handleNetworkError } from '@/utils/networkErrorHandler';

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
    // Clear previous errors
    setErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      await authApi.login(email, password);
      // Navigate to home
    } catch (error) {
      // Handle network errors
      const errorInfo = handleNetworkError(error);
      setErrors({ form: errorInfo.userMessage });
    }
  };

  return (
    <View style={styles.container}>
      {/* Email Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errors.email && (
          <Text style={styles.errorText}>{errors.email}</Text>
        )}
      </View>

      {/* Password Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}
      </View>

      {/* Form Error */}
      {errors.form && (
        <View style={styles.formErrorContainer}>
          <Text style={styles.formErrorText}>{errors.form}</Text>
        </View>
      )}

      {/* Submit Button */}
      <RetryButton
        onRetry={handleSubmit}
        label="Sign In"
        variant="primary"
        size="large"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  formErrorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  formErrorText: {
    color: '#991B1B',
    fontSize: 14,
  },
});
```

---

## Testing Integration

### Test 1: Network Errors

```typescript
// Turn off WiFi/mobile data
// Make an API call
// Should see:
// - Retry attempts in console (3 attempts)
// - User-friendly error message
// - Retry button

// Turn on WiFi/mobile data
// Press retry button
// Should succeed
```

### Test 2: Error Boundary

```typescript
// Add a component that throws an error
const BrokenComponent = () => {
  throw new Error('Test error');
};

// Wrap with ErrorBoundary
<ErrorBoundary>
  <BrokenComponent />
</ErrorBoundary>

// Should see:
// - Error caught by ErrorBoundary
// - User-friendly error UI
// - "Try Again" button
```

### Test 3: Offline Banner

```typescript
// Turn off WiFi/mobile data
// Should see:
// - Red banner at top: "No internet connection"
// - Message: "You can still browse, changes will sync later"

// Turn on WiFi/mobile data
// Should see:
// - Green banner at top: "Back online"
// - Auto-hide after 3 seconds
```

### Test 4: Rate Limiting

```typescript
// Make many rapid API calls
// Should see:
// - 429 error caught
// - Automatic retry with exponential backoff
// - User message: "Too many requests. Please wait a moment."
```

### Test 5: Form Validation

```typescript
// Submit form with invalid data
// Should see:
// - Validation errors under inputs
// - No network call made
// - Error messages from VALIDATION_ERRORS

// Submit form with valid data but network error
// Should see:
// - Form-level error message
// - Network error from NETWORK_ERRORS
// - Retry button enabled
```

---

## Verifying Installation

### Checklist

- [ ] API Client replaced with enhanced version
- [ ] GlobalErrorBoundary wrapping app
- [ ] OfflineBanner added to layout
- [ ] All API services have try-catch blocks
- [ ] Components show LoadingState, ErrorState
- [ ] Forms have validation errors
- [ ] Error messages use constants
- [ ] ErrorReporter integrated
- [ ] Network status monitoring active

### Quick Test Script

```bash
# Run this to verify everything is working

# 1. Start app
npm start

# 2. Open in browser/emulator
# 3. Open browser console
# 4. Turn off network
# 5. Make API call (e.g., load products)
# 6. Check console for:
#    - "Retrying... Attempt 1/3"
#    - "Retrying... Attempt 2/3"
#    - "Retrying... Attempt 3/3"
#    - Error classification
# 7. Check UI for:
#    - Offline banner at top
#    - Error message in component
#    - Retry button
# 8. Turn on network
# 9. Press retry
# 10. Should succeed
```

---

## Troubleshooting

### Issue: "Cannot find module '@/utils/retryLogic'"

**Solution:** Make sure all new files are created in the correct directories.

```bash
# Verify files exist
ls -la utils/retryLogic.ts
ls -la utils/networkErrorHandler.ts
ls -la constants/errorMessages.ts
ls -la components/common/GlobalErrorBoundary.tsx
ls -la components/common/RetryButton.tsx
```

### Issue: "Retry not working"

**Solution:** Check if retry is enabled:

```typescript
// Make sure shouldRetry is true (default)
const response = await apiClient.get('/endpoint', {}, {
  shouldRetry: true, // This is default, can be omitted
});
```

### Issue: "Offline banner not showing"

**Solution:** Check NetInfo installation:

```bash
# Verify @react-native-community/netinfo is installed
npm list @react-native-community/netinfo

# If not installed
npm install @react-native-community/netinfo
```

### Issue: "Errors not being reported"

**Solution:** Check errorReporter is enabled:

```typescript
// In app/_layout.tsx
errorReporter.setEnabled(true);
```

### Issue: "GlobalErrorBoundary not catching errors"

**Solution:** Make sure it's the outermost component:

```tsx
// Correct
<GlobalErrorBoundary>
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
</GlobalErrorBoundary>

// Wrong
<ErrorBoundary>
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
</ErrorBoundary>
```

---

## Performance Considerations

### Retry Impact

- Network retries add latency (1s + 2s + 4s = 7s max)
- Configure `maxRetries` based on use case
- Critical operations: `maxRetries: 1`
- Background operations: `maxRetries: 5`

### Error Storage

- Errors stored in AsyncStorage
- Max 100 errors stored
- Old errors auto-purged
- Call `errorReporter.clearErrors()` periodically

### Network Monitoring

- NetInfo listener always active
- Minimal performance impact
- Can disable if not needed

---

## Production Checklist

Before deploying to production:

- [ ] Replace API client with enhanced version
- [ ] Add GlobalErrorBoundary
- [ ] Add OfflineBanner
- [ ] Update all API services
- [ ] Add error states to all components
- [ ] Test all error scenarios
- [ ] Configure error reporting service (Sentry/Bugsnag)
- [ ] Set appropriate retry limits
- [ ] Test offline mode
- [ ] Test rate limiting
- [ ] Verify error messages are user-friendly
- [ ] Test on real devices
- [ ] Monitor error rates in production

---

## Support

For questions or issues:

1. Check ERROR_HANDLING_GUIDE.md
2. Check ERROR_HANDLING_IMPLEMENTATION_SUMMARY.md
3. Review example components in guide
4. Test with provided test scenarios

---

**Last Updated:** 2025-01-12
**Version:** 1.0.0
