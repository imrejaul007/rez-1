# Testing Quick Start Guide

## 🚀 Quick Commands

```bash
# Run all tests
npm test

# Run merchant tests only
npm test -- --testPathPatterns=merchant

# Run with coverage report
npm run test:coverage

# Run in watch mode (auto-rerun on changes)
npm run test:watch

# Run specific test file
npm test -- merchantAuth.test.ts
```

## 📂 Files Created

### Test Infrastructure
- `src/__tests__/setup.ts` - MongoDB Memory Server configuration
- `src/__tests__/helpers/testUtils.ts` - Reusable test utilities
- `jest.config.js` - Jest configuration (updated)

### Test Files
- `src/__tests__/merchantAuth.test.ts` - 15 authentication tests
- `src/__tests__/merchantProducts.test.ts` - 16 product tests

## 🧪 Test Utilities

```typescript
import {
  createTestMerchant,
  generateMerchantToken,
  createAuthHeaders
} from './helpers/testUtils';

// Create a test merchant
const merchant = await createTestMerchant();

// Generate auth token
const token = generateMerchantToken(merchant.id);

// Create auth headers for requests
const headers = createAuthHeaders(token);
```

## 📝 Writing New Tests

### Basic Test Structure

```typescript
describe('Feature Name', () => {
  let merchant: any;
  let token: string;

  beforeEach(async () => {
    merchant = await createTestMerchant();
    token = generateMerchantToken(merchant.id);
  });

  it('should do something', async () => {
    const response = await request(app)
      .post('/api/merchant/endpoint')
      .set(createAuthHeaders(token))
      .send({ data: 'value' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## ⚠️ Current Status

**Tests Written**: 31 tests (15 auth + 16 product)
**Status**: Ready to run once source code TypeScript errors are fixed

### Required Fix

The file `src/merchantroutes/auth.ts` has compilation errors that prevent tests from running. See `TESTING_INFRASTRUCTURE_SUMMARY.md` for details.

## 📊 Coverage Reports

After running `npm run test:coverage`, view reports at:
- Terminal: Immediate summary
- HTML: `coverage/index.html`
- LCOV: `coverage/lcov-report/index.html`

## 🎯 Test Naming Convention

```typescript
describe('HTTP Method /api/endpoint', () => {
  it('should [expected behavior]', async () => {
    // Test implementation
  });
});
```

Examples:
- `should register a new merchant`
- `should reject invalid token`
- `should create a new product`

## 🔍 Debugging Tests

### Enable verbose output:
```bash
npm test -- --verbose
```

### Run single test:
```bash
npm test -- --testNamePattern="should register a new merchant"
```

### Debug mode:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## ✅ Test Checklist

For each new endpoint, write tests for:
- [ ] Success case with valid data
- [ ] Authentication required (401 without token)
- [ ] Validation errors (400 with invalid data)
- [ ] Not found errors (404 for non-existent resources)
- [ ] Authorization (can't access other merchant's data)
- [ ] Edge cases and boundary conditions

## 📚 Resources

- Jest Documentation: https://jestjs.io/
- Supertest Documentation: https://github.com/visionmedia/supertest
- MongoDB Memory Server: https://github.com/nodkz/mongodb-memory-server

---

**Next**: Fix TypeScript errors in `src/merchantroutes/auth.ts` to run tests
