# @rez/shared Package Implementation

## Overview

This document describes the implementation of the `@rez/shared` package that consolidates cross-service utilities for REZ backend services.

## Package Structure

```
src/@rez/shared/
├── src/
│   ├── response.ts      # Response helper functions
│   ├── errors.ts        # Custom error class hierarchy
│   ├── validators.ts    # Validation utilities
│   ├── sanitization.ts # Input sanitization utilities
│   └── index.ts         # Main entry point
├── package.json         # Package configuration
└── tsconfig.json        # TypeScript configuration
```

## Features

### 1. Response Helpers (`response.ts`)

Provides standardized API response formatting for all microservices.

**Interface: `APIResponse<T>`**
```typescript
interface APIResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    timestamp?: string;
    version?: string;
  };
  errors?: Array<{
    field?: string;
    message: string;
  }>;
}
```

**Functions:**
- `sendSuccess(res, data?, message?, statusCode?, meta?)` - Send success response
- `sendError(res, message?, statusCode?, errors?)` - Send error response
- `sendPaginated(res, data, page, limit, total, message?)` - Send paginated response
- `sendCreated(res, data, message?)` - Send 201 Created response
- `sendNoContent(res)` - Send 204 No Content response
- `sendNotFound(res, message?)` - Send 404 Not Found response
- `sendBadRequest(res, message?)` - Send 400 Bad Request response
- `sendValidationError(res, errors, message?)` - Send validation error response
- `sendUnauthorized(res, message?)` - Send 401 Unauthorized response
- `sendForbidden(res, message?)` - Send 403 Forbidden response
- `sendConflict(res, message?)` - Send 409 Conflict response
- `sendTooManyRequests(res, message?)` - Send 429 Too Many Requests response
- `sendInternalError(res, message?)` - Send 500 Internal Server Error response
- `sendServiceUnavailable(res, message?)` - Send 503 Service Unavailable response

### 2. Error Classes (`errors.ts`)

Custom error hierarchy for standardized error handling.

**Base Class: `AppError`**
```typescript
class AppError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;
  errors?: Array<{ field?: string; message: string }>;
}
```

**Error Classes:**
- `ValidationError` - 400 status code
- `AuthenticationError` - 401 status code
- `AuthorizationError` - 403 status code
- `NotFoundError` - 404 status code
- `ConflictError` - 409 status code
- `PaymentError` - 402 status code
- `RateLimitError` - 429 status code
- `ServiceUnavailableError` - 503 status code

**Error Codes:**
```typescript
const ErrorCodes = {
  AUTH_001: 'Invalid credentials',
  AUTH_002: 'Token expired',
  AUTH_003: 'Invalid token',
  AUTH_004: 'Unauthorized access',
  AUTH_005: 'Account locked',
  AUTH_006: 'Insufficient permissions',
  AUTH_007: 'MFA required',
  AUTH_008: 'Invalid OTP',
  AUTH_009: 'OTP expired',
  SRV_001: 'Internal server error',
  SRV_002: 'Database error',
  SRV_003: 'Service unavailable',
  RES_001: 'Resource not found',
  RES_002: 'Resource already exists',
  RES_003: 'Resource deleted',
  VAL_001: 'Invalid input',
  VAL_002: 'Missing required field',
  RATE_001: 'Too many requests',
};
```

### 3. Validators (`validators.ts`)

Validation utilities for common data types.

**Functions:**
- `isValidEmail(email)` - Validate email addresses
- `isValidPhone(phone)` - Validate phone numbers (international format)
- `isValidOTP(otp)` - Validate 6-digit OTP codes
- `isValidObjectId(id)` - Validate MongoDB ObjectIds
- `isValidURL(url)` - Validate URLs
- `isValidLength(str, min?, max?)` - Validate string length
- `isAlphanumeric(str)` - Check if string is alphanumeric
- `isNumeric(str)` - Check if string is numeric
- `isStrongPassword(password, options?)` - Validate password strength
- `isValidReferralCode(code)` - Validate referral code format
- `isValidDate(dateStr)` - Validate date strings
- `isValidISODate(dateStr)` - Validate ISO date strings

### 4. Sanitization (`sanitization.ts`)

Input sanitization to prevent XSS and injection attacks.

**Middleware:**
- `sanitizeBody` - Middleware to sanitize request body
- `sanitizeQuery` - Middleware to sanitize query parameters
- `sanitizeParams` - Middleware to sanitize URL parameters
- `sanitizeRequest` - Combined middleware for all request data

**Functions:**
- `sanitizeInput(input)` - Sanitize string input
- `sanitizeHTML(input)` - Sanitize HTML content
- `sanitizeEmail(email)` - Sanitize and normalize email
- `sanitizePhoneNumber(phone)` - Sanitize phone number
- `sanitizeURL(url)` - Sanitize and validate URL
- `sanitizeMongoQuery(query)` - Sanitize MongoDB queries
- `sanitizeObjectId(id)` - Sanitize ObjectId
- `sanitizeProductText(text, options?)` - Sanitize product text fields
- `sanitizeText(input)` - Alias for sanitizeInput
- `normalizePhoneNumber(phone)` - Normalize to international format

## Usage

### Installation

Add the package to your service's dependencies:

```json
{
  "dependencies": {
    "@rez/shared": "file:../src/@rez/shared"
  }
}
```

Or reference it in your `tsconfig.json` paths:

```json
{
  "compilerOptions": {
    "paths": {
      "@rez/shared": ["../src/@rez/shared/src"]
    }
  }
}
```

### Example Usage

**In rez-backend-master:**

```typescript
// Before (local imports)
import { sendSuccess, sendError } from '../utils/response';
import { AppError } from '../utils/AppError';

// After (shared package)
import { sendSuccess, sendError, AppError } from '@rez/shared';
```

**In rez-auth-service:**

```typescript
// Before
import { errorResponse, successResponseWithRes } from '../utils/errorResponse';
import { ApiError } from '../utils/errorResponse';

// After
import { sendError, sendSuccess, AppError } from '@rez/shared';
```

## Migration Guide

### For rez-backend-master

1. Update imports in files using response helpers:
   ```typescript
   // Old
   import { sendSuccess, sendError, sendPaginated } from '../utils/response';

   // New
   import { sendSuccess, sendError, sendPaginated } from '@rez/shared';
   ```

2. Update imports in files using error classes:
   ```typescript
   // Old
   import { AppError, ValidationError } from '../utils/AppError';

   // New
   import { AppError, ValidationError } from '@rez/shared';
   ```

3. For sanitization middleware, update imports:
   ```typescript
   // Old
   import { sanitizeBody, sanitizeHTML } from '../middleware/sanitization';

   // New
   import { sanitizeBody, sanitizeHTML } from '@rez/shared';
   ```

### For rez-auth-service

1. The auth service uses a different response format. Create compatibility wrappers if needed, or update the response format to match the shared package.

2. Update error imports:
   ```typescript
   // Old
   import { ApiError, errorResponse } from '../utils/errorResponse';

   // New
   import { AppError, sendError } from '@rez/shared';
   ```

## Files to Update

### rez-backend-master
- `src/utils/response.ts` - Remove after migration
- `src/utils/AppError.ts` - Remove after migration
- `src/middleware/sanitization.ts` - Remove after migration (use shared package)

### rez-auth-service
- `src/utils/response.ts` - Update to re-export from shared package
- `src/utils/errorResponse.ts` - Update to re-export from shared package

## Implementation Notes

1. **Backward Compatibility**: The shared package maintains compatibility with both existing codebases.

2. **Express Dependency**: The response helpers depend on Express `Response` type. Both services use Express.

3. **Validator Dependency**: Uses the `validator` npm package for email, URL, and escape functions.

4. **No Side Effects**: All functions are pure and do not have side effects.

5. **Type Safety**: Full TypeScript support with proper type exports.

## Future Enhancements

Potential additions for future versions:
- Rate limiting utilities
- Logging utilities
- Metrics/observability helpers
- Request ID middleware
- CORS configuration helpers
