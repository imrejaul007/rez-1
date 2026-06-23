# Unit Testing Guide

## Overview

This guide provides comprehensive information on unit testing in the Rez App frontend. We use Jest and React Native Testing Library for our testing infrastructure.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Mock Strategies](#mock-strategies)
5. [Coverage Requirements](#coverage-requirements)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 16+ installed
- npm or yarn package manager
- Understanding of JavaScript/TypeScript and React

### Installation

All testing dependencies are already included in the project:

```bash
npm install
```

Key testing libraries:
- `jest`: Testing framework
- `@testing-library/react-native`: React Native testing utilities
- `@testing-library/jest-native`: Jest matchers for React Native
- `ts-jest`: TypeScript support for Jest

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run specific test file
```bash
npm test -- validation.test.ts
```

## Writing Tests

### Test File Structure

Place test files in the `__tests__` directory mirroring the source structure.

### Basic Test Template

```typescript
import { functionToTest } from '@/path/to/module';

describe('ModuleName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle normal case', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected output');
  });
});
```

### Testing Utilities

```typescript
import { validateEmail } from '@/utils/validation';

describe('validation utilities', () => {
  it('should return true for valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('should return false for invalid emails', () => {
    expect(validateEmail('invalid')).toBe(false);
  });
});
```

### Testing Custom Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';
import { useWallet } from '@/hooks/useWallet';

describe('useWallet', () => {
  it('should load wallet balance', async () => {
    const { result } = renderHook(() => useWallet());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.balance).toBeDefined();
  });
});
```

### Testing API Services

```typescript
import * as authApi from '@/services/authApi';

jest.mock('@/services/apiClient');

describe('authApi', () => {
  it('should send OTP', async () => {
    const result = await authApi.sendOTP('+919876543210');
    expect(result.success).toBe(true);
  });
});
```

## Mock Strategies

### Mocking Modules

```typescript
jest.mock('@/services/api', () => ({
  fetchData: jest.fn(() => Promise.resolve({ data: 'test' })),
}));
```

### Mocking React Native Modules

```typescript
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
```

## Coverage Requirements

### Target Coverage

- **Utilities**: 80%+ coverage
- **Hooks**: 70%+ coverage
- **Services**: 75%+ coverage
- **Contexts**: 70%+ coverage

### Checking Coverage

```bash
npm run test:coverage
```

## Best Practices

### 1. Test Naming

Use descriptive test names:

```typescript
it('should return true for valid email addresses', () => {});
```

### 2. Arrange-Act-Assert Pattern

```typescript
it('should add item to cart', () => {
  // Arrange
  const item = { id: 'prod-123', price: 999 };

  // Act
  const result = addToCart(item);

  // Assert
  expect(result.items).toContain(item);
});
```

### 3. Test One Thing at a Time

Focus each test on a single behavior.

### 4. Clean Up After Tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### 5. Test Edge Cases

Test null, undefined, empty strings, boundary values, etc.

## Troubleshooting

### Common Issues

#### Module Not Found

Check `moduleNameMapper` in `jest.config.js`.

#### Async Tests Timeout

Use `waitFor` and increase timeout if needed.

#### Mock Not Working

Ensure mock is set up in `beforeEach` or at module level.

### Debugging Tests

```bash
npm test -- validation.test.ts
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)

---

Last Updated: 2025-11-11
