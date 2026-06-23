# Testing Tools Reference

**Complete reference for all testing tools and configurations in the Rez App**

---

## Table of Contents

1. [Overview](#overview)
2. [Jest](#jest)
3. [React Native Testing Library](#react-native-testing-library)
4. [Detox](#detox)
5. [TypeScript Integration](#typescript-integration)
6. [Mock Libraries](#mock-libraries)
7. [Testing Utilities](#testing-utilities)
8. [CI/CD Tools](#cicd-tools)
9. [Development Tools](#development-tools)
10. [Configuration Files](#configuration-files)

---

## Overview

### Testing Stack

```
┌──────────────────────────────────────────┐
│          Testing Tool Stack               │
├──────────────────────────────────────────┤
│                                          │
│  Test Runner:                            │
│  └─ Jest 29.4.0                         │
│                                          │
│  Component Testing:                      │
│  └─ React Native Testing Library 13.3.3 │
│                                          │
│  E2E Testing:                            │
│  └─ Detox (Latest)                      │
│                                          │
│  Type Support:                           │
│  ├─ TypeScript 5.x                      │
│  └─ ts-jest                             │
│                                          │
│  Assertions:                             │
│  ├─ Jest matchers                       │
│  └─ @testing-library/jest-native        │
│                                          │
│  Mocking:                                │
│  ├─ Jest mocks                          │
│  └─ Manual mocks                        │
│                                          │
└──────────────────────────────────────────┘
```

### Installation

```bash
# Core testing dependencies
npm install --save-dev \
  jest@^29.4.0 \
  @testing-library/react-native@^13.3.3 \
  @testing-library/jest-native@^5.4.3 \
  @types/jest@^30.0.0 \
  ts-jest@latest

# Detox for E2E
npm install --save-dev detox detox-cli

# React Native preset
npm install --save-dev jest-expo
```

---

## Jest

### Overview

Jest is the test runner and assertion library used throughout the project.

**Official Documentation**: https://jestjs.io/

### Configuration

Located in `jest.config.js`:

```javascript
/** @type {import('jest').Config} */
module.exports = {
  // Use jest-expo preset for React Native + Expo
  preset: 'jest-expo',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|@expo|expo)/)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'utils/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      statements: 50,
      branches: 40,
      functions: 40,
      lines: 50,
    },
  },

  // Test environment
  testEnvironment: 'node',

  // Clear and restore mocks
  clearMocks: true,
  restoreMocks: true,

  // Timeout
  testTimeout: 10000,

  // Max workers
  maxWorkers: '50%',
};
```

### Key Commands

```bash
# Run all tests
jest

# Run specific file
jest path/to/test.test.ts

# Run tests matching pattern
jest --testPathPattern=validation

# Run tests matching name
jest -t "should validate email"

# Watch mode
jest --watch

# Coverage
jest --coverage

# Verbose output
jest --verbose

# Run in band (sequentially)
jest --runInBand

# Update snapshots
jest --updateSnapshot

# Clear cache
jest --clearCache
```

### Jest Matchers

#### Basic Matchers

```typescript
// Equality
expect(value).toBe(5);
expect(value).toEqual({ a: 1 });
expect(value).toStrictEqual({ a: 1 });

// Truthiness
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeNull();
expect(value).toBeUndefined();
expect(value).toBeDefined();

// Numbers
expect(value).toBeGreaterThan(3);
expect(value).toBeGreaterThanOrEqual(3);
expect(value).toBeLessThan(10);
expect(value).toBeLessThanOrEqual(10);
expect(value).toBeCloseTo(0.3, 2);

// Strings
expect(string).toMatch(/pattern/);
expect(string).toContain('substring');

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);
expect(array).toContainEqual({ id: 1 });

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('key', 'value');
expect(obj).toMatchObject({ a: 1 });

// Exceptions
expect(fn).toThrow();
expect(fn).toThrow('error message');
expect(fn).toThrow(Error);

// Async
await expect(promise).resolves.toBe('value');
await expect(promise).rejects.toThrow('error');

// Functions
expect(fn).toHaveBeenCalled();
expect(fn).toHaveBeenCalledTimes(2);
expect(fn).toHaveBeenCalledWith(arg1, arg2);
expect(fn).toHaveReturned();
expect(fn).toHaveReturnedWith('value');
```

#### React Native Matchers

From `@testing-library/jest-native`:

```typescript
// Visibility
expect(element).toBeOnTheScreen();
expect(element).toBeVisible();
expect(element).toBeEmptyElement();

// Text
expect(element).toHaveTextContent('text');
expect(element).toContainElement(child);

// Props
expect(element).toHaveProp('propName', 'value');
expect(element).toHaveStyle({ color: 'red' });

// Accessibility
expect(element).toBeEnabled();
expect(element).toBeDisabled();
expect(element).toBeSelected();
expect(element).toHaveAccessibilityState({ disabled: true });
expect(element).toHaveAccessibilityValue({ min: 0, max: 100 });
```

### Mock Functions

```typescript
// Create mock
const mockFn = jest.fn();

// With return value
const mockFn = jest.fn(() => 'return value');

// With implementation
const mockFn = jest.fn((x) => x * 2);

// Mock resolved promise
const mockFn = jest.fn().mockResolvedValue('value');

// Mock rejected promise
const mockFn = jest.fn().mockRejectedValue(new Error('error'));

// Mock multiple calls
const mockFn = jest.fn()
  .mockReturnValueOnce('first')
  .mockReturnValueOnce('second')
  .mockReturnValue('default');

// Check calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenNthCalledWith(1, arg1);
expect(mockFn).toHaveBeenLastCalledWith(arg1);

// Access mock data
mockFn.mock.calls[0]; // First call arguments
mockFn.mock.results[0]; // First call result
mockFn.mock.instances[0]; // First call this value

// Reset
mockFn.mockClear(); // Clear call history
mockFn.mockReset(); // Clear call history and implementation
mockFn.mockRestore(); // Reset to original implementation
```

### Setup File

Located in `jest.setup.js`:

```javascript
import '@testing-library/jest-native/extend-expect';

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  Constants: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:3000',
      },
    },
  },
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
```

---

## React Native Testing Library

### Overview

React Native Testing Library provides utilities for testing React Native components.

**Official Documentation**: https://callstack.github.io/react-native-testing-library/

### Rendering

```typescript
import { render, screen } from '@testing-library/react-native';

// Basic render
const { getByText } = render(<Component />);

// With props
const { getByText } = render(<Component prop="value" />);

// With wrapper
const { getByText } = render(<Component />, {
  wrapper: ({ children }) => (
    <Provider>
      {children}
    </Provider>
  ),
});
```

### Queries

```typescript
import { render } from '@testing-library/react-native';

const {
  // Get queries (throw if not found)
  getByText,
  getByTestId,
  getByPlaceholderText,
  getByDisplayValue,
  getByRole,
  getAllByText,

  // Query queries (return null if not found)
  queryByText,
  queryByTestId,
  queryAllByText,

  // Find queries (async, wait for element)
  findByText,
  findByTestId,
  findAllByText,

  // Debug
  debug,
} = render(<Component />);

// Usage
expect(getByText('Hello')).toBeTruthy();
expect(queryByText('Missing')).toBeNull();
await findByText('Async content');
```

### User Events

```typescript
import { render, fireEvent } from '@testing-library/react-native';

const { getByTestId } = render(<Component />);

// Press
fireEvent.press(getByTestId('button'));

// Change text
fireEvent.changeText(getByTestId('input'), 'new value');

// Scroll
fireEvent.scroll(getByTestId('scrollview'), {
  nativeEvent: {
    contentOffset: { y: 100 },
  },
});

// Custom events
fireEvent(element, 'eventName', eventData);
```

### Async Utilities

```typescript
import { waitFor, waitForElementToBeRemoved } from '@testing-library/react-native';

// Wait for assertion
await waitFor(() => {
  expect(getByText('Loaded')).toBeTruthy();
});

// With timeout
await waitFor(() => {
  expect(result).toBeDefined();
}, { timeout: 5000 });

// Wait for element removal
await waitForElementToBeRemoved(() => getByTestId('loading'));
```

### Hook Testing

```typescript
import { renderHook, act } from '@testing-library/react-native';

// Basic hook test
const { result } = renderHook(() => useCustomHook());
expect(result.current.value).toBe(0);

// With props
const { result } = renderHook(
  ({ id }) => useData(id),
  { initialProps: { id: '123' } }
);

// Update hook
act(() => {
  result.current.increment();
});

// Rerender with new props
rerender({ id: '456' });

// Unmount
unmount();
```

---

## Detox

### Overview

Detox is an end-to-end testing framework for React Native.

**Official Documentation**: https://wix.github.io/Detox/

### Configuration

Located in `.detoxrc.js`:

```javascript
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/RezApp.app',
      build: 'xcodebuild -workspace ios/RezApp.xcworkspace -scheme RezApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 14' },
    },
    emulator: {
      type: 'android.emulator',
      device: { avdName: 'Pixel_5_API_31' },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
  },
};
```

### Commands

```bash
# Build app
detox build --configuration ios.sim.debug

# Run tests
detox test --configuration ios.sim.debug

# Run specific test
detox test e2e/login.e2e.js --configuration ios.sim.debug

# Clean
detox clean-framework-cache
```

### API

```javascript
// Element selection
element(by.id('testID'));
element(by.text('Text'));
element(by.label('label'));
element(by.type('RCTTextInput'));

// Actions
await element(by.id('button')).tap();
await element(by.id('input')).typeText('text');
await element(by.id('input')).replaceText('text');
await element(by.id('input')).clearText();
await element(by.id('scrollview')).scroll(100, 'down');
await element(by.id('element')).swipe('left', 'fast');

// Expectations
await expect(element(by.id('element'))).toBeVisible();
await expect(element(by.id('element'))).toExist();
await expect(element(by.id('element'))).toHaveText('text');
await expect(element(by.id('element'))).toHaveValue('value');

// Waiting
await waitFor(element(by.id('element')))
  .toBeVisible()
  .withTimeout(5000);

// Device
await device.launchApp();
await device.reloadReactNative();
await device.sendToHome();
await device.terminateApp();
await device.takeScreenshot('name');
```

---

## TypeScript Integration

### ts-jest Configuration

```javascript
// jest.config.js
module.exports = {
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
};
```

### Type Definitions

```typescript
// types/tests.d.ts

// Extend Jest matchers
declare namespace jest {
  interface Matchers<R> {
    toBeWithinRange(a: number, b: number): R;
  }
}

// Mock types
declare module '@/services/apiClient' {
  const apiClient: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    delete: jest.Mock;
  };
  export default apiClient;
}
```

---

## Mock Libraries

### Manual Mocks

Located in `__mocks__/` directory:

```typescript
// __mocks__/@react-native-async-storage/async-storage.ts
export default {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
};
```

### Module Mocking

```typescript
// Mock entire module
jest.mock('@/services/api');

// Mock with factory
jest.mock('@/services/api', () => ({
  fetchData: jest.fn(),
  postData: jest.fn(),
}));

// Mock default export
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

// Partial mock
jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  fetchData: jest.fn(),
}));
```

---

## Testing Utilities

### Test Helpers

Located in `__tests__/utils/testHelpers.ts`:

```typescript
// Setup authenticated user
export const setupAuthenticatedUser = async () => {
  await AsyncStorage.setItem('auth-token', 'mock-token');
  await AsyncStorage.setItem('user', JSON.stringify(mockUser));
};

// Cleanup
export const cleanupAfterTest = async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
};

// Mock API response
export const mockApiResponse = (data: any) => ({
  success: true,
  data,
});

// Generate mock data
export const generateMockProducts = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `prod_${i}`,
    name: `Product ${i}`,
    price: 1000 + i * 100,
  }));
};

// Performance measurement
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
};
```

### Test Factories

```typescript
// testFactories.ts
export const createMockUser = (overrides = {}) => ({
  id: 'user_123',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+919876543210',
  ...overrides,
});

export const createMockProduct = (overrides = {}) => ({
  id: 'prod_123',
  name: 'Test Product',
  price: 999,
  category: 'Electronics',
  inStock: true,
  ...overrides,
});

export const createMockCart = (overrides = {}) => ({
  id: 'cart_123',
  items: [],
  total: 0,
  ...overrides,
});
```

---

## CI/CD Tools

### GitHub Actions

Located in `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Tests
        run: npm test -- --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### Coverage Reporting

```bash
# Generate coverage
npm run test:coverage

# View in browser
open coverage/lcov-report/index.html

# Upload to Codecov
codecov -f coverage/lcov.info
```

---

## Development Tools

### VS Code Extensions

Recommended extensions:

- **Jest**: orta.vscode-jest
- **Jest Runner**: firsttris.vscode-jest-runner
- **Test Explorer**: hbenl.vscode-test-explorer

### VS Code Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Jest Debug",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": [
        "--runInBand",
        "--no-cache",
        "${file}"
      ],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

### NPM Scripts

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "detox test --configuration ios.sim.debug",
    "test:e2e:android": "detox test --configuration android.emu.debug",
    "test:e2e:build:ios": "detox build --configuration ios.sim.debug",
    "test:e2e:build:android": "detox build --configuration android.emu.debug"
  }
}
```

---

## Configuration Files

### jest.config.js

Main Jest configuration file.

**Location**: `frontend/jest.config.js`

**Key Settings**:
- preset: 'jest-expo'
- testEnvironment: 'node'
- transformIgnorePatterns
- moduleNameMapper
- collectCoverageFrom
- coverageThreshold

### jest.setup.js

Jest setup and global configuration.

**Location**: `frontend/jest.setup.js`

**Contains**:
- Global mocks
- Test environment setup
- Extended matchers
- Global timeout settings

### .detoxrc.js

Detox configuration for E2E tests.

**Location**: `frontend/.detoxrc.js`

**Contains**:
- App build configurations
- Device configurations
- Test runner settings

### tsconfig.json

TypeScript configuration.

**Location**: `frontend/tsconfig.json`

**Key Settings**:
- compilerOptions
- include/exclude patterns
- Path aliases

---

## Quick Reference

### Common Commands

```bash
# Unit tests
npm test                      # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage

# E2E tests
npm run test:e2e:build:ios   # Build for iOS
npm run test:e2e            # Run iOS E2E
npm run test:e2e:android    # Run Android E2E

# Debug
npm test -- --verbose       # Verbose output
npm test -- -t "test name"  # Run specific test
jest --clearCache           # Clear cache
```

### File Locations

```
frontend/
├── jest.config.js           # Jest configuration
├── jest.setup.js            # Jest setup
├── .detoxrc.js             # Detox configuration
├── __tests__/              # Test files
├── __mocks__/              # Manual mocks
└── e2e/                    # E2E tests
    └── jest.config.js      # E2E Jest config
```

---

## Conclusion

This reference covers all major testing tools used in the Rez App. For specific usage examples, see the other testing guides.

**Related Documentation**:
- [TESTING_GUIDE_MASTER.md](./TESTING_GUIDE_MASTER.md)
- [TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md)
- [TESTING_TROUBLESHOOTING.md](./TESTING_TROUBLESHOOTING.md)

**Last Updated**: November 11, 2025
