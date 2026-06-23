# E2E Testing Guide for Rez App

Comprehensive guide for End-to-End testing using Detox.

## Quick Start

### Setup

```bash
# Install Detox CLI
npm install -g detox-cli

# Install dependencies
npm install

# iOS: Install applesimutils (macOS only)
brew tap wix/brew
brew install applesimutils

# Build for testing
npm run test:e2e:build:ios  # iOS
npm run test:e2e:build:android  # Android
```

### Run Tests

```bash
# Run all E2E tests
npm run test:e2e  # iOS
npm run test:e2e:android  # Android

# Run specific test file
detox test e2e/shopping.e2e.js --configuration ios.sim.debug

# Run with verbose logging
detox test --configuration ios.sim.debug --loglevel verbose
```

## Test Coverage

| Test Suite | File | Description | Test Count |
|------------|------|-------------|------------|
| Onboarding | `onboarding.e2e.js` | Splash, registration, login flows | 20+ |
| Homepage | `homepage.e2e.js` | Homepage navigation, content display | 25+ |
| Shopping | `shopping.e2e.js` | Complete shopping journey | 50+ |
| Earning | `earning.e2e.js` | Bill upload, tasks, referrals | 45+ |
| Social | `social.e2e.js` | Videos, UGC upload, interactions | 60+ |
| Account | `account.e2e.js` | Profile, settings, addresses | 50+ |
| Edge Cases | `edge-cases.e2e.js` | Errors, offline, validation | 30+ |
| Performance | `performance.e2e.js` | Speed, memory, efficiency | 25+ |

**Total: 300+ E2E tests**

## Test Structure

```
e2e/
├── helpers/
│   └── testHelpers.ts       # Reusable functions
├── onboarding.e2e.js       # Onboarding tests
├── homepage.e2e.js         # Homepage tests
├── shopping.e2e.js         # Shopping journey
├── earning.e2e.js          # Earning journey
├── social.e2e.js           # Social/UGC features
├── account.e2e.js          # Account management
├── edge-cases.e2e.js       # Error scenarios
└── performance.e2e.js      # Performance tests
```

## Helper Functions

Located in `e2e/helpers/testHelpers.ts`:

```javascript
// Navigation
await waitForElement(by.id('element-id'), timeout);
await tapElement(by.id('button-id'));

// Input
await typeText(by.id('input-id'), 'text');
await clearText(by.id('input-id'));
await replaceText(by.id('input-id'), 'new text');

// Scroll
await scrollToElement(scrollView, element, 'down');
await swipeElement(element, 'left', 'fast');

// Utilities
await takeScreenshot('name');
await login(phone, otp);
await logout();
```

## Writing New Tests

### 1. Add TestIDs to Components

```tsx
<TouchableOpacity testID="add-to-cart-button">
  <Text>Add to Cart</Text>
</TouchableOpacity>
```

### 2. Write Test

```javascript
describe('Feature E2E', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should perform action', async () => {
    await waitForElement(by.id('home-screen'), 5000);
    await tapElement(by.id('button-id'));
    await waitForElement(by.id('result'), 2000);
    await detoxExpect(element(by.id('result'))).toBeVisible();
    await takeScreenshot('test-result');
  });
});
```

### 3. Run Test

```bash
detox test e2e/feature.e2e.js --configuration ios.sim.debug
```

## Debugging

### Take Screenshots

```javascript
await takeScreenshot('step-01-initial');
await tapElement(by.id('button'));
await takeScreenshot('step-02-after-tap');
```

Screenshots saved to `artifacts/` directory.

### Verbose Logging

```bash
detox test --configuration ios.sim.debug --loglevel verbose
```

### Keep Simulator Open

```bash
detox test --configuration ios.sim.debug --debug-synchronization 10000
```

### Check Element Existence

```javascript
const exists = await element(by.id('element')).exists();
console.log(`Element exists: ${exists}`);
```

## Common Issues

### Element Not Found
- Verify testID is correct
- Increase timeout
- Scroll to element if in ScrollView

```javascript
await element(by.id('scroll-view')).scroll(300, 'down');
await waitForElement(by.id('element'), 5000);
```

### Test Timeout
- Increase timeouts
- Add intermediate waits
- Check network requests

```javascript
await tapElement(by.id('submit'));
await new Promise(resolve => setTimeout(resolve, 2000));
await waitForElement(by.id('success'), 5000);
```

### Flaky Tests
- Add explicit waits
- Wait for loading to complete

```javascript
await waitFor(element(by.id('loading')))
  .not.toBeVisible()
  .withTimeout(10000);
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests
on: [pull_request, push]

jobs:
  e2e:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm install -g detox-cli
      - run: brew tap wix/brew && brew install applesimutils
      - run: npm run test:e2e:build:ios
      - run: npm run test:e2e -- --headless
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: detox-artifacts
          path: frontend/artifacts/
```

## Performance Thresholds

Defined in `performance.e2e.js`:

```javascript
const THRESHOLDS = {
  APP_LAUNCH: 3000,        // 3 seconds
  SCREEN_TRANSITION: 1000, // 1 second
  IMAGE_LOAD: 2000,        // 2 seconds
  SEARCH: 1500,            // 1.5 seconds
};
```

Run separately:

```bash
detox test e2e/performance.e2e.js --configuration ios.sim.release
```

## Best Practices

1. **Use meaningful testIDs**: `add-to-cart-button` not `btn1`
2. **Wait for elements**: Always use `waitForElement` before interactions
3. **Independent tests**: Each test should reset to known state
4. **Descriptive names**: `should add product to cart and show success`
5. **Take screenshots**: Capture evidence at key points
6. **Handle async**: Always await promises
7. **Clean up**: Remove test data after tests

## Useful Commands

```bash
# List configurations
detox test --help

# Run specific configuration
detox test --configuration <config-name>

# Run with artifacts
detox test --artifacts-location ./test-artifacts

# Run tests matching pattern
detox test --grep "Shopping"

# Clean cache
detox clean-framework-cache
```

## Test Data

### Test Accounts

```javascript
const TEST_USERS = {
  standard: { phone: '+919876543210', otp: '123456' },
  premium: { phone: '+919876543211', otp: '123456' },
  new: { phone: '+919876543212', otp: '123456' },
};
```

## Resources

- [Detox Documentation](https://wix.github.io/Detox/)
- [API Reference](https://wix.github.io/Detox/docs/api/actions)
- [Troubleshooting Guide](https://wix.github.io/Detox/docs/troubleshooting)

## Support

1. Check this guide
2. Review test implementations for examples
3. Check Detox documentation
4. Contact development team

---

**Last Updated**: Phase 3 - E2E Testing Implementation
