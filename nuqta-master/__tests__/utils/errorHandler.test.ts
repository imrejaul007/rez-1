/**
 * Unit Tests for errorHandler.ts
 */

import ErrorHandler, { ErrorLogger, ErrorCategory, ErrorSeverity } from '@/utils/errorHandler';
import { Alert } from 'react-native';

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ErrorLogger.clearLogs();
  });

  it('should normalize API errors', () => {
    const apiError = {
      code: 'API_ERROR',
      message: 'API request failed',
      details: { status: 500 },
    };

    const normalized = ErrorHandler.normalize(apiError);

    expect(normalized.code).toBe('API_ERROR');
    expect(normalized.message).toBe('API request failed');
    expect(normalized.timestamp).toBeInstanceOf(Date);
  });

  it('should normalize Error instances', () => {
    const error = new Error('Test error');
    const normalized = ErrorHandler.normalize(error);

    expect(normalized.code).toBe('CLIENT_ERROR');
    expect(normalized.message).toBe('Test error');
  });

  it('should return metadata for known error codes', () => {
    const metadata = ErrorHandler.getMetadata('NETWORK_ERROR');

    expect(metadata.category).toBe(ErrorCategory.NETWORK);
    expect(metadata.severity).toBe(ErrorSeverity.HIGH);
    expect(metadata.retryable).toBe(true);
  });

  it('should log errors', () => {
    const error = new Error('Test error');

    ErrorHandler.handle(error, { showAlert: false });

    const logs = ErrorLogger.getLogs();
    expect(logs).toHaveLength(1);
  });
});
