# Testing Workflow Guide

**Complete development and testing workflow for the Rez App**

---

## Table of Contents

1. [Overview](#overview)
2. [Development Workflow](#development-workflow)
3. [Pre-Commit Testing](#pre-commit-testing)
4. [Local Development Testing](#local-development-testing)
5. [Pull Request Testing](#pull-request-testing)
6. [CI/CD Pipeline](#cicd-pipeline)
7. [Deployment Testing](#deployment-testing)
8. [Production Monitoring](#production-monitoring)
9. [Test-Driven Development](#test-driven-development)
10. [Debugging Workflow](#debugging-workflow)

---

## Overview

This guide describes the complete testing workflow from local development to production deployment. Following this workflow ensures high-quality, reliable code at every stage.

### Workflow Stages

```
┌──────────────────────────────────────────────────────────┐
│              Testing Workflow Stages                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  1. Local Development                                    │
│     └─ Write code + tests → Run tests → Debug           │
│                                                           │
│  2. Pre-Commit                                           │
│     └─ Lint → Type Check → Test Changed Files           │
│                                                           │
│  3. Pull Request                                         │
│     └─ All Unit Tests → Integration Tests → Coverage    │
│                                                           │
│  4. Main Branch                                          │
│     └─ Full Test Suite → E2E Tests → Build              │
│                                                           │
│  5. Staging                                              │
│     └─ Smoke Tests → Integration Tests → Manual QA      │
│                                                           │
│  6. Production                                           │
│     └─ Health Checks → Monitoring → Error Tracking      │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Development Workflow

### Step 1: Create Feature Branch

```bash
# Create branch from main
git checkout main
git pull origin main
git checkout -b feature/new-feature

# Or for bug fixes
git checkout -b fix/bug-description
```

### Step 2: Write Tests First (TDD)

```typescript
// __tests__/features/newFeature.test.ts

describe('NewFeature', () => {
  it('should do something', () => {
    // This test will fail initially
    const result = newFeature();
    expect(result).toBe('expected');
  });
});
```

### Step 3: Run Tests in Watch Mode

```bash
# Start watch mode
npm run test:watch

# Jest will automatically re-run tests as you code
```

### Step 4: Implement Feature

```typescript
// src/features/newFeature.ts

export const newFeature = () => {
  // Implement to make tests pass
  return 'expected';
};
```

### Step 5: Verify All Tests Pass

```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage
```

### Step 6: Commit Changes

```bash
# Stage changes
git add .

# Commit (triggers pre-commit hooks)
git commit -m "feat: add new feature"
```

---

## Pre-Commit Testing

### Automatic Checks

When you commit, these checks run automatically:

```
┌─────────────────────────────────────┐
│       Pre-Commit Hooks              │
├─────────────────────────────────────┤
│                                     │
│  1. Linting (ESLint)                │
│     • Check code style              │
│     • Fix auto-fixable issues       │
│                                     │
│  2. Type Checking (TypeScript)      │
│     • Verify type safety            │
│     • Check for type errors         │
│                                     │
│  3. Unit Tests (Changed Files)      │
│     • Run tests for modified files  │
│     • Ensure existing tests pass    │
│                                     │
│  4. Format Check (Prettier)         │
│     • Format code automatically     │
│                                     │
└─────────────────────────────────────┘
```

### Pre-Commit Hook Setup

Install husky for pre-commit hooks:

```bash
npm install --save-dev husky lint-staged

# Initialize husky
npx husky install
```

Configure in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

### Manual Pre-Commit Checks

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Run tests for changed files
npm test -- --onlyChanged

# All checks
npm run lint && npx tsc --noEmit && npm test
```

---

## Local Development Testing

### Test-Driven Development (TDD)

#### Red-Green-Refactor Cycle

```
┌─────────────────────────────────────┐
│    TDD: Red-Green-Refactor Cycle    │
├─────────────────────────────────────┤
│                                     │
│  RED: Write failing test            │
│    ↓                                │
│  GREEN: Make test pass              │
│    ↓                                │
│  REFACTOR: Improve code             │
│    ↓                                │
│  Repeat                             │
│                                     │
└─────────────────────────────────────┘
```

#### Example TDD Workflow

```typescript
// 1. RED: Write failing test
describe('calculateDiscount', () => {
  it('should apply 10% discount correctly', () => {
    expect(calculateDiscount(1000, 10)).toBe(900);
  });
});

// Run test → FAILS ❌

// 2. GREEN: Implement minimum code to pass
const calculateDiscount = (price: number, percent: number) => {
  return price * (1 - percent / 100);
};

// Run test → PASSES ✅

// 3. REFACTOR: Improve implementation
const calculateDiscount = (price: number, percent: number) => {
  if (price < 0) throw new Error('Price cannot be negative');
  if (percent < 0 || percent > 100) throw new Error('Invalid discount');
  return price * (1 - percent / 100);
};

// Add tests for edge cases
it('should handle negative price', () => {
  expect(() => calculateDiscount(-100, 10)).toThrow();
});

// Run tests → ALL PASS ✅
```

### Watch Mode Development

```bash
# Start watch mode
npm run test:watch

# Watch only tests related to changed files
npm run test:watch -- --onlyChanged

# Watch specific test file
npm run test:watch -- validation.test.ts
```

### Interactive Watch Mode

```
Watch Usage
 › Press f to run only failed tests.
 › Press o to only run tests related to changed files.
 › Press p to filter by a filename regex pattern.
 › Press t to filter by a test name regex pattern.
 › Press q to quit watch mode.
 › Press Enter to trigger a test run.
```

### Coverage During Development

```bash
# Generate coverage report
npm run test:coverage

# Watch mode with coverage
npm run test:watch -- --coverage

# Open coverage report
open coverage/lcov-report/index.html
```

---

## Pull Request Testing

### Before Creating PR

```bash
# 1. Update from main
git checkout main
git pull origin main
git checkout feature/your-branch
git rebase main

# 2. Run full test suite
npm test

# 3. Check coverage
npm run test:coverage

# 4. Run linter
npm run lint

# 5. Type check
npx tsc --noEmit

# 6. Build check
npm run build
```

### PR Checklist

Create PR with this checklist:

```markdown
## Testing Checklist

- [ ] All existing tests pass
- [ ] New tests added for new features
- [ ] Coverage hasn't decreased
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Integration tests added (if needed)
- [ ] E2E tests added (if needed)
- [ ] Manual testing completed
- [ ] No console.log or debugging code
- [ ] Documentation updated

## Test Results

```
Test Suites: 129 passed, 129 total
Tests:       1250 passed, 1250 total
Coverage:    72.45%
```

### Automated PR Checks

When you create a PR, these run automatically:

```
┌─────────────────────────────────────────┐
│        Automated PR Checks              │
├─────────────────────────────────────────┤
│                                         │
│  ✓ Linting                              │
│  ✓ Type Checking                        │
│  ✓ Unit Tests (All)                     │
│  ✓ Integration Tests                    │
│  ✓ Coverage Report                      │
│  ✓ Bundle Size Check                    │
│  ✓ Accessibility Tests                  │
│                                         │
│  Duration: ~5 minutes                   │
│                                         │
└─────────────────────────────────────────┘
```

### PR Testing Requirements

Your PR must meet these criteria:

1. **All Tests Pass**: 100% pass rate required
2. **Coverage Maintained**: Coverage must not decrease
3. **New Tests Added**: New features must have tests
4. **No Type Errors**: TypeScript must compile
5. **Linting Passes**: No ESLint errors
6. **Build Succeeds**: Code must build successfully

### Reviewing PRs

When reviewing PRs, check:

```markdown
## Code Review Testing Checklist

### Test Quality
- [ ] Tests are clear and well-named
- [ ] Tests follow AAA pattern
- [ ] Tests are independent
- [ ] Edge cases covered
- [ ] Error scenarios tested
- [ ] No flaky tests

### Test Coverage
- [ ] New code is tested
- [ ] Critical paths covered
- [ ] Coverage reports look good

### Test Types
- [ ] Appropriate test types used
- [ ] Unit tests for utilities
- [ ] Integration tests for flows
- [ ] E2E tests for critical paths

### Implementation
- [ ] Tests actually test the code
- [ ] Mocks are appropriate
- [ ] Test data is realistic
- [ ] No implementation details tested
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml

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

      - name: Lint
        run: npm run lint

      - name: Type Check
        run: npx tsc --noEmit

      - name: Run Unit Tests
        run: npm test -- --coverage --maxWorkers=2

      - name: Run Integration Tests
        run: npm test -- __tests__/integration --maxWorkers=2

      - name: Upload Coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Check Coverage Threshold
        run: |
          coverage=$(grep -oP '(?<=All files\s+\|\s+)\d+\.\d+' coverage/coverage-summary.json)
          if (( $(echo "$coverage < 70" | bc -l) )); then
            echo "Coverage $coverage% is below threshold 70%"
            exit 1
          fi
```

### Pipeline Stages

```
┌───────────────────────────────────────────────────────┐
│              CI/CD Pipeline Stages                     │
├───────────────────────────────────────────────────────┤
│                                                        │
│  Stage 1: Code Quality                                │
│  ├─ Lint (30s)                                        │
│  ├─ Type Check (45s)                                  │
│  └─ Format Check (15s)                                │
│                                                        │
│  Stage 2: Unit Tests                                  │
│  ├─ Utils Tests (20s)                                 │
│  ├─ Hooks Tests (30s)                                 │
│  ├─ Services Tests (25s)                              │
│  ├─ Components Tests (40s)                            │
│  └─ Coverage Report (10s)                             │
│                                                        │
│  Stage 3: Integration Tests                           │
│  ├─ User Flows (45s)                                  │
│  ├─ API Integration (30s)                             │
│  ├─ State Management (25s)                            │
│  └─ Component Integration (35s)                       │
│                                                        │
│  Stage 4: E2E Tests (Main branch only)                │
│  ├─ Critical Flows (5min)                             │
│  ├─ Payment Flows (3min)                              │
│  └─ User Journeys (4min)                              │
│                                                        │
│  Stage 5: Build & Deploy                              │
│  ├─ Build App (2min)                                  │
│  ├─ Deploy to Staging (1min)                          │
│  └─ Smoke Tests (1min)                                │
│                                                        │
│  Total Duration: 5-20 minutes (varies by branch)      │
│                                                        │
└───────────────────────────────────────────────────────┘
```

### Parallel Test Execution

```yaml
# Run tests in parallel for faster feedback

jobs:
  test-unit:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-group: [utils, hooks, services, components]
    steps:
      - name: Run ${{ matrix.test-group }} tests
        run: npm test -- __tests__/${{ matrix.test-group }}

  test-integration:
    runs-on: ubuntu-latest
    steps:
      - name: Run integration tests
        run: npm test -- __tests__/integration

  test-e2e:
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Deployment Testing

### Staging Environment

```
┌────────────────────────────────────────┐
│       Staging Test Workflow            │
├────────────────────────────────────────┤
│                                        │
│  1. Automated Smoke Tests              │
│     ├─ App launches                    │
│     ├─ Authentication works            │
│     ├─ Key pages load                  │
│     └─ API connectivity                │
│                                        │
│  2. Integration Tests                  │
│     ├─ Real backend APIs               │
│     ├─ Database operations             │
│     ├─ External services               │
│     └─ Payment gateway (test mode)     │
│                                        │
│  3. Manual QA                          │
│     ├─ Critical user flows             │
│     ├─ New features                    │
│     ├─ Bug fixes verification          │
│     └─ Edge cases                      │
│                                        │
│  4. Performance Tests                  │
│     ├─ Load time                       │
│     ├─ API response time               │
│     ├─ Memory usage                    │
│     └─ Network efficiency              │
│                                        │
└────────────────────────────────────────┘
```

### Staging Test Script

```bash
#!/bin/bash
# scripts/test-staging.sh

echo "Running staging tests..."

# 1. Smoke tests
echo "1. Running smoke tests..."
npm run test:e2e -- e2e/smoke.e2e.js

# 2. Critical flows
echo "2. Testing critical flows..."
npm run test:e2e -- e2e/critical-flows.e2e.js

# 3. Integration tests against staging API
echo "3. Running integration tests..."
API_URL=https://staging-api.rezapp.com npm test -- __tests__/integration

# 4. Performance check
echo "4. Running performance tests..."
npm run test:e2e -- e2e/performance.e2e.js

echo "Staging tests complete!"
```

### Production Release Checklist

Before releasing to production:

```markdown
## Production Release Checklist

### Pre-Release Testing
- [ ] All unit tests pass (100%)
- [ ] All integration tests pass (100%)
- [ ] All E2E tests pass (100%)
- [ ] Staging tests completed
- [ ] Performance tests passed
- [ ] Security scan completed
- [ ] Accessibility audit passed
- [ ] Cross-platform testing done
- [ ] Load testing completed
- [ ] Backup and rollback plan ready

### Release Verification
- [ ] Version number updated
- [ ] Changelog updated
- [ ] Release notes prepared
- [ ] Stakeholders notified
- [ ] Monitoring alerts configured
- [ ] Error tracking enabled

### Post-Release
- [ ] Smoke tests in production
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify critical flows
- [ ] User feedback review
```

---

## Production Monitoring

### Health Checks

```typescript
// Production health check endpoints

// 1. Basic health check
GET /health
Response: { status: 'ok', timestamp: '2025-11-11T10:00:00Z' }

// 2. Detailed health check
GET /health/detailed
Response: {
  status: 'ok',
  services: {
    database: 'ok',
    redis: 'ok',
    payment: 'ok'
  },
  metrics: {
    responseTime: '45ms',
    errorRate: '0.01%',
    uptime: '99.99%'
  }
}
```

### Monitoring Dashboard

```
┌────────────────────────────────────────────────────┐
│           Production Monitoring                     │
├────────────────────────────────────────────────────┤
│                                                     │
│  Error Rate:        0.05% ✓                        │
│  Response Time:     120ms ✓                        │
│  Uptime:            99.98% ✓                       │
│  Active Users:      15,420                         │
│                                                     │
│  Critical Alerts:   0                              │
│  Warnings:          2                              │
│                                                     │
│  Recent Deployments:                               │
│  ├─ v2.1.0 - 2 hours ago ✓                        │
│  ├─ v2.0.9 - 1 day ago ✓                          │
│  └─ v2.0.8 - 3 days ago ✓                         │
│                                                     │
└────────────────────────────────────────────────────┘
```

### Error Tracking

```typescript
// Sentry error tracking setup

import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter out non-critical errors
    if (event.level === 'info') {
      return null;
    }
    return event;
  },
});

// Track test failures
Sentry.captureException(new Error('Test failed in production'));
```

### Automated Alerts

```yaml
# Alert configuration
alerts:
  - name: High Error Rate
    condition: error_rate > 1%
    action: Send notification to team
    severity: critical

  - name: Slow Response Time
    condition: avg_response_time > 500ms
    action: Send notification to team
    severity: warning

  - name: Test Failure
    condition: test_failure_rate > 5%
    action: Trigger investigation
    severity: high
```

---

## Test-Driven Development

### TDD Workflow

```
1. Add a test
   ↓
2. Run tests (should fail)
   ↓
3. Write minimal code to pass
   ↓
4. Run tests (should pass)
   ↓
5. Refactor
   ↓
6. Run tests (should still pass)
   ↓
7. Repeat
```

### TDD Example: Shopping Cart

```typescript
// Step 1: Write failing test
describe('ShoppingCart', () => {
  it('should add item to cart', () => {
    const cart = new ShoppingCart();
    const item = createMockProduct();

    cart.addItem(item);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]).toEqual(item);
  });
});

// Step 2: Run test → FAILS ❌

// Step 3: Implement minimum code
class ShoppingCart {
  items: Product[] = [];

  addItem(item: Product) {
    this.items.push(item);
  }
}

// Step 4: Run test → PASSES ✅

// Step 5: Add more tests
it('should calculate total price', () => {
  const cart = new ShoppingCart();
  cart.addItem(createMockProduct({ price: 1000 }));
  cart.addItem(createMockProduct({ price: 500 }));

  expect(cart.getTotal()).toBe(1500);
});

// Step 6: Implement
class ShoppingCart {
  items: Product[] = [];

  addItem(item: Product) {
    this.items.push(item);
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}

// Step 7: Refactor and repeat
```

### Benefits of TDD

1. **Better Design**: Tests force you to think about API design
2. **Fewer Bugs**: Bugs are caught early
3. **Confidence**: Refactor with confidence
4. **Documentation**: Tests serve as documentation
5. **Fast Feedback**: Know immediately when something breaks

---

## Debugging Workflow

### When Tests Fail

```
1. Read the error message carefully
   ↓
2. Check which assertion failed
   ↓
3. Review test setup and mocks
   ↓
4. Add console.log to debug
   ↓
5. Run single test in isolation
   ↓
6. Check for state pollution
   ↓
7. Verify mocks are correct
   ↓
8. Fix the issue
   ↓
9. Remove debug code
   ↓
10. Verify all tests pass
```

### Debugging Commands

```bash
# Run single test
npm test -- -t "test name"

# Run with verbose output
npm test -- --verbose

# Run in debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Run specific file
npm test -- path/to/test.test.ts

# Show console.log output
npm test -- --silent=false
```

### Common Issues and Solutions

See [TESTING_TROUBLESHOOTING.md](./TESTING_TROUBLESHOOTING.md) for detailed troubleshooting guide.

---

## Quick Reference

### Daily Development

```bash
# Start watch mode
npm run test:watch

# Test changed files only
npm test -- --onlyChanged

# Run specific test
npm test -- validation.test.ts
```

### Before Committing

```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

### Before Creating PR

```bash
# Full test suite
npm test

# Integration tests
npm test -- __tests__/integration

# E2E tests (optional)
npm run test:e2e:build:ios
npm run test:e2e
```

### After PR Approved

```bash
# Merge and deploy
git checkout main
git merge --no-ff feature/your-branch
git push origin main

# Monitor CI/CD pipeline
# Check staging deployment
# Verify production metrics
```

---

## Conclusion

Following this workflow ensures:

- **High Quality**: Comprehensive testing at every stage
- **Fast Feedback**: Early detection of issues
- **Confidence**: Safe refactoring and deployments
- **Reliability**: Consistent, predictable releases

**Remember**: Testing is not just about finding bugs—it's about building confidence in your code.

---

**Related Documentation**:
- [TESTING_GUIDE_MASTER.md](./TESTING_GUIDE_MASTER.md)
- [TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md)
- [TESTING_TROUBLESHOOTING.md](./TESTING_TROUBLESHOOTING.md)

**Last Updated**: November 11, 2025
