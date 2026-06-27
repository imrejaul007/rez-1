# Duplicate Code Analysis

## Summary
Analysis across three backend services: `nuqta-master`, `rez-backend-master`, and `rez-auth-service`

> **Note**: This report only identifies duplicates for review. No code modifications were made.

---

## Duplicate Code Found

### 1. Response Helper Functions
**Confidence: HIGH - Clear duplication**
**Variation Analysis: INTENTIONAL** - Services have slightly different API requirements

| Location | Functions |
|----------|-----------|
| `rez-backend-master:src/utils/response.ts:25-159` | `sendSuccess`, `sendError`, `sendPaginated`, `sendCreated`, `sendNotFound`, `sendBadRequest`, `sendUnauthorized`, `sendForbidden`, `sendConflict`, `sendTooManyRequests`, `sendInternalError`, `sendServiceUnavailable` |
| `rez-auth-service:src/utils/errorResponse.ts:52-120` | `errorResponse`, `successResponse`, `errorResponseWithRes`, `successResponseWithRes` |

**Analysis**: Both implement Express Response wrappers with similar patterns. The `rez-auth-service` version is more minimal (auth-focused), while `rez-backend-master` has comprehensive HTTP status helpers. **Consider consolidation** into shared package with both styles available.

---

### 2. Error Class Hierarchy
**Confidence: HIGH - Clear duplication**
**Variation Analysis: COPY-PASTE** - Both implement nearly identical class hierarchies

| Location | Classes |
|----------|---------|
| `rez-backend-master:src/utils/AppError.ts:7-69` | `AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `PaymentError`, `RateLimitError` |
| `rez-auth-service:src/utils/errorResponse.ts:31-41` | `ApiError` |

**Code Comparison**:
```typescript
// rez-backend-master
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', errors?) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

// rez-auth-service
class ApiError extends Error {
  constructor(public statusCode, message, public code?, public details?) {
    super(message);
    this.name = 'ApiError';
  }
}
```

**Analysis**: Nearly identical patterns. **Recommend consolidation** into single error class with optional `errors` and `details` arrays.

---

### 3. Error Code Constants
**Confidence: HIGH - Clear duplication**
**Variation Analysis: COPY-PASTE** - Same codes, same meanings, different locations

| Location | Error Codes |
|----------|-------------|
| `rez-backend-master:src/middleware/errorHandler.ts:55-126` | `AUTH_001-009`, `SRV_001-003`, `RES_001-003`, `VAL_001-002`, `RATE_001` |
| `rez-auth-service:src/utils/errorResponse.ts:125-153` | `AUTH_001-009`, `SRV_001-003`, `RES_001-003`, `VAL_001-002`, `RATE_001` |

**Analysis**: Identical error codes defined in 2 places. **Recommend consolidation** into shared constants file.

---

### 4. Sanitization Functions
**Confidence: MEDIUM - Similar patterns but different scope**
**Variation Analysis: INTENTIONAL** - Different service requirements

| Location | Functions |
|----------|-----------|
| `nuqta-master:utils/inputSanitization.ts:4-31` | `sanitizeInput`, `sanitizeNumber`, `sanitizeBillNumber` |
| `rez-backend-master:src/middleware/sanitization.ts:4-430` | `deepSanitize`, `sanitizeMongoQuery`, `sanitizeHTML`, `sanitizeProductText`, `preventNoSQLInjection`, `sanitizeEmail`, `sanitizePhoneNumber`, `sanitizeURL`, `sanitizeObjectId` |

**Analysis**: `rez-backend-master` is significantly more comprehensive with XSS prevention, NoSQL injection protection, and field-specific sanitization. `nuqta-master` has basic sanitization. **Consider adopting rez-backend-master's sanitization** as the standard.

---

### 5. Email/Phone Validation Regex
**Confidence: HIGH - Exact duplication**
**Variation Analysis: COPY-PASTE** - Identical regex patterns scattered

| Location | Email Pattern | Phone Pattern |
|----------|---------------|--------------|
| `nuqta-master:hooks/useOnboarding.ts:142` | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `/^[+]?[\d\s\-\(\)]{10,}$/` |
| `nuqta-master:services/authApi.ts:154` | `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` | `/^\+?[1-9]\d{6,14}$/` |
| `nuqta-master:types/unified/validators.ts:603,611` | Same as above | Same as above |
| `nuqta-master:__tests__/utils/validation.test.ts` | Tests for same validators | Tests for same validators |

**Analysis**: Email regex is identical across 4 locations. Phone regex varies slightly (intentional - different validation strictness for different use cases). **Recommend extracting to shared validators.ts**.

---

### 6. Rate Limiter Implementations
**Confidence: HIGH - Nearly identical patterns**
**Variation Analysis: COPY-PASTE** - Same architecture, same Redis patterns

| Location | Key Pattern |
|----------|------------|
| `rez-backend-master:src/middleware/rateLimiter.ts:1-583` | Uses `rate-limit-redis`, lazy store creation, complex factory |
| `rez-auth-service:src/middleware/rateLimiter.ts:1-265` | Uses `redis.pipeline()` directly, simpler implementation |

**Common Patterns Found**:
```typescript
// Both services do this:
const pipeline = redis.pipeline();
pipeline.incr(key);
pipeline.expire(key, windowSec);
const results = await pipeline.exec();
```

**Analysis**: `rez-auth-service` has optimized pipeline pattern. `rez-backend-master` has more features (lazy store, fail-open modes). **Consider extracting shared rate limiter factory**.

---

### 7. JWT Decode for Rate Limiting
**Confidence: HIGH - Exact duplication**
**Variation Analysis: COPY-PASTE** - Identical code

| Location | Code |
|----------|------|
| `rez-backend-master:src/middleware/auth.ts:156` | `jwt.decode(token) as { userId?: string; sub?: string }` |
| `rez-auth-service:src/middleware/rateLimiter.ts:153` | `jwt.decode(token) as { userId?: string; sub?: string }` |

**Analysis**: Identical pattern for extracting userId from JWT without verification (appropriate for rate limiting). **Recommend extracting helper function**.

---

### 8. Auth Middleware
**Confidence: MEDIUM - Similar patterns but different scope**
**Variation Analysis: INTENTIONAL** - Different service responsibilities

| Location | Scope |
|----------|-------|
| `rez-backend-master:src/middleware/auth.ts:164-355` | Full auth with shadow user creation, device fingerprinting, role hierarchy |
| `rez-auth-service:src/middleware/auth.ts:42-101` | Token validation, corp role checking |

**Analysis**: Intentional differences due to service boundaries. Auth-service handles token validation, backend handles user state. **Not recommended for consolidation** - different responsibilities.

---

### 9. Logger Configuration
**Confidence: MEDIUM - Similar features, different implementations**
**Variation Analysis: INTENTIONAL** - Both use Winston with similar patterns

| Location | Features |
|----------|----------|
| `rez-backend-master:src/config/logger.ts` | Correlation IDs, log sanitization, service loggers |
| `rez-auth-service:src/config/logger.ts` | Similar patterns |

**Analysis**: Both implement Winston with correlation IDs and sanitization. **Consider consolidation** but not critical.

---

### 10. Global Error Handlers
**Confidence: MEDIUM - Similar classification logic**
**Variation Analysis: COPY-PASTE** - Same error classification patterns

| Location | Handled Errors |
|----------|----------------|
| `rez-backend-master:src/middleware/errorHandler.ts:166-220` | Mongoose, JWT, Stripe, Razorpay, Twilio, SendGrid, MongoDB |
| `rez-auth-service:error handling` | JWT, auth-specific errors |

**Analysis**: Classification logic is similar. `rez-backend-master` is more comprehensive (payment integrations). **Consider extracting classification function**.

---

## Priority Summary

| Priority | Finding | Confidence | Recommendation |
|----------|---------|------------|----------------|
| HIGH | Error codes | HIGH | Consolidate to shared constants |
| HIGH | Error classes | HIGH | Consolidate AppError + ApiError |
| HIGH | Email validation regex | HIGH | Extract to validators.ts |
| HIGH | JWT decode pattern | HIGH | Extract helper function |
| MEDIUM | Response helpers | HIGH | Create unified API response package |
| MEDIUM | Rate limiter patterns | HIGH | Extract rate limiter factory |
| MEDIUM | Sanitization | MEDIUM | Adopt rez-backend as standard |
| LOW | Logger config | MEDIUM | Consider consolidation |
| LOW | Auth middleware | MEDIUM | Intentional - don't consolidate |

---

## Cross-Service Shared Package Proposal

```
@rez/shared
├── src/
│   ├── utils/
│   │   ├── apiResponse.ts      # Response helpers (sendSuccess, sendError, etc.)
│   │   ├── errorHandler.ts     # Error classes (AppError, ValidationError, etc.)
│   │   ├── sanitization.ts     # XSS/NoSQL prevention
│   │   ├── validators.ts        # Email, phone, OTP validation
│   │   ├── jwt.ts              # JWT utilities (decode, extract userId)
│   │   └── rateLimiter.ts      # Rate limiting factory
│   ├── constants/
│   │   ├── errorCodes.ts       # AUTH_001, SRV_001, etc.
│   │   └── statusCodes.ts      # HTTP status codes
│   └── types/
│       └── express.d.ts        # Extended Express types
```

---

## Files Requiring Investigation

| Pattern | Files Count | Example Locations |
|---------|------------|------------------|
| `isValidObjectId` checks | 147 | Various route files |
| `asyncHandler` usage | 250+ | All controllers/routes |
| JWT decode patterns | 29 | Auth middleware, tests |
| Sanitization imports | 132 | Route files, controllers |
