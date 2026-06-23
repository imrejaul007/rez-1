// @ts-nocheck
/**
 * Test Helper Functions
 *
 * Provides utility functions and helpers for testing React Native components
 * and bill upload functionality.
 */

import { ReactTestInstance } from 'react-test-renderer';
import { act } from '@testing-library/react-native';

// =============================================================================
// ASYNC UTILITIES
// =============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitForCondition(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 50
): Promise<void> {
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Condition timeout exceeded');
    }
    await delay(interval);
  }
}

/**
 * Wait for a specific amount of time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Flush all pending promises
 */
export async function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Wait for next tick
 */
export async function nextTick(): Promise<void> {
  return new Promise(resolve => process.nextTick(resolve));
}

// =============================================================================
// MOCK SETUP HELPERS
// =============================================================================

/**
 * Create a mock function with return values
 */
export function createMockFn<T = any>(returnValues: T[]): jest.Mock {
  const mockFn = jest.fn();
  returnValues.forEach((value, index) => {
    mockFn.mockReturnValueOnce(value);
  });
  return mockFn;
}

/**
 * Create a mock async function
 */
export function createMockAsyncFn<T = any>(
  returnValue: T,
  delay: number = 0
): jest.Mock {
  return jest.fn().mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve(returnValue), delay))
  );
}

/**
 * Create a mock rejected promise
 */
export function createMockRejectedFn(error: Error | string): jest.Mock {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  return jest.fn().mockRejectedValue(errorObj);
}

/**
 * Create a series of mock implementations
 */
export function createSequentialMock<T = any>(
  implementations: Array<() => T>
): jest.Mock {
  const mockFn = jest.fn();
  implementations.forEach(impl => {
    mockFn.mockImplementationOnce(impl);
  });
  return mockFn;
}

// =============================================================================
// COMPONENT TEST HELPERS
// =============================================================================

/**
 * Find element by test ID
 */
export function findByTestId(
  container: ReactTestInstance,
  testId: string
): ReactTestInstance | null {
  try {
    return container.findByProps({ testID: testId });
  } catch {
    return null;
  }
}

/**
 * Find all elements by test ID
 */
export function findAllByTestId(
  container: ReactTestInstance,
  testId: string
): ReactTestInstance[] {
  try {
    return container.findAllByProps({ testID: testId });
  } catch {
    return [];
  }
}

/**
 * Check if element exists
 */
export function elementExists(
  container: ReactTestInstance,
  testId: string
): boolean {
  return findByTestId(container, testId) !== null;
}

/**
 * Get element text content
 */
export function getTextContent(element: ReactTestInstance): string {
  if (typeof element.props.children === 'string') {
    return element.props.children;
  }
  if (Array.isArray(element.props.children)) {
    return element.props.children
      .filter(child => typeof child === 'string')
      .join('');
  }
  return '';
}

// =============================================================================
// FORM TESTING HELPERS
// =============================================================================

/**
 * Fill form field
 */
export async function fillFormField(
  getByPlaceholderText: (text: string) => ReactTestInstance,
  placeholder: string,
  value: string
): Promise<void> {
  await act(async () => {
    const input = getByPlaceholderText(placeholder);
    input.props.onChangeText(value);
  });
}

/**
 * Submit form
 */
export async function submitForm(
  getByText: (text: string) => ReactTestInstance,
  buttonText: string
): Promise<void> {
  await act(async () => {
    const button = getByText(buttonText);
    button.props.onPress();
  });
}

/**
 * Check if form field has error
 */
export function hasFormError(
  queryByText: (text: string | RegExp) => ReactTestInstance | null,
  errorText: string | RegExp
): boolean {
  return queryByText(errorText) !== null;
}

// =============================================================================
// UPLOAD TESTING HELPERS
// =============================================================================

/**
 * Simulate file upload progress
 */
export async function simulateUploadProgress(
  progressCallback: (progress: any) => void,
  steps: number = 10,
  totalSize: number = 1000
): Promise<void> {
  for (let i = 1; i <= steps; i++) {
    await act(async () => {
      const loaded = (totalSize / steps) * i;
      progressCallback({
        loaded,
        total: totalSize,
        percentage: Math.round((loaded / totalSize) * 100),
        speed: loaded / i,
        timeRemaining: (totalSize - loaded) / (loaded / i),
        startTime: Date.now() - i * 100,
        currentTime: Date.now(),
      });
    });
    await delay(50);
  }
}

/**
 * Create mock file object
 */
export function createMockFile(
  name: string = 'test.jpg',
  size: number = 1024,
  type: string = 'image/jpeg'
): File {
  const blob = new Blob(['test content'], { type });
  return new File([blob], name, { type });
}

/**
 * Create mock image URI
 */
export function createMockImageUri(
  filename: string = 'test-image.jpg'
): string {
  return `file://mock/path/${filename}`;
}

// =============================================================================
// ASYNC STORAGE HELPERS
// =============================================================================

/**
 * Setup AsyncStorage mock with data
 */
export function setupAsyncStorageMock(
  initialData: Record<string, any> = {}
): void {
  const AsyncStorage = require('@react-native-async-storage/async-storage');

  const storage: Record<string, string> = {};

  // Pre-populate with initial data
  Object.entries(initialData).forEach(([key, value]) => {
    storage[key] = JSON.stringify(value);
  });

  AsyncStorage.setItem = jest.fn(async (key: string, value: string) => {
    storage[key] = value;
  });

  AsyncStorage.getItem = jest.fn(async (key: string) => {
    return storage[key] || null;
  });

  AsyncStorage.removeItem = jest.fn(async (key: string) => {
    delete storage[key];
  });

  AsyncStorage.clear = jest.fn(async () => {
    Object.keys(storage).forEach(key => delete storage[key]);
  });

  AsyncStorage.getAllKeys = jest.fn(async () => {
    return Object.keys(storage);
  });

  AsyncStorage.multiGet = jest.fn(async (keys: string[]) => {
    return keys.map(key => [key, storage[key] || null]);
  });
}

/**
 * Get all data from AsyncStorage mock
 */
export async function getAllAsyncStorageData(): Promise<Record<string, any>> {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  const keys = await AsyncStorage.getAllKeys();
  const data = await AsyncStorage.multiGet(keys);

  return data.reduce((acc: Record<string, any>, [key, value]: [string, string]) => {
    try {
      acc[key] = JSON.parse(value);
    } catch {
      acc[key] = value;
    }
    return acc;
  }, {});
}

// =============================================================================
// API MOCKING HELPERS
// =============================================================================

/**
 * Create mock API response
 */
export function createMockApiResponse<T>(
  data: T,
  success: boolean = true,
  message?: string
) {
  return {
    success,
    data: success ? data : undefined,
    error: success ? undefined : 'Mock error',
    message: message || (success ? 'Success' : 'Error'),
  };
}

/**
 * Create mock API error response
 */
export function createMockApiError(
  errorMessage: string,
  statusCode: number = 500
) {
  return {
    success: false,
    error: errorMessage,
    statusCode,
  };
}

/**
 * Setup API client mock
 */
export function setupApiClientMock(responses: Record<string, any> = {}): void {
  const apiClient = require('@/services/apiClient').default;

  apiClient.get = jest.fn((endpoint: string) => {
    return Promise.resolve(
      responses[endpoint] || createMockApiResponse(null, false, 'Not mocked')
    );
  });

  apiClient.post = jest.fn((endpoint: string, data: any) => {
    return Promise.resolve(
      responses[endpoint] || createMockApiResponse(null, false, 'Not mocked')
    );
  });

  apiClient.uploadFile = jest.fn((endpoint: string, formData: any) => {
    return Promise.resolve(
      responses[endpoint] || createMockApiResponse(null, false, 'Not mocked')
    );
  });
}

// =============================================================================
// DATE/TIME HELPERS
// =============================================================================

/**
 * Create date relative to today
 */
export function createRelativeDate(daysOffset: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
}

/**
 * Create ISO date string relative to today
 */
export function createRelativeDateString(daysOffset: number): string {
  return createRelativeDate(daysOffset).toISOString();
}

/**
 * Create date in YYYY-MM-DD format
 */
export function formatDateYYYYMMDD(date: Date): string {
  return date.toISOString().split('T')[0];
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Create valid bill data
 */
export function createValidBillData(overrides: Record<string, any> = {}) {
  return {
    billImage: 'file://test-bill.jpg',
    merchantId: 'merchant-123',
    amount: '1000',
    billDate: new Date(),
    billNumber: 'INV-001',
    notes: 'Test bill',
    ...overrides,
  };
}

/**
 * Create invalid bill data
 */
export function createInvalidBillData(invalidFields: string[] = ['amount']) {
  const data = createValidBillData();

  invalidFields.forEach(field => {
    switch (field) {
      case 'amount':
        data.amount = '25'; // Below minimum
        break;
      case 'billDate':
        data.billDate = createRelativeDate(50); // Too old
        break;
      case 'merchantId':
        data.merchantId = '';
        break;
      case 'billImage':
        data.billImage = '';
        break;
    }
  });

  return data;
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert element is visible
 */
export function assertElementVisible(
  getByTestId: (testId: string) => ReactTestInstance,
  testId: string
): void {
  const element = getByTestId(testId);
  expect(element).toBeTruthy();
  expect(element.props.style?.display).not.toBe('none');
}

/**
 * Assert element is hidden
 */
export function assertElementHidden(
  queryByTestId: (testId: string) => ReactTestInstance | null,
  testId: string
): void {
  const element = queryByTestId(testId);
  if (element) {
    expect(element.props.style?.display).toBe('none');
  } else {
    expect(element).toBeNull();
  }
}

/**
 * Assert loading state
 */
export function assertIsLoading(
  queryByTestId: (testId: string) => ReactTestInstance | null
): void {
  const loader = queryByTestId('loading-indicator');
  expect(loader).toBeTruthy();
}

/**
 * Assert not loading
 */
export function assertNotLoading(
  queryByTestId: (testId: string) => ReactTestInstance | null
): void {
  const loader = queryByTestId('loading-indicator');
  expect(loader).toBeNull();
}

// =============================================================================
// PERFORMANCE HELPERS
// =============================================================================

/**
 * Measure execution time
 */
export async function measureTime<T>(
  fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
  const startTime = performance.now();
  const result = await fn();
  const duration = performance.now() - startTime;
  return { result, duration };
}

/**
 * Assert execution time is within limit
 */
export async function assertExecutionTime<T>(
  fn: () => Promise<T>,
  maxDuration: number
): Promise<T> {
  const { result, duration } = await measureTime(fn);
  expect(duration).toBeLessThan(maxDuration);
  return result;
}

// =============================================================================
// CLEANUP HELPERS
// =============================================================================

/**
 * Clear all mocks
 */
export function clearAllMocks(): void {
  jest.clearAllMocks();
}

/**
 * Reset all mocks
 */
export function resetAllMocks(): void {
  jest.resetAllMocks();
}

/**
 * Restore all mocks
 */
export function restoreAllMocks(): void {
  jest.restoreAllMocks();
}

// =============================================================================
// EXPORT ALL HELPERS
// =============================================================================

export const testHelpers = {
  // Async utilities
  waitForCondition,
  delay,
  flushPromises,
  nextTick,

  // Mock setup
  createMockFn,
  createMockAsyncFn,
  createMockRejectedFn,
  createSequentialMock,

  // Component helpers
  findByTestId,
  findAllByTestId,
  elementExists,
  getTextContent,

  // Form helpers
  fillFormField,
  submitForm,
  hasFormError,

  // Upload helpers
  simulateUploadProgress,
  createMockFile,
  createMockImageUri,

  // AsyncStorage helpers
  setupAsyncStorageMock,
  getAllAsyncStorageData,

  // API helpers
  createMockApiResponse,
  createMockApiError,
  setupApiClientMock,

  // Date/time helpers
  createRelativeDate,
  createRelativeDateString,
  formatDateYYYYMMDD,

  // Validation helpers
  createValidBillData,
  createInvalidBillData,

  // Assertion helpers
  assertElementVisible,
  assertElementHidden,
  assertIsLoading,
  assertNotLoading,

  // Performance helpers
  measureTime,
  assertExecutionTime,

  // Cleanup helpers
  clearAllMocks,
  resetAllMocks,
  restoreAllMocks,
};

export default testHelpers;
