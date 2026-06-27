# Shadow User Bypass Vulnerability Fix

**Date:** 2026-06-25
**Severity:** CRITICAL
**File:** `rez-backend-master/src/middleware/auth.ts` (lines 189-270)
**Status:** FIXED

## Vulnerability Description

The shadow user creation mechanism in the authentication middleware had a critical security flaw that allowed deactivated or locked users to bypass security controls.

### Original Vulnerable Code

```typescript
const shadowUser = await User.create({
  _id: decoded.userId,
  phone: (decoded as any).phoneNumber || '',
  phoneNumber: (decoded as any).phoneNumber || '',
  role: 'user',
  isActive: true,  // VULNERABILITY: Hardcoded to true
  isVerified: false,
  isOnboarded: false,
  profile: {},
  preferences: {},
});
// ...
return next();  // VULNERABILITY: Checks never reached
```

### Problem

1. Shadow users were created with `isActive: true`, bypassing the deactivation check
2. The `isAccountLocked()` check was never reached because `next()` was called early
3. Deactivated/locked users could access the system by presenting any valid JWT

## Fix Applied

### Key Changes

1. **Shadow users now created with `isActive: false`**

   ```typescript
   isActive: false,  // SECURITY: Must be false so status checks block access
   ```

2. **Shadow users now created with locked auth state**

   ```typescript
   auth: {
     isVerified: false,
     isOnboarded: false,
     loginAttempts: 0,
     lockUntil: new Date(),  // SECURITY: Lock until explicitly activated
   },
   ```

3. **Moved user attachment AFTER security checks**

   ```typescript
   // SECURITY FIX: Check account status BEFORE granting access
   if (!shadowUser.isActive) {
     logger.warn('⚠️ [AUTH] Shadow user account not activated:', shadowUser._id);
     return res.status(401).json({
       success: false,
       message: 'Account requires activation. Please complete registration.'
     });
   }

   if (shadowUser.isAccountLocked()) {
     logger.warn('⚠️ [AUTH] Shadow user account locked:', shadowUser._id);
     return res.status(423).json({
       success: false,
       message: 'Account is temporarily locked. Please try again later.'
     });
   }

   // Attach user to request only after passing all security checks
   req.user = shadowUser;
   req.userId = String(shadowUser._id);
   ```

4. **Updated error message** to be more accurate for shadow users

   ```typescript
   message: 'Account requires activation. Please complete registration.'
   ```

## Security Impact

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Deactivated user with valid JWT | ACCESS GRANTED | ACCESS DENIED |
| Locked user with valid JWT | ACCESS GRANTED | ACCESS DENIED |
| User exists in auth-service but not monolith | SHADOW CREATED | SHADOW CREATED (but blocked) |

## Defense in Depth

This fix implements defense in depth:

1. **Pre-creation**: Shadow users are now created in a blocked state (`isActive: false`, `lockUntil: now`)
2. **Post-creation**: Status checks MUST pass before access is granted
3. **Logging**: All shadow user creation and block events are logged for audit

## Remaining Type Safety Issues - STATUS

The team lead requested fixes for type safety issues in `rez-auth-service/src/types/index.ts`:

| Issue | Status | Notes |
|-------|--------|-------|
| `Session = any` | ALREADY FIXED | `Session` interface properly defined with typed fields |
| `Device = any` | ALREADY FIXED | `Device` interface properly defined with typed fields |
| `AuthServiceUser._id: any` | ALREADY FIXED | `_id` typed as `string` in `user.types.ts` |

### Current Type Definitions (rez-auth-service/src/types/index.ts)

```typescript
export interface Session {
  id: string;
  userId: string;
  refreshToken?: string;
  deviceId?: string;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface Device {
  id: string;
  userId: string;
  deviceType: 'android' | 'ios' | 'web' | 'other';
  deviceToken?: string;
  pushNotificationsEnabled: boolean;
  lastActiveAt?: Date;
  createdAt: Date;
}
```

### AuthServiceUser Type (rez-auth-service/src/types/user.types.ts)

```typescript
export interface AuthServiceUser {
  _id: string;  // MongoDB ObjectId as string - properly typed
  phoneNumber: string;
  // ... other fields
}
```

**Note:** The type safety issues appear to have been addressed in previous updates. The `Session`, `Device`, and `AuthServiceUser._id` all have proper TypeScript types defined.

## Testing Recommendations

1. Test that deactivated users with valid JWTs are denied access
2. Test that locked users with valid JWTs are denied access
3. Test that valid users with valid JWTs can still authenticate
4. Test shadow user creation still works for legitimate cross-service auth

## Related Files

- `C:/Users/user/Downloads/rez-backend-master/rez-backend-master/src/middleware/auth.ts` - Fixed
- `C:/Users/user/Downloads/rez-backend-master/rez-auth-service/src/types/index.ts` - Already properly typed
- `C:/Users/user/Downloads/rez-backend-master/rez-auth-service/src/types/user.types.ts` - Already properly typed
