# Testing Quick Reference Card

## 🚀 Quick Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Run specific file
npm test -- validation.test.ts

# Run specific category
npm test -- __tests__/utils/
npm test -- __tests__/hooks/
npm test -- __tests__/services/
npm test -- __tests__/contexts/
```

---

## 📁 Test Structure

```
__tests__/
  ├── utils/           (18 files) - 80%+ coverage target
  ├── hooks/           (21 files) - 70%+ coverage target
  ├── services/        (16 files) - 75%+ coverage target
  └── contexts/        (10 files) - 70%+ coverage target
```

---

## 🎯 Writing Tests

### Basic Template

```typescript
import { functionToTest } from '@/path/to/module';

describe('ModuleName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle normal case', () => {
    const result = functionToTest('input');
    expect(result).toBe('expected');
  });
});
```

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';

describe('useCustomHook', () => {
  it('should load data', async () => {
    const { result } = renderHook(() => useCustomHook());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeDefined();
  });
});
```

### Testing Services

```typescript
import * as api from '@/services/api';
import { apiClient } from '@/services/apiClient';

jest.mock('@/services/apiClient');

describe('api', () => {
  it('should fetch data', async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true }
    });

    const result = await api.fetchData();
    expect(result.success).toBe(true);
  });
});
```

---

## 🏭 Test Factories

```typescript
import {
  createMockUser,
  createMockProduct,
  createMockStore,
  createMockCart,
} from '@/__tests__/utils/testFactories';

// Usage
const user = createMockUser({ name: 'John' });
const product = createMockProduct({ price: 999 });
```

---

## 🎭 Common Mocks

### AsyncStorage
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

AsyncStorage.getItem.mockResolvedValue('stored-value');
AsyncStorage.setItem.mockResolvedValue();
```

### API Client
```typescript
jest.mock('@/services/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));
```

### React Native Components
```typescript
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: { alert: jest.fn() },
}));
```

---

## ✅ Best Practices

1. **Descriptive Names** - Clear what is being tested
2. **One Thing** - Test single behavior per test
3. **Arrange-Act-Assert** - Follow AAA pattern
4. **Clean Up** - Use beforeEach/afterEach
5. **Edge Cases** - Test null, undefined, boundaries
6. **Async** - Use waitFor and act properly

---

## 📊 Coverage Targets

| Category | Target | Command |
|----------|--------|---------|
| Utils | 80%+ | `npm test -- __tests__/utils/` |
| Hooks | 70%+ | `npm test -- __tests__/hooks/` |
| Services | 75%+ | `npm test -- __tests__/services/` |
| Contexts | 70%+ | `npm test -- __tests__/contexts/` |

---

## 🐛 Troubleshooting

### Module Not Found
Check `moduleNameMapper` in `jest.config.js`

### Async Timeout
```typescript
await waitFor(() => {
  expect(result).toBeDefined();
}, { timeout: 10000 });
```

### Mock Not Working
```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

---

## 📚 Documentation

- `UNIT_TESTING_GUIDE.md` - Complete guide
- `UNIT_TEST_REPORT.md` - Test report
- `PHASE3_UNIT_TESTING_COMPLETE.md` - Completion summary

---

## 🎯 Test Counts

- **Total Tests**: 129 files
- **Utils**: 18 files
- **Hooks**: 21 files
- **Services**: 16 files
- **Contexts**: 10 files

---

**Last Updated**: November 11, 2025
