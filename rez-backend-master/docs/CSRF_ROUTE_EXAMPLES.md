# CSRF Protection - Route Examples

This document shows how to apply CSRF protection to different types of routes in the backend.

## Option 1: Global Protection (Recommended)

Apply CSRF token generation globally and validation to all state-changing routes:

```typescript
// src/server.ts

import { setCsrfToken, validateCsrfToken } from './middleware/csrf';

// Set CSRF token for all requests (generates and sends token)
app.use(setCsrfToken);

// Apply validation only to state-changing methods globally
app.use((req, res, next) => {
  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return validateCsrfToken(req, res, next);
  }
  next();
});
```

## Option 2: Per-Route Protection

Apply CSRF protection to specific routes:

```typescript
// src/merchantroutes/products.ts

import { validateCsrfToken } from '../middleware/csrf';

// Apply to specific routes
router.post('/', validateCsrfToken, createProduct);
router.put('/:id', validateCsrfToken, updateProduct);
router.delete('/:id', validateCsrfToken, deleteProduct);

// GET routes don't need CSRF protection
router.get('/', getProducts);
router.get('/:id', getProduct);
```

## Option 3: Router-Level Protection

Apply CSRF to all routes in a router:

```typescript
// src/merchantroutes/products.ts

import { validateCsrfToken } from '../middleware/csrf';

const router = Router();

// Apply CSRF to all routes in this router
// (GET/HEAD/OPTIONS are automatically exempted)
router.use(validateCsrfToken);

router.get('/', getProducts);           // Automatically exempted
router.post('/', createProduct);         // CSRF validated
router.put('/:id', updateProduct);       // CSRF validated
router.delete('/:id', deleteProduct);    // CSRF validated
```

## Example: Protecting Product Routes

```typescript
// src/merchantroutes/products.ts

import { Router } from 'express';
import { authMiddleware } from '../middleware/merchantauth';
import { validateCsrfToken, requireCsrfToken } from '../middleware/csrf';
import { validateRequest } from '../middleware/merchantvalidation';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Option A: Apply CSRF to specific routes
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', validateCsrfToken, validateRequest(schema), createProduct);
router.put('/:id', validateCsrfToken, validateRequest(schema), updateProduct);
router.delete('/:id', validateCsrfToken, deleteProduct);

// Option B: Apply CSRF to all state-changing methods
router.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return requireCsrfToken(req, res, next);
  }
  next();
});

router.post('/', validateRequest(schema), createProduct);
router.put('/:id', validateRequest(schema), updateProduct);
router.delete('/:id', deleteProduct);

export default router;
```

## Example: Mixed Protection Strategy

Some routes need CSRF, others don't (like webhooks):

```typescript
// src/server.ts

import { setCsrfToken, validateCsrfToken } from './middleware/csrf';

// Generate CSRF tokens for all requests
app.use(setCsrfToken);

// User routes - require CSRF
app.use('/api/user', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return validateCsrfToken(req, res, next);
  }
  next();
});
app.use('/api/user/auth', authRoutes);
app.use('/api/user/profile', profileRoutes);

// Merchant routes - require CSRF
app.use('/api/merchant', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    return validateCsrfToken(req, res, next);
  }
  next();
});
app.use('/api/merchant/products', productRoutes);
app.use('/api/merchant/orders', orderRoutes);

// Webhook routes - NO CSRF (automatically exempted)
app.use('/api/webhooks', webhookRoutes);
app.use('/api/razorpay/webhook', razorpayWebhook);
```

## Example: Conditional CSRF Based on Client Type

Different protection for web vs mobile clients:

```typescript
// Custom middleware
const csrfForWebClients = (req: Request, res: Response, next: NextFunction) => {
  // Check if request has JWT (mobile/API client)
  const hasJWT = req.headers.authorization?.startsWith('Bearer ');

  if (hasJWT) {
    // JWT clients are exempt from CSRF
    return next();
  }

  // Web clients need CSRF
  return validateCsrfToken(req, res, next);
};

// Apply to routes
router.post('/products', csrfForWebClients, createProduct);
```

## Example: CSRF with Rate Limiting

Combine CSRF with rate limiting for maximum security:

```typescript
import { validateCsrfToken } from '../middleware/csrf';
import { productWriteLimiter } from '../middleware/rateLimiter';

router.post('/',
  productWriteLimiter,      // Rate limiting
  validateCsrfToken,        // CSRF protection
  validateRequest(schema),  // Input validation
  sanitizeInput,            // Input sanitization
  createProduct            // Controller
);
```

## Example: Error Handling

Handle CSRF errors gracefully:

```typescript
// Global error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // CSRF errors
  if (err.code?.includes('CSRF_TOKEN')) {
    return res.status(403).json({
      success: false,
      message: err.message,
      code: err.code,
      hint: 'Please refresh the page and try again'
    });
  }

  // Other errors
  next(err);
});
```

## Example: CSRF in Tests

Test CSRF protection in your routes:

```typescript
// test/products.test.ts

import request from 'supertest';
import { app } from '../src/server';

describe('Product Routes CSRF', () => {
  let csrfToken: string;
  let cookies: string[];

  beforeEach(async () => {
    // Get CSRF token before each test
    const response = await request(app)
      .get('/api/csrf-token');

    csrfToken = response.body.token;
    cookies = response.headers['set-cookie'];
  });

  it('should reject POST without CSRF token', async () => {
    const response = await request(app)
      .post('/api/merchant/products')
      .set('Authorization', 'Bearer fake-token')
      .send({ name: 'Test Product' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
  });

  it('should accept POST with valid CSRF token', async () => {
    const response = await request(app)
      .post('/api/merchant/products')
      .set('Authorization', 'Bearer valid-token')
      .set('X-CSRF-Token', csrfToken)
      .set('Cookie', cookies)
      .send({ name: 'Test Product' });

    expect(response.status).not.toBe(403);
  });

  it('should accept POST with JWT (auto-exempt)', async () => {
    // JWT tokens bypass CSRF
    const response = await request(app)
      .post('/api/merchant/products')
      .set('Authorization', 'Bearer valid-jwt-token')
      .send({ name: 'Test Product' });

    // Should not fail due to CSRF
    expect(response.body.code).not.toContain('CSRF_TOKEN');
  });
});
```

## Example: CSRF with Authentication

Combine CSRF with JWT authentication:

```typescript
import { authMiddleware } from '../middleware/merchantauth';
import { validateCsrfToken } from '../middleware/csrf';

// Option 1: Auth first, then CSRF
router.post('/',
  authMiddleware,        // Verify JWT
  validateCsrfToken,     // Check CSRF (if not JWT)
  createProduct
);

// Option 2: CSRF first, then auth
router.post('/',
  validateCsrfToken,     // Check CSRF (auto-skips if JWT)
  authMiddleware,        // Verify JWT
  createProduct
);
```

## Best Practices

### 1. Apply CSRF Early in Middleware Chain

```typescript
// Good: CSRF before business logic
router.post('/',
  validateCsrfToken,
  authMiddleware,
  validateRequest,
  createProduct
);

// Bad: CSRF after expensive operations
router.post('/',
  authMiddleware,
  validateRequest,
  expensiveOperation,
  validateCsrfToken,  // Too late!
  createProduct
);
```

### 2. Don't Apply CSRF to Webhooks

```typescript
// Webhooks use signature verification instead
router.post('/webhooks/razorpay',
  verifyRazorpaySignature,  // Not validateCsrfToken
  handleWebhook
);
```

### 3. Exempt Public APIs

```typescript
// Public read-only API
router.get('/api/public/products', getProducts);  // No CSRF needed

// Authenticated API
router.post('/api/products',
  authMiddleware,
  validateCsrfToken,  // CSRF for authenticated users
  createProduct
);
```

### 4. Log CSRF Violations

```typescript
import { logger } from '../config/logger';

router.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code?.includes('CSRF_TOKEN')) {
    logger.warn('CSRF violation', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }
  next(err);
});
```

## Summary

- **Global**: Apply to all routes, auto-exempt safe methods
- **Per-Route**: Apply only where needed, maximum control
- **Router-Level**: Apply to entire router, good for feature modules
- **Conditional**: Different rules for different client types
- **Combined**: Use with auth, rate limiting, validation for defense in depth

Choose the approach that best fits your application architecture.
