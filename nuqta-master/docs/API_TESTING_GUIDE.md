# REZ App - API Testing Guide

Complete guide for testing API integrations in the REZ App.

---

## Table of Contents

1. [Testing Setup](#testing-setup)
2. [Unit Testing APIs](#unit-testing-apis)
3. [Integration Testing](#integration-testing)
4. [Manual Testing with Tools](#manual-testing-with-tools)
5. [Mock API Testing](#mock-api-testing)
6. [E2E Testing](#e2e-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)

---

## Testing Setup

### Install Dependencies

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native jest-expo
npm install --save-dev @types/jest
```

### Jest Configuration

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  collectCoverageFrom: [
    'services/**/*.ts',
    'hooks/**/*.ts',
    'contexts/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
};
```

### Jest Setup File

Create `jest.setup.js`:

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
```

---

## Unit Testing APIs

### Testing API Services

#### Example: Testing Products API

Create `__tests__/services/productsApi.test.ts`:

```typescript
import productsService from '@/services/productsApi';
import apiClient from '@/services/apiClient';

// Mock the API client
jest.mock('@/services/apiClient');

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('ProductsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    it('should fetch products successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          products: [
            {
              id: 'prod_1',
              name: 'Test Product',
              pricing: { basePrice: 1000 },
            },
          ],
          pagination: {
            current: 1,
            pages: 1,
            total: 1,
            limit: 20,
          },
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await productsService.getProducts({ page: 1, limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data?.products).toHaveLength(1);
      expect(result.data?.products[0].name).toBe('Test Product');
      expect(mockApiClient.get).toHaveBeenCalledWith('/products', {
        page: 1,
        limit: 20,
      });
    });

    it('should handle API errors', async () => {
      const mockError = {
        success: false,
        error: 'Network error',
      };

      mockApiClient.get.mockResolvedValue(mockError);

      const result = await productsService.getProducts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    it('should handle network exceptions', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Connection failed'));

      await expect(productsService.getProducts()).rejects.toThrow('Connection failed');
    });
  });

  describe('getProductById', () => {
    it('should fetch product by ID', async () => {
      const mockProduct = {
        id: 'prod_123',
        name: 'Gaming Laptop',
        pricing: { basePrice: 45000 },
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: mockProduct,
      });

      const result = await productsService.getProductById('prod_123');

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Gaming Laptop');
      expect(mockApiClient.get).toHaveBeenCalledWith('/products/prod_123');
    });
  });

  describe('searchProducts', () => {
    it('should search products with query', async () => {
      const mockResponse = {
        success: true,
        data: {
          products: [],
          suggestions: ['laptop', 'laptop bag'],
          pagination: { current: 1, pages: 1, total: 0, limit: 20 },
          query: 'lap',
          searchTime: 45,
        },
      };

      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await productsService.searchProducts({ q: 'lap', limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data?.suggestions).toContain('laptop');
    });
  });
});
```

### Testing API Client

Create `__tests__/services/apiClient.test.ts`:

```typescript
import apiClient from '@/services/apiClient';

describe('ApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should make GET request', async () => {
    const mockData = { success: true, data: { id: 1 } };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
      headers: new Headers(),
    });

    const result = await apiClient.get('/test', { param: 'value' });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test?param=value'),
      expect.any(Object)
    );
    expect(result.success).toBe(true);
  });

  it('should make POST request', async () => {
    const mockData = { success: true, data: { id: 1 } };
    const postData = { name: 'Test' };

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockData,
      headers: new Headers(),
    });

    const result = await apiClient.post('/test', postData);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(postData),
      })
    );
    expect(result.success).toBe(true);
  });

  it('should handle 401 and trigger token refresh', async () => {
    const refreshCallback = jest.fn().mockResolvedValue(true);
    apiClient.setRefreshTokenCallback(refreshCallback);

    // First call returns 401
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          success: false,
          error: 'Token expired',
        }),
      })
      // Second call (after refresh) succeeds
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: {} }),
        headers: new Headers(),
      });

    await apiClient.get('/test');

    expect(refreshCallback).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should handle request timeout', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true }), 35000);
        })
    );

    const result = await apiClient.get('/test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
});
```

---

## Integration Testing

### Testing React Hooks

Create `__tests__/hooks/useProducts.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-hooks';
import { useProducts } from '@/hooks/useProducts';
import productsService from '@/services/productsApi';

jest.mock('@/services/productsApi');

const mockProductsService = productsService as jest.Mocked<typeof productsService>;

describe('useProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch products on mount', async () => {
    mockProductsService.getProducts.mockResolvedValue({
      success: true,
      data: {
        products: [{ id: 'prod_1', name: 'Test' }],
        pagination: { current: 1, pages: 1, total: 1, limit: 20 },
      },
    });

    const { result } = renderHook(() => useProducts());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    mockProductsService.getProducts.mockResolvedValue({
      success: false,
      error: 'Failed to fetch',
    });

    const { result } = renderHook(() => useProducts());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.products).toHaveLength(0);
    expect(result.current.error).toBe('Failed to fetch');
  });

  it('should load more products', async () => {
    mockProductsService.getProducts
      .mockResolvedValueOnce({
        success: true,
        data: {
          products: [{ id: 'prod_1', name: 'Test 1' }],
          pagination: { current: 1, pages: 2, total: 2, limit: 1 },
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          products: [{ id: 'prod_2', name: 'Test 2' }],
          pagination: { current: 2, pages: 2, total: 2, limit: 1 },
        },
      });

    const { result } = renderHook(() => useProducts({ limit: 1 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.products).toHaveLength(1);

    result.current.loadMore();

    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));
    expect(result.current.products).toHaveLength(2);
  });
});
```

### Testing Context Providers

Create `__tests__/contexts/AuthContext.test.tsx`:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react-hooks';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import authService from '@/services/authApi';

jest.mock('@/services/authApi');

const mockAuthService = authService as jest.Mocked<typeof authService>;

describe('AuthContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send OTP', async () => {
    mockAuthService.sendOtp.mockResolvedValue({
      success: true,
      data: { message: 'OTP sent', expiresIn: 300 },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.sendOtp('+919876543210');
    });

    expect(mockAuthService.sendOtp).toHaveBeenCalledWith({
      phoneNumber: '+919876543210',
    });
  });

  it('should verify OTP and authenticate user', async () => {
    const mockUser = {
      id: 'user_123',
      phoneNumber: '+919876543210',
      isVerified: true,
    };

    const mockTokens = {
      accessToken: 'token123',
      refreshToken: 'refresh123',
      expiresIn: 3600,
    };

    mockAuthService.verifyOtp.mockResolvedValue({
      success: true,
      data: { user: mockUser, tokens: mockTokens },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      await result.current.verifyOtp('+919876543210', '123456');
    });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    expect(result.current.user?.id).toBe('user_123');
  });

  it('should logout user', async () => {
    mockAuthService.logout.mockResolvedValue({
      success: true,
      data: { message: 'Logged out' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // First authenticate
    mockAuthService.verifyOtp.mockResolvedValue({
      success: true,
      data: {
        user: { id: 'user_123' },
        tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: 3600 },
      },
    });

    await act(async () => {
      await result.current.verifyOtp('+919876543210', '123456');
    });

    // Then logout
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });
});
```

---

## Manual Testing with Tools

### Using Postman

1. **Import Collection**

Create a Postman collection with all endpoints:

```json
{
  "info": {
    "name": "REZ App API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Send OTP",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"phoneNumber\": \"+919876543210\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{baseUrl}}/user/auth/send-otp",
              "host": ["{{baseUrl}}"],
              "path": ["user", "auth", "send-otp"]
            }
          }
        }
      ]
    }
  ]
}
```

2. **Environment Variables**

Set up environment:

```json
{
  "baseUrl": "http://localhost:5001/api",
  "accessToken": "",
  "refreshToken": ""
}
```

3. **Pre-request Script for Auth**

Add to requests requiring authentication:

```javascript
pm.request.headers.add({
  key: 'Authorization',
  value: 'Bearer ' + pm.environment.get('accessToken')
});
```

### Using cURL

#### Send OTP
```bash
curl -X POST http://localhost:5001/api/user/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'
```

#### Verify OTP
```bash
curl -X POST http://localhost:5001/api/user/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "otp": "123456"}'
```

#### Get Products (with auth)
```bash
curl -X GET "http://localhost:5001/api/products?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Mock API Testing

### Creating Mock Responses

Create `__mocks__/services/productsApi.ts`:

```typescript
const mockProducts = [
  {
    id: 'prod_1',
    name: 'Test Product 1',
    pricing: { basePrice: 1000, salePrice: 900 },
    images: [{ id: 'img_1', url: 'https://...', alt: 'Product 1', isMain: true }],
  },
  {
    id: 'prod_2',
    name: 'Test Product 2',
    pricing: { basePrice: 2000, salePrice: 1800 },
    images: [{ id: 'img_2', url: 'https://...', alt: 'Product 2', isMain: true }],
  },
];

export default {
  getProducts: jest.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        products: mockProducts,
        pagination: {
          current: 1,
          pages: 1,
          total: mockProducts.length,
          limit: 20,
        },
      },
    })
  ),

  getProductById: jest.fn((id: string) =>
    Promise.resolve({
      success: true,
      data: mockProducts.find(p => p.id === id) || null,
    })
  ),

  searchProducts: jest.fn(() =>
    Promise.resolve({
      success: true,
      data: {
        products: mockProducts,
        suggestions: ['test', 'product'],
        pagination: { current: 1, pages: 1, total: 2, limit: 20 },
        query: 'test',
        searchTime: 50,
      },
    })
  ),
};
```

---

## E2E Testing

### Detox Setup

Install Detox:

```bash
npm install --save-dev detox detox-cli
```

Create `.detoxrc.js`:

```javascript
module.exports = {
  testRunner: 'jest',
  runnerConfig: 'e2e/jest.config.js',
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/RezApp.app',
      build: 'xcodebuild -workspace ios/RezApp.xcworkspace -scheme RezApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug && cd ..'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

### E2E Test Example

Create `e2e/auth.test.js`:

```javascript
describe('Authentication Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should complete login flow', async () => {
    // Enter phone number
    await element(by.id('phone-input')).typeText('+919876543210');
    await element(by.id('send-otp-button')).tap();

    // Wait for OTP screen
    await waitFor(element(by.id('otp-input')))
      .toBeVisible()
      .withTimeout(2000);

    // Enter OTP
    await element(by.id('otp-input')).typeText('123456');
    await element(by.id('verify-otp-button')).tap();

    // Verify navigation to home
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error for invalid OTP', async () => {
    await element(by.id('phone-input')).typeText('+919876543210');
    await element(by.id('send-otp-button')).tap();

    await waitFor(element(by.id('otp-input'))).toBeVisible();
    await element(by.id('otp-input')).typeText('000000');
    await element(by.id('verify-otp-button')).tap();

    // Verify error message
    await expect(element(by.id('error-message'))).toBeVisible();
  });
});
```

---

## Performance Testing

### API Response Time Testing

```typescript
describe('Performance Tests', () => {
  it('should fetch products within acceptable time', async () => {
    const startTime = Date.now();

    await productsService.getProducts({ page: 1, limit: 20 });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(responseTime).toBeLessThan(2000); // 2 seconds
  });

  it('should handle concurrent requests', async () => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      productsService.getProducts({ page: i + 1, limit: 10 })
    );

    const startTime = Date.now();
    await Promise.all(promises);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(5000); // 5 seconds for 10 concurrent requests
  });
});
```

---

## Security Testing

### Testing Authentication

```typescript
describe('Security Tests', () => {
  it('should not allow access without token', async () => {
    apiClient.setAuthToken(null);

    const result = await productsService.getProducts();

    expect(result.success).toBe(false);
    expect(result.error).toContain('Authentication');
  });

  it('should refresh token on expiration', async () => {
    const refreshCallback = jest.fn().mockResolvedValue(true);
    apiClient.setRefreshTokenCallback(refreshCallback);

    // Simulate expired token
    apiClient.setAuthToken('expired_token');

    await productsService.getProducts();

    expect(refreshCallback).toHaveBeenCalled();
  });

  it('should not log sensitive data', () => {
    const consoleSpy = jest.spyOn(console, 'log');

    apiClient.setAuthToken('secret_token_123');

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('secret_token_123')
    );
  });
});
```

---

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- productsApi.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

### Watch Mode
```bash
npm test -- --watch
```

### E2E Tests
```bash
# iOS
detox test --configuration ios.sim.debug

# Android
detox test --configuration android.emu.debug
```

---

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

**End of API Testing Guide**
