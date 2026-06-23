# Testing Quick Start Guide

**Get started with testing in 5 minutes** - Perfect for new developers!

## Quick Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Run in watch mode (recommended for development)
npm run test:watch

# Run with coverage
npm run test:coverage
```

That's it! You're ready to test.

---

## Writing Your First Test

### Step 1: Create Test File

Create a file named `myFunction.test.ts`:

```typescript
// __tests__/utils/myFunction.test.ts

describe('myFunction', () => {
  it('should return correct result', () => {
    // Arrange
    const input = 'test';

    // Act
    const result = myFunction(input);

    // Assert
    expect(result).toBe('TEST');
  });
});
```

### Step 2: Run Your Test

```bash
npm test -- myFunction.test.ts
```

### Step 3: See Results

```
PASS  __tests__/utils/myFunction.test.ts
  myFunction
    ✓ should return correct result (2ms)

Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

---

## Common Test Patterns

### Testing a Service

```typescript
import { myService } from '@/services/myService';
import apiClient from '@/services/apiClient';

jest.mock('@/services/apiClient');

describe('myService', () => {
  it('should fetch data', async () => {
    // Mock API response
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { id: 1, name: 'Test' }
    });

    // Call service
    const result = await myService.getData(1);

    // Verify
    expect(result.id).toBe(1);
    expect(apiClient.get).toHaveBeenCalledWith('/data/1');
  });
});
```

### Testing a Hook

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useMyHook } from '@/hooks/useMyHook';

describe('useMyHook', () => {
  it('should update state', () => {
    const { result } = renderHook(() => useMyHook());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

### Testing a Component

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import MyButton from '@/components/MyButton';

describe('MyButton', () => {
  it('should call onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<MyButton onPress={onPress}>Click Me</MyButton>);

    fireEvent.press(getByText('Click Me'));

    expect(onPress).toHaveBeenCalled();
  });
});
```

---

## Mocking Strategies

### Mock API Calls

```typescript
import apiClient from '@/services/apiClient';

jest.mock('@/services/apiClient');

(apiClient.get as jest.Mock).mockResolvedValue({
  data: { /* mock data */ }
});
```

### Mock AsyncStorage

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// AsyncStorage is already mocked in jest.setup.js
await AsyncStorage.setItem('key', 'value');
const value = await AsyncStorage.getItem('key');
```

### Mock Navigation

```typescript
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));
```

---

## Test Data Management

### Using Mock Factories

```typescript
import { createMockUser, createMockProduct } from '@/__tests__/utils/testHelpers';

const user = createMockUser({ email: 'custom@example.com' });
const product = createMockProduct({ price: 999 });
```

### Creating Test Data

```typescript
const mockUser = {
  id: 'user_123',
  email: 'test@example.com',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
  },
};
```

---

## Debugging Tests

### Run Specific Test

```bash
# By file name
npm test -- myTest.test.ts

# By test name pattern
npm test -- --testNamePattern="should fetch data"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "${file}"],
  "console": "integratedTerminal"
}
```

Set breakpoints and press F5.

### View Console Output

```typescript
it('should log message', () => {
  console.log('Debug info:', variable);
  // Test code
});
```

---

## Coverage Reports

### Generate Coverage

```bash
npm run test:coverage
```

### View HTML Report

```bash
# Open in browser
open coverage/lcov-report/index.html

# Windows
start coverage/lcov-report/index.html
```

### Understand Coverage Metrics

- **Lines**: % of code lines executed
- **Functions**: % of functions called
- **Branches**: % of if/else branches taken
- **Statements**: % of statements executed

Target: **70%+ for all metrics**

---

## Troubleshooting

### Tests Won't Run

```bash
# Clear Jest cache
npm test -- --clearCache

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Mock Not Working

```typescript
// Mock BEFORE importing
jest.mock('@/services/api');
import { api } from '@/services/api';

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Timeout Errors

```typescript
// Increase timeout
it('slow test', async () => {
  // test code
}, 10000); // 10 seconds
```

### Async Test Issues

```typescript
// Use async/await
it('async test', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Or use waitFor
await waitFor(() => {
  expect(element).toBeVisible();
});
```

---

## Quick Commands Reference

```bash
# Development
npm run test:watch              # Watch mode
npm test -- path/to/test.ts    # Run specific test
npm test -- -t "test name"     # Run by name

# Coverage
npm run test:coverage          # Generate coverage
npm run test:coverage -- --watch # Coverage in watch mode

# Debugging
npm test -- --verbose          # Detailed output
npm test -- --no-cache         # No cache
npm test -- --runInBand        # Sequential (for debugging)

# Maintenance
npm test -- --clearCache       # Clear cache
npm test -- -u                 # Update snapshots
```

---

## Next Steps

1. **Read Full Guide**: See [TEST_AUTOMATION_GUIDE.md](./TEST_AUTOMATION_GUIDE.md)
2. **Review Test Cases**: Check [TEST_CASES.md](./TEST_CASES.md)
3. **Write Tests**: Add tests for your code
4. **Run Tests**: `npm run test:watch`
5. **Check Coverage**: `npm run test:coverage`

---

## Best Practices Checklist

- [ ] Write tests first (TDD)
- [ ] Keep tests simple and focused
- [ ] Use descriptive test names
- [ ] Mock external dependencies
- [ ] Test edge cases
- [ ] Run tests before committing
- [ ] Maintain 70%+ coverage
- [ ] Review test output
- [ ] Fix failing tests immediately
- [ ] Update tests with code changes

---

## Getting Help

- **Documentation**: [TEST_AUTOMATION_GUIDE.md](./TEST_AUTOMATION_GUIDE.md)
- **Examples**: Check `__tests__/` directory
- **Test Utilities**: See `__tests__/utils/testHelpers.ts`
- **CI/CD**: See `.github/workflows/testing.yml`

---

**Happy Testing! 🧪**

Last Updated: 2024-01-27
