# Integration Testing Guide

## Overview

This guide provides comprehensive documentation for the integration testing infrastructure in the Rez App. Integration tests verify that different parts of the application work together correctly.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Running Tests](#running-tests)
3. [Test Categories](#test-categories)
4. [Writing Integration Tests](#writing-integration-tests)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

## Test Structure

```
__tests__/
├── integration/
│   ├── utils/
│   │   ├── testHelpers.ts          # Test utility functions
│   │   └── mockApiHandlers.ts      # Centralized API mocking
│   ├── flows/                       # User flow tests
│   │   ├── shopping-flow.test.ts
│   │   ├── earning-flow.test.ts
│   │   ├── social-flow.test.ts
│   │   ├── wallet-flow.test.ts
│   │   └── onboarding-flow.test.ts
│   ├── components/                  # Component integration
│   │   ├── cart-component-integration.test.tsx
│   │   ├── navigation-integration.test.tsx
│   │   ├── modal-integration.test.tsx
│   │   ├── form-integration.test.tsx
│   │   ├── list-integration.test.tsx
│   │   └── realtime-integration.test.tsx
│   ├── api/                         # API integration
│   │   ├── api-client-integration.test.ts
│   │   ├── offline-queue-integration.test.ts
│   │   ├── websocket-integration.test.ts
│   │   ├── payment-gateway-integration.test.ts
│   │   ├── search-integration.test.ts
│   │   └── notifications-integration.test.ts
│   ├── state/                       # State management
│   │   ├── context-integration.test.tsx
│   │   ├── persistence-integration.test.ts
│   │   ├── optimistic-updates.test.ts
│   │   └── cross-tab-sync.test.ts
│   └── performance/                 # Performance tests
│       ├── api-performance.test.ts
│       ├── rendering-performance.test.tsx
│       ├── memory-performance.test.ts
│       ├── bundle-size.test.ts
│       └── image-optimization.test.ts
```

## Running Tests

### Run All Integration Tests

```bash
npm test -- __tests__/integration
```

### Run Specific Category

```bash
# User flow tests
npm test -- __tests__/integration/flows

# API tests
npm test -- __tests__/integration/api

# Component tests
npm test -- __tests__/integration/components

# State management tests
npm test -- __tests__/integration/state

# Performance tests
npm test -- __tests__/integration/performance
```

### Run Specific Test File

```bash
npm test -- __tests__/integration/flows/shopping-flow.test.ts
```

### Watch Mode

```bash
npm test -- --watch __tests__/integration
```

### Coverage Report

```bash
npm test -- --coverage __tests__/integration
```

## Test Categories

### 1. User Flow Tests (flows/)

Tests complete user journeys from start to finish.

**Examples:**
- Shopping Flow: Browse → View → Add to Cart → Checkout → Payment → Order
- Earning Flow: Browse Projects → Complete Task → Submit → Earn Coins
- Social Flow: View Feed → Like/Comment → Upload → Share
- Wallet Flow: Add Money → Pay Bill → Upload Receipt → Get Cashback

**Key Features:**
- End-to-end user scenarios
- Multi-step workflows
- Real user behavior patterns
- State changes across multiple screens

### 2. Component Integration Tests (components/)

Tests how components interact with each other and with contexts/APIs.

**Examples:**
- Cart component syncing with API
- Navigation between screens
- Modal interactions
- Form submissions
- List pagination and scrolling
- Real-time updates

**Key Features:**
- Component communication
- Context integration
- Event handling
- State synchronization

### 3. API Integration Tests (api/)

Tests API client functionality and service layer integration.

**Examples:**
- Authentication with token refresh
- Request retry logic
- Offline queue processing
- WebSocket connections
- Payment gateway integration
- Search functionality

**Key Features:**
- Request/response handling
- Error handling and retries
- Cache integration
- Network condition handling

### 4. State Management Tests (state/)

Tests state management across the application.

**Examples:**
- Context state synchronization
- State persistence to AsyncStorage
- Optimistic updates
- Cross-tab synchronization

**Key Features:**
- Context integration
- State persistence
- State updates and rollbacks
- Multi-source state management

### 5. Performance Tests (performance/)

Tests performance-critical aspects of the application.

**Examples:**
- API response times
- Rendering performance
- Memory usage
- Bundle size
- Image optimization

**Key Features:**
- Performance measurement
- Resource usage monitoring
- Optimization verification

## Writing Integration Tests

### Basic Test Structure

```typescript
import apiClient from '@/services/apiClient';
import { setupAuthenticatedUser, cleanupAfterTest, testDataFactory } from '../utils/testHelpers';
import { setupMockHandlers } from '../utils/mockApiHandlers';

jest.mock('@/services/apiClient');

describe('Your Integration Test', () => {
  beforeEach(async () => {
    await setupAuthenticatedUser();
    setupMockHandlers(apiClient);
  });

  afterEach(async () => {
    await cleanupAfterTest();
  });

  it('should complete the user flow', async () => {
    // Arrange: Set up mocks
    (apiClient.get as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: testDataFactory.cart(),
    });

    // Act: Execute the flow
    const result = await apiClient.get('/cart');

    // Assert: Verify results
    expect(result.success).toBe(true);
    expect(result.data.items).toBeDefined();
  });
});
```

### Using Test Helpers

#### Setup Authenticated User

```typescript
import { setupAuthenticatedUser } from '../utils/testHelpers';

beforeEach(async () => {
  await setupAuthenticatedUser();
  // User is now logged in with mock tokens
});
```

#### Mock API Responses

```typescript
import { mockApiResponse, testDataFactory } from '../utils/testHelpers';

(apiClient.get as jest.Mock).mockResolvedValueOnce(
  mockApiResponse(testDataFactory.cart())
);
```

#### Generate Test Data

```typescript
import { generateMockProducts, generateMockStores } from '../utils/testHelpers';

const products = generateMockProducts(10); // Generate 10 mock products
const stores = generateMockStores(5);      // Generate 5 mock stores
```

#### Measure Performance

```typescript
import { measurePerformance } from '../utils/testHelpers';

const { result, duration } = await measurePerformance(async () => {
  return await apiClient.get('/products');
});

expect(duration).toBeLessThan(1000); // Should complete in under 1 second
```

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  (apiClient.post as jest.Mock).mockResolvedValueOnce({
    success: true,
    data: { id: 'order_123' },
  });

  const order = await orderApi.createOrder({
    items: [{ productId: 'prod_1', quantity: 1 }],
  });

  expect(order.id).toBe('order_123');
});
```

### Testing Error Scenarios

```typescript
it('should handle errors gracefully', async () => {
  (apiClient.post as jest.Mock).mockRejectedValueOnce({
    response: {
      status: 400,
      data: { error: 'Invalid data' },
    },
  });

  await expect(
    apiClient.post('/orders', {})
  ).rejects.toMatchObject({
    response: { status: 400 },
  });
});
```

### Testing Real-time Updates

```typescript
import { MockWebSocket } from '../utils/testHelpers';

it('should receive real-time updates', (done) => {
  const mockSocket = new MockWebSocket();

  mockSocket.on('cart:updated', (data) => {
    expect(data).toBeDefined();
    done();
  });

  mockSocket.connect();
  mockSocket.emit('cart:updated', { items: [] });
});
```

## Best Practices

### 1. Test User Behavior, Not Implementation

✅ **Good:**
```typescript
it('should complete checkout flow', async () => {
  await addItemToCart();
  await proceedToCheckout();
  await confirmPayment();
  expect(orderCreated).toBe(true);
});
```

❌ **Bad:**
```typescript
it('should call addToCart function', async () => {
  const spy = jest.spyOn(cartService, 'addToCart');
  await cartService.addToCart('prod_1');
  expect(spy).toHaveBeenCalled();
});
```

### 2. Keep Tests Independent

Each test should be able to run independently without relying on other tests.

```typescript
beforeEach(async () => {
  // Reset state before each test
  await cleanupAfterTest();
  await setupAuthenticatedUser();
});
```

### 3. Use Descriptive Test Names

```typescript
// Good: Describes what the test does and expected outcome
it('should display error message when payment fails')

// Bad: Vague description
it('test payment')
```

### 4. Mock External Dependencies

Always mock API calls, database operations, and external services.

```typescript
jest.mock('@/services/apiClient');

beforeEach(() => {
  setupMockHandlers(apiClient);
});
```

### 5. Test Happy Path and Error Cases

```typescript
describe('Order Creation', () => {
  it('should create order successfully', async () => {
    // Test success case
  });

  it('should handle out of stock error', async () => {
    // Test error case
  });

  it('should handle payment failure', async () => {
    // Test another error case
  });
});
```

### 6. Clean Up After Tests

```typescript
afterEach(async () => {
  await cleanupAfterTest();
  jest.clearAllMocks();
});
```

### 7. Use Test Data Factories

```typescript
import { testDataFactory } from '../utils/testHelpers';

// Instead of creating test data manually
const cart = testDataFactory.cart();
const user = testDataFactory.user();
const product = testDataFactory.product();
```

### 8. Avoid Test Interdependence

```typescript
// Bad: Tests depend on execution order
it('should create user', async () => {
  user = await createUser();
});

it('should get user', async () => {
  const retrieved = await getUser(user.id); // Depends on previous test
});

// Good: Each test is independent
it('should create user', async () => {
  const user = await createUser();
  expect(user.id).toBeDefined();
});

it('should get user', async () => {
  const user = await createUser(); // Create fresh user
  const retrieved = await getUser(user.id);
  expect(retrieved.id).toBe(user.id);
});
```

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

**Problem:** Tests take too long or timeout

**Solution:**
- Increase timeout in jest.config.js
- Check for missing async/await
- Verify mock implementations resolve/reject correctly

```typescript
// Increase timeout for specific test
it('long running test', async () => {
  // Test code
}, 15000); // 15 second timeout
```

#### 2. Mock Not Working

**Problem:** Mock API calls not being used

**Solution:**
- Verify jest.mock() is called before imports
- Check mock implementation is set up correctly
- Use jest.clearAllMocks() between tests

```typescript
jest.mock('@/services/apiClient');

beforeEach(() => {
  jest.clearAllMocks();
  setupMockHandlers(apiClient);
});
```

#### 3. State Persisting Between Tests

**Problem:** Tests affect each other

**Solution:**
- Use cleanup functions
- Clear AsyncStorage
- Reset all mocks

```typescript
afterEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});
```

#### 4. Network Errors in Tests

**Problem:** Tests try to make real network requests

**Solution:**
- Ensure all network dependencies are mocked
- Use setupMockHandlers utility
- Check for missing jest.mock() declarations

```typescript
jest.mock('@/services/apiClient');
jest.mock('@react-native-community/netinfo');
```

### Debug Tips

#### Enable Verbose Output

```bash
npm test -- --verbose __tests__/integration
```

#### Run Single Test

```bash
npm test -- -t "should complete shopping flow"
```

#### Check Mock Calls

```typescript
expect(apiClient.post).toHaveBeenCalledWith('/cart/add', {
  productId: 'prod_1',
  quantity: 1,
});

console.log(apiClient.post.mock.calls); // See all calls
```

#### Use console.log in Tests

```typescript
it('debugging test', async () => {
  const result = await apiClient.get('/test');
  console.log('Result:', result); // Helps debug
  expect(result).toBeDefined();
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install Dependencies
        run: npm install

      - name: Run Integration Tests
        run: npm test -- __tests__/integration --coverage

      - name: Upload Coverage
        uses: codecov/codecov-action@v2
        with:
          files: ./coverage/lcov.info
```

## Performance Targets

- **Total Test Execution:** < 5 minutes
- **Individual Test:** < 10 seconds
- **API Response Simulation:** < 100ms
- **Test Coverage:** > 80%

## Further Reading

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
