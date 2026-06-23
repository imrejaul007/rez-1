# Rate Limiter Configuration

## Changes Made

### 1. Added Environment Variable
- Added `DISABLE_RATE_LIMIT=true` to `.env` file
- This allows disabling rate limiting for development

### 2. Modified Rate Limiter Middleware
- Updated `/src/middleware/rateLimiter.ts`
- All rate limiters now check the `DISABLE_RATE_LIMIT` environment variable
- When `DISABLE_RATE_LIMIT=true`, a passthrough middleware is used instead of actual rate limiting
- Console log indicates whether rate limiting is enabled or disabled

## How to Enable/Disable Rate Limiting

### To Disable Rate Limiting (Development)
```env
DISABLE_RATE_LIMIT=true
```

### To Enable Rate Limiting (Production)
```env
DISABLE_RATE_LIMIT=false
# or simply remove/comment out the line
```

## Rate Limiters Affected
- `generalLimiter` - General API rate limiter
- `authLimiter` - Authentication rate limiter
- `otpLimiter` - OTP rate limiter
- `securityLimiter` - Security operations rate limiter
- `uploadLimiter` - File upload rate limiter
- `searchLimiter` - Search rate limiter
- `strictLimiter` - Strict rate limiter for sensitive operations
- `reviewLimiter` - Review operations rate limiter
- `analyticsLimiter` - Analytics rate limiter
- `comparisonLimiter` - Comparison operations rate limiter
- `favoriteLimiter` - Favorite operations rate limiter
- `recommendationLimiter` - Recommendation rate limiter
- `createRateLimiter` - Custom rate limiter factory function

## Important Notes
- **NEVER** disable rate limiting in production
- This configuration is meant for development only
- The backend will log whether rate limiting is enabled or disabled on startup

## Restart Required
After making these changes, **restart your backend server** for the changes to take effect.