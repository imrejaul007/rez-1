/**
 * Tests for API Utilities
 * Tests retry logic, timeout handling, error handling, and response standardization
 */

import {
  withRetry,
  withTimeout,
  withRetryAndTimeout,
  standardizeResponse,
  createErrorResponse,
  validateResponse,
  safeJsonParse,
  isNetworkError,
  isTimeoutError,
  getUserFriendlyErrorMessage,
  sleep,
  parseQueryParams,
  mergeResponses,
  RateLimiter,
  executeBatch,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_TIMEOUT_CONFIG,
} from '@/utils/apiUtils';

// Mock sleep function for faster tests
jest.mock('@/utils/apiUtils', () => {
  const actual = jest.requireActual('@/utils/apiUtils');
  return {
    ...actual,
    sleep: jest.fn((ms) => Promise.resolve()),
  };
});

describe('apiUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce({ status: 500, message: 'Server error' })
        .mockResolvedValue('success');

      const result = await withRetry(mockFn, { maxRetries: 3 });

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const mockFn = jest.fn().mockRejectedValue({ status: 404, message: 'Not found' });

      await expect(withRetry(mockFn, { maxRetries: 3 })).rejects.toEqual({
        status: 404,
        message: 'Not found',
      });

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should exhaust retries and throw last error', async () => {
      const mockFn = jest.fn().mockRejectedValue({ status: 500, message: 'Server error' });

      await expect(withRetry(mockFn, { maxRetries: 3 })).rejects.toEqual({
        status: 500,
        message: 'Server error',
      });

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should use custom retry config', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce({ status: 503, message: 'Service unavailable' })
        .mockResolvedValue('success');

      await withRetry(mockFn, {
        maxRetries: 5,
        retryableStatuses: [503],
      });

      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('withTimeout', () => {
    it('should succeed within timeout', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await withTimeout(mockFn, { timeout: 5000 });

      expect(result).toBe('success');
    });

    it('should throw timeout error if exceeded', async () => {
      const mockFn = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      );

      await expect(
        withTimeout(mockFn, { timeout: 100, timeoutMessage: 'Custom timeout' })
      ).rejects.toThrow('Custom timeout');
    });
  });

  describe('withRetryAndTimeout', () => {
    it('should combine retry and timeout', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValue('success');

      const result = await withRetryAndTimeout(
        mockFn,
        { maxRetries: 3 },
        { timeout: 5000 }
      );

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('standardizeResponse', () => {
    it('should keep already standardized response', () => {
      const response = {
        success: true,
        data: { id: '123' },
        message: 'Success',
      };

      const result = standardizeResponse(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123' });
      expect(result.message).toBe('Success');
      expect(result.timestamp).toBeDefined();
    });

    it('should standardize non-standard response', () => {
      const response = { id: '123', name: 'Test' };

      const result = standardizeResponse(response);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: '123', name: 'Test' });
      expect(result.timestamp).toBeDefined();
    });

    it('should add timestamp if missing', () => {
      const response = {
        success: true,
        data: { id: '123' },
      };

      const result = standardizeResponse(response);

      expect(result.timestamp).toBeDefined();
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response from error object', () => {
      const error = new Error('Test error');

      const result = createErrorResponse(error);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.message).toBe('Test error');
      expect(result.timestamp).toBeDefined();
    });

    it('should use default message if error has no message', () => {
      const error = {};

      const result = createErrorResponse(error, 'Default error');

      expect(result.error).toBe('Default error');
      expect(result.message).toBe('Default error');
    });

    it('should include validation errors', () => {
      const error = {
        message: 'Validation failed',
        errors: { email: ['Invalid email'] },
      };

      const result = createErrorResponse(error);

      expect(result.errors).toEqual({ email: ['Invalid email'] });
    });
  });

  describe('validateResponse', () => {
    it('should validate valid response', () => {
      const response = {
        success: true,
        data: { id: '123', name: 'Test' },
      };

      const result = validateResponse(response, ['id', 'name']);

      expect(result).toBe(true);
    });

    it('should return false for invalid response structure', () => {
      const response = { data: { id: '123' } }; // Missing success

      const result = validateResponse(response);

      expect(result).toBe(false);
    });

    it('should return false for missing required fields', () => {
      const response = {
        success: true,
        data: { id: '123' },
      };

      const result = validateResponse(response, ['id', 'name']);

      expect(result).toBe(false);
    });

    it('should validate response without required fields check', () => {
      const response = {
        success: true,
        data: { id: '123' },
      };

      const result = validateResponse(response);

      expect(result).toBe(true);
    });

    it('should return false for non-object response', () => {
      expect(validateResponse(null)).toBe(false);
      expect(validateResponse('invalid')).toBe(false);
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      const json = '{"id":"123","name":"Test"}';

      const result = safeJsonParse(json, {});

      expect(result).toEqual({ id: '123', name: 'Test' });
    });

    it('should return default value for invalid JSON', () => {
      const json = '{invalid json}';
      const defaultValue = { error: true };

      const result = safeJsonParse(json, defaultValue);

      expect(result).toEqual(defaultValue);
    });

    it('should handle complex objects', () => {
      const json = '{"nested":{"value":123},"array":[1,2,3]}';

      const result = safeJsonParse(json, {});

      expect(result).toEqual({ nested: { value: 123 }, array: [1, 2, 3] });
    });
  });

  describe('isNetworkError', () => {
    it('should detect network errors', () => {
      expect(isNetworkError({ message: 'Network request failed' })).toBe(true);
      expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true);
      expect(isNetworkError({ name: 'NetworkError' })).toBe(true);
      expect(isNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
      expect(isNetworkError({ code: 'ENOTFOUND' })).toBe(true);
    });

    it('should not detect non-network errors', () => {
      expect(isNetworkError({ message: 'Validation error' })).toBe(false);
      expect(isNetworkError({ status: 404 })).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should detect timeout errors', () => {
      expect(isTimeoutError({ name: 'AbortError' })).toBe(true);
      expect(isTimeoutError({ message: 'Request timeout' })).toBe(true);
      expect(isTimeoutError({ message: 'Timeout exceeded' })).toBe(true);
      expect(isTimeoutError({ code: 'ETIMEDOUT' })).toBe(true);
    });

    it('should not detect non-timeout errors', () => {
      expect(isTimeoutError({ message: 'Server error' })).toBe(false);
      expect(isTimeoutError({ status: 500 })).toBe(false);
    });
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('should return friendly message for network errors', () => {
      const error = { message: 'Network request failed' };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toContain('Network connection error');
    });

    it('should return friendly message for timeout errors', () => {
      const error = { name: 'AbortError' };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toContain('Request timed out');
    });

    it('should return friendly message for 401 errors', () => {
      const error = { status: 401 };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toContain('Authentication required');
    });

    it('should return friendly message for 403 errors', () => {
      const error = { status: 403 };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toContain('permission');
    });

    it('should return friendly message for 404 errors', () => {
      const error = { status: 404 };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toContain('not found');
    });

    it('should return friendly message for 429 errors', () => {
      const error = { status: 429 };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toContain('Too many requests');
    });

    it('should return friendly message for 500+ errors', () => {
      const error = { status: 500 };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toContain('Server error');
    });

    it('should return error message for other errors', () => {
      const error = { message: 'Custom error' };

      const result = getUserFriendlyErrorMessage(error);

      expect(result).toBe('Custom error');
    });
  });

  describe('parseQueryParams', () => {
    it('should parse query parameters', () => {
      const params = { id: '123', name: 'Test', active: true };

      const result = parseQueryParams(params);

      expect(result).toBe('id=123&name=Test&active=true');
    });

    it('should handle array parameters', () => {
      const params = { tags: ['tag1', 'tag2', 'tag3'] };

      const result = parseQueryParams(params);

      expect(result).toBe('tags=tag1&tags=tag2&tags=tag3');
    });

    it('should skip null and undefined values', () => {
      const params = { id: '123', name: null, active: undefined };

      const result = parseQueryParams(params);

      expect(result).toBe('id=123');
    });

    it('should handle empty params', () => {
      const params = {};

      const result = parseQueryParams(params);

      expect(result).toBe('');
    });
  });

  describe('mergeResponses', () => {
    it('should merge successful responses', () => {
      const responses = [
        { success: true, data: { id: '1' } },
        { success: true, data: { id: '2' } },
        { success: true, data: { id: '3' } },
      ];

      const result = mergeResponses(responses);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: '1' }, { id: '2' }, { id: '3' }]);
    });

    it('should filter out failed responses', () => {
      const responses = [
        { success: true, data: { id: '1' } },
        { success: false, error: 'Failed' },
        { success: true, data: { id: '2' } },
      ];

      const result = mergeResponses(responses);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('should return error if all responses failed', () => {
      const responses = [
        { success: false, error: 'Failed 1' },
        { success: false, error: 'Failed 2' },
      ];

      const result = mergeResponses(responses);

      expect(result.success).toBe(false);
      expect(result.error).toBe('All requests failed');
    });
  });

  describe('RateLimiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter(5, 1000);
      const mockFn = jest.fn().mockResolvedValue('success');

      const results = await Promise.all([
        limiter.execute(mockFn),
        limiter.execute(mockFn),
        limiter.execute(mockFn),
      ]);

      expect(results).toEqual(['success', 'success', 'success']);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });
  });

  describe('executeBatch', () => {
    it('should execute items in batches', async () => {
      const items = [1, 2, 3, 4, 5, 6, 7];
      const mockFn = jest.fn((item) => Promise.resolve(item * 2));

      const results = await executeBatch(items, mockFn, 3, 0);

      expect(results).toEqual([2, 4, 6, 8, 10, 12, 14]);
      expect(mockFn).toHaveBeenCalledTimes(7);
    });

    it('should handle empty array', async () => {
      const mockFn = jest.fn();

      const results = await executeBatch([], mockFn, 3);

      expect(results).toEqual([]);
      expect(mockFn).not.toHaveBeenCalled();
    });

    it('should handle batch size larger than array', async () => {
      const items = [1, 2, 3];
      const mockFn = jest.fn((item) => Promise.resolve(item * 2));

      const results = await executeBatch(items, mockFn, 10);

      expect(results).toEqual([2, 4, 6]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle retry with zero max retries', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(mockFn, { maxRetries: 0 });

      expect(result).toBe('success');
    });

    it('should handle standardizeResponse with null', () => {
      const result = standardizeResponse(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it('should handle empty error in createErrorResponse', () => {
      const result = createErrorResponse(null);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An error occurred');
    });

    it('should handle query params with special characters', () => {
      const params = { search: 'test & special' };

      const result = parseQueryParams(params);

      expect(result).toContain('search=');
    });
  });
});
