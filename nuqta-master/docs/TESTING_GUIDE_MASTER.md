# Rez App - Master Testing Guide

**Version:** 1.0.0
**Last Updated:** November 11, 2025
**Status:** Phase 4 Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Strategy](#testing-strategy)
3. [Quick Navigation](#quick-navigation)
4. [Test Type Distribution](#test-type-distribution)
5. [Getting Started](#getting-started)
6. [Test Pyramid](#test-pyramid)
7. [Critical Paths](#critical-paths)
8. [Coverage Standards](#coverage-standards)
9. [CI/CD Pipeline](#cicd-pipeline)
10. [Related Documentation](#related-documentation)
11. [Support](#support)

---

## Overview

This master guide provides a comprehensive overview of the testing infrastructure for the Rez App. Whether you're a new developer getting started with testing or an experienced developer looking for specific guidance, this guide will direct you to the right resources.

### Testing Philosophy

Our testing approach is built on these principles:

- **Quality First**: Comprehensive testing ensures reliability and user satisfaction
- **Fast Feedback**: Tests should run quickly to enable rapid iteration
- **Confidence**: High test coverage gives confidence for refactoring and new features
- **Maintainability**: Tests should be easy to understand and update
- **Real-World Focus**: Tests should reflect actual user behavior

### Test Infrastructure

- **Total Tests**: 300+ across all types
- **Framework**: Jest + React Native Testing Library + Detox
- **Coverage**: 70%+ across critical modules
- **CI/CD**: Automated testing on every PR and commit

---

## Testing Strategy

### The Three Pillars

#### 1. Unit Testing (70% of tests)
- **Purpose**: Test individual functions, hooks, and components in isolation
- **Speed**: Very fast (<1ms per test)
- **Coverage**: 80%+ for utilities and services
- **Documentation**: [UNIT_TESTING_GUIDE.md](./UNIT_TESTING_GUIDE.md)

#### 2. Integration Testing (20% of tests)
- **Purpose**: Test how different parts of the app work together
- **Speed**: Moderate (100-500ms per test)
- **Coverage**: 75%+ for critical integrations
- **Documentation**: [INTEGRATION_TESTING_GUIDE.md](./INTEGRATION_TESTING_GUIDE.md)

#### 3. End-to-End Testing (10% of tests)
- **Purpose**: Test complete user journeys
- **Speed**: Slower (2-10s per test)
- **Coverage**: All critical user flows
- **Documentation**: [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)

### Additional Testing

#### Accessibility Testing
- **Manual Testing**: VoiceOver and TalkBack
- **Automated Testing**: Jest accessibility matchers
- **Documentation**: [ACCESSIBILITY_TESTING_GUIDE.md](./ACCESSIBILITY_TESTING_GUIDE.md)

#### Performance Testing
- **Load Time**: App launch and screen transitions
- **Memory Usage**: Memory profiling and leak detection
- **Network**: API response times and bandwidth
- **Documentation**: Covered in E2E guide

---

## Quick Navigation

### For New Developers

Start here if you're new to the project:

1. **[Quick Start Guide](./TESTING_QUICK_START.md)** - Get testing in 5 minutes
2. **[Best Practices](./TESTING_BEST_PRACTICES.md)** - Learn testing patterns
3. **[Quick Reference](./TESTING_QUICK_REFERENCE.md)** - Common commands and patterns

### For Writing Tests

Choose based on what you're testing:

- **Testing a utility function?** → [UNIT_TESTING_GUIDE.md](./UNIT_TESTING_GUIDE.md)
- **Testing a custom hook?** → [UNIT_TESTING_GUIDE.md](./UNIT_TESTING_GUIDE.md) (Hooks section)
- **Testing an API service?** → [UNIT_TESTING_GUIDE.md](./UNIT_TESTING_GUIDE.md) (Services section)
- **Testing component interactions?** → [INTEGRATION_TESTING_GUIDE.md](./INTEGRATION_TESTING_GUIDE.md)
- **Testing user flows?** → [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)
- **Testing accessibility?** → [ACCESSIBILITY_TESTING_GUIDE.md](./ACCESSIBILITY_TESTING_GUIDE.md)

### For Running Tests

- **[Workflow Guide](./TESTING_WORKFLOW.md)** - Complete testing workflow
- **[Tools Reference](./TESTING_TOOLS_REFERENCE.md)** - Tools configuration and usage
- **[Quick Reference](./TESTING_QUICK_REFERENCE.md)** - Common commands

### For Debugging

When tests fail:

1. **[Troubleshooting Guide](./TESTING_TROUBLESHOOTING.md)** - Common issues and solutions
2. **[Best Practices](./TESTING_BEST_PRACTICES.md)** - Debugging patterns
3. **[Tools Reference](./TESTING_TOOLS_REFERENCE.md)** - Debugging tools

---

## Test Type Distribution

```
┌─────────────────────────────────────────────────────────┐
│                   Test Distribution                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Unit Tests (70%)          ████████████████████████████ │
│  - Utils: 18 files                                      │
│  - Hooks: 21 files                                      │
│  - Services: 16 files                                   │
│  - Contexts: 10 files                                   │
│                                                          │
│  Integration Tests (20%)   ████████                     │
│  - User Flows: 5 files                                  │
│  - Components: 6 files                                  │
│  - API: 6 files                                         │
│  - State: 4 files                                       │
│                                                          │
│  E2E Tests (10%)           ████                         │
│  - Critical Flows: 8 suites                            │
│  - 300+ scenarios                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Test Counts by Category

| Category | Files | Tests | Coverage Target |
|----------|-------|-------|----------------|
| **Unit Tests** | | | |
| Utils | 18 | 150+ | 80%+ |
| Hooks | 21 | 180+ | 75%+ |
| Services | 16 | 140+ | 80%+ |
| Contexts | 10 | 90+ | 75%+ |
| Components | 35 | 200+ | 65%+ |
| **Integration Tests** | | | |
| User Flows | 5 | 60+ | 100% |
| Components | 6 | 50+ | 80%+ |
| API Integration | 6 | 45+ | 80%+ |
| State Management | 4 | 35+ | 75%+ |
| **E2E Tests** | | | |
| Critical Flows | 8 | 300+ | 100% |
| **Total** | **129+** | **1250+** | **70%+** |

---

## Getting Started

### Prerequisites

```bash
# Node.js 16+ installed
node --version

# Dependencies installed
npm install

# Optional: Detox CLI for E2E tests
npm install -g detox-cli
```

### Run Your First Test

```bash
# 1. Run all tests
npm test

# 2. Run a specific test file
npm test -- validation.test.ts

# 3. Run tests in watch mode
npm run test:watch

# 4. Run with coverage
npm run test:coverage
```

### Expected Output

```
PASS  __tests__/utils/validation.test.ts
  ✓ validates email addresses correctly (3ms)
  ✓ validates phone numbers correctly (2ms)
  ✓ handles edge cases (1ms)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Time:        2.5s
```

### Next Steps

1. Read the [Quick Start Guide](./TESTING_QUICK_START.md) for a 5-minute introduction
2. Review [Best Practices](./TESTING_BEST_PRACTICES.md) for writing effective tests
3. Check out example tests in the `__tests__/` directory

---

## Test Pyramid

Our testing follows the standard test pyramid approach:

```
                    /\
                   /  \
                  / E2E \      • 300+ scenarios
                 /  10%  \     • Critical user journeys
                /________\     • Full app testing
               /          \
              /Integration \   • API integration
             /     20%      \  • Component interactions
            /______________\ • State management
           /                \
          /   Unit Tests     \ • Utilities
         /       70%          \ • Hooks
        /____________________\ • Services
                               • Components
```

### Why This Distribution?

#### Unit Tests (70%)
- **Fast**: Run in milliseconds
- **Isolated**: No external dependencies
- **Focused**: Test one thing at a time
- **Debuggable**: Easy to identify issues
- **Maintainable**: Simple to update

#### Integration Tests (20%)
- **Realistic**: Test actual interactions
- **Moderate Speed**: Faster than E2E
- **Confident**: Test module integration
- **API Coverage**: Test backend integration

#### E2E Tests (10%)
- **User-Centric**: Test real user flows
- **High Confidence**: Full app testing
- **Critical Paths**: Focus on business value
- **Cross-Platform**: Test iOS and Android

---

## Critical Paths

These user journeys must have 100% test coverage:

### 1. Authentication Flow
```
Registration → OTP Verification → Login → Token Refresh → Logout
```
**Tests**: 45+ scenarios
**Coverage**: Unit + Integration + E2E

### 2. Shopping Journey
```
Browse → Search → Product Details → Add to Cart → Checkout → Payment → Order Confirmation
```
**Tests**: 80+ scenarios
**Coverage**: Unit + Integration + E2E

### 3. Payment Processing
```
Select Payment → Enter Details → 3D Secure → Confirmation → Receipt
```
**Tests**: 60+ scenarios
**Coverage**: Unit + Integration + E2E

### 4. Earning Flow
```
Browse Tasks → Complete Task → Upload Proof → Verification → Earn Coins
```
**Tests**: 50+ scenarios
**Coverage**: Unit + Integration + E2E

### 5. Social Features
```
View Feed → Like/Comment → Upload UGC → Share → Engage
```
**Tests**: 65+ scenarios
**Coverage**: Unit + Integration + E2E

### 6. Wallet Management
```
View Balance → Add Money → Pay Bill → Upload Receipt → Get Cashback
```
**Tests**: 55+ scenarios
**Coverage**: Unit + Integration + E2E

---

## Coverage Standards

### Global Targets

```javascript
{
  "global": {
    "statements": 70,
    "branches": 70,
    "functions": 70,
    "lines": 70
  }
}
```

### Per-Module Targets

| Module | Target | Priority | Status |
|--------|--------|----------|--------|
| **Utils** | 80%+ | Critical | ✓ Achieved |
| **Services** | 80%+ | Critical | ✓ Achieved |
| **Hooks** | 75%+ | High | ✓ Achieved |
| **Contexts** | 75%+ | High | ✓ Achieved |
| **Components** | 65%+ | Medium | ✓ Achieved |
| **Screens** | 60%+ | Medium | In Progress |

### Checking Coverage

```bash
# Generate coverage report
npm run test:coverage

# View in browser
open coverage/lcov-report/index.html

# Coverage output
--------------------|---------|----------|---------|---------|
File                | % Stmts | % Branch | % Funcs | % Lines |
--------------------|---------|----------|---------|---------|
All files           |   72.45 |    68.32 |   74.18 |   72.89 |
 utils/             |   82.15 |    78.54 |   85.32 |   83.12 |
 hooks/             |   76.32 |    72.18 |   78.45 |   77.23 |
 services/          |   81.45 |    76.89 |   83.12 |   82.34 |
--------------------|---------|----------|---------|---------|
```

---

## CI/CD Pipeline

### Automated Testing Stages

```
┌─────────────────────────────────────────────────────────┐
│                  CI/CD Test Pipeline                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Pre-commit Hook                                     │
│     └─ Lint + Type Check + Unit Tests (changed files)  │
│        Duration: 10-30s                                  │
│                                                          │
│  2. Pull Request                                        │
│     ├─ All Unit Tests                                   │
│     ├─ All Integration Tests                            │
│     ├─ Coverage Report                                  │
│     └─ Accessibility Tests                              │
│        Duration: 2-5 min                                 │
│                                                          │
│  3. Main Branch Merge                                   │
│     ├─ All Unit Tests                                   │
│     ├─ All Integration Tests                            │
│     ├─ E2E Tests (Critical Flows)                       │
│     └─ Performance Tests                                │
│        Duration: 10-20 min                               │
│                                                          │
│  4. Release Build                                       │
│     ├─ All Tests (Unit + Integration + E2E)            │
│     ├─ Cross-Platform Testing                           │
│     ├─ Accessibility Audit                              │
│     └─ Security Scan                                    │
│        Duration: 30-60 min                               │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Test Execution Times

| Stage | Tests | Duration | When |
|-------|-------|----------|------|
| Pre-commit | Changed files only | 10-30s | Before commit |
| PR Check | All unit + integration | 2-5 min | On PR creation |
| Merge | All + Critical E2E | 10-20 min | Before merge |
| Release | All tests | 30-60 min | Release build |

### CI Configuration

See `.github/workflows/` for:
- `test-unit.yml` - Unit test workflow
- `test-integration.yml` - Integration test workflow
- `test-e2e.yml` - E2E test workflow
- `test-accessibility.yml` - Accessibility test workflow

---

## Related Documentation

### Core Testing Guides

| Document | Purpose | Audience |
|----------|---------|----------|
| [TESTING_QUICK_START.md](./TESTING_QUICK_START.md) | 5-minute quick start | New developers |
| [TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md) | Testing patterns and practices | All developers |
| [TESTING_WORKFLOW.md](./TESTING_WORKFLOW.md) | Development workflow | All developers |
| [TESTING_TROUBLESHOOTING.md](./TESTING_TROUBLESHOOTING.md) | Common issues | All developers |
| [TESTING_TOOLS_REFERENCE.md](./TESTING_TOOLS_REFERENCE.md) | Tools and configuration | All developers |

### Specific Testing Guides

| Document | Purpose |
|----------|---------|
| [UNIT_TESTING_GUIDE.md](./UNIT_TESTING_GUIDE.md) | Unit testing details |
| [INTEGRATION_TESTING_GUIDE.md](./INTEGRATION_TESTING_GUIDE.md) | Integration testing details |
| [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) | E2E testing with Detox |
| [ACCESSIBILITY_TESTING_GUIDE.md](./ACCESSIBILITY_TESTING_GUIDE.md) | Accessibility testing procedures |
| [TESTING_QUICK_REFERENCE.md](./TESTING_QUICK_REFERENCE.md) | Quick reference card |

### Feature-Specific Testing

| Document | Purpose |
|----------|---------|
| [GAMES_TESTING_GUIDE.md](./GAMES_TESTING_GUIDE.md) | Games feature testing |
| [ONLINE_VOUCHER_TESTING_GUIDE.md](./ONLINE_VOUCHER_TESTING_GUIDE.md) | Voucher system testing |
| [RAZORPAY_TESTING_GUIDE.md](./RAZORPAY_TESTING_GUIDE.md) | Payment integration testing |
| [LEADERBOARD_TESTING_REPORT.md](./LEADERBOARD_TESTING_REPORT.md) | Leaderboard feature testing |

### Test Reports and Summaries

| Document | Purpose |
|----------|---------|
| [UNIT_TEST_REPORT.md](./UNIT_TEST_REPORT.md) | Unit test results |
| [INTEGRATION_TEST_REPORT.md](./INTEGRATION_TEST_REPORT.md) | Integration test results |
| [E2E_TEST_REPORT.md](./E2E_TEST_REPORT.md) | E2E test results |
| [ACCESSIBILITY_TEST_REPORT.md](./ACCESSIBILITY_TEST_REPORT.md) | Accessibility test results |

---

## Support

### Getting Help

1. **Check Documentation**: Review the relevant guide above
2. **Search Issues**: Check if your issue is already documented
3. **Ask the Team**: Reach out to the testing team
4. **Review Examples**: Look at existing tests for patterns

### Common Resources

- **Jest Documentation**: https://jestjs.io/
- **React Native Testing Library**: https://callstack.github.io/react-native-testing-library/
- **Detox Documentation**: https://wix.github.io/Detox/
- **Testing Best Practices**: https://kentcdodds.com/blog/

### Internal Resources

- **Example Tests**: Browse `__tests__/` directory
- **Test Utilities**: Check `__tests__/utils/` for helpers
- **Mock Data**: See `data/` directory for test data
- **Test Factories**: Use factories for consistent test data

---

## Testing Decision Tree

Use this flowchart to decide what type of test to write:

```
┌─────────────────────────────────┐
│  What are you testing?          │
└────────────┬────────────────────┘
             │
      ┌──────┴──────┐
      │             │
   Function?    Component?
      │             │
      ▼             ▼
  Unit Test    Is it isolated?
               │          │
              Yes        No
               │          │
               ▼          ▼
           Unit Test  Integration Test
                         │
                    Is it a full
                    user journey?
                         │
                     ┌───┴───┐
                    Yes     No
                     │       │
                     ▼       ▼
                 E2E Test  Integration Test
```

### Quick Decision Guide

**Write a Unit Test when:**
- Testing a pure function
- Testing a utility
- Testing a hook in isolation
- Testing an API service method

**Write an Integration Test when:**
- Testing component interactions
- Testing state management
- Testing API client integration
- Testing data flow between modules

**Write an E2E Test when:**
- Testing a complete user journey
- Testing critical business flows
- Testing cross-platform behavior
- Testing real backend integration

---

## Key Metrics

### Current Status (November 2025)

```
┌──────────────────────────────────────────────┐
│            Test Suite Status                 │
├──────────────────────────────────────────────┤
│                                              │
│  Total Test Files:     129+                 │
│  Total Test Cases:     1250+                │
│  Test Success Rate:    98.5%                │
│  Average Duration:     3.2s per file        │
│  Code Coverage:        72.45%               │
│                                              │
│  ✓ Unit Tests:         760+ tests           │
│  ✓ Integration Tests:  190+ tests           │
│  ✓ E2E Tests:          300+ scenarios       │
│  ✓ Accessibility:      Full coverage        │
│                                              │
└──────────────────────────────────────────────┘
```

### Quality Gates

All PRs must pass these checks:

- ✓ All tests passing
- ✓ Coverage not decreased
- ✓ No console errors or warnings
- ✓ Linting passed
- ✓ Type checking passed
- ✓ Build successful

---

## Conclusion

This master guide provides an overview of our comprehensive testing infrastructure. For specific testing scenarios, refer to the specialized guides linked throughout this document.

**Remember**: Good tests are an investment in code quality, reliability, and developer productivity. They enable confident refactoring and rapid feature development.

### Quick Links Summary

- **New to testing?** Start with [TESTING_QUICK_START.md](./TESTING_QUICK_START.md)
- **Writing tests?** Check [TESTING_BEST_PRACTICES.md](./TESTING_BEST_PRACTICES.md)
- **Tests failing?** See [TESTING_TROUBLESHOOTING.md](./TESTING_TROUBLESHOOTING.md)
- **Need commands?** Use [TESTING_QUICK_REFERENCE.md](./TESTING_QUICK_REFERENCE.md)
- **Setting up tools?** Read [TESTING_TOOLS_REFERENCE.md](./TESTING_TOOLS_REFERENCE.md)

---

**Questions or Suggestions?** Open an issue or contact the testing team.

**Last Updated**: November 11, 2025
**Maintained By**: Rez App Development Team
**Version**: 1.0.0
