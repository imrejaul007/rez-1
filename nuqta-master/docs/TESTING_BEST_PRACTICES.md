# Testing Best Practices

**Comprehensive guide to writing effective tests in the Rez App**

---

## Table of Contents

1. [General Principles](#general-principles)
2. [Test Structure](#test-structure)
3. [Naming Conventions](#naming-conventions)
4. [Test Organization](#test-organization)
5. [Mock Strategies](#mock-strategies)
6. [Test Data Management](#test-data-management)
7. [Async Testing](#async-testing)
8. [Error Testing](#error-testing)
9. [Component Testing](#component-testing)
10. [Hook Testing](#hook-testing)
11. [API Testing](#api-testing)
12. [Accessibility Testing](#accessibility-testing)
13. [Performance Testing](#performance-testing)
14. [Security Testing](#security-testing)
15. [Anti-Patterns](#anti-patterns)
16. [Code Review Checklist](#code-review-checklist)

---

## General Principles

### 1. Test Behavior, Not Implementation

**✅ Good**: Test what the user sees and experiences
```typescript
it('should display success message after form submission', async () => {
  const { getByText, getByPlaceholderText } = render(<LoginForm />);

  fireEvent.changeText(getByPlaceholderText('Phone'), '+919876543210');
  fireEvent.press(getByText('Send OTP'));

  await waitFor(() => {
    expect(getByText('OTP sent successfully')).toBeTruthy();
  });
});
```

**❌ Bad**: Test internal implementation details
```typescript
it('should call setState when button is pressed', () => {
  const wrapper = shallow(<LoginForm />);
  const instance = wrapper.instance();
  const spy = jest.spyOn(instance, 'setState');

  wrapper.find('Button').simulate('press');
  expect(spy).toHaveBeenCalled();
});
```

### 2. Write Descriptive Test Names

**✅ Good**: Clear, specific descriptions
```typescript
describe('useWallet', () => {
  it('should load user balance on mount', () => {});
  it('should update balance after successful transaction', () => {});
  it('should display error message when API fails', () => {});
  it('should retry failed requests up to 3 times', () => {});
});
```

**❌ Bad**: Vague or technical descriptions
```typescript
describe('useWallet', () => {
  it('test 1', () => {});
  it('works', () => {});
  it('calls API', () => {});
});
```

### 3. One Assertion Per Concept

Each test should verify one specific behavior:

**✅ Good**: Focused tests
```typescript
it('should validate email format', () => {
  expect(validateEmail('user@example.com')).toBe(true);
});

it('should reject invalid email format', () => {
  expect(validateEmail('invalid')).toBe(false);
});

it('should reject empty email', () => {
  expect(validateEmail('')).toBe(false);
});
```

**❌ Bad**: Testing multiple things
```typescript
it('validates email', () => {
  expect(validateEmail('user@example.com')).toBe(true);
  expect(validateEmail('invalid')).toBe(false);
  expect(validateEmail('')).toBe(false);
  expect(validateEmail(null)).toBe(false);
});
```

### 4. Test Edge Cases

Always test boundary conditions and edge cases:

```typescript
describe('calculateDiscount', () => {
  it('should handle zero amount', () => {
    expect(calculateDiscount(0, 10)).toBe(0);
  });

  it('should handle 100% discount', () => {
    expect(calculateDiscount(1000, 100)).toBe(0);
  });

  it('should handle negative amounts', () => {
    expect(() => calculateDiscount(-100, 10)).toThrow();
  });

  it('should handle discount over 100%', () => {
    expect(() => calculateDiscount(1000, 150)).toThrow();
  });

  it('should handle decimal amounts', () => {
    expect(calculateDiscount(99.99, 10)).toBeCloseTo(89.99, 2);
  });
});
```

### 5. Keep Tests Independent

Each test should be able to run in isolation:

**✅ Good**: Independent tests
```typescript
describe('ShoppingCart', () => {
  beforeEach(() => {
    // Reset state before each test
    jest.clearAllMocks();
  });

  it('should add item to empty cart', () => {
    const cart = new ShoppingCart();
    cart.addItem(mockProduct);
    expect(cart.items).toHaveLength(1);
  });

  it('should remove item from cart', () => {
    const cart = new ShoppingCart();
    cart.addItem(mockProduct);
    cart.removeItem(mockProduct.id);
    expect(cart.items).toHaveLength(0);
  });
});
```

**❌ Bad**: Tests depend on each other
```typescript
describe('ShoppingCart', () => {
  const cart = new ShoppingCart(); // Shared state!

  it('should add item', () => {
    cart.addItem(mockProduct);
    expect(cart.items).toHaveLength(1);
  });

  it('should remove item', () => {
    // Assumes previous test ran!
    cart.removeItem(mockProduct.id);
    expect(cart.items).toHaveLength(0);
  });
});
```

---

## Test Structure

### Arrange-Act-Assert (AAA) Pattern

```typescript
it('should calculate total price with discount', () => {
  // Arrange: Set up test data and preconditions
  const items = [
    { price: 1000, quantity: 2 },
    { price: 500, quantity: 1 }
  ];
  const discountPercent = 10;

  // Act: Execute the function being tested
  const total = calculateTotal(items, discountPercent);

  // Assert: Verify the result
  expect(total).toBe(2250); // (2000 + 500) * 0.9
});
```

### Given-When-Then Pattern (BDD)

```typescript
it('should send OTP when valid phone number is provided', async () => {
  // Given: A user with a valid phone number
  const phoneNumber = '+919876543210';
  (authApi.sendOTP as jest.Mock).mockResolvedValue({ success: true });

  // When: User requests OTP
  const result = await sendOTP(phoneNumber);

  // Then: OTP is sent successfully
  expect(result.success).toBe(true);
  expect(authApi.sendOTP).toHaveBeenCalledWith(phoneNumber);
});
```

### Nested Describe Blocks

Organize related tests with nested describes:

```typescript
describe('PaymentService', () => {
  describe('processPayment', () => {
    describe('when payment succeeds', () => {
      it('should return success status', () => {});
      it('should create order record', () => {});
      it('should send confirmation email', () => {});
    });

    describe('when payment fails', () => {
      it('should return error status', () => {});
      it('should not create order record', () => {});
      it('should log error details', () => {});
    });

    describe('when 3D Secure is required', () => {
      it('should redirect to authentication page', () => {});
      it('should handle successful authentication', () => {});
      it('should handle failed authentication', () => {});
    });
  });
});
```

---

## Naming Conventions

### Test File Names

```
Component/Module Name + .test + Extension

Examples:
- validation.test.ts
- useWallet.test.ts
- authApi.test.ts
- LoginForm.test.tsx
- ShoppingCart.test.tsx
```

### Test Suite Names

```typescript
// Use the component/module name
describe('ComponentName', () => {});
describe('FunctionName', () => {});
describe('ServiceName', () => {});

// Examples
describe('useWallet', () => {});
describe('validateEmail', () => {});
describe('authApi', () => {});
```

### Test Case Names

Use descriptive sentences starting with "should":

```typescript
it('should [expected behavior] when [condition]', () => {});

// Examples
it('should display error message when API fails', () => {});
it('should disable submit button when form is invalid', () => {});
it('should update cart total when item quantity changes', () => {});
```

### Test ID Naming

Use kebab-case for testID attributes:

```typescript
<TouchableOpacity testID="add-to-cart-button">
<TextInput testID="email-input" />
<View testID="error-message-container">
<Text testID="product-price-text">
```

---

## Test Organization

### Directory Structure

```
__tests__/
├── utils/                  # Utility function tests
│   ├── validation.test.ts
│   ├── formatting.test.ts
│   └── ...
├── hooks/                  # Custom hook tests
│   ├── useWallet.test.ts
│   ├── useAuth.test.ts
│   └── ...
├── services/              # API service tests
│   ├── authApi.test.ts
│   ├── cartApi.test.ts
│   └── ...
├── contexts/              # Context provider tests
│   ├── AuthContext.test.tsx
│   └── ...
├── components/            # Component tests
│   ├── common/
│   ├── cart/
│   └── ...
├── integration/           # Integration tests
│   ├── flows/
│   ├── components/
│   └── api/
└── accessibility/         # Accessibility tests
    ├── forms.test.tsx
    └── navigation.test.tsx
```

### Grouping Tests

```typescript
describe('CartService', () => {
  // Setup shared across all tests
  beforeAll(() => {
    // One-time setup
  });

  beforeEach(() => {
    // Reset before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Cleanup after each test
  });

  afterAll(() => {
    // One-time cleanup
  });

  // Group related tests
  describe('adding items', () => {
    it('should add new item', () => {});
    it('should increment quantity of existing item', () => {});
    it('should validate item before adding', () => {});
  });

  describe('removing items', () => {
    it('should remove item by id', () => {});
    it('should handle removing non-existent item', () => {});
  });

  describe('calculating totals', () => {
    it('should calculate subtotal', () => {});
    it('should apply discounts', () => {});
    it('should include taxes', () => {});
  });
});
```

---

## Mock Strategies

### When to Mock

**Mock these:**
- External API calls
- Database operations
- File system operations
- Network requests
- Date/time (when testing time-dependent code)
- Random number generation
- External libraries

**Don't mock these:**
- The code you're testing
- Simple utilities (unless slow)
- Pure functions
- Constants

### Module Mocking

```typescript
// Mock entire module
jest.mock('@/services/apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

// Mock with default export
jest.mock('@/utils/storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

// Partial mock (keep some real implementation)
jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  fetchData: jest.fn(), // Only mock this function
}));
```

### Function Mocking

```typescript
// Mock resolved promise
(apiClient.get as jest.Mock).mockResolvedValue({
  success: true,
  data: mockData,
});

// Mock rejected promise
(apiClient.post as jest.Mock).mockRejectedValue(
  new Error('Network error')
);

// Mock implementation
(calculateDiscount as jest.Mock).mockImplementation((price, percent) => {
  return price * (1 - percent / 100);
});

// Mock different return values for multiple calls
(apiClient.get as jest.Mock)
  .mockResolvedValueOnce({ success: true, data: [] })
  .mockResolvedValueOnce({ success: true, data: [item1] })
  .mockResolvedValueOnce({ success: true, data: [item1, item2] });
```

### Context Mocking

```typescript
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: any) => children,
}));

// In test
beforeEach(() => {
  (useAuth as jest.Mock).mockReturnValue({
    state: {
      isAuthenticated: true,
      user: mockUser,
      token: 'mock-token',
    },
    login: jest.fn(),
    logout: jest.fn(),
  });
});
```

### AsyncStorage Mocking

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

beforeEach(() => {
  AsyncStorage.getItem.mockResolvedValue(null);
  AsyncStorage.setItem.mockResolvedValue();
  AsyncStorage.removeItem.mockResolvedValue();
});

// Mock specific values
AsyncStorage.getItem.mockImplementation((key) => {
  const store: Record<string, string> = {
    'user-token': 'mock-token',
    'user-data': JSON.stringify(mockUser),
  };
  return Promise.resolve(store[key] || null);
});
```

---

## Test Data Management

### Use Test Factories

Create reusable factories for test data:

```typescript
// testFactories.ts
export const createMockUser = (overrides = {}) => ({
  id: 'user_123',
  name: 'Test User',
  email: 'test@example.com',
  phone: '+919876543210',
  ...overrides,
});

export const createMockProduct = (overrides = {}) => ({
  id: 'prod_123',
  name: 'Test Product',
  price: 999,
  category: 'Electronics',
  inStock: true,
  ...overrides,
});

export const createMockCart = (overrides = {}) => ({
  id: 'cart_123',
  items: [],
  total: 0,
  ...overrides,
});

// Usage in tests
it('should add product to cart', () => {
  const product = createMockProduct({ price: 1500 });
  const cart = createMockCart();

  addToCart(cart, product);

  expect(cart.items).toHaveLength(1);
  expect(cart.total).toBe(1500);
});
```

### Realistic Test Data

Use realistic data that represents actual usage:

```typescript
// Good: Realistic data
const mockUser = {
  name: 'Rahul Kumar',
  email: 'rahul.kumar@example.com',
  phone: '+919876543210',
  address: {
    street: '123 MG Road',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560001',
  },
};

// Bad: Generic data
const mockUser = {
  name: 'User 1',
  email: 'user1@test.com',
  phone: '1234567890',
};
```

### Test Data Organization

```typescript
// testData.ts
export const TEST_USERS = {
  standard: {
    id: 'user_001',
    name: 'Standard User',
    email: 'standard@example.com',
    role: 'user',
  },
  premium: {
    id: 'user_002',
    name: 'Premium User',
    email: 'premium@example.com',
    role: 'premium',
  },
  admin: {
    id: 'admin_001',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin',
  },
};

export const TEST_PRODUCTS = {
  inStock: {
    id: 'prod_001',
    name: 'In Stock Product',
    stock: 50,
  },
  outOfStock: {
    id: 'prod_002',
    name: 'Out of Stock Product',
    stock: 0,
  },
  lowStock: {
    id: 'prod_003',
    name: 'Low Stock Product',
    stock: 2,
  },
};
```

---

## Async Testing

### Using async/await

```typescript
it('should fetch user data', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    success: true,
    data: mockUser,
  });

  const result = await fetchUser('user_123');

  expect(result).toEqual(mockUser);
});
```

### Using waitFor

```typescript
it('should display loaded data', async () => {
  const { getByText, queryByTestId } = render(<UserProfile userId="123" />);

  // Wait for loading to finish
  await waitFor(() => {
    expect(queryByTestId('loading-spinner')).toBeNull();
  });

  // Verify data is displayed
  expect(getByText('John Doe')).toBeTruthy();
});
```

### Testing Loading States

```typescript
it('should show loading spinner while fetching', async () => {
  let resolvePromise: (value: any) => void;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  (apiClient.get as jest.Mock).mockReturnValue(promise);

  const { getByTestId, queryByTestId } = render(<DataComponent />);

  // Loading should be visible
  expect(getByTestId('loading-spinner')).toBeTruthy();

  // Resolve the promise
  resolvePromise!({ success: true, data: mockData });

  // Wait for loading to disappear
  await waitFor(() => {
    expect(queryByTestId('loading-spinner')).toBeNull();
  });
});
```

### Testing Timeouts

```typescript
it('should timeout after 5 seconds', async () => {
  jest.useFakeTimers();

  (apiClient.get as jest.Mock).mockImplementation(
    () => new Promise(() => {}) // Never resolves
  );

  const promise = fetchWithTimeout('/api/data', 5000);

  jest.advanceTimersByTime(5000);

  await expect(promise).rejects.toThrow('Request timeout');

  jest.useRealTimers();
});
```

---

## Error Testing

### Testing Error Handling

```typescript
describe('error handling', () => {
  it('should handle network errors', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    await expect(fetchData()).rejects.toThrow('Network error');
  });

  it('should handle 404 errors', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue({
      response: { status: 404, data: { error: 'Not found' } },
    });

    await expect(fetchUser('invalid-id')).rejects.toMatchObject({
      response: { status: 404 },
    });
  });

  it('should handle validation errors', async () => {
    (apiClient.post as jest.Mock).mockRejectedValue({
      response: {
        status: 400,
        data: {
          errors: {
            email: 'Invalid email format',
            phone: 'Phone number required',
          },
        },
      },
    });

    const result = await submitForm(invalidData);

    expect(result.errors).toBeDefined();
    expect(result.errors.email).toBe('Invalid email format');
  });
});
```

### Testing Error Messages

```typescript
it('should display user-friendly error message', async () => {
  (apiClient.post as jest.Mock).mockRejectedValue(
    new Error('Network error')
  );

  const { getByText } = render(<SubmitForm />);

  fireEvent.press(getByText('Submit'));

  await waitFor(() => {
    expect(getByText('Unable to submit. Please check your connection.')).toBeTruthy();
  });
});
```

---

## Component Testing

### Testing Rendering

```typescript
it('should render product card with correct information', () => {
  const product = createMockProduct({
    name: 'Nike Shoes',
    price: 5999,
    rating: 4.5,
  });

  const { getByText } = render(<ProductCard product={product} />);

  expect(getByText('Nike Shoes')).toBeTruthy();
  expect(getByText('₹5,999')).toBeTruthy();
  expect(getByText('4.5')).toBeTruthy();
});
```

### Testing User Interactions

```typescript
it('should call onPress when button is tapped', () => {
  const onPress = jest.fn();

  const { getByText } = render(
    <Button onPress={onPress}>Add to Cart</Button>
  );

  fireEvent.press(getByText('Add to Cart'));

  expect(onPress).toHaveBeenCalledTimes(1);
});
```

### Testing Conditional Rendering

```typescript
it('should show "Out of Stock" when stock is zero', () => {
  const product = createMockProduct({ stock: 0 });

  const { getByText, queryByText } = render(<ProductCard product={product} />);

  expect(getByText('Out of Stock')).toBeTruthy();
  expect(queryByText('Add to Cart')).toBeNull();
});

it('should show "Add to Cart" when stock is available', () => {
  const product = createMockProduct({ stock: 10 });

  const { getByText, queryByText } = render(<ProductCard product={product} />);

  expect(getByText('Add to Cart')).toBeTruthy();
  expect(queryByText('Out of Stock')).toBeNull();
});
```

---

## Hook Testing

### Basic Hook Testing

```typescript
import { renderHook } from '@testing-library/react-native';

it('should initialize with default values', () => {
  const { result } = renderHook(() => useCounter());

  expect(result.current.count).toBe(0);
});
```

### Testing Hook Updates

```typescript
it('should increment counter', () => {
  const { result } = renderHook(() => useCounter());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
```

### Testing Async Hooks

```typescript
it('should fetch data on mount', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    success: true,
    data: mockData,
  });

  const { result } = renderHook(() => useData());

  expect(result.current.loading).toBe(true);

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(result.current.data).toEqual(mockData);
});
```

### Testing Hook Dependencies

```typescript
it('should refetch data when id changes', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    success: true,
    data: mockData,
  });

  const { result, rerender } = renderHook(
    ({ id }) => useUserData(id),
    { initialProps: { id: 'user_1' } }
  );

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(apiClient.get).toHaveBeenCalledWith('/users/user_1');

  // Change the id
  rerender({ id: 'user_2' });

  await waitFor(() => {
    expect(result.current.loading).toBe(false);
  });

  expect(apiClient.get).toHaveBeenCalledWith('/users/user_2');
});
```

---

## API Testing

### Testing GET Requests

```typescript
describe('fetchProducts', () => {
  it('should fetch products successfully', async () => {
    const mockProducts = [createMockProduct(), createMockProduct()];

    (apiClient.get as jest.Mock).mockResolvedValue({
      success: true,
      data: mockProducts,
    });

    const result = await fetchProducts();

    expect(result).toEqual(mockProducts);
    expect(apiClient.get).toHaveBeenCalledWith('/products');
  });

  it('should handle fetch errors', async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    await expect(fetchProducts()).rejects.toThrow('Network error');
  });
});
```

### Testing POST Requests

```typescript
describe('createOrder', () => {
  it('should create order with correct data', async () => {
    const orderData = {
      items: [{ productId: 'prod_1', quantity: 2 }],
      total: 2000,
    };

    (apiClient.post as jest.Mock).mockResolvedValue({
      success: true,
      data: { orderId: 'order_123' },
    });

    const result = await createOrder(orderData);

    expect(result.orderId).toBe('order_123');
    expect(apiClient.post).toHaveBeenCalledWith('/orders', orderData);
  });
});
```

### Testing Request Headers

```typescript
it('should include authentication token in request', async () => {
  (apiClient.get as jest.Mock).mockResolvedValue({
    success: true,
    data: mockData,
  });

  await fetchProtectedData('token_123');

  expect(apiClient.get).toHaveBeenCalledWith(
    '/protected',
    expect.objectContaining({
      headers: {
        Authorization: 'Bearer token_123',
      },
    })
  );
});
```

---

## Accessibility Testing

### Testing ARIA Labels

```typescript
it('should have accessible labels', () => {
  const { getByLabelText } = render(<LoginForm />);

  expect(getByLabelText('Email address')).toBeTruthy();
  expect(getByLabelText('Password')).toBeTruthy();
});
```

### Testing Role Attributes

```typescript
it('should have correct accessibility roles', () => {
  const { getByRole } = render(<Navigation />);

  expect(getByRole('button', { name: 'Home' })).toBeTruthy();
  expect(getByRole('button', { name: 'Profile' })).toBeTruthy();
});
```

### Testing Focus Management

```typescript
it('should move focus to error message on validation failure', async () => {
  const { getByText, getByTestId } = render(<Form />);

  fireEvent.press(getByText('Submit'));

  await waitFor(() => {
    const errorMessage = getByTestId('error-message');
    expect(errorMessage.props.accessibilityLiveRegion).toBe('assertive');
  });
});
```

---

## Performance Testing

### Testing Render Performance

```typescript
it('should render large list efficiently', () => {
  const items = Array.from({ length: 1000 }, (_, i) =>
    createMockProduct({ id: `prod_${i}` })
  );

  const start = performance.now();
  render(<ProductList items={items} />);
  const duration = performance.now() - start;

  expect(duration).toBeLessThan(100); // Should render in <100ms
});
```

### Testing Memory Leaks

```typescript
it('should clean up subscriptions on unmount', () => {
  const { unmount } = render(<RealtimeComponent />);

  expect(mockSocket.on).toHaveBeenCalled();

  unmount();

  expect(mockSocket.off).toHaveBeenCalled();
});
```

---

## Security Testing

### Testing Input Sanitization

```typescript
describe('input sanitization', () => {
  it('should sanitize HTML in user input', () => {
    const maliciousInput = '<script>alert("xss")</script>';
    const sanitized = sanitizeInput(maliciousInput);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
  });

  it('should escape SQL injection attempts', () => {
    const sqlInjection = "'; DROP TABLE users; --";
    const escaped = escapeSQL(sqlInjection);

    expect(escaped).not.toContain("';");
    expect(escaped).not.toContain('DROP');
  });
});
```

### Testing Authentication

```typescript
describe('authentication', () => {
  it('should not allow access without token', async () => {
    await expect(fetchProtectedData(null)).rejects.toThrow('Unauthorized');
  });

  it('should validate token expiry', async () => {
    const expiredToken = 'expired_token';

    await expect(fetchProtectedData(expiredToken)).rejects.toMatchObject({
      response: { status: 401 },
    });
  });
});
```

---

## Anti-Patterns

### Don't Test the Framework

**❌ Avoid**:
```typescript
it('should call useState', () => {
  // Don't test React internals
  const spy = jest.spyOn(React, 'useState');
  render(<Component />);
  expect(spy).toHaveBeenCalled();
});
```

### Don't Use Snapshot Testing for Everything

**❌ Avoid**:
```typescript
it('renders correctly', () => {
  const tree = renderer.create(<Component />).toJSON();
  expect(tree).toMatchSnapshot(); // Too broad
});
```

**✅ Better**:
```typescript
it('should display product name and price', () => {
  const { getByText } = render(<ProductCard product={mockProduct} />);
  expect(getByText('Nike Shoes')).toBeTruthy();
  expect(getByText('₹5,999')).toBeTruthy();
});
```

### Don't Test Multiple Things

**❌ Avoid**:
```typescript
it('handles the entire shopping flow', () => {
  // Too much in one test
  addToCart();
  updateQuantity();
  applyDiscount();
  checkout();
  processPayment();
});
```

### Don't Skip Cleanup

**❌ Avoid**:
```typescript
describe('tests', () => {
  // No cleanup - state persists between tests
  it('test 1', () => {});
  it('test 2', () => {});
});
```

**✅ Better**:
```typescript
describe('tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('test 1', () => {});
  it('test 2', () => {});
});
```

---

## Code Review Checklist

### Before Submitting

- [ ] All tests pass locally
- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] Tests follow naming conventions
- [ ] Tests are independent
- [ ] Mocks are used appropriately
- [ ] Test data is realistic
- [ ] Edge cases are covered
- [ ] Error scenarios are tested
- [ ] Async operations are handled correctly
- [ ] No console.log statements
- [ ] Test descriptions are clear
- [ ] Coverage hasn't decreased

### During Review

- [ ] Tests verify behavior, not implementation
- [ ] Test names are descriptive
- [ ] One assertion per concept
- [ ] AAA pattern is followed
- [ ] No test duplication
- [ ] Appropriate test type (unit/integration/e2e)
- [ ] Performance considerations
- [ ] Accessibility considerations
- [ ] Security considerations

---

## Quick Reference

### Must Do

1. ✅ Test behavior, not implementation
2. ✅ Use descriptive names
3. ✅ Keep tests independent
4. ✅ Test edge cases
5. ✅ Clean up after tests
6. ✅ Use realistic test data
7. ✅ Mock external dependencies
8. ✅ Test error scenarios
9. ✅ Follow AAA pattern
10. ✅ Write tests before code (TDD when possible)

### Must Not Do

1. ❌ Test implementation details
2. ❌ Create test dependencies
3. ❌ Skip edge cases
4. ❌ Use generic test names
5. ❌ Test multiple things in one test
6. ❌ Leave console.log statements
7. ❌ Skip error testing
8. ❌ Use shared mutable state
9. ❌ Test the framework
10. ❌ Commit failing tests

---

## Conclusion

Following these best practices will result in:

- **Maintainable Tests**: Easy to understand and update
- **Reliable Tests**: Consistent, deterministic results
- **Fast Tests**: Quick feedback loops
- **Confident Refactoring**: Tests catch regressions
- **Better Code**: Testing reveals design issues

**Remember**: Good tests are an investment in code quality and developer productivity.

---

**Related Documentation**:
- [TESTING_GUIDE_MASTER.md](./TESTING_GUIDE_MASTER.md)
- [TESTING_QUICK_START.md](./TESTING_QUICK_START.md)
- [TESTING_TROUBLESHOOTING.md](./TESTING_TROUBLESHOOTING.md)

**Last Updated**: November 11, 2025
