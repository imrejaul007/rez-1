# Rate Limiting Quick Reference

## At a Glance

### Rate Limiters Available

| Limiter | Max Requests | Window | Use Case |
|---------|--------------|---------|----------|
| `authLimiter` | 5 | 15 min | Login attempts |
| `registrationLimiter` | 5 | 1 hour | New registrations |
| `passwordResetLimiter` | 3 | 1 hour | Password reset/forgot |
| `generalLimiter` | 100 | 15 min | General API calls |

### Protected Routes

```
POST /api/merchant/auth/login          → authLimiter (5/15min)
POST /api/merchant/auth/register       → registrationLimiter (5/hour)
POST /api/merchant/auth/forgot-password → passwordResetLimiter (3/hour)
POST /api/merchant/auth/reset-password/:token → passwordResetLimiter (3/hour)
ALL  /api/merchant/*                   → generalLimiter (100/15min)
```

## Quick Start

### Import
```typescript
import {
  authLimiter,
  registrationLimiter,
  passwordResetLimiter,
  generalLimiter
} from './middleware/rateLimiter';
```

### Apply to Route
```typescript
router.post('/login', authLimiter, validateRequest(schema), handler);
```

### Apply to All Routes
```typescript
app.use('/api/merchant', generalLimiter);
```

## IP Blocking

### Import
```typescript
import {
  ipBlocker,
  blockIP,
  unblockIP,
  getBlockedIPs,
  recordViolation,
  getIPBlockerStats
} from './middleware/ipBlocker';
```

### Common Commands
```typescript
// Block an IP
blockIP('192.168.1.100', 'Brute force detected');

// Unblock an IP
unblockIP('192.168.1.100');

// Check if blocked
if (isIPBlocked(clientIP)) { /* ... */ }

// Record violation (auto-blocks at 10)
recordViolation(clientIP, 'Rate limit exceeded');

// Get stats
const stats = getIPBlockerStats();
```

### Apply Middleware
```typescript
app.use(ipBlocker); // Add before routes
```

## Testing Commands

### Test Login Rate Limit
```bash
# Run 6 times - 6th should fail
curl -X POST http://localhost:5001/api/merchant/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}'
```

### Check Headers
```bash
curl -I http://localhost:5001/api/merchant/auth/test
# Look for: RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
```

### View Logs
```bash
# Look for these patterns:
🚫 Blocked IP: xxx.xxx.xxx.xxx
✅ Unblocked IP: xxx.xxx.xxx.xxx
⚠️ Violation #X for IP
🚨 IP automatically blocked
```

## Error Responses

### 429 Rate Limited
```json
{
  "success": false,
  "error": "Too many login attempts. Please try again after 15 minutes.",
  "retryAfter": 900
}
```

### 403 IP Blocked
```json
{
  "success": false,
  "error": "Your IP has been blocked due to suspicious activity."
}
```

## Configuration

### Disable for Development
In `.env`:
```env
DISABLE_RATE_LIMIT=true
```

### Production Settings
In `.env`:
```env
DISABLE_RATE_LIMIT=false
JWT_MERCHANT_SECRET=your-secure-secret
```

## Files Modified/Created

### Created
- `src/middleware/ipBlocker.ts` - IP blocking system

### Modified
- `src/middleware/rateLimiter.ts` - Added auth/registration/password limiters
- `src/merchantroutes/auth.ts` - Applied limiters to routes
- `src/server.ts` - Applied general limiter to merchant routes

## Admin Functions

```typescript
// Get all blocked IPs
const blocked = getBlockedIPs();

// Get statistics
const stats = getIPBlockerStats();
console.log(`Blocked: ${stats.blockedIPsCount}`);
console.log(`Tracked: ${stats.trackedIPsCount}`);

// Clear violations for IP
clearViolations('192.168.1.100');

// Clear all blocks (use carefully!)
clearAllBlockedIPs();
```

## Troubleshooting

### Rate Limiting Not Working
1. Check `DISABLE_RATE_LIMIT` in `.env`
2. Verify middleware is imported
3. Check middleware order in server.ts
4. Ensure same IP for all requests

### Headers Not Showing
1. Verify `standardHeaders: true`
2. Use `curl -v` to see headers
3. Check client header handling

### IP Blocker Not Working
1. Check `ipBlocker` middleware applied
2. Verify IP in blocklist: `getBlockedIPs()`
3. Ensure middleware before routes

## Production Checklist

- [ ] `DISABLE_RATE_LIMIT=false` in production `.env`
- [ ] JWT secrets properly set
- [ ] Monitor blocked IPs regularly
- [ ] Set up alerts for violations
- [ ] Consider Redis for multi-server setup
- [ ] Log analysis configured
- [ ] Rate limit metrics tracked

## Need Help?

- Full documentation: `RATE_LIMITING_IMPLEMENTATION_SUMMARY.md`
- Testing guide: `RATE_LIMITING_TESTING_GUIDE.md`
- Check server logs for rate limit events

---

**Version**: 1.0
**Last Updated**: November 17, 2025
**Status**: Production Ready ✅
