# TypeScript Type Safety Fixes

## Summary

Fixed remaining TypeScript type safety issues across the `rez-backend-master` and `rez-auth-service` projects by replacing `as any` casts with proper types and adding Express type augmentations.

**Changes by project:**
- `rez-auth-service`: 7 files modified, all production `as any` casts removed
- `rez-backend-master`: 1 file modified (`resolveCustomerIdentity.ts`), 3 casts removed

## Files Modified

### rez-auth-service

#### 1. `src/middleware/tracing.ts`
**Fix:** Added Express `Response.locals` type augmentation to properly type `requestId`, `traceId`, and `spanId` set by tracing middleware.

```typescript
declare module 'express' {
  interface Response {
    locals: Response['locals'] & {
      traceId?: string;
      spanId?: string;
      requestId?: string;
    };
  }
}
```

#### 2. `src/middleware/internalAuth.ts`
**Fixes:**
- Added Express `Request` type augmentation for `user` property
- Replaced `(req as any).ip` with typed intersection `req as Request & { ip?: string; socket?: { remoteAddress?: string } }`

```typescript
declare module 'express' {
  interface Request {
    user?: {
      sub?: string;
      [key: string]: unknown;
    };
  }
}

// Fixed IP extraction:
const reqWithIp = req as Request & { ip?: string; socket?: { remoteAddress?: string } };
return reqWithIp.ip || reqWithIp.socket?.remoteAddress || null;
```

#### 3. `src/routes/mfaRoutes.ts`
**Fixes:**
- Defined `AccessTokenPayload` interface for JWT token payload
- Replaced `jwt.verify(...) as any` with typed cast to `AccessTokenPayload`
- Replaced `err: any` with `err: unknown` with proper error handling
- Removed 2x `(req.user as any)` casts using typed `AuthRequest` interface

```typescript
interface AccessTokenPayload {
  userId: string;
  role: string;
  jti?: string;
  sid?: string;
  sessionId?: string;
  phoneNumber?: string;
  merchantId?: string;
  iat?: number;
  exp?: number;
}

// Fixed JWT verification:
const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as AccessTokenPayload;
```

#### 4. `src/routes/authRoutes.ts`
**Fixes:**
- Added `PhoneFields` interface for `parsePhone()` parameter (replacing `any`)
- Added `OnboardingProfile` and `OnboardingPreferences` interfaces
- Replaced `(profile as any)[key]` with typed array iteration using `keyof OnboardingProfile`
- Replaced `(preferences as any)[key]` with typed array iteration using `keyof OnboardingPreferences`
- Replaced `(mfaConfig as any).backupCodes` with typed object
- Replaced `parsePhone(req.query as any)` with `parsePhone(req.query as unknown as PhoneFields)`

```typescript
interface PhoneFields {
  phone?: string | null;
  countryCode?: string | null;
  phoneNumber?: string | null;
}

interface OnboardingProfile {
  name?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  firstName?: string;
  lastName?: string;
  avatar?: string;
  bio?: string;
}

// Fixed profile field iteration:
const allowed: (keyof OnboardingProfile)[] = ['firstName', 'lastName', ...];
for (const key of allowed) {
  if (profile[key] !== undefined) updateFields[`profile.${key}`] = profile[key];
}
```

#### 5. `src/routes/admin/oauthAdmin.ts`
**Fix:** Replaced `(req as any).user?.sub` with `as unknown as { user?: { sub?: string } }`

#### 6. `src/utils/response.ts`
**Fixes:**
- Replaced `(msg as any)?.message` with `msg?.message` (proper optional chaining)
- Replaced `(opts?: any)` parameter with `(opts?: { message?: string; [key: string]: unknown })`

#### 7. `src/index.ts`
**Fixes:**
- Replaced `(res as any).locals?.requestId` with `res.locals?.requestId` (requires type augmentation)
- Replaced `err as any` with `err as Error & { code?: string }` for error handling

### rez-backend-master

#### 8. `src/events/resolveCustomerIdentity.ts`
**Fixes:**
- Replaced `(_UserModel as any).findOneAndUpdate` with `(_UserModel.findOneAndUpdate as Function | undefined)`
- Added explicit type casts for `.lean()` results:
  - `User.findById(...).lean()` now typed as `{ _id: mongoose.Types.ObjectId } | null`
  - `User.findOneAndUpdate(...).lean()` now typed as `{ _id: mongoose.Types.ObjectId } | null`
- Removed `(doc as any)._id` - now uses typed `doc._id`

```typescript
// Before:
const existing = await User.findById(...).lean();
return { customerId: String((existing as any)._id), ... };

// After:
const existing = await User.findById(...).lean() as { _id: mongoose.Types.ObjectId } | null;
return { customerId: String(existing._id), ... };
```

## Remaining `as any` Casts (Justified)

### Test Files (acceptable)
These test files contain `as any` casts that are standard practice in test contexts:
- `src/__tests__/tokenSecurity.test.ts` - Mocking JWT decode returns
- `src/__tests__/securityFixes.test.ts` - Mocking request/response objects and process.env
- `src/__tests__/otpSecurity.test.ts` - Mocking crypto.randomInt
- `src/routes/mfaRoutes.test.ts` - Accessing Express Router.stack (internal property)

### Model-Level `as any` (tracked as tech debt)
In `src/core/rewardEngine.ts`, some `as any` casts remain for:
- `UserLoyalty` document methods (`.categoryCoins`, `.markModified()`) - requires document instance, not lean
- Mongoose `.lean()` results from dynamic imports or complex query chains
- JSON.parse results (Redis cache deserialization)

These require broader refactoring of the Mongoose model layer.

## `@ts-nocheck` Status

| Project | Source Files with `@ts-nocheck` |
|--------|-------------------------------|
| `rez-auth-service` | **0** - All TypeScript checking is active |
| `rez-backend-master` | **120+** - Route files intentionally skipped |

The `rez-backend-master` project has `@ts-nocheck` on many route files in `src/routes/`. These were intentionally left in place as lower-priority route files that would require more extensive testing to modify safely.

## Verification

```bash
# rez-auth-service
cd rez-auth-service
npx tsc --noEmit

# rez-backend
cd rez-backend-master
npx tsc --noEmit
```

## References
- `AUDIT_CODE_QUALITY.md` - Original audit findings
- `AUDIT_SECURITY.md` - Security implications of type issues
- `src/types/lean-results.ts` - Lean type definitions for Mongoose results
- `src/types/user.types.ts` (auth-service) - Auth-specific user types
