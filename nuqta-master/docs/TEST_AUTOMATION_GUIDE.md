# Test Automation Guide

Complete guide for testing the REZ app including testing strategy, tools, best practices, and CI/CD integration.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Pyramid](#test-pyramid)
3. [Coverage Targets](#coverage-targets)
4. [Testing Tools](#testing-tools)
5. [Writing Tests](#writing-tests)
6. [Test Organization](#test-organization)
7. [CI/CD Integration](#cicd-integration)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Testing Strategy

### Overview

Our testing strategy follows the test pyramid approach with emphasis on:
- **Fast feedback loops** - Most tests should run quickly
- **Comprehensive coverage** - Critical paths must be thoroughly tested
- **Maintainability** - Tests should be easy to understand and update
- **Reliability** - Tests should be deterministic and not flaky

### Test Types

#### 1. Unit Tests (70% of tests)
- Test individual functions, hooks, and components in isolation
- Fast execution (<1ms per test)
- No external dependencies
- Mock all external services

#### 2. Integration Tests (20% of tests)
- Test interactions between modules
- Test API integration
- Test data flow through the application
- Mock external services only

#### 3. E2E Tests (10% of tests)
- Test complete user journeys
- Test critical business flows
- Run against actual or staging environment
- Slower execution but high confidence

---

## Test Pyramid

```
        /\
       /  \      E2E Tests (10%)
      /____\     - User journeys
     /      \    - Critical flows
    /        \   - Cross-platform
   /__________\
  /            \ Integration Tests (20%)
 /______________\ - API integration
/                \ - Module interactions
/__________________\ Unit Tests (70%)
                    - Functions, hooks, components
```

### Distribution

- **Unit Tests**: 70% - Fast, isolated, high volume
- **Integration Tests**: 20% - Moderate speed, test interactions
- **E2E Tests**: 10% - Slow, test complete flows

---

## Coverage Targets

### Minimum Coverage Requirements

```javascript
{
  "global": {
    "branches": 70,
    "functions": 70,
    "lines": 70,
    "statements": 70
  }
}
```

### Per-Module Targets

| Module | Target | Priority |
|--------|--------|----------|
| Services | 80% | Critical |
| Hooks | 75% | High |
| Contexts | 75% | High |
| Utils | 80% | Critical |
| Components | 65% | Medium |
| Screens | 60% | Medium |

### Critical Paths (100% Coverage)

1. **Authentication Flow**
   - OTP generation
   - OTP verification
   - Token management
   - Session persistence

2. **Payment Processing**
   - Payment intent creation
   - Payment confirmation
   - 3D Secure handling
   - Refunds

3. **Order Management**
   - Order creation
   - Order status updates
   - Order tracking

4. **Fraud Detection**
   - Duplicate detection
   - Rate limiting
   - Risk scoring

---

## Testing Tools

### Core Tools

#### Jest
- Test runner and assertion library
- Built-in mocking capabilities
- Code coverage reporting

```bash
npm test                    # Run all tests
npm run test:watch         # Run in watch mode
npm run test:coverage      # Run with coverage
```

#### React Native Testing Library
- Component testing
- User-centric testing approach
- DOM queries and interactions

#### ts-jest
- TypeScript support for Jest
- Type-safe testing

### Additional Tools

#### Detox (E2E Testing)
- React Native E2E testing framework
- Native app automation
- Cross-platform support

#### MSW (Mock Service Worker)
- API mocking for integration tests
- Network-level mocking
- Request interception

#### Faker.js
- Generate realistic mock data
- Consistent test data

---

## Writing Tests

### Unit Test Structure

```typescript
describe('ServiceName', () => {
  // Setup
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('functionName', () => {
    it('should do something successfully', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle errors gracefully', () => {
      // Test error scenarios
    });
  });
});
```

### Integration Test Structure

```typescript
describe('Feature Integration', () => {
  beforeEach(async () => {
    // Setup test environment
    await setupTestData();
  });

  afterEach(async () => {
    // Cleanup
    await cleanupTestData();
  });

  it('should complete full workflow', async () => {
    // Test complete feature flow
  });
});
```

### E2E Test Structure

```typescript
describe('User Journey', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should complete purchase flow', async () => {
    // Navigate through app
    // Perform actions
    // Verify outcomes
  });
});
```

### Best Practices for Writing Tests

#### 1. Test Naming
```typescript
// Good
it('should return user data when ID is valid', () => {});

// Bad
it('test getUserById', () => {});
```

#### 2. Arrange-Act-Assert Pattern
```typescript
it('should calculate total correctly', () => {
  // Arrange - Setup test data
  const items = [{ price: 100 }, { price: 200 }];

  // Act - Execute function
  const total = calculateTotal(items);

  // Assert - Verify result
  expect(total).toBe(300);
});
```

#### 3. One Assertion Per Test (When Possible)
```typescript
// Good
it('should return correct subtotal', () => {
  expect(cart.subtotal).toBe(1000);
});

it('should return correct tax', () => {
  expect(cart.tax).toBe(100);
});

// Acceptable for related assertions
it('should return correct cart totals', () => {
  expect(cart.subtotal).toBe(1000);
  expect(cart.tax).toBe(100);
  expect(cart.total).toBe(1100);
});
```

#### 4. Mock External Dependencies
```typescript
jest.mock('@/services/apiClient');

it('should call API with correct params', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: mockUser });

  const user = await getUser('123');

  expect(apiClient.get).toHaveBeenCalledWith('/users/123');
});
```

#### 5. Test Edge Cases
```typescript
describe('calculateDiscount', () => {
  it('should handle zero amount', () => {
    expect(calculateDiscount(0, 10)).toBe(0);
  });

  it('should handle negative amounts', () => {
    expect(calculateDiscount(-100, 10)).toBe(0);
  });

  it('should handle 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(100);
  });

  it('should handle decimal amounts', () => {
    expect(calculateDiscount(123.45, 10)).toBe(12.35);
  });
});
```

---

## Test Organization

### Directory Structure

```
frontend/
├── __tests__/
│   ├── services/          # Service unit tests
│   │   ├── fraudDetectionService.test.ts
│   │   ├── authApi.test.ts
│   │   └── cartApi.test.ts
│   ├── hooks/             # Hook unit tests
│   │   ├── useSafeNavigation.test.ts
│   │   └── useCart.test.ts
│   ├── components/        # Component unit tests
│   │   └── SafeBackButton.test.tsx
│   ├── utils/             # Utility unit tests
│   │   ├── earningsCalculation.test.ts
│   │   └── testHelpers.ts
│   └── integration/       # Integration tests
│       ├── checkout.test.ts
│       ├── authentication.test.ts
│       └── groupBuying.test.ts
├── e2e/                   # E2E tests
│   ├── userJourney.test.ts
│   ├── purchaseFlow.test.ts
│   └── socialFeatures.test.ts
├── __mocks__/             # Mock implementations
│   └── react-native.js
├── jest.config.js         # Jest configuration
└── jest.setup.js          # Jest setup file
```

### File Naming Conventions

- Unit tests: `*.test.ts` or `*.spec.ts`
- E2E tests: `*.e2e.test.ts`
- Test utilities: `testHelpers.ts`, `mockFactories.ts`
- Mocks: Place in `__mocks__/` directory

---

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- Pull requests
- Push to main branch
- Nightly builds
- Manual trigger

### Test Stages

1. **Fast Tests (Required)**
   - Unit tests
   - Linting
   - Type checking
   - Duration: ~2-5 minutes

2. **Integration Tests (Required)**
   - API integration tests
   - Database tests
   - Duration: ~5-10 minutes

3. **E2E Tests (Optional)**
   - Critical user journeys
   - Cross-platform tests
   - Duration: ~10-30 minutes
   - Only on main branch

### Coverage Reporting

- Coverage reports generated on every PR
- Fails if coverage drops below threshold
- Reports uploaded to Codecov/Coveralls

### Performance Tests

- Run nightly
- Benchmark critical operations
- Alert on performance regressions

---

## Best Practices

### Do's ✅

1. **Write tests first (TDD)** - When possible
2. **Keep tests simple** - One concept per test
3. **Use descriptive names** - Tests should be self-documenting
4. **Mock external dependencies** - Keep tests isolated
5. **Test edge cases** - Not just happy paths
6. **Clean up after tests** - Reset state between tests
7. **Use test utilities** - DRY principle applies to tests
8. **Run tests locally** - Before pushing
9. **Keep tests fast** - Optimize slow tests
10. **Update tests with code** - Keep them in sync

### Don'ts ❌

1. **Don't test implementation details** - Test behavior
2. **Don't write flaky tests** - They lose trust
3. **Don't skip tests** - Fix or remove them
4. **Don't test third-party code** - Only test your code
5. **Don't share state between tests** - Use beforeEach
6. **Don't over-mock** - Mock only what's necessary
7. **Don't ignore failing tests** - Fix immediately
8. **Don't test everything** - Focus on critical paths
9. **Don't write slow tests** - Optimize or move to integration
10. **Don't duplicate tests** - One test per scenario

---

## Troubleshooting

### Common Issues

#### 1. Tests Timing Out

```typescript
// Increase timeout for specific test
it('should handle long operation', async () => {
  // ...
}, 10000); // 10 second timeout
```

#### 2. Async Issues

```typescript
// Use async/await properly
it('should fetch data', async () => {
  await waitFor(() => {
    expect(element).toBeVisible();
  });
});
```

#### 3. Mock Not Working

```typescript
// Ensure mock is set up before import
jest.mock('@/services/api');
import { api } from '@/services/api';

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

#### 4. Coverage Not Updating

```bash
# Clear Jest cache
npm test -- --clearCache

# Run with no cache
npm test -- --no-cache
```

#### 5. Tests Passing Locally But Failing in CI

- Check environment variables
- Verify Node/npm versions match
- Check for timezone issues
- Review test isolation

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Test-Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)

---

## Quick Commands Reference

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="authentication"

# Update snapshots
npm test -- -u

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Clear cache
npm test -- --clearCache
```

---

**Last Updated:** 2024-01-27
**Version:** 1.0.0
