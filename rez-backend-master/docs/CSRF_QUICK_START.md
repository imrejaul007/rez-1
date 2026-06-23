# CSRF Protection - Quick Start Guide

## Installation Steps

### 1. Install Dependencies

```bash
npm install cookie-parser @types/cookie-parser
```

### 2. Enable Cookie Parser

In `src/server.ts`, uncomment these lines (around line 276-277):

```typescript
import cookieParser from 'cookie-parser';
app.use(cookieParser());
```

### 3. Enable CSRF Middleware

In `src/server.ts`, uncomment this line (around line 282):

```typescript
app.use(setCsrfToken);
```

### 4. Restart Server

```bash
npm run dev
```

## Frontend Integration

### For Web Apps (React, Vue, Angular)

```typescript
// 1. Fetch CSRF token on app load
const fetchCsrfToken = async () => {
  const res = await fetch('http://localhost:5001/api/csrf-token', {
    credentials: 'include'
  });
  const data = await res.json();
  return data.token;
};

// 2. Store token (e.g., in state, context, or localStorage)
const csrfToken = await fetchCsrfToken();
localStorage.setItem('csrfToken', csrfToken);

// 3. Include token in POST/PUT/DELETE requests
const response = await fetch('http://localhost:5001/api/products', {
  method: 'POST',
  credentials: 'include', // Important!
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': localStorage.getItem('csrfToken')
  },
  body: JSON.stringify(data)
});
```

### For React Native Apps

**No CSRF needed!** React Native apps using JWT are automatically exempted.

If you still want to use CSRF:

```typescript
// Fetch token
const res = await fetch('http://localhost:5001/api/csrf-token');
const data = await res.json();
await AsyncStorage.setItem('csrfToken', data.token);

// Include in requests
const token = await AsyncStorage.getItem('csrfToken');
fetch(url, {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
    'Authorization': `Bearer ${jwtToken}` // JWT takes priority
  }
});
```

## Testing

### Test with curl

```bash
# Get token
curl -X GET http://localhost:5001/api/csrf-token -c cookies.txt

# Extract token
TOKEN=$(curl -s http://localhost:5001/api/csrf-token | jq -r '.token')

# Make request
curl -X POST http://localhost:5001/api/merchant/products \
  -H "X-CSRF-Token: $TOKEN" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -b cookies.txt \
  -d '{"name":"Test"}'
```

### Test with Postman

1. GET `http://localhost:5001/api/csrf-token` (enable "Save cookies")
2. Copy the `token` from response
3. POST to any endpoint with:
   - Header: `X-CSRF-Token: <copied-token>`
   - Settings: Enable "Send cookies"

## Exemptions (No CSRF Required)

- GET, HEAD, OPTIONS requests
- Requests with JWT (`Authorization: Bearer <token>`)
- Webhook endpoints (`/api/webhooks/*`)
- Health checks (`/health`, `/test`)

## Error Handling

```typescript
if (response.status === 403) {
  const error = await response.json();

  if (error.code?.includes('CSRF_TOKEN')) {
    // Refresh token and retry
    const newToken = await fetchCsrfToken();
    // Retry request with new token
  }
}
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `CSRF_TOKEN_MISSING` | Cookie not set | Add `credentials: 'include'` to fetch |
| `CSRF_TOKEN_NOT_PROVIDED` | Header not set | Add `X-CSRF-Token` header |
| `CSRF_TOKEN_INVALID` | Tokens don't match | Fetch new token |

## Configuration

All configuration is in `src/middleware/csrf.ts`:

```typescript
const CSRF_TOKEN_LENGTH = 32;        // Token length
const CSRF_COOKIE_NAME = 'csrf-token';  // Cookie name
const CSRF_HEADER_NAME = 'x-csrf-token'; // Header name
const CSRF_COOKIE_MAX_AGE = 3600000;    // 1 hour
```

## Security Notes

1. **Always use HTTPS in production**
2. **Tokens expire after 1 hour**
3. **JWT tokens bypass CSRF** (by design)
4. **All violations are logged** for monitoring

## Need More Info?

See `CSRF_PROTECTION_GUIDE.md` for complete documentation.

## Quick Checklist

- [ ] Installed cookie-parser
- [ ] Enabled cookieParser() in server.ts
- [ ] Enabled setCsrfToken middleware
- [ ] Frontend fetches CSRF token on load
- [ ] Frontend includes token in POST/PUT/DELETE headers
- [ ] Frontend includes `credentials: 'include'` in fetch
- [ ] CORS allows credentials from frontend origin
- [ ] HTTPS enabled in production
