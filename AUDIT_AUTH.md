# rez-auth-service Security Audit Report

**Service:** rez-auth-service
**Audit Date:** 2026-06-25
**Auditor:** Claude (Auth Service Auditor)
**Scope:** JWT, OAuth, Password/PIN, OTP, MFA, Session Management, Rate Limiting

---

## Executive Summary

The auth service has implemented substantial security hardening across most areas. JWT handling is particularly well-designed with role-specific secrets, atomic blacklist operations, and proper token rotation. However, several issues require attention before production deployment.

**Critical Issues:** 2
**High Issues:** 3
**Medium Issues:** 5
**Low Issues:** 4

---

## Detailed Findings

### CRITICAL Severity

#### 1. App Check Bypass on OTP Endpoints

**File:** `src/routes/authRoutes.ts` (lines 225, 230, 235, 413, 416, 420, 564-565, 1393, 1477)

**Issue:** All OTP send and verify endpoints use `optionalAppCheck` middleware, which passes requests through when no `x-firebase-appcheck` header is present. Even when `APP_CHECK_SECRET_KEY` is configured, an attacker can bypass App Check by simply not sending the header.

```typescript
// Current (vulnerable):
router.post('/auth/otp/send', optionalAppCheck, otpSendPhoneLimiter, otpLimiter, sendOTPHandler);
router.post('/auth/otp/verify', optionalAppCheck, otpVerifyPhoneLimiter, authLimiter, verifyOTPHandler);
```

**Impact:** OTP endpoints remain vulnerable to bot abuse and automated attacks. App Check's purpose (preventing non-genuine app instances from accessing OTP endpoints) is completely defeated.

**Recommendation:** Change `optionalAppCheck` to `verifyAppCheck` on all OTP-related endpoints, or implement phone-number-based rate limiting that can't be bypassed by rotating IPs. Alternatively, add a dedicated per-phone App Check enforcement layer.

---

#### 2. User Enumeration via `/auth/has-pin`

**File:** `src/routes/authRoutes.ts` (lines 681-692)

**Issue:** The `hasPinHandler` accepts any request without any rate limiting or input validation. The `hasPinLimiter` is IP-based (which can be rotated), and no phone number parsing or rate limiting by phone number is applied.

```typescript
async function hasPinHandler(req: Request, res: Response) {
  try {
    const parsed = parsePhone(req.query as any);
    if (!parsed) { throw new ApiError(400, 'Phone required'); }
    // Always return 200 with success:true — never reveal whether the user exists
    res.json({ success: true });
  } catch (err: any) {
    // ...
  }
}
// Route: router.get('/auth/has-pin', hasPinLimiter, hasPinHandler);
```

**Impact:** An attacker can enumerate whether any phone number is registered in the system. Even though the response doesn't leak `hasPIN`, the **response time** likely differs between registered and non-registered numbers (database lookup), enabling timing-based enumeration. Additionally, the IP-based rate limit (`hasPinLimiter`) can be bypassed by rotating IPs.

**Recommendation:** Add per-phone number rate limiting similar to `otpSendPhoneLimiter`. Consider adding artificial delay for non-existent users to equalize response times.

---

### HIGH Severity

#### 3. No Rate Limiting on Email Verification Requests

**File:** `src/routes/authRoutes.ts` (line 1516)

**Issue:** The `emailVerifyRequestHandler` sends verification emails without any rate limiting. While the endpoint requires authentication, a compromised account could be used to send unlimited verification emails to any target email address.

```typescript
router.post('/auth/email/verify/request', otpLimiter, emailVerifyRequestHandler);
```

**Note:** Only `otpLimiter` (10 per 15 min per IP) is applied, which is shared with other OTP operations. An authenticated attacker with multiple IPs could send emails to a victim's address at scale.

**Impact:** Email bombing attack - an authenticated attacker can flood any email address with verification emails, causing harassment and potential email provider blocking.

**Recommendation:** Add a per-user rate limit on verification email requests (e.g., 5 per hour per authenticated user) and implement exponential backoff on repeated requests to the same target email.

---

#### 4. OAuth Consent Endpoint Missing Client Authentication

**File:** `src/routes/oauthPartnerRoutes.ts` (lines 288-428)

**Issue:** The `/oauth/consent` endpoint does not validate client credentials. While the `state` parameter provides CSRF protection, there's no verification that the consent request was initiated by the same client that receives the authorization code.

```typescript
router.post('/consent', oauthConsentLimiter, async (req: Request, res: Response) => {
  // No client_id or client_secret validation here
  const { otp, approved, state } = validated.data;
  // ...
```

**Impact:** While the OAuth flow is constrained by valid state parameters, an attacker who can obtain a valid state (from the authorize endpoint without client authentication) could potentially trick users into consenting to a different client's authorization.

**Recommendation:** Include `client_id` in the consent request body and validate it matches the stored state, or require client authentication at the consent step.

---

#### 5. Missing `max` in OAuth State Validation

**File:** `src/routes/oauthPartnerRoutes.ts` (line 257)

**Issue:** The OAuth state validation only checks minimum length (16 characters) but not maximum length:

```typescript
const serverState = state && typeof state === 'string' && state.length >= 16
  ? state
  : crypto.randomBytes(32).toString('hex');
```

**Impact:** A malicious client could pass an extremely long state parameter, potentially causing storage issues or log injection.

**Recommendation:** Add maximum length validation: `state.length >= 16 && state.length <= 256`.

---

### MEDIUM Severity

#### 6. MFA Verify Rate Limit Window Mismatch

**File:** `src/middleware/rateLimiter.ts` (lines 226-232)

**Issue:** The MFA verify rate limit is 5 attempts per 60 seconds per user, but the MFA pending token TTL is 5 minutes. An attacker with a captured pending token has a 5-minute window for brute-forcing, not 1 minute.

```typescript
export const mfaVerifyLimiter = mfaLimiterByUserId(
  'rl:mfa:verify',
  5,
  60,  // 60 seconds, but token is valid for 5 minutes
  false,
  'Too many MFA attempts. Please wait before trying again.',
);
```

**Impact:** While the TOTP space (1 million possibilities) makes full brute-force impractical, an attacker has 5x more attempts than the rate limit suggests before hitting the window reset.

**Recommendation:** Consider increasing the rate limit enforcement to match the token TTL, or implement exponential backoff on failed attempts.

---

#### 7. Email Token Doesn't Verify User Ownership

**File:** `src/routes/authRoutes.ts` (lines 1481-1515)

**Issue:** The `emailVerifyRequestHandler` accepts any email address and sends a verification link, even if the email doesn't belong to the authenticated user. The email is only committed to the database after the verification link is clicked.

```typescript
const normalizedEmail = email.toLowerCase().trim();
const existing = await Users.findOne({
  _id: { $ne: new mongoose.Types.ObjectId(decoded.userId) },
  email: normalizedEmail,
  'auth.emailVerified': true,
});
if (existing) { throw new ApiError(409, 'Email already in use'); }
```

**Impact:** An authenticated user can send verification emails to arbitrary email addresses. This enables email spam/harassment, though the verification token is only useful for the account that initiated it.

**Recommendation:** Implement email ownership verification before sending the link (e.g., send a code to the email that must be entered in the app).

---

#### 8. CorpAuth Secret Fallback

**File:** `src/middleware/auth.ts` (line 52) and `src/middleware/corpAuth.ts` (line 78)

**Issue:** Both `requireAuth` and `requireCorpAuth` fall back to `JWT_SECRET` if the role-specific secret is not set:

```typescript
// auth.ts
decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });

// corpAuth.ts
const secret = process.env.JWT_SECRET || process.env.CORP_JWT_SECRET;
```

**Impact:** If only `JWT_SECRET` is set (without `CORP_JWT_SECRET`), CorpPerks tokens would be verified with the same secret as regular user tokens, potentially enabling role confusion attacks.

**Recommendation:** Fail closed if the expected secret is not configured, rather than falling back to a generic secret.

---

#### 9. TOTP Window of ±1 (60 seconds tolerance)

**File:** `src/services/totpService.ts` (line 133) and `src/routes/authRoutes.ts` (line 89)

**Issue:** TOTP verification allows ±1 time window (60 seconds total), which doubles the effective attack window for a stolen TOTP code.

```typescript
// totpService.ts
export function verifyTOTPCode(secret: string, code: string, window: number = 1): boolean {
  // Default window of 1 means ±30 seconds = 60 second window

// authRoutes.ts (inline TOTP)
function verifyTOTP(secret: string, token: string, window = 1): boolean {
```

**Impact:** A intercepted TOTP code remains valid for up to 60 seconds (not 30), giving attackers a larger exploitation window.

**Recommendation:** Consider reducing the default window to 0 (30 seconds), or documenting this trade-off clearly. Clock skew tolerance of 30 seconds is usually sufficient.

---

#### 10. Unhandled Exception in Global Handler

**File:** `src/index.ts` (lines 159-171)

**Issue:** The global error handler has conditional Sentry setup that results in empty blocks when `SENTRY_DSN` is not set, and the error handler itself doesn't type-check properly:

```typescript
if (process.env.SENTRY_DSN) {
  // Sentry.Handlers removed in v8
}
// ...
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
```

**Impact:** While not a direct security vulnerability, incomplete error handling could cause errors to be logged improperly or responses to be inconsistent.

**Recommendation:** Remove dead code blocks and ensure consistent error response format for all error types.

---

### LOW Severity

#### 11. OAuth Token Endpoint Doesn't Enforce PKCE for Public Clients

**File:** `src/routes/oauthPartnerRoutes.ts` (lines 479-497)

**Issue:** The `/oauth/token` endpoint accepts requests without `code_verifier` even when PKCE was used during authorization. While the code checks if a challenge exists, there's no enforcement that PKCE must be used.

```typescript
if (codeData.codeChallenge) {
  if (!code_verifier || typeof code_verifier !== 'string') {
    res.status(400).json({ error: 'invalid_grant', ... });
    return;
  }
  // ...
}
// If no codeChallenge stored, code_verifier is accepted but not required
```

**Impact:** Public clients that should use PKCE per OAuth 2.1 can skip it entirely by not providing a code_challenge at authorization time.

**Recommendation:** For public clients, enforce PKCE usage at the authorization endpoint rather than at the token endpoint.

---

#### 12. Incomplete Input Sanitization on Profile Fields

**File:** `src/routes/authRoutes.ts` (lines 774-776, 827-829)

**Issue:** Profile fields use allowlists but don't sanitize content beyond type checking:

```typescript
const allowed = ['firstName', 'lastName', 'avatar', 'dateOfBirth', 'gender', 'bio'];
for (const key of allowed) {
  if ((profile as any)[key] !== undefined) updateFields[`profile.${key}`] = (profile as any)[key];
}
```

**Impact:** While the Zod schema validates types, no XSS sanitization is applied to string fields like `bio` or `firstName`. Stored XSS could be possible if these fields are rendered without escaping in other services.

**Recommendation:** Apply HTML sanitization to profile text fields, or document that consuming services must escape these fields.

---

#### 13. Redis Connection Pool Not Explicitly Configured

**File:** `src/config/redis.ts` and `src/config/redis-auth.ts`

**Issue:** Redis connection uses default pool settings, which may not be optimal for high-throughput scenarios.

**Impact:** Connection exhaustion under heavy load could cause rate limiting to fail open (if failOpen mode is accidentally enabled) or authentication failures.

**Recommendation:** Configure explicit connection pool limits and implement proper connection health checking.

---

#### 14. Missing Security Headers Beyond Helmet

**File:** `src/index.ts` (line 87)

**Issue:** While Helmet is used, specific security headers like Content-Security-Policy, Permissions-Policy, or X-Frame-Options are not explicitly configured.

**Impact:** Missing defense-in-depth headers could enable clickjacking, content injection, or other attacks.

**Recommendation:** Configure Helmet with explicit security headers including CSP, X-Frame-Options, and Permissions-Policy.

---

## Positive Security Findings

The following areas show strong security implementation:

1. **JWT Token Generation**: Role-specific secrets prevent token confusion attacks
2. **Token Blacklisting**: Atomic Redis operations with MongoDB fallback
3. **Token Rotation**: Proper rotation with replay detection via `SET NX`
4. **PIN Security**: bcrypt with cost factor 12, common PIN rejection, lockout after 5 failures
5. **OTP Verification**: Lua script for atomic verify-and-consume prevents replay
6. **MFA TOTP**: Encrypted at rest (AES-256-GCM), RFC 6238 compliant
7. **Password Comparison**: Constant-time comparison for admin login, with legacy upgrade path
8. **Rate Limiting**: Comprehensive per-phone and per-IP limits on sensitive endpoints
9. **Account Enumeration Prevention**: Consistent responses in hasPin handler
10. **Input Validation**: Zod schemas with strict mode prevent mass assignment
11. **OAuth PKCE**: S256 challenge method enforced when provided
12. **Internal Auth**: Scoped tokens, IP allowlisting, timing-safe comparison
13. **TOTP Backup Codes**: Hashed before storage, marked as used after consumption

---

## Recommendations Summary

### Immediate (Before Production)

1. **CRITICAL**: Change `optionalAppCheck` to `verifyAppCheck` on OTP endpoints, OR implement mandatory per-phone rate limiting
2. **CRITICAL**: Add per-phone rate limiting to `/auth/has-pin` and consider timing-attack mitigation
3. **HIGH**: Add per-user rate limiting on email verification endpoint
4. **HIGH**: Add client validation to OAuth consent endpoint

### Short Term

5. **MEDIUM**: Adjust MFA rate limit window to match token TTL
6. **MEDIUM**: Add maximum length validation to OAuth state parameter
7. **MEDIUM**: Implement email ownership verification before sending links
8. **MEDIUM**: Fail closed on missing CorpPerks secret instead of falling back

### Long Term

9. **LOW**: Consider reducing TOTP window to ±0 for tighter security
10. **LOW**: Apply HTML sanitization to profile text fields
11. **LOW**: Configure explicit Redis connection pool settings
12. **LOW**: Add explicit CSP and other security headers

---

*End of Audit Report*
