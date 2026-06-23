# Testing Troubleshooting Guide

**Solutions to common testing issues in the Rez App**

---

## Table of Contents

1. [General Issues](#general-issues)
2. [Jest Configuration Issues](#jest-configuration-issues)
3. [Mock Issues](#mock-issues)
4. [Async Testing Issues](#async-testing-issues)
5. [Component Testing Issues](#component-testing-issues)
6. [Integration Testing Issues](#integration-testing-issues)
7. [E2E Testing Issues](#e2e-testing-issues)
8. [Performance Issues](#performance-issues)
9. [Platform-Specific Issues](#platform-specific-issues)
10. [Coverage Issues](#coverage-issues)
11. [Flaky Tests](#flaky-tests)
12. [Debug Techniques](#debug-techniques)

---

## General Issues

### Issue: "Cannot find module '@/...'"

**Symptoms:**
```
Cannot find module '@/services/api' from '__tests__/api.test.ts'
```

**Cause:** Path alias not configured in Jest

**Solution:**
```javascript
// jest.config.js
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

**Verification:**
```bash
npm test -- api.test.ts
```

---

### Issue: "Unexpected token" or "SyntaxError"

**Symptoms:**
```
SyntaxError: Unexpected token 'export'
```

**Cause:** ES6 modules not being transformed

**Solution:**
```javascript
// jest.config.js
module.exports = {
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@react-native|react-native|expo|@expo)/)',
  ],
};
```

---

### Issue: Tests Hanging or Timing Out

**Symptoms:**
```
Timeout - Async callback was not invoked within the 5000ms timeout
```

**Cause:** Missing await or unresolved promise

**Solution 1 - Add await:**
```typescript
// ❌ Bad
it('should fetch data', () => {
  const data = fetchData(); // Missing await!
  expect(data).toBeDefined();
});

// ✅ Good
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});
```

**Solution 2 - Increase timeout:**
```typescript
it('slow operation', async () => {
  // Test code
}, 10000); // 10 second timeout
```

**Solution 3 - Use waitFor:**
```typescript
await waitFor(() => {
  expect(result.current.loading).toBe(false);
}, { timeout: 5000 });
```

---

### Issue: "Cannot read property 'xxx' of undefined"

**Symptoms:**
```
TypeError: Cannot read property 'get' of undefined
```

**Cause:** Mock not properly initialized

**Solution:**
```typescript
// ❌ Bad
jest.mock('@/services/apiClient');

it('test', async () => {
  // apiClient.get is undefined!
  const result = await apiClient.get('/data');
});

// ✅ Good
jest.mock('@/services/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

it('test', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({ data: [] });
  const result = await apiClient.get('/data');
});
```

---

## Jest Configuration Issues

### Issue: Tests Not Found

**Symptoms:**
```
No tests found
```

**Solution 1 - Check test patterns:**
```javascript
// jest.config.js
module.exports = {
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
};
```

**Solution 2 - Check file naming:**
```
✅ validation.test.ts
✅ useWallet.test.ts
❌ validation.tests.ts (wrong)
❌ useWallet_test.ts (wrong)
```

---

### Issue: Coverage Not Collected

**Symptoms:**
```
Coverage not collected for some files
```

**Solution:**
```javascript
// jest.config.js
module.exports = {
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
};
```

---

### Issue: Transform Errors

**Symptoms:**
```
Transform error: SyntaxError: Unexpected token
```

**Solution:**
```javascript
// jest.config.js
module.exports = {
  transformIgnorePatterns: [
    'node_modules/(?!(' +
      '@react-native|' +
      'react-native|' +
      '@expo|' +
      'expo|' +
      'expo-.*|' +
      '@react-navigation|' +
      'socket.io-client|' +
      'use-debounce' +
    ')/)',
  ],
};
```

---

## Mock Issues

### Issue: Mock Not Working

**Symptoms:**
```
Expected mock function to have been called, but it was not called
```

**Solution 1 - Clear mocks:**
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

it('test', () => {
  const mockFn = jest.fn();
  // Test code
});
```

**Solution 2 - Mock before import:**
```typescript
// ❌ Bad order
import { apiClient } from '@/services/apiClient';
jest.mock('@/services/apiClient');

// ✅ Good order
jest.mock('@/services/apiClient');
import { apiClient } from '@/services/apiClient';
```

---

### Issue: Mock Returns Undefined

**Symptoms:**
```
Received: undefined
```

**Solution:**
```typescript
// ❌ Bad - no return value
(apiClient.get as jest.Mock).mockResolvedValue();

// ✅ Good - return value defined
(apiClient.get as jest.Mock).mockResolvedValue({
  success: true,
  data: mockData,
});
```

---

### Issue: Can't Mock AsyncStorage

**Symptoms:**
```
AsyncStorage is not mocked properly
```

**Solution:**
```typescript
// jest.setup.js
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// In test
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue();
});
```

---

### Issue: Context Mock Not Working

**Symptoms:**
```
useAuth is not a function
```

**Solution:**
```typescript
// ❌ Bad
jest.mock('@/contexts/AuthContext');

// ✅ Good
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: any) => children,
}));

// In test
import { useAuth } from '@/contexts/AuthContext';

beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue({
    state: { isAuthenticated: true },
    login: jest.fn(),
    logout: jest.fn(),
  });
});
```

---

## Async Testing Issues

### Issue: Act Warning

**Symptoms:**
```
Warning: An update to Component inside a test was not wrapped in act(...)
```

**Solution 1 - Use waitFor:**
```typescript
// ❌ Bad
it('test', async () => {
  const { result } = renderHook(() => useData());
  await new Promise(resolve => setTimeout(resolve, 100));
  expect(result.current.data).toBeDefined();
});

// ✅ Good
it('test', async () => {
  const { result } = renderHook(() => useData());
  await waitFor(() => {
    expect(result.current.data).toBeDefined();
  });
});
```

**Solution 2 - Wrap in act:**
```typescript
import { act } from '@testing-library/react-native';

it('test', async () => {
  const { result } = renderHook(() => useCounter());

  await act(async () => {
    await result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

---

### Issue: Promise Not Resolving

**Symptoms:**
```
Test times out waiting for promise
```

**Solution:**
```typescript
// ❌ Bad - promise never resolves
(apiClient.get as jest.Mock).mockImplementation(
  () => new Promise(() => {}) // Never resolves!
);

// ✅ Good - promise resolves
(apiClient.get as jest.Mock).mockResolvedValue({
  success: true,
  data: mockData,
});

// Or reject
(apiClient.get as jest.Mock).mockRejectedValue(
  new Error('Network error')
);
```

---

### Issue: Race Conditions

**Symptoms:**
```
Tests pass individually but fail when run together
```

**Solution:**
```typescript
// Use proper cleanup
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Wait for all async operations
afterEach(async () => {
  await waitFor(() => {
    // Ensure all promises resolved
  });
});
```

---

## Component Testing Issues

### Issue: Element Not Found

**Symptoms:**
```
Unable to find an element with testID: "submit-button"
```

**Solution 1 - Check testID:**
```typescript
// Component
<TouchableOpacity testID="submit-button">
  <Text>Submit</Text>
</TouchableOpacity>

// Test
const { getByTestId } = render(<Component />);
expect(getByTestId('submit-button')).toBeTruthy();
```

**Solution 2 - Wait for element:**
```typescript
// ❌ Bad - element not rendered yet
const { getByTestId } = render(<Component />);
expect(getByTestId('loading-spinner')).toBeTruthy();

// ✅ Good - wait for element
const { getByTestId } = render(<Component />);
await waitFor(() => {
  expect(getByTestId('loading-spinner')).toBeTruthy();
});
```

**Solution 3 - Use debug:**
```typescript
const { debug } = render(<Component />);
debug(); // See what's actually rendered
```

---

### Issue: fireEvent Not Working

**Symptoms:**
```
Event handler not triggered
```

**Solution:**
```typescript
// ❌ Bad - wrong event
fireEvent.click(button); // This is for web!

// ✅ Good - use press for React Native
fireEvent.press(button);

// For text input
fireEvent.changeText(input, 'new value');
```

---

### Issue: Modal Not Testable

**Symptoms:**
```
Cannot find elements inside modal
```

**Solution:**
```typescript
// ❌ Bad - modal not in test tree
const { getByText } = render(<App />);
expect(getByText('Modal Content')).toBeTruthy();

// ✅ Good - include modal in render
const { getByText } = render(
  <ModalProvider>
    <App />
  </ModalProvider>
);

// Or test modal directly
const { getByText } = render(
  <Modal visible={true}>
    <Text>Modal Content</Text>
  </Modal>
);
```

---

## Integration Testing Issues

### Issue: API Calls Not Mocked

**Symptoms:**
```
Error: Network request failed
```

**Solution:**
```typescript
// Mock at the beginning
jest.mock('@/services/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Setup in beforeEach
beforeEach(() => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    success: true,
    data: [],
  });
});
```

---

### Issue: State Not Persisting

**Symptoms:**
```
State changes don't persist between actions
```

**Solution:**
```typescript
// Wrap in provider
const { getByText, getByTestId } = render(
  <AuthProvider>
    <CartProvider>
      <Component />
    </CartProvider>
  </AuthProvider>
);

// Wait for state updates
await waitFor(() => {
  expect(getByText('2 items')).toBeTruthy();
});
```

---

## E2E Testing Issues

### Issue: Detox Not Finding Element

**Symptoms:**
```
Error: Cannot find element with testID: "login-button"
```

**Solution 1 - Wait for element:**
```javascript
// ❌ Bad
await element(by.id('login-button')).tap();

// ✅ Good
await waitFor(element(by.id('login-button')))
  .toBeVisible()
  .withTimeout(5000);
await element(by.id('login-button')).tap();
```

**Solution 2 - Scroll to element:**
```javascript
await element(by.id('scroll-view')).scroll(300, 'down');
await waitFor(element(by.id('bottom-button')))
  .toBeVisible()
  .withTimeout(2000);
```

---

### Issue: Detox Test Flaky

**Symptoms:**
```
Test passes sometimes, fails other times
```

**Solution:**
```javascript
// Add explicit waits
await new Promise(resolve => setTimeout(resolve, 1000));

// Wait for loading to complete
await waitFor(element(by.id('loading')))
  .not.toBeVisible()
  .withTimeout(10000);

// Use device.reloadReactNative() between tests
beforeEach(async () => {
  await device.reloadReactNative();
});
```

---

### Issue: Detox Build Fails

**Symptoms:**
```
Error: Build failed
```

**Solution for iOS:**
```bash
# Clean build
cd ios
rm -rf build
pod install
cd ..

# Rebuild
detox build --configuration ios.sim.debug
```

**Solution for Android:**
```bash
# Clean
cd android
./gradlew clean
cd ..

# Rebuild
detox build --configuration android.emu.debug
```

---

## Performance Issues

### Issue: Tests Running Slowly

**Symptoms:**
```
Test suite takes over 5 minutes
```

**Solution 1 - Use maxWorkers:**
```bash
npm test -- --maxWorkers=4
```

**Solution 2 - Run tests in parallel:**
```javascript
// jest.config.js
module.exports = {
  maxWorkers: '50%',
};
```

**Solution 3 - Skip slow tests locally:**
```typescript
describe.skip('Slow E2E tests', () => {
  // These run in CI only
});
```

---

### Issue: Memory Leak in Tests

**Symptoms:**
```
JavaScript heap out of memory
```

**Solution:**
```bash
# Increase memory
NODE_OPTIONS=--max-old-space-size=4096 npm test

# Or in package.json
"scripts": {
  "test": "NODE_OPTIONS=--max-old-space-size=4096 jest"
}
```

**Solution 2 - Cleanup:**
```typescript
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  cleanup();
});
```

---

## Platform-Specific Issues

### iOS-Specific Issues

**Issue: Xcode Build Fails**
```bash
# Solution
cd ios
pod install
cd ..
npm run ios
```

**Issue: Simulator Not Found**
```bash
# List available simulators
xcrun simctl list devices

# Use specific device
npm run ios --simulator="iPhone 14"
```

---

### Android-Specific Issues

**Issue: Gradle Build Fails**
```bash
# Solution
cd android
./gradlew clean
./gradlew build
cd ..
```

**Issue: Emulator Not Starting**
```bash
# List emulators
emulator -list-avds

# Start emulator
emulator -avd Pixel_5_API_31
```

---

## Coverage Issues

### Issue: Coverage Below Threshold

**Symptoms:**
```
Coverage for lines (65%) does not meet threshold (70%)
```

**Solution:**
```bash
# Identify uncovered files
npm run test:coverage -- --verbose

# View coverage report
open coverage/lcov-report/index.html

# Add tests for uncovered files
```

---

### Issue: Coverage Report Incorrect

**Symptoms:**
```
Coverage shows 0% for tested files
```

**Solution:**
```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
  ],
};
```

---

## Flaky Tests

### Identifying Flaky Tests

```bash
# Run test multiple times
for i in {1..10}; do npm test -- flaky.test.ts; done

# Or use --runInBand for deterministic order
npm test -- --runInBand
```

### Common Causes

**1. Timing Issues**
```typescript
// ❌ Bad
await new Promise(resolve => setTimeout(resolve, 100));

// ✅ Good
await waitFor(() => {
  expect(result).toBeDefined();
});
```

**2. Shared State**
```typescript
// ❌ Bad
const sharedCart = new Cart();

it('test 1', () => {
  sharedCart.add(item); // Affects other tests!
});

// ✅ Good
it('test 1', () => {
  const cart = new Cart(); // Fresh instance
  cart.add(item);
});
```

**3. Test Order Dependency**
```typescript
// ❌ Bad
it('creates user', () => {
  user = createUser();
});

it('updates user', () => {
  updateUser(user); // Depends on previous test!
});

// ✅ Good
it('updates user', () => {
  const user = createUser(); // Independent
  updateUser(user);
});
```

---

## Debug Techniques

### Technique 1: Use debug()

```typescript
it('test', () => {
  const { debug } = render(<Component />);
  debug(); // Prints component tree
});
```

### Technique 2: console.log

```typescript
it('test', async () => {
  const result = await fetchData();
  console.log('Result:', result); // See actual data
  expect(result).toBeDefined();
});
```

### Technique 3: Run Single Test

```bash
# Run one test
npm test -- -t "specific test name"

# Run one file
npm test -- path/to/test.test.ts

# Run with verbose output
npm test -- --verbose
```

### Technique 4: Debug in VS Code

```json
// .vscode/launch.json
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
```

### Technique 5: Check Mock Calls

```typescript
it('test', () => {
  mockFn();

  // See what was called
  console.log(mockFn.mock.calls);
  console.log(mockFn.mock.results);

  expect(mockFn).toHaveBeenCalled();
});
```

### Technique 6: Increase Timeouts

```typescript
// For specific test
it('slow test', async () => {
  // Test code
}, 30000); // 30 seconds

// For all tests in describe
describe('slow tests', () => {
  jest.setTimeout(30000);

  it('test 1', async () => {});
  it('test 2', async () => {});
});
```

---

## Quick Troubleshooting Checklist

### When a Test Fails

1. **Read the error message carefully**
   - What failed?
   - What was expected vs received?

2. **Check test setup**
   - [ ] Are mocks configured?
   - [ ] Is cleanup happening?
   - [ ] Are dependencies installed?

3. **Verify the code**
   - [ ] Does the code work manually?
   - [ ] Are there typos?
   - [ ] Is logic correct?

4. **Isolate the issue**
   - [ ] Run test alone
   - [ ] Remove other tests
   - [ ] Simplify test case

5. **Check for common issues**
   - [ ] Missing await
   - [ ] Wrong mock setup
   - [ ] State pollution
   - [ ] Timing issues

6. **Debug**
   - [ ] Add console.log
   - [ ] Use debug()
   - [ ] Check mock calls
   - [ ] Increase timeout

7. **Search for solutions**
   - [ ] Check this guide
   - [ ] Search error message
   - [ ] Check Jest docs
   - [ ] Ask team

---

## Getting Help

### Internal Resources

1. **Check Documentation**
   - [TESTING_GUIDE_MASTER.md](./TESTING_GUIDE_MASTER.md)
   - [TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md)
   - [TESTING_WORKFLOW.md](./TESTING_WORKFLOW.md)

2. **Review Examples**
   - Browse `__tests__/` directory
   - Look at similar tests
   - Check test utilities

3. **Ask the Team**
   - Post in testing channel
   - Pair with another developer
   - Schedule code review

### External Resources

- **Jest Documentation**: https://jestjs.io/docs/troubleshooting
- **Testing Library**: https://testing-library.com/docs/react-native-testing-library/intro
- **Stack Overflow**: Search for error messages
- **GitHub Issues**: Check jest and testing-library repos

---

## Conclusion

Most testing issues fall into these categories:

1. **Configuration**: Jest setup issues
2. **Mocking**: Incorrect mocks
3. **Async**: Not handling promises correctly
4. **Timing**: Race conditions and delays
5. **State**: Shared state between tests

**Remember**: When stuck, start simple and gradually add complexity. Isolate the problem before fixing it.

---

**Last Updated**: November 11, 2025
**Maintainers**: Rez App Testing Team

Have a question not covered here? Open an issue or contact the testing team!
