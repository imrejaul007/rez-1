# CSRF Protection Implementation Guide

## Overview

This backend implements comprehensive CSRF (Cross-Site Request Forgery) protection to secure state-changing operations against unauthorized requests. The implementation uses the **Double Submit Cookie** pattern with additional security enhancements.

## What is CSRF?

Cross-Site Request Forgery (CSRF) is an attack that forces authenticated users to execute unwanted actions on a web application. For example, an attacker could trick a user into transferring money, changing their email address, or deleting their account without their knowledge.

### How CSRF Attacks Work

1. User logs into `trusted-app.com` and receives a session cookie
2. User visits `malicious-site.com` (while still logged in to trusted-app.com)
3. Malicious site makes a request to `trusted-app.com/api/delete-account`
4. Browser automatically includes the session cookie
5. Trusted app processes the request as if the user intended it

## Our CSRF Protection Implementation

### Protection Strategy

We use a **Double Submit Cookie** pattern with these security features:

1. **Cryptographically secure token generation** - 256-bit random tokens
2. **HttpOnly cookies** - Prevents XSS attacks from stealing tokens
3. **SameSite=Strict cookies** - Browser-level CSRF protection
4. **Constant-time comparison** - Prevents timing attacks
5. **JWT exemption** - API clients using JWT tokens are automatically exempt
6. **Comprehensive logging** - All CSRF violations are logged for monitoring

### How It Works

1. **Server generates CSRF token**: When a client makes any request, the server generates a random CSRF token
2. **Token sent in cookie**: Token is set in an HttpOnly cookie named `csrf-token`
3. **Token also in response header**: Same token is sent in `X-CSRF-Token` response header
4. **Client stores token**: Client reads the token from the response header
5. **Client includes token**: For POST/PUT/DELETE requests, client includes token in `X-CSRF-Token` request header
6. **Server validates**: Server compares cookie token with header token using constant-time comparison

## Installation

### 1. Install Required Package

```bash
npm install cookie-parser @types/cookie-parser
```

### 2. Enable Cookie Parser in server.ts

Uncomment these lines in `src/server.ts`:

```typescript
// Uncomment these lines:
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

### 3. Enable CSRF Middleware

Uncomment this line in `src/server.ts`:

```typescript
// Uncomment this line:
app.use(setCsrfToken);
```

## Usage

### For Web Applications (Browser-based)

#### 1. Fetch CSRF Token

```javascript
// Fetch CSRF token on app initialization
const response = await fetch('http://localhost:5001/api/csrf-token', {
  credentials: 'include' // Important: Include cookies
});

const data = await response.json();
const csrfToken = data.token;

// Store token for later use
localStorage.setItem('csrfToken', csrfToken);
```

#### 2. Include Token in Requests

```javascript
// For POST/PUT/DELETE requests
const response = await fetch('http://localhost:5001/api/products', {
  method: 'POST',
  credentials: 'include', // Important: Include cookies
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': localStorage.getItem('csrfToken') // Include CSRF token
  },
  body: JSON.stringify(productData)
});
```

#### 3. Handle CSRF Errors

```javascript
if (response.status === 403) {
  const error = await response.json();

  if (error.code === 'CSRF_TOKEN_MISSING' ||
      error.code === 'CSRF_TOKEN_INVALID') {
    // Refresh CSRF token and retry
    await fetchNewCsrfToken();
    // Retry the request
  }
}
```

### For React Applications

```typescript
// Create a CSRF context
import { createContext, useContext, useState, useEffect } from 'react';

const CsrfContext = createContext<string | null>(null);

export function CsrfProvider({ children }: { children: React.ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch CSRF token on mount
    fetch('http://localhost:5001/api/csrf-token', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setCsrfToken(data.token))
      .catch(err => console.error('Failed to fetch CSRF token:', err));
  }, []);

  return (
    <CsrfContext.Provider value={csrfToken}>
      {children}
    </CsrfContext.Provider>
  );
}

export function useCsrf() {
  return useContext(CsrfContext);
}

// Use in components
function ProductForm() {
  const csrfToken = useCsrf();

  const handleSubmit = async (data: any) => {
    const response = await fetch('/api/products', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || ''
      },
      body: JSON.stringify(data)
    });
  };
}
```

### For React Native Apps (Mobile)

**React Native apps using JWT authentication are automatically exempt from CSRF protection.**

CSRF is primarily a browser vulnerability because browsers automatically include cookies with requests. Mobile apps don't have this behavior, and JWT tokens are not automatically sent.

However, if you need to use cookie-based sessions in React Native:

```typescript
// Fetch CSRF token
const response = await fetch('http://localhost:5001/api/csrf-token');
const data = await response.json();

// Store token
await AsyncStorage.setItem('csrfToken', data.token);

// Include in requests
const csrfToken = await AsyncStorage.getItem('csrfToken');
const response = await fetch('http://localhost:5001/api/products', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`, // JWT takes precedence
    'X-CSRF-Token': csrfToken || ''
  },
  body: JSON.stringify(productData)
});
```

## API Reference

### Endpoints

#### GET /api/csrf-token

Returns a new CSRF token for the client.

**Response:**
```json
{
  "success": true,
  "message": "CSRF token generated successfully",
  "token": "a1b2c3d4e5f6...",
  "usage": {
    "header": "Include this token in X-CSRF-Token header for POST/PUT/DELETE requests",
    "cookie": "Token is also set in csrf-token cookie automatically"
  }
}
```

### Middleware Functions

#### `setCsrfToken(req, res, next)`

Generates and sets CSRF token in cookie and response header.

**Usage:**
```typescript
import { setCsrfToken } from './middleware/csrf';

// Apply globally
app.use(setCsrfToken);

// Or apply to specific routes
app.use('/api', setCsrfToken);
```

#### `validateCsrfToken(req, res, next)`

Validates CSRF token for state-changing requests.

**Usage:**
```typescript
import { validateCsrfToken } from './middleware/csrf';

// Apply to specific routes
router.post('/products', validateCsrfToken, createProduct);
router.put('/products/:id', validateCsrfToken, updateProduct);
router.delete('/products/:id', validateCsrfToken, deleteProduct);
```

#### `csrfProtection(req, res, next)`

Combined middleware that both sets and validates CSRF tokens.

**Usage:**
```typescript
import { csrfProtection } from './middleware/csrf';

// Apply to routes that need both
router.post('/products', csrfProtection, createProduct);
```

### Exemptions

The following requests are **automatically exempted** from CSRF protection:

1. **Safe HTTP methods**: GET, HEAD, OPTIONS
2. **JWT-authenticated requests**: Any request with `Authorization: Bearer <token>` header
3. **Webhook endpoints**: `/api/webhooks/*`, `/api/razorpay/webhook`, `/api/stripe/webhook`
4. **Health checks**: `/health`, `/test`, `/api-info`
5. **Documentation**: `/api-docs`, `/api-docs.json`

### Configuration

Configuration constants in `src/middleware/csrf.ts`:

```typescript
export const CSRF_CONFIG = {
  TOKEN_LENGTH: 32,              // 256 bits of randomness
  COOKIE_NAME: 'csrf-token',     // Cookie name
  HEADER_NAME: 'x-csrf-token',   // Header name
  COOKIE_MAX_AGE: 3600000,       // 1 hour in milliseconds
  SAFE_METHODS: ['GET', 'HEAD', 'OPTIONS'],
  EXEMPT_PATHS: ['/health', '/test', '/api-info', ...]
};
```

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `CSRF_TOKEN_MISSING` | No CSRF token in cookie | Fetch new token from `/api/csrf-token` |
| `CSRF_TOKEN_NOT_PROVIDED` | Token not in request header | Include token in `X-CSRF-Token` header |
| `CSRF_TOKEN_INVALID` | Cookie and header tokens don't match | Fetch new token and retry |
| `CSRF_VALIDATION_ERROR` | Server error during validation | Check server logs |

## Security Logging

All CSRF-related events are logged:

```typescript
// Successful validation
logger.debug('CSRF token validated successfully', {
  path: '/api/products',
  method: 'POST'
});

// Failed validation
logger.warn('CSRF validation failed: Token mismatch', {
  path: '/api/products',
  method: 'POST',
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
});
```

Monitor these logs for security incidents.

## Testing

### Manual Testing with curl

```bash
# 1. Get CSRF token
curl -X GET http://localhost:5001/api/csrf-token \
  -c cookies.txt

# 2. Extract token from response
TOKEN=$(cat cookies.txt | grep csrf-token | awk '{print $7}')

# 3. Make authenticated request
curl -X POST http://localhost:5001/api/merchant/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "X-CSRF-Token: $TOKEN" \
  -b cookies.txt \
  -d '{"name":"Test Product"}'
```

### Testing with Postman

1. **Get CSRF Token**:
   - Method: GET
   - URL: `http://localhost:5001/api/csrf-token`
   - Settings: Enable "Save cookies"

2. **Make Request**:
   - Method: POST
   - URL: `http://localhost:5001/api/merchant/products`
   - Headers:
     - `Content-Type: application/json`
     - `Authorization: Bearer <your-jwt-token>`
     - `X-CSRF-Token: <token-from-step-1>`
   - Settings: Enable "Send cookies"

### Automated Testing

```typescript
// test/csrf.test.ts
import request from 'supertest';
import { app } from '../src/server';

describe('CSRF Protection', () => {
  it('should generate CSRF token', async () => {
    const response = await request(app)
      .get('/api/csrf-token')
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.token).toBeDefined();
  });

  it('should reject POST without CSRF token', async () => {
    const response = await request(app)
      .post('/api/merchant/products')
      .send({ name: 'Test' })
      .expect(403);

    expect(response.body.code).toBe('CSRF_TOKEN_MISSING');
  });

  it('should accept POST with valid CSRF token', async () => {
    // Get token
    const tokenResponse = await request(app)
      .get('/api/csrf-token');

    const token = tokenResponse.body.token;
    const cookies = tokenResponse.headers['set-cookie'];

    // Make request with token
    const response = await request(app)
      .post('/api/merchant/products')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', token)
      .set('Authorization', 'Bearer valid-jwt-token')
      .send({ name: 'Test Product' });

    expect(response.status).not.toBe(403);
  });
});
```

## Troubleshooting

### Common Issues

#### 1. "CSRF token missing" error

**Cause**: Cookie not being sent with request

**Solution**: Ensure `credentials: 'include'` is set in fetch options

```javascript
fetch(url, {
  credentials: 'include' // Add this!
});
```

#### 2. "CSRF token invalid" error

**Cause**: Token in cookie doesn't match token in header

**Solution**:
- Ensure you're sending the same token you received
- Check for token expiry (tokens expire after 1 hour)
- Fetch a new token if it's been a while

#### 3. CORS errors when fetching token

**Cause**: Server not configured to allow credentials from your origin

**Solution**: Verify CORS configuration in `server.ts`:

```typescript
const corsOptions = {
  credentials: true, // Must be true
  origin: 'http://localhost:3000' // Your frontend URL
};
```

#### 4. Token works in Postman but not in browser

**Cause**: Browser security policies

**Solution**:
- Ensure SameSite cookie policy is compatible
- Check if cookies are enabled in browser
- Verify HTTPS is used in production

## Best Practices

### 1. Always Use HTTPS in Production

CSRF tokens in cookies should only be sent over HTTPS to prevent interception.

```typescript
res.cookie(CSRF_COOKIE_NAME, token, {
  secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
  httpOnly: true,
  sameSite: 'strict'
});
```

### 2. Implement Token Refresh

Refresh CSRF tokens periodically or when they expire:

```typescript
// Refresh token every 30 minutes
setInterval(async () => {
  const response = await fetch('/api/csrf-token', {
    credentials: 'include'
  });
  const data = await response.json();
  localStorage.setItem('csrfToken', data.token);
}, 30 * 60 * 1000);
```

### 3. Handle Token Errors Gracefully

```typescript
async function makeRequest(url: string, options: RequestInit) {
  let response = await fetch(url, options);

  if (response.status === 403) {
    const error = await response.json();

    if (error.code?.startsWith('CSRF_TOKEN')) {
      // Refresh token and retry once
      await refreshCsrfToken();
      response = await fetch(url, options);
    }
  }

  return response;
}
```

### 4. Monitor CSRF Violations

Set up alerts for CSRF validation failures:

```typescript
// In your logging system
if (error.code === 'CSRF_TOKEN_INVALID') {
  alertSecurityTeam({
    type: 'CSRF_VIOLATION',
    ip: req.ip,
    path: req.path,
    userAgent: req.headers['user-agent']
  });
}
```

### 5. Use JWT for API Clients

For mobile apps and API integrations, use JWT authentication instead of cookies. JWT is inherently CSRF-resistant.

```typescript
// Mobile app - no CSRF needed with JWT
const response = await fetch('/api/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`, // JWT auto-exempts from CSRF
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

## Security Considerations

### Why Double Submit Cookie?

1. **No server-side storage**: Tokens don't need to be stored in database
2. **Scalable**: Works well with load balancers and multiple servers
3. **Simple**: Easy to implement and understand
4. **Effective**: Provides strong CSRF protection

### Limitations

1. **Subdomain attacks**: If attacker controls a subdomain, they might set cookies
   - **Mitigation**: Use strict SameSite policy

2. **XSS vulnerabilities**: If site has XSS, attacker can read tokens from headers
   - **Mitigation**: Implement proper Content Security Policy (CSP)
   - **Mitigation**: Use HttpOnly cookies (we do this)

3. **Man-in-the-middle**: Attacker could intercept tokens over HTTP
   - **Mitigation**: Always use HTTPS in production

### Defense in Depth

CSRF protection is one layer of security. Also implement:

1. **Input validation**: Validate all user inputs
2. **Output encoding**: Prevent XSS attacks
3. **Content Security Policy**: Restrict resource loading
4. **Rate limiting**: Prevent brute force attacks (already implemented)
5. **Authentication**: Strong authentication mechanisms (JWT - already implemented)

## Migration Guide

### From No CSRF to CSRF Protection

1. **Phase 1: Preparation**
   - Install cookie-parser
   - Enable setCsrfToken middleware
   - Test that tokens are being generated

2. **Phase 2: Frontend Updates**
   - Update frontend to fetch and include CSRF tokens
   - Test all forms and API calls
   - Handle CSRF errors gracefully

3. **Phase 3: Enforcement**
   - Enable validateCsrfToken on specific routes
   - Monitor logs for CSRF violations
   - Gradually expand to all state-changing routes

4. **Phase 4: Verification**
   - Test all user flows
   - Verify mobile apps still work (JWT exemption)
   - Monitor for any issues

## Support

For issues or questions:

1. Check server logs for detailed error messages
2. Review this documentation
3. Test with curl to isolate frontend vs backend issues
4. Check CSRF configuration in `src/middleware/csrf.ts`

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Double Submit Cookie Pattern](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
- [SameSite Cookie Attribute](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
