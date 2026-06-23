# Security Quick Reference - Product Routes

## Rate Limits

| Operation | Limit | Window | Routes |
|-----------|-------|--------|--------|
| **GET** (Read) | 100 requests | 1 minute | All GET endpoints |
| **POST/PUT** (Write) | 30 requests | 1 minute | Create/Update products |
| **DELETE** | 10 requests | 1 minute | Delete products/variants |
| **BULK** | 5 requests | 1 minute | Bulk operations |

## Environment Variables

```bash
# Development (no rate limiting)
DISABLE_RATE_LIMIT=true

# Production (rate limiting active)
DISABLE_RATE_LIMIT=false
```

## Sanitized Fields

### Text Fields (HTML stripped)
- `name` (max 200 chars)
- `shortDescription`
- `brand`
- `sku`
- `barcode`
- `metaTitle` (max 60 chars)
- `metaDescription` (max 160 chars)

### HTML Fields (dangerous HTML removed)
- `description`

### Array Fields (filtered, sanitized)
- `tags` (each max 50 chars)
- `searchKeywords` (each max 50 chars)

## Removed Content

- `<script>` tags
- `<iframe>` tags
- `<object>` and `<embed>` tags
- Inline event handlers (`onclick`, etc.)
- `javascript:` protocols
- `data:text/html` protocols
- Null bytes
- Control characters

## Error Responses

### Rate Limited (429)
```json
{
  "success": false,
  "message": "Too many product requests. Please try again in a minute.",
  "retryAfter": 60
}
```

### Headers
```
RateLimit-Limit: 100
RateLimit-Remaining: 95
RateLimit-Reset: 1701234567
```

## Testing

### Test Rate Limiting
```bash
# Set in .env first: DISABLE_RATE_LIMIT=false
for i in {1..105}; do curl http://localhost:5001/api/products; done
```

### Test Sanitization
```bash
curl -X POST http://localhost:5001/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test <script>alert(1)</script>"}'
```

## Monitoring

Check logs for violations:
```bash
tail -f logs/app.log | grep "RATE LIMIT"
```

## Files Modified

- `src/middleware/rateLimiter.ts` - Rate limiters
- `src/middleware/sanitization.ts` - Sanitization functions
- `src/merchantroutes/products.ts` - Applied to routes
