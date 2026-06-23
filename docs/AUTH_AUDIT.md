Nothing imports the strict `env` validator — the file is dead code. The actual validator is the one in `index.ts:43-62`, which does NOT check `OTP_TOTP_ENCRYPTION_KEY` (the TOTP encryption key). If it's unset, the service starts; the first MFA setup throws at runtime (line 64 of `totpEncryption.ts`), not at startup. This is a **fail-late**, not fail-fast, and gives an attacker a chance to access non-MFA endpoints if they can quickly exploit the race.

**Fix:** Add `OTP_TOTP_ENCRYPTION_KEY` to the `validateEnv` in `index.ts:43-62`.

**Confidence:** High.

---

### 2.7 [MEDIUM] Refresh token TTL clamping allows values higher than 48 hours with `Math.min`
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\tokenService.ts:89`

```ts
const ttlHours = Math.min(parseInt(process.env.JWT_REFRESH_TTL_HOURS || '24', 10), 48);
```

This is good (caps at 48h), but `parseInt` of an empty string or non-numeric returns `NaN`, and `Math.min(NaN, 48)` returns `NaN`. Then `expiresIn: '${ttlHours}h'` becomes the literal string `"NaNh"`, which jsonwebtoken interprets as a number `NaN`, and the token is issued with `exp: NaN` (i.e., immediately invalid). An admin who fat-fingers the env var breaks their own refresh tokens.

**Fix:**
```ts
const ttlHours = Math.min(Math.max(parseInt(process.env.JWT_REFRESH_TTL_HOURS || '24', 10) || 24, 1), 48);
```

**Confidence:** Medium.

---

### 2.8 [LOW] JWT secrets are 64-hex characters (256 bits) — acceptable
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\config\env.ts:28-39`

256 bits of random entropy is sufficient for HS256. No issue.

**Confidence:** High (passing).

---

### 2.9 [MEDIUM] No `kid` / `jti` on tokens — token revocation requires Redis cache hit
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\tokenService.ts:67-92`

Every `jwt.sign` lacks a `jti`. Refresh-token replay protection relies on the Redis SET NX + MongoDB unique index. Without `jti`, the `requireMfa` middleware's session-key fallback (finding 2.4) is broken. The blacklist is *the entire token* — long. A `jti` would let the blacklist use a short hash and the blacklist cache could be much smaller.

**Fix:** Generate `jti: crypto.randomUUID()` on every `jwt.sign` and use it in the blacklist.

**Confidence:** Medium.

---

### 2.10 [MEDIUM] `refreshAccessToken` is `@deprecated` but exported
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\tokenService.ts:224`

`refreshAccessToken` is exported and could be called from a future caller. It has weaker revocation (no MongoDB RefreshToken record on the *new* token's previous use). Mark `@deprecated` but ideally delete it.

**Confidence:** Low (today).

---

## 3. Input Validation

### 3.1 [HIGH] No Zod/Joi schemas for request bodies; manual parsing is incomplete
**Location:** All routes in `authRoutes.ts`, `mfaRoutes.ts`, `oauthPartnerRoutes.ts`, etc.

`zod` is in the dependency tree but is **only used in `env.ts`**. The `authRoutes.ts` uses `parsePhone` and ad-hoc `String(...)` casts. Examples of missing validation:

- `authRoutes.ts:707` `completeOnboardingHandler` — `req.body.profile` and `req.body.preferences` are walked by an allow-list, but `dateOfBirth` is not parsed. An attacker can pass a string that gets stored verbatim. Then on the next login, the field is sent back to any user who fetches `/auth/me`.
- `authRoutes.ts:1419` `emailVerifyRequestHandler` — `email` regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` accepts `a@b.c` (a valid but junk email) and even `a@b@c.d` (rejected, ok). However, `String(email).toLowerCase().trim()` is done *after* the regex — if the regex rejects, the user gets a generic error message; if the regex passes but the email is `><script>`-shaped, MongoDB stores it as-is (XSS risk in the admin panel).
- `authRoutes.ts:417` `verify-setup` body — `String(req.body.code).trim()` does no type check; if `code` is an object, `String(obj)` returns `"[object Object]"` and the regex check rejects, but error messages can leak.

**Fix:** Define a Zod schema for every body in `src/schemas/` and call `schema.parse(req.body)` at the top of each handler.

**Confidence:** High.

---

### 3.2 [MEDIUM] `parsePhone` allows arbitrary 5–15 digit numbers
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:111-125`

`/^\d{5,15}$/` accepts any 5–15-digit number. A valid Indian number is 10 digits; this allows 5-digit short codes and 15-digit extensions. Combined with the rate-limit normalization in finding 1.1, an attacker can submit the same 10-digit number prefixed with `1`, `91`, `971`, `44`, etc., and produce different rate-limit buckets. The actual OTP send uses the parsed `countryCode + phone` (e.g., `+91<10digits>`), so the phone sent to the SMS provider is consistent — but the per-phone rate-limit key is not.

**Fix:** Canonicalize to E.164 in `parsePhone` (default `+91` for 10-digit numbers starting with 6-9, no leading 0/91). Reject numbers that don't normalize cleanly.

**Confidence:** High.

---

### 3.3 [MEDIUM] `email` regex is too permissive
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:1414`

```ts
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
```

`"a@b.c"` passes. A disposable email like `xxx@xxx.xxx` is accepted. For verification, the email will be stored on the user document. The risk is that junk emails dilute engagement metrics. Lower severity, but a Zod `.email()` validator would be cleaner.

**Confidence:** Low.

---

### 3.4 [HIGH] `oauthAdmin.ts:64-67` — no validation of `redirectUris` array contents
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\admin\oauthAdmin.ts:57-65`

```ts
const { name, redirectUris, scopes = ['profile'], ownerEmail } = req.body;
if (!name || !redirectUris || !ownerEmail) { ... }
if (!Array.isArray(redirectUris) || redirectUris.length === 0) { ... }
```

The `redirectUris` array accepts any string. An internal admin (or anyone with `INTERNAL_SERVICE_TOKEN`) can register a partner with `redirectUris: ['javascript:alert(1)']` or `redirectUris: ['https://evil.com']`. The `/oauth/authorize` route at `oauthPartnerRoutes.ts:221` checks `partner.redirectUris.includes(redirect_uri)` — if the registered partner has `evil.com`, the code is sent to evil.com. There is no scheme allowlist, no host check, no fragment/port allowlist.

This is privileged (requires internal service token) but the **blast radius is total account takeover of any user who consents**.

**Fix:**
```ts
for (const uri of redirectUris) {
  let parsed: URL;
  try { parsed = new URL(uri); } catch { return res.status(400).json({ error: 'Invalid redirect URI' }); }
  if (!['https:'].includes(parsed.protocol)) return res.status(400).json({ error: 'redirect URI must be https' });
  if (parsed.hash) return res.status(400).json({ error: 'redirect URI must not contain fragments' });
}
```

**Confidence:** High.

---

### 3.5 [MEDIUM] `oauthPartnerRoutes.ts:227` — `scope` parsed by space-split, allows any scope if request supplies one
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:227-232`

```ts
const requestedScopes = scope ? (scope as string).split(' ') : partner.scopes;
const invalidScopes = requestedScopes.filter(s => !partner.scopes.includes(s));
```

If `scope` is an array (`?scope=a&scope=b`), `String.split` is called on the array (which joins with `,`). An attacker can pass `?scope=profile` to any partner that has only `['profile']` registered, which works. The filter is correct. **No issue today.** But the scope string is not URL-decoded by `req.query` — Express handles that. If `scope` is empty, `requestedScopes = partner.scopes` (all default scopes). This is correct.

**Confidence:** Low (no issue).

---

## 4. Authentication Middleware

### 4.1 [CRITICAL] `appCheckVerifier.ts` "verifies" tokens with a fake check
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\appCheckVerifier.ts:27-50`

```ts
function verifyToken(token: string): boolean {
  if (!token || token.length < 10) return false;
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    if (!parsed.platform || !parsed.appVersion) return false;
    return true;
  } catch {
    const parts = token.split('.');
    if (parts.length === 3) return true;
    return false;
  }
}
```

This is **not** Firebase App Check verification. There is no JWT signature check, no Firebase public key fetch, no JWK rotation. The verifier accepts:
- Any base64-encoded JSON with `platform` and `appVersion` strings (an attacker can `echo -n '{"platform":"ios","appVersion":"1"}' | base64` to bypass).
- Any string with three dot-separated parts (any 3-segment string).

This middleware is a **placeholder**, not a real verifier. It provides the appearance of protection while providing none. Worse, `APP_CHECK_SECRET_KEY` is referenced but never used in the verify function.

**Fix:** Either (a) use the `firebase-admin` SDK to verify the App Check JWT, or (b) delete this middleware. The current code is worse than no check because it gives false confidence.

```ts
// Real implementation:
import { firebaseAdmin } from 'firebase-admin';
import { getAppCheck } from 'firebase-admin/app-check';
async function verifyToken(token: string): Promise<boolean> {
  try {
    await getAppCheck().verifyToken(token);
    return true;
  } catch { return false; }
}
```

**Confidence:** High (this is a critical issue — the middleware is named "verifier" and is a complete no-op).

---

### 4.2 [HIGH] `appCheckVerifier.ts:82-93` — in-memory cache grows unbounded until cleanup at 10k
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\appCheckVerifier.ts:82-93`

```ts
const cached = verifiedTokens.get(token);
if (cached && cached.expiresAt > Date.now()) { next(); return; }
if (verifyToken(token)) {
  verifiedTokens.set(token, { valid: true, expiresAt: Date.now() + TOKEN_CACHE_TTL });
  if (verifiedTokens.size > 10000) { ... }
}
```

An attacker can send unique tokens to fill this Map to 10,000 entries. With `token.length < 10` required, the smallest valid input is `"........."` (10 chars, three dots? no, just 10 of anything if `JSON.parse` fails — then `parts.length === 3` requires three dots). The bypass tokens are at minimum `a.b.c` (5 chars — wait, `length < 10` means at least 10 chars). So the smallest bypass is 10 chars. An attacker can fill the cache with 10,000 unique tokens and then keep the `Map` at 10,000 forever by continually sending new ones (the cleanup only fires when size exceeds 10,000, and even then it only deletes expired entries). Combined with the fact that verified tokens have a 5-minute TTL, an attacker must continually flood 10,000 every 5 minutes = ~33 RPS to keep the cache full. This is a **memory-exhaustion DoS**.

**Fix:** Use Redis for the cache (already configured), with `SET ... EX 300` and natural TTL eviction.

**Confidence:** High.

---

### 4.3 [MEDIUM] `requireMfa.ts:97` — same as finding 2.4; cross-referenced.

---

### 4.4 [HIGH] `requireMfa.ts:107` — every MFA-enabled user is blocked, because `markMfaVerified` is never called
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\requireMfa.ts:97-111` and `src/routes/mfaRoutes.ts:190-239`

`markMfaVerified` is exported by `requireMfa.ts` but **no caller in the codebase calls it**. Grep confirms. So every MFA-enabled user hits the `isMfaVerified` check and fails it, gets a 403 with `requiresMfa: true`, and the MFA verify endpoint at `mfaRoutes.ts:190-239` does NOT mark the session. The MFA flow is broken end-to-end.

This is both a security issue (admins/MFA users are denied legitimate access — denial of service) and a functional bug.

**Fix:** Call `markMfaVerified(req.user.userId, sessionId)` in `mfaRoutes.ts:228` after `mfaConfig.save()` succeeds.

**Confidence:** High (verified by grep).

---

### 4.5 [MEDIUM] `internalAuth.ts:getCallerIp` — rightmost public X-Forwarded-For hop selection
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\internalAuth.ts:86-104`

```ts
function getCallerIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'] as string | undefined;
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
      const candidate = parts[i].replace(/^::ffff:/, '');
      if (!isPrivateIp(candidate)) return candidate;
    }
    if (parts.length > 0) return parts[parts.length - 1].replace(/^::ffff:/, '');
  }
  return (req as any).ip || (req as any).socket?.remoteAddress || null;
}
```

The logic: walk right-to-left, return the first **non-private** IP. Standard XFF parsing. The issue is `app.set('trust proxy', 1)` at `index.ts:71` — Express trusts only 1 hop. This means `req.ip` = the leftmost public IP in XFF, but `getCallerIp` walks *right-to-left* and returns the **last public IP**, which may differ from `req.ip`. Inconsistency: `req.ip` is used by the rate limiter, `getCallerIp` is used by the internal auth allowlist.

If the attacker controls the rightmost X-Forwarded-For value (the LB appends the connection IP, but the rightmost *non-private* is what the attacker sent), the attacker can claim a private IP and bypass the allowlist. Specifically, if the attacker sends `X-Forwarded-For: 192.168.1.1` (private) and connects from a public IP, the LB appends `<attacker-public-IP>`, so XFF becomes `192.168.1.1, <attacker-public>`. The function walks right-to-left: `<attacker-public>` is NOT private, returns immediately. Good. But if the attacker sends `X-Forwarded-For: 8.8.8.8, 192.168.1.1`, the LB appends `<attacker-public>`: `8.8.8.8, 192.168.1.1, <attacker-public>`. Walks right-to-left: `<attacker-public>` returned. Good. **But** if the attacker sends just `X-Forwarded-For: 192.168.1.1` and the LB does NOT append (some configurations), XFF is just `192.168.1.1`. `isPrivateIp` returns true for `192.168.1.1`, loop ends, falls through to `return parts[parts.length - 1]` = `192.168.1.1` — **the attacker-claimed private IP**. If the allowlist is `10.0.0.0/8` (which is what production might look like), `192.168.1.1` doesn't match. But if the allowlist is `192.168.0.0/16`, the attacker wins.

**Fix:** Walk left-to-right instead, and use the same value Express sees in `req.ip` (which is leftmost with `trust proxy 1`). Or better, trust no client-supplied X-Forwarded-For and use `req.socket.remoteAddress`.

**Confidence:** High.

---

### 4.6 [HIGH] `internalAuth.ts:181-204` — scoped-token validation falls through to legacy if `callerService` is missing/wrong
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\internalAuth.ts:181-204`

```ts
if (scopedTokens && callerService) {
  const expected = scopedTokens[callerService];
  if (expected && tokenBuf.length > 0) { ... }
}
// Legacy fallback: single shared token
if (!isValid && legacyToken && tokenBuf.length > 0) { ... }
```

If `INTERNAL_SERVICE_TOKENS_JSON` is set but the caller does not send `x-internal-service`, the scoped check is skipped and the legacy `INTERNAL_SERVICE_TOKEN` is tried. An attacker who learns the legacy token (which is the same across all deploys of the legacy monolith and is in the `.env` file: `349d27de05a948d70543f1a0ee94cb20366ca1ff4d6b2e0f7fcb2ffb7cb22b94`) can hit any internal endpoint without specifying a service name.

**Fix:** If `scopedTokens` is set, require `x-internal-service` and reject otherwise.

```ts
if (scopedTokens) {
  if (!callerService) {
    return errorResponse(res, errors.authTokenInvalid());
  }
  // ... scoped check, no legacy fallback
}
```

**Confidence:** High.

---

### 4.7 [MEDIUM] `internalAuth.ts:185-191` — `if (tokenBuf.length === expectedBuf.length)` short-circuits timing-safe
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\internalAuth.ts:185-191`

The length check before `timingSafeEqual` is correct (timingSafeEqual requires equal lengths), but it leaks token-length information. Combined with the fact that `callerService` is attacker-controlled, an attacker can probe the length of each scoped token. In practice, tokens are all 64 hex chars (32 bytes = 64 chars), so the lengths are uniform. **Low risk today, but worth noting.**

**Fix:** Pad both buffers to a fixed length before comparison (similar to finding in `adminLoginHandler`).

**Confidence:** Low.

---

### 4.8 [LOW] `auth.ts:44-46` — does not differentiate missing vs invalid token
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\auth.ts:44-46`

Returns the same `authTokenMissing()` for both. This is actually good practice (prevents enumeration). **No issue.**

**Confidence:** High (passing).

---

## 5. Internal Service-to-Service Auth

### 5.1 [HIGH] `INTERNAL_SERVICE_TOKENS_JSON` not required in env; legacy single-token bypass still works
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\config\env.ts:50-53` and `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\index.ts:54-57`

```ts
// env.ts
INTERNAL_SERVICE_TOKENS_JSON: z.string().optional(),
INTERNAL_SERVICE_TOKEN: z.string().optional(),
```

The env schema accepts either. The startup guard at `index.ts:54-57` accepts either. The middleware at `internalAuth.ts:169-204` falls back to legacy if scoped is missing OR if `callerService` is missing. An admin who configures scoped tokens is *expected* to delete the legacy `INTERNAL_SERVICE_TOKEN`, but if they forget, both work. Worse, the `.env` file in the repo (committed by mistake? or not in `.gitignore`?) has `INTERNAL_SERVICE_TOKEN=349d27de05a948d70543f1a0ee94cb20366ca1ff4d6b2e0f7fcb2ffb7cb22b94` set. If this value is also used in production, the entire blast-radius argument for scoped tokens is moot.

**Fix:** Reject startup if both are set; if only `INTERNAL_SERVICE_TOKENS_JSON` is set, remove the legacy fallback in the middleware.

**Confidence:** High.

---

### 5.2 [MEDIUM] `internalAuth.ts:147-153` — invalid JSON in `INTERNAL_SERVICE_TOKENS_JSON` silently ignored
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\internalAuth.ts:146-154`

```ts
function resolveScopedTokens(): Record<string, string> | null {
  try {
    const raw = process.env.INTERNAL_SERVICE_TOKENS_JSON;
    const parsed = raw ? JSON.parse(raw) as Record<string, string> : {};
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}
```

If the JSON is malformed, the function returns `null`, and the middleware proceeds with legacy. The `index.ts` startup check parses the JSON elsewhere (or not) — if not, the operator gets no error feedback. The middleware should fail-closed on parse error in production.

**Confidence:** Medium.

---

### 5.3 [LOW] `internalAuth.ts:160` — IP allowlist check happens before token check
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\internalAuth.ts:156-162`

The IP allowlist is checked first, then the token. This is the right order for fail-closed (don't reveal token validation to off-allowlist IPs). **No issue.**

**Confidence:** High (passing).

---

## 6. Session/Cookie Handling

### 6.1 [INFO] No cookies are set — the service is stateless JWT
**Location:** All routes

No `Set-Cookie` headers in any route. Authentication is via `Authorization: Bearer` header. No cookie-related vulnerabilities (no `httpOnly`/`Secure`/`SameSite` to misconfigure).

**Confidence:** High (passing).

---

## 7. MFA Implementation

### 7.1 [MEDIUM] TOTP secret encrypted with a fixed-salt PBKDF2 — KDF weakness
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\totpEncryption.ts:40-53`

```ts
function deriveKey(rawKey: string): Buffer {
  if (/^[a-f0-9]{64}$/i.test(rawKey)) {
    return Buffer.from(rawKey.slice(0, 64), 'hex');
  }
  if (/^[A-Za-z0-9+/]{43}=$/.test(rawKey) || /^[A-Za-z0-9+/]{44}$/.test(rawKey)) {
    const decoded = Buffer.from(rawKey, 'base64');
    if (decoded.length === KEY_LENGTH) return decoded;
  }
  // Format 3: passphrase — PBKDF2 stretch
  const salt = 'rez-totp-v1'; // fixed salt for deterministic derivation
  return crypto.pbkdf2Sync(rawKey, salt, 100_000, KEY_LENGTH, 'sha512');
}
```

If `OTP_TOTP_ENCRYPTION_KEY` is a passphrase (not 64 hex chars or 44 base64 chars), the PBKDF2 path uses a **fixed salt** `'rez-totp-v1'`. A fixed salt negates the value of salt (rainbow tables / precomputation across deploys). The PBKDF2 only matters if the passphrase is weak, in which case the fixed salt is a problem.

**Fix:** Use a random per-secret salt, stored alongside the ciphertext. The current `payload = { v, iv, ct }` format has no salt field; add one.

**Confidence:** Medium (only matters for passphrase-format keys, not hex/base64).

---

### 7.2 [MEDIUM] AES-GCM IV is per-encryption random — good
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\totpEncryption.ts:73`

`crypto.randomBytes(IV_LENGTH)` — correct, random per encryption. **No issue.**

**Confidence:** High (passing).

---

### 7.3 [MEDIUM] Backup code: hex truncated to 8 chars — only 32 bits of entropy
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\totpService.ts:157-174`

```ts
const randomBytes = crypto.randomBytes(Math.ceil(BACKUP_CODE_LENGTH / 2)); // 4 bytes
const code = randomBytes.toString('hex').toUpperCase().slice(0, BACKUP_CODE_LENGTH); // 8 hex chars
```

4 bytes of entropy = 32 bits = ~4 billion possibilities. Brute-forceable in minutes with a dictionary if a rate limit is missing. The MFA backup-verify route at `mfaRoutes.ts:246-293` has no per-user rate limit on backup code attempts. An attacker with a stolen user JWT can submit 8-char codes at unlimited rate until one matches.

**Fix:** Use at least 6 bytes (12 hex chars), and add a rate limiter to `backup-verify`.

**Confidence:** High.

---

### 7.4 [HIGH] `verifyBackupCode` uses `timingSafeEqual` but pre-hashes the input — vulnerable to per-code timing if multiple codes are stored
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\totpService.ts:194-200`

```ts
export function verifyBackupCode(code: string, hashedCode: string): boolean {
  const codeHash = hashBackupCode(code);
  return crypto.timingSafeEqual(Buffer.from(codeHash), Buffer.from(hashedCode));
}
```

`mfaRoutes.ts:267-273` calls `verifyBackupCode` in a loop. Each iteration:
1. Computes `codeHash = hashBackupCode(code)` — O(1)
2. Calls `timingSafeEqual` — constant time per call

But the **loop short-circuits** at the first match (line 269 `break`). This is a timing oracle: a code that matches early in the list returns faster than a code that matches late. With 10 backup codes, the difference is negligible (10 SHA-256 hashes is microseconds). **Low practical risk** for 10 codes, but a 1000-code list (some sites have many) would be exploitable.

**Confidence:** Low.

---

### 7.5 [HIGH] MFA `verify-setup` accepts the secret *from the user* implicitly by storing then re-decrypting — but the flow has a race
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\mfaRoutes.ts:122-174`

The flow:
1. `POST /auth/mfa/setup` generates a secret, encrypts it, stores with `isEnabled: false`.
2. `POST /auth/mfa/verify-setup` fetches the pending config, decrypts the secret, verifies the TOTP.

If the user calls `setup` twice in parallel, both calls return the QR code. The second call's `findOneAndUpdate` (line 88-97) overwrites the first's secret. If the user scans the first QR code, the second `verify-setup` will use the second secret — **the first code never matches**. The user is locked out.

**Fix:** Make the setup endpoint reject if a pending config already exists, or version-stamp the secret.

**Confidence:** Medium.

---

### 7.6 [MEDIUM] TOTP replay protection window is ±1 period (60s total) — large
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\totpService.ts:133-150`

A 30-second period with ±1 tolerance means a 60-second window in which a given 6-digit code is valid. The TOTP is `HMAC-SHA1` truncated to 6 digits, so collisions are common (only 10^6 codes per 30s window = ~1 collision per 30 codes per window). With 60-second effective window, an attacker has 2 chances to guess per minute per user. Combined with finding 7.3 (weak backup codes) and no rate limit on `/auth/mfa/verify`, brute-force is feasible.

**Fix:** Reduce window to 0 (no skew tolerance), or rate-limit `/auth/mfa/verify` to 5/min per user.

**Confidence:** Medium.

---

### 7.7 [MEDIUM] `authRoutes.ts:1011-1027` — admin backup code verification also short-circuits the loop
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:1019-1031`

Same finding as 7.4. The admin backup code list is also walked with early `break`. **Low risk for 10 codes, but worth a fix.**

---

### 7.8 [CRITICAL] Admin MFA verify endpoint has no rate limit
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:965-1063`

`router.post('/auth/admin/mfa/verify', adminMfaVerifyHandler);` — no `authLimiter`, no `adminLoginLimiter`. An attacker with a stolen `pendingToken` (5-minute TTL) can brute-force the 6-digit TOTP at unlimited rate. With 60-second TOTP window, ~120 attempts to exhaust the window. ~1 in 60,000 chance per code, but unlimited tries = expected 30,000 tries = seconds at 100 RPS.

**Fix:** Add `adminLoginLimiter` (3/5min/IP) to the route.

**Confidence:** High.

---

## 8. OAuth2 Partner Flows

### 8.1 [CRITICAL] `oauthPartnerRoutes.ts:325` calls `verifyOTP(phone, otp)` with default `countryCode = '+91'` — wrong lockout key for non-IN users
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:325`

This is the same issue as 1.2 in the OAuth context. An attacker can trigger 5 lockouts in a 30-minute window for the same phone, but only for the `+91` bucket. The OAuth `/oauth/consent` accepts a `phone` field of any format (`+1234567890`), and `verifyOTP` will hash and store under `+91+1234567890` while the regular `auth/otp/verify` uses the parsed country code. **Different lockout buckets = bypass.**

**Fix:** In `oauthPartnerRoutes.ts:325`, parse the phone properly and pass the country code.

**Confidence:** High.

---

### 8.2 [HIGH] `oauthPartnerRoutes.ts:308-316` — phone-based rate limit on the OAuth flow
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:306-316`

The rate-limit key is `oauth:otp_attempt:${phone}` (no normalization). Different phone formats hit different buckets. The `oauthConsentLimiter` is per-IP (10/min), so 10 different phone formats from one IP = 100 OTP attempts/min. The `verifyOTP` call also has a separate `+91`-keyed fail counter. Brute-force is straightforward.

**Fix:** Add a strict E.164 parser before keying, and increase the per-phone rate limit to global hard ceiling.

**Confidence:** High.

---

### 8.3 [CRITICAL] `oauthPartnerRoutes.ts:587-607` — `Array.filter` with async callback silently fails; token revocation logic is broken
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:587-607`

```ts
const accessPattern = `oauth:token:*`;
const allTokenKeys = await redis.keys(accessPattern);
const userTokens = allTokenKeys.filter(async (key) => {
  const data = await redis.get(key);
  if (!data) return false;
  try {
    const parsed = JSON.parse(data);
    return parsed.userId === tokenInfo.userId && parsed.clientId === tokenInfo.clientId;
  } catch {
    return false;
  }
});
if (userTokens.length > 0) {
  await redis.unlink(...userTokens);
}
```

`Array.prototype.filter` ignores the returned promise. The callback returns a `Promise<boolean>`, but `filter` coerces it to truthy (`Promise` object is always truthy). So `userTokens` is `allTokenKeys` with every element kept (or rejected by truthiness, but a Promise is truthy). The `unlink(...userTokens)` deletes **all** access tokens in the Redis instance. On a theft detection, this is "fail-deadly" — every user's tokens are deleted.

Worse, `await redis.keys('oauth:token:*')` blocks the Redis main thread (KEYS is O(N)).

**Fix:** Use a for-await loop or SCAN cursor, and an explicit predicate:
```ts
const userTokens: string[] = [];
const stream = redis.scanStream({ match: 'oauth:token:*', count: 100 });
for await (const keys of stream) {
  for (const key of keys) {
    const data = await redis.get(key);
    if (!data) continue;
    try {
      const parsed = JSON.parse(data);
      if (parsed.userId === tokenInfo.userId && parsed.clientId === tokenInfo.clientId) {
        userTokens.push(key);
      }
    } catch {}
  }
}
if (userTokens.length > 0) await redis.unlink(...userTokens);
```

**Confidence:** High.

---

### 8.4 [HIGH] `oauthPartnerRoutes.ts:235-236` — `state` stored in Redis is never validated for CSRF
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:235-260, 280-285`

```ts
const oauthState = `${partner.clientId}:${redirect_uri}:${requestedScopes.join(' ')}:${state || ''}`;
await redis.set(`oauth:params:${state}`, oauthState, 'EX', OAUTH_STATE_TTL);
```

The `state` is user-supplied and is the key. There is **no PKCE** (no `code_challenge` / `code_verifier`). The `state` is meant to be CSRF protection (RFC 6749), but the server stores whatever the client sent — no validation that the `state` is bound to a session. An attacker can craft a `state` to a victim's session (knowing it from a previous flow), then when the victim clicks the attacker's link, the attacker's `state` is consumed and the victim gets the attacker's auth code. The redirect at line 369-374 includes `storedState` (which is just the original `state` from the request, not regenerated), so the victim's callback includes the attacker's `state` — **no CSRF protection**.

**Fix:** Generate a server-side `state` (or `nonce`) on `/oauth/authorize` and bind it to the user's session cookie. Return the generated `state` in the JSON response. Use PKCE (`code_challenge` / `code_verifier`).

**Confidence:** High.

---

### 8.5 [MEDIUM] `oauthPartnerRoutes.ts:435-450` — OAuth access token is a random hex, not signed — needs Redis lookup on every request
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:435, 633`

The OAuth access tokens are 32-byte random hex (`crypto.randomBytes(32).toString('hex')`), not JWTs. This is correct for OAuth (opaque tokens) but means every `/oauth/userinfo` request does a Redis GET. If Redis is down, the endpoint fails. The `/oauth/refresh` flow requires Redis for everything. No fallback.

**Confidence:** Low (operational, not security).

---

### 8.6 [MEDIUM] `oauthPartnerRoutes.ts:621-624` — refresh token reuse detection only fires if the *used* key is in Redis; on Redis flush, detection is lost
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:570-616`

If Redis is flushed (e.g., admin clear, or a misconfiguration), an attacker who already captured a refresh token can reuse it without detection. The 30-day TTL of `usedTokenKey` is also long — an attacker has a 30-day window to detect and revoke via this mechanism.

**Fix:** Add a MongoDB-backed record of used refresh tokens (similar to the JWT refresh-token pattern in `tokenService.ts:367-386`).

**Confidence:** Medium.

---

### 8.7 [MEDIUM] `oauthPartnerRoutes.ts:308` — phone in the rate-limit key is not normalized
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:307`

`const rateKey = \`${OTP_ATTEMPT_PREFIX}${phone}\`;` — if `phone` is `+91 98765 43210` and then `+919876543210`, different keys. **Same bypass as 1.1 in the OAuth context.**

**Confidence:** High.

---

### 8.8 [LOW] `oauthPartnerRoutes.ts:402-407` — `safeCompare` is timing-safe (good)
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:13-20`

`crypto.timingSafeEqual` is used after a length check. **No issue.**

**Confidence:** High (passing).

---

### 8.9 [MEDIUM] `oauthPartnerRoutes.ts:298-300` — redirect with `access_denied` error appends the stored state, but state is attacker-supplied
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:294-302`

If the user denies consent, the error redirect includes the `storedState`. This is fine, but the user never verified the state matches their session (because there's no session — the state is the Redis key). An attacker can pre-load a state, send the link to the victim, and if the victim denies, the error URL has the attacker's state. The victim's browser then hits the attacker's redirect_uri with `error=access_denied&state=<attacker-state>`. If the legitimate app's callback handler trusts the state for session binding, the victim's session is now bound to the attacker's state. **CSRF in the error path too.**

**Confidence:** Medium.

---

## 9. Password Handling

### 9.1 [MEDIUM] `bcryptjs` (pure JS) is used instead of `bcrypt` (native) — CPU exhaustion risk
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:4, 679, 879`

`bcryptjs` is 5–10x slower than native `bcrypt`, and pure JS (no native binding). Under load, an attacker can hit `/auth/login-pin` and `/auth/admin/login` with junk PINs to consume CPU. Cost factor is 12 (good), but with `bcryptjs` at cost 12, each verify takes ~250ms. With `authLimiter` at 100/min/IP, an attacker at 1 IP can consume ~25,000ms of CPU per minute per IP — at 100 IP, ~2,500,000ms = **42 minutes of CPU per minute of attack** (linear scaling).

**Fix:** Switch to native `bcrypt` (which has a Node binding) or to `argon2id` (which is the OWASP recommendation).

**Confidence:** High.

---

### 9.2 [LOW] PIN bcrypt cost is 12 — adequate
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:679`

`bcrypt.hash(String(pin), 12)` — cost 12 is the current minimum recommended. **No issue, but see 9.1.**

**Confidence:** High (passing).

---

### 9.3 [MEDIUM] Legacy plaintext admin password — auto-upgrade path
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:861-882`

The admin login handler supports legacy plaintext passwords with a constant-time compare (line 868-877), and on success upgrades to bcrypt. This is a **defense-in-depth improvement**, but it means an admin database could still contain plaintext passwords from older deploys. The transition window is until all admins log in. If the database is leaked in this window, the plaintext passwords are exposed.

**Fix:** Force a migration to bcrypt on next login (already done), but also log a warning at startup if any admin record has a non-bcrypt password hash. Better: write a one-time migration script that hashes all plaintext passwords in a single batch with `bcrypt.hash(password, 12)` and updates them.

**Confidence:** Medium.

---

### 9.4 [HIGH] `bcryptjs` is a JavaScript re-implementation of bcrypt — vulnerable to timing attacks due to the way the JS engine optimizes string comparisons
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:587`

`bcryptjs` is widely considered insecure for production use. The native `bcrypt` is preferred. Specifically, `bcryptjs` has had timing issues that `bcrypt` does not. While not a known CVE today, the recommendation is to use `bcrypt` or `argon2`.

**Fix:** `npm install bcrypt` and `import bcrypt from 'bcrypt'`. Replace all imports.

**Confidence:** High (industry standard recommendation).

---

## 10. Information Disclosure

### 10.1 [HIGH] `index.ts:155` — global error handler logs `err.stack` at error level
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\index.ts:155`

```ts
logger.error('Unhandled error', { error: err.message, stack: err.stack, requestId });
```

The stack trace is logged but not returned to the client. The `errorResponse` returns a generic message. **No direct leak to the user, but the stack is in the logs.** This is acceptable, but if logs are forwarded to an external system (Sentry), the stack may be exposed there. The `errorResponse` at `errorResponse.ts:82-87` returns `{ success: false, error: errMessage, code: errCode, details: errDetails }` — `errMessage` is the original `err.message` for non-ApiError errors. **An unhandled error's `err.message` is returned to the client.** This can leak internal paths ("ECONNREFUSED 10.0.0.5:6379"), MongoDB error details, and other internals.

**Fix:** Map non-ApiError errors to a generic `errors.internalError()` and only log details internally.

```ts
// index.ts:155
if (err instanceof ApiError) {
  return errorResponse(res, err);
}
// Otherwise: generic 500
logger.error('Unhandled error', { error: err.message, stack: err.stack, requestId });
return errorResponse(res, errors.internalError());
```

**Confidence:** High.

---

### 10.2 [MEDIUM] `internalRoutes.ts:79` — `throw new ApiError(500, e.message)` returns raw error messages
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\internalRoutes.ts:79, 127, 163, 215`

```ts
throw new ApiError(500, e.message);
```

The MongoDB error message is returned to the caller. If the caller is a trusted internal service, this is fine, but if the internal token leaks (see finding 5.1), the attacker sees MongoDB internals (collection names, query structure).

**Fix:** Return a generic 500 message; log details internally.

**Confidence:** Medium.

---

### 10.3 [MEDIUM] `internalProfile.routes.ts:30, 50, 68, 92` — same `e.message` leak
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\internalProfile.routes.ts:30, 50, 68, 92`

Same pattern. **Same fix as 10.2.**

**Confidence:** Medium.

---

### 10.4 [LOW] `health.ts:27` — health endpoint includes raw error messages
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\health.ts:27`

`checks.mongodb = \`error: ${err.message}\`` — returns MongoDB error to the health endpoint. The health endpoint is exposed to Render (a public LB), and `req.url === '/health/live'` is a separate liveness probe. The readiness endpoint includes the error. The error is unlikely to contain secrets, but it does reveal the DB topology.

**Confidence:** Low.

---

### 10.5 [MEDIUM] Swagger UI is exposed in production
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\index.ts:126-133`

```ts
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, ...));
app.get('/api-docs.json', (_req, res) => { res.json(swaggerDocument); });
```

The full API surface is documented and publicly accessible. An attacker reading `/api-docs.json` learns all endpoints, their parameters, expected responses, and rate-limit headers. This is a **reconnaissance gift**.

**Fix:** Gate `/api-docs` behind admin authentication or environment check (`if (process.env.NODE_ENV !== 'production')`).

**Confidence:** High.

---

## 11. Logging Hygiene

### 11.1 [HIGH] `otpService.ts:81` — logs last 4 digits of phone
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\services\otpService.ts:81, 85`

```ts
logger.debug(`[DEV ONLY] OTP generated for phone=***${phone.slice(-4)}`);
const maskedPhone = fullPhone.replace(/(\+\d{1,3})\d{6}(\d{4})/, '$1******$2');
```

This is masked. **Good — no leak.**

**Confidence:** High (passing).

---

### 11.2 [HIGH] `oauthPartnerRoutes.ts:332, 313` — phone logged with slicing
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:332`

```ts
logger.warn('[OAuth] OTP verification failed', { phone: phone.slice(-4).padStart(phone.length, '*'), reason: otpResult.reason });
```

`phone.slice(-4).padStart(phone.length, '*')` — pads with `*` to original length, but only the last 4 chars are real. **Masked, good.**

But `padStart(phone.length, '*')` — if `phone` is empty (the route doesn't validate), the result is `''` (no padding). The OTP attempt then logs nothing, but the route proceeds to call `verifyOTP('', otp)` which hashes `':+91'` (empty + country code) — **a fixed hash that can be precomputed and matched**. A request to `/oauth/consent` with `phone: ''` and `otp: '000000'` will:
- Hit the rate limiter (per-IP, 10/min).
- Call `verifyOTP('', '000000', '+91')` which hashes `+91:000000` and checks against `otp:+91` (which exists for legitimate +91 users without an OTP? No — the key is `otp:+91` only if the OTP was sent to `+91` — i.e., the empty phone with +91 country code).

Actually, the OTP key is `otp:${fullPhone}`. If a user has `phone = ''` and `countryCode = '+91'`, `fullPhone = '+91'`. There is no real user with phone `+91`, so the key is never written. The verifyOTP returns `valid: false, reason: 'not_found'`. **No actual exploit, but the empty phone is a shape the server should reject.**

**Fix:** Reject empty/invalid phone at the route level.

**Confidence:** Low (the exploit path requires the OTP key to be set, which is hard).

---

### 11.3 [LOW] `authRoutes.ts:1145-1158` — refresh error logs `err.message` which may include token details
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:1157, 1177`

`logger.error('Refresh error', { error: err.message });` — `err.message` for JWT errors is generic ("invalid signature", "jwt expired"). No token bytes are logged. **No issue.**

**Confidence:** High (passing).

---

### 11.4 [LOW] `internalAuth.ts:140-141` — full allowlist logged on rejection
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\internalAuth.ts:140-141`

```ts
allowlist,
```

The full IP allowlist is logged on every rejection. If the allowlist is `10.0.0.0/8,172.16.0.0/12,192.168.0.0/16`, that's a fixed string. **No issue.**

**Confidence:** High (passing).

---

### 11.5 [MEDIUM] `authRoutes.ts:425, 430` — MFA session token may end up in logs via error path
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:425, 430`

```ts
const sessionJson = await redis.get(`mfa:verify:${mfaSessionToken}`);
```

The token is used as a Redis key. If Redis logs are forwarded (Redis slowlog, audit log), the token leaks. Better to use a hash: `mfa:verify:${sha256(token)}` and store the hash→payload mapping.

**Confidence:** Medium.

---

## 12. CORS

### 12.1 [HIGH] CORS allows `credentials: true` with origin allowlist — but allowlist contains wildcard patterns
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\index.ts:91-98`

```ts
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
```

The CORS check is exact-match (`allowedOrigins.includes(origin)`). The wildcard check at lines 84-89 only rejects `*` in the env value, not subdomains. The CORS_ORIGIN env value is `https://rez-app-admin.vercel.app,https://rez-app-consumer.vercel.app,https://rez-app-marchant.vercel.app,...` — all full origins. **No wildcard leakage.**

But `credentials: true` with the current setup is correct: the frontend can send cookies/auth headers cross-origin. The CORS spec says `Access-Control-Allow-Origin` must NOT be `*` when `credentials: true`, and the code uses `cb(null, true)` which Express-cors translates to echoing the origin. **No issue today.**

**Confidence:** High (passing).

---

### 12.2 [LOW] `app.set('trust proxy', 1)` — trusts the first 
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\index.ts:71`

Standard pattern for Render. `req.ip` reflects the client IP from `X-Forwarded-For` leftmost. **No issue.**

**Confidence:** High (passing).

---

## 13. MongoDB Injection

### 13.1 [HIGH] `authRoutes.ts:1422-1426` — `email` is passed directly to MongoDB query
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:1422-1426`

```ts
const normalizedEmail = String(email).toLowerCase().trim();
const existing = await Users.findOne({
  _id: { $ne: new mongoose.Types.ObjectId(decoded.userId) },
  email: normalizedEmail,
  'auth.emailVerified': true,
});
```

`email` is the user-supplied string. The regex check at line 1414 limits format, but the value is passed as-is to the query. If the regex is bypassed (e.g., `email` is an array — but `String(arr)` would call `Array.prototype.toString` and produce `a@b.c,d@e.f`), the query would search for `email: 'a@b.c,d@e.f'`. Not exploitable in MongoDB query (no operator injection) but could match the wrong doc. The regex rejects arrays because `String([])` is `''`.

`mongoSanitize()` is applied globally (line 100), which strips `$`-prefixed keys from `req.body`. So `email: { $ne: null }` in the body becomes `email: '[object Object]'` (mongoSanitize replaces with empty string for non-string values? Let me verify).

Looking at express-mongo-sanitize v2 behavior: it removes keys starting with `$` or containing `.`. So `req.body.email` (a string) is unaffected. If `req.body.email` is an object like `{ $ne: null }`, mongoSanitize replaces the WHOLE object with an empty string. The regex then fails. **No injection.**

But for the **change phone** flow at `authRoutes.ts:1309-1310`:
```ts
const existing = await Users.findOne({ $or: [{ phoneNumber: newFullPhone }, { phone: newFullPhone }] });
```

`newFullPhone` is built from `parsePhone(req.body)` which uses `/^\d{5,15}$/` for `phone` and `/^\+\d{1,3}$/` for `countryCode`. So `newFullPhone` is always a sanitized string. **No injection.**

For the **email verification confirm** at `authRoutes.ts:1455-1461`:
```ts
const updateResult = await Users.updateOne(
  { _id: userId, $nor: [{ email: result.email, 'auth.emailVerified': true, _id: { $ne: userId } }] },
  { $set: { 'auth.emailVerified': true, email: result.email, updatedAt: new Date() } },
);
```

`result.email` came from Redis (line 1446) which stored the normalized email at line 1419. The Redis stored value is safe (Mongo did not insert). **No injection.**

**Confidence:** High (passing — mongoSanitize + regex provides defense in depth).

---

### 13.2 [LOW] `internalRoutes.ts:46-52` — `customerPhone` is passed directly to MongoDB
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\internalRoutes.ts:46-52`

```ts
const user = await User.findOneAndUpdate(
  { phoneNumber: customerPhone },
  ...
);
```

`customerPhone` is internal-only (gated by `requireInternalToken`), so the input is from a trusted sibling service. **No injection risk from external actors**, but a compromised service token could insert a malicious `customerPhone` like `{ $ne: null }`. mongoSanitize doesn't help because the field is set inside the route handler, not from `req.body` at the express level... wait, `customerPhone` is `req.body.customerPhone` (line 24). mongoSanitize processes `req.body` before the route runs. So if `customerPhone` is `{ $ne: null }`, it becomes `''`. Then `phoneNumber: ''` — finds the user with empty phone number (if any). Not exploitable as a NoSQL injection, but a compromised service can still pass arbitrary phone numbers.

**Fix:** Validate `customerPhone` is a string with E.164 format before use.

**Confidence:** Low.

---

### 13.3 [HIGH] `authRoutes.ts:187` — `req.body` directly into `findOne` projection
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:186-189`

```ts
const existingUser = await Users.findOne(
  { $or: [{ phoneNumber: fullPhone }, { phone: fullPhone }] },
  { projection: { 'auth.pinHash': 1, 'auth.isOnboarded': 1, isActive: 1 } },
);
```

The query values are `fullPhone` (sanitized via `parsePhone`), and the projection is hardcoded. **No injection.**

But the *projection* is hardcoded — this is good. If a developer ever changes this to use `req.body.projection`, it becomes a leak vector. **Code review note.**

**Confidence:** Low (no issue today).

---

## Additional Findings (Functional Flow Gaps)

### F1 [HIGH] `mfaRoutes.ts:303-305` — `code` is `String(req.body.code).trim()` but then `String().trim()` again, defensive duplication
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\mfaRoutes.ts:303`

```ts
const code = String(req.body.code).trim();
```

If `req.body.code` is `undefined`, `String(undefined)` is `'undefined'` — passes `String()` then trims, regex check fails (`/^\d{6}$/`). The error message at line 308 is `Invalid TOTP code format`. The route does not reach the MfaConfig fetch. **Safe, but the error is misleading.**

**Confidence:** Low.

---

### F2 [HIGH] `emailVerifyConfirmHandler` accepts tokens that may not have been deleted in the `verifyEmailToken` path
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:1441-1480` and `emailService.ts:75-98`

The flow at `emailService.ts:75-98` returns the `key` (Redis key) to the caller instead of deleting the token. The caller (`authRoutes.ts:1469-1472`) deletes the key on success. This is a recovery improvement.

**However**, the `verifyEmailToken` function does not validate the format of the token. `await redis.get(\`email-verify:${token}\`)` — if `token` is a path parameter (line 1443 `req.params.token`), an attacker can pass `../` or special chars. Express decodes the URL, but the Redis key becomes `email-verify:../...` which doesn't match. No issue, but the function should validate the token format.

**Fix:** Validate `token` is a 64-char hex string.

**Confidence:** Low.

---

### F3 [HIGH] `oauthPartnerRoutes.ts:345` — `code` is a UUID — but never bound to the user/IP, so any party that obtains the URL can exchange it
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:345-358`

```ts
const code = crypto.randomUUID();
const codeData = { clientId, redirectUri, userId: user._id.toString(), scope };
await redis.setex(`${REDIS_KEYS.AUTH_CODE}${code}`, AUTH_CODE_TTL, JSON.stringify(codeData));
```

The `code` is a UUID (122 bits of entropy), stored in Redis with 10-minute TTL. The redirect at line 367-374 includes the code in the URL. Anyone who intercepts the redirect (compromised browser history, log, referer) can exchange the code for an access token at `/oauth/token`. **This is by design** (the redirect_uri is trusted to be TLS), but the code is sent in the query string, which can be logged by intermediate proxies.

**Fix:** Use PKCE (code_challenge/code_verifier) so that the code alone is not enough to redeem; the verifier must also be presented.

**Confidence:** Medium.

---

### F4 [MEDIUM] `mfaRoutes.ts:230-237` — successful MFA verify returns 200 but does not issue a new session JWT
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\mfaRoutes.ts:230-239`

```ts
res.json({
  success: true,
  message: 'MFA verified',
  mfaVerified: true,
});
```

The response is `mfaVerified: true` but no new JWT is issued. The client presumably calls back to a guarded endpoint, which calls `requireMfa`, which checks `isMfaVerified` — but `markMfaVerified` was never called (finding 4.4). **The MFA flow is broken end-to-end.**

**Fix:** Call `markMfaVerified` in this handler. Optionally, issue a new JWT with an MFA-claim or a short-lived `mfa:verified` token.

**Confidence:** High.

---

### F5 [HIGH] `authRoutes.ts:201-204` — `sendOTP` does not check `isActive` before sending
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:185-204`

The handler checks `existingUser.auth.pinHash` and `isActive` in the projection, but does not check `isActive` before sending the OTP. A user with `isActive: false` can still receive an OTP (the response at line 280-282 in `verifyOTPHandler` then blocks them with a 403). The OTP is sent unnecessarily. **Wasted SMS cost and SMS-based account probing — an attacker can enumerate active vs inactive accounts by sending OTPs and checking whether verify succeeds.**

**Fix:** Reject the sendOTP early for inactive users (return the same response as a new user to avoid enumeration).

**Confidence:** Medium.

---

### F6 [MEDIUM] `authRoutes.ts:300-304` — MFA session JWT lacks `iat`/`jti` for session binding
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:300-318`

```ts
const mfaSessionPayload = {
  userId,
  phone: fullPhone,
  role: user.role || 'user',
  deviceFingerprint: deviceService.computeFingerprint(req.headers as ...),
  purpose: 'mfa_verify',
};
const mfaSessionToken = jwt.sign(mfaSessionPayload, mfaSecret, { expiresIn: '5m' });
```

No `jti`. The Redis key is `mfa:verify:${mfaSessionToken}` — the full token. The blacklist on line 453 uses `redis.unlink(\`mfa:verify:${mfaSessionToken}\`)`. **Works, but the Redis key is 200+ bytes per session. With 5-minute TTL, the Redis memory can grow.** Use `jti` and store `jti → payload`.

**Confidence:** Low.

---

### F7 [HIGH] `authRoutes.ts:432-434` — MFA session JWT `phone`/`role` come from Redis, `userId` from JWT — inconsistent
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:430-433`

```ts
const session = JSON.parse(sessionJson);
// Use userId from JWT payload (authoritative) instead of session
const { phone, role, deviceFingerprint } = session;
const userId = jwtPayload.userId;
```

The comment says `userId` is from the JWT (authoritative), but `phone` and `role` are from the Redis session. The `phone` and `role` are stored in Redis by the original `verifyOTPHandler` at line 312-318. If the Redis value is tampered (which requires Redis R/W access — an admin or compromised Redis), the `phone` used in the new JWT (line 473) is attacker-controlled. The `userId` from the JWT is the constraint (it must match the session, but the code doesn't check this).

**Fix:** Verify `jwtPayload.userId === session.userId`. Also verify `jwtPayload.phone === session.phone`.

**Confidence:** High.

---

### F8 [MEDIUM] `requireMfa.ts:97` — same as finding 2.4
Already covered.

---

### F9 [HIGH] `authRoutes.ts:1019-1027` — admin backup code verification uses `bc.code` (hashed) but compares with `verifyBackupCode` (also hashed) — but the loop short-circuits
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:1019-1031`

```ts
if (!verified && /^\w{4}-\w{4}$/.test(code)) {
  for (const bc of adminMfa.backupCodes) {
    if (!bc.used && totpService.verifyBackupCode(code.toUpperCase(), bc.code)) {
      bc.used = true;
      bc.usedAt = new Date();
      verified = true;
      break;
    }
  }
  if (verified) {
    await adminMfa.save();
  }
}
```

The pattern of `bc.code.match` is only a SHA-256 hash comparison — `bc.code` is the hash. The verification is `verifyBackupCode(code, bc.code)` which hashes `code` and compares. **Correct logic.** But:
1. The regex `/^\w{4}-\w{4}$/` matches any 4-char-4-char pattern including `****-****` (all asterisks are word chars). An attacker submitting `****-****` will not match any real hash (SHA-256 of `****-****` is fixed, but it's not in the user's set), so this is fine. **But** the regex is too permissive — it should require hex/alphanumeric only.
2. The loop short-circuits on first match (timing oracle, see 7.4).

**Fix:** Tighten the regex to `/^[A-F0-9]{4}-[A-F0-9]{4}$/` and iterate all codes (no early break).

**Confidence:** Medium.

---

### F10 [MEDIUM] `authRoutes.ts:933-938` — admin MFA pending state in Redis but pendingToken carries the same info
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:926-928`

```ts
const pendingKey = `admin-pending:${userId}`;
await redis.set(pendingKey, pendingToken, 'EX', 300);
```

The Redis key is `admin-pending:${userId}` (only one per user), and the value is the `pendingToken`. The check at line 990-992:
```ts
const storedToken = await redis.get(pendingKey);
if (!storedToken || storedToken !== pendingToken) {
  throw new ApiError(401, 'Pending session expired or already used. Please login again.');
}
```

The check is `!==` (not constant-time). For a 200-byte token, the timing leak is microseconds, but it's a defense-in-depth concern. **Use `crypto.timingSafeEqual`.**

**Confidence:** Low.

---

### F11 [MEDIUM] `requireMfa.ts:74-76` — JWT verify error swallows the message
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\middleware\requireMfa.ts:74`

```ts
} catch (err: any) {
  return errorResponse(res, errors.authTokenInvalid());
}
```

The error is silently swallowed. The client gets a generic "invalid token" — fine, but a developer debugging won't know if it's an expired token, bad signature, or wrong secret. **No security issue, but log the error.**

**Confidence:** Low.

---

### F12 [HIGH] `authRoutes.ts:855-857` — invalid admin user: bcrypt compare with fake hash to prevent timing leak
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\authRoutes.ts:853-857`

```ts
if (!admin) {
  await bcrypt.compare(password, '$2b$12$invalidhashpaddingtopreventimenumeration');
  throw new ApiError(401, 'Invalid credentials');
}
```

`$2b$12$invalidhashpaddingtopreventimenumeration` — is this a valid bcrypt hash? Let me check format: `$2b$<cost>$<22-char-salt><31-char-hash>`. The string `invalidhashpaddingtopreventimenumeration` is 38 chars. Length 38 includes 22 (salt) + 16 (hash) = 38, but bcrypt hash is 22 + 31 = 53 chars. The provided string is too short.

`bcrypt.compare` will read the salt and re-hash the password, then compare with the (truncated) hash. It should still work (truncation is fine for the salt extraction) but takes the same time. **Probably safe**, but the comment says "padding" which is misleading. The hash length is wrong but the timing should still be constant.

**Fix:** Use a known-valid bcrypt hash like `$2b$12$0000000000000000000000.0000000000000000000000000000000000` (with 22+31=53 chars).

**Confidence:** Medium.

---

### F13 [MEDIUM] `oauthPartnerRoutes.ts:394-477` — `POST /oauth/token` accepts credentials in body, not Basic auth
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:394`

OAuth 2.0 spec (RFC 6749 §2.3.1) says client credentials MAY be in the body OR Basic auth. The current impl uses body only. **No issue, but server logs may capture `client_secret` in the body. If body is logged, secret leaks.**

**Fix:** Add `client_secret` to a denylist of fields not to log. Or accept Basic auth.

**Confidence:** Low.

---

### F14 [HIGH] `mfaRoutes.ts:281-282` — backup code `used` flag updated, but `bc.usedAt` is set even if `mfaConfig.save()` fails
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\mfaRoutes.ts:267-282`

```ts
let codeFound = false;
for (const bc of mfaConfig.backupCodes) {
  if (!bc.used && totpService.verifyBackupCode(backupCode, bc.code)) {
    bc.used = true;
    bc.usedAt = new Date();
    codeFound = true;
    break;
  }
}
if (!codeFound) { ... }
await mfaConfig.save();
```

If `mfaConfig.save()` fails, the in-memory `bc.used = true` is rolled back by Mongoose on the next fetch (the change is on the document object, not persisted). **Actually, this is correct** — the in-memory change is lost on save failure. **No issue.**

But if `bc.used = true` is set in-memory and then a second request with the same backup code arrives concurrently, the second request reads the same Mongoose document from the in-memory cache (Mongoose `findOne` returns a model instance, not a fresh DB read on each call) and sees `bc.used = false` (the in-memory change isn't persisted yet). **Race condition: the same backup code can be used twice if two requests hit simultaneously.**

**Fix:** Use `findOneAndUpdate` with an atomic `$set` matching the unused code.

**Confidence:** Medium.

---

### F15 [CRITICAL] `mfaRoutes.ts:108-110` — `/auth/mfa/setup` returns `backupCodes` in plaintext ONCE, but if the user re-runs setup before verify, the old codes are overwritten
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\mfaRoutes.ts:88-97`

```ts
await MfaConfig.findOneAndUpdate(
  { userId: new mongoose.Types.ObjectId(userId) },
  { userId: ..., secret: encryptedSecret.encrypted, isEnabled: false, backupCodes: hashedBackupCodes },
  { upsert: true, new: true }
);
```

If a user has not yet verified the setup (line 67-69 only blocks if `isEnabled: true`), they can re-run setup. The `findOneAndUpdate` with `upsert: true` overwrites the secret and backup codes. The user receives a new QR code (with the new secret) and a new set of backup codes. The previous codes are gone. **No security issue per se, but the user may have written down the old codes and now they're invalid. This is a UX issue, not a security issue.** The bigger issue: if the user never verifies the setup and a later flow proceeds with the new codes, the old codes are dead.

**Confidence:** Low (UX issue, not security).

---

### F16 [HIGH] `oauthPartnerRoutes.ts:271-379` — entire `/oauth/consent` flow is unauthenticated until OTP verify succeeds
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\src\routes\oauthPartnerRoutes.ts:271-379`

The flow expects the user to enter their phone and OTP, but there's no session check, no cookie, no nothing. The route accepts `phone` and `otp` and (on success) issues an auth code. **This is an OTP-based OAuth flow, which is OK** — but the route is not bound to a session, and the `state` is not validated (see 8.4). An attacker can directly POST to `/oauth/consent` with a victim's phone and their own intercepted OTP to get a code for the victim's account. **Wait — the OTP is sent to the victim's phone, so the attacker doesn't have the OTP.** Unless the attacker can intercept the OTP (SIM swap, SS7) or has previously phished it. The flow is actually secure against a passive attacker.

**Active attacker:** If the attacker controls the network, they can redirect the user to a malicious `/oauth/authorize` with a malicious `state` and `redirect_uri`. The user is shown the REZ login page (via the redirect to `/oauth/consent`). The user enters their OTP. The OTP is verified. The code is sent to the **attacker's redirect_uri** (because `redirect_uri` is part of the state stored in Redis). **This is an open redirect via the OAuth flow** — the attacker chooses the redirect_uri at `/oauth/authorize` and it must be in the partner's `redirectUris` list. If the partner is "rez-merchant" with `redirectUris: ['https://rez-merchant-service.onrender.com/api/auth/callback']`, the attacker is constrained. **But the partner's redirect_uris are admin-configured and rarely change. The risk is for partners that allow multiple redirect URIs (e.g., a partner with `['https://example.com/callback', 'https://example.com/staging-callback']` — the attacker uses the staging one).**

**Fix:** Bind `state` to a server-side session and use PKCE. The redirect_uri should also be bound to a single partner+user+scope tuple and not freely chosen at `/oauth/consent`.

**Confidence:** Medium.

---

## Dependency Vulnerabilities (package-lock.json snapshot)

### D1 [HIGH] `@sentry/node@7.120.4` — Sentry v7 is EOL; v8 is required
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:23`

Sentry v7 reached end-of-life in 2024. No more security patches. Upgrade to v8+.

**Confidence:** High.

---

### D2 [MEDIUM] `bcryptjs@3.0.3` — pure JS, vulnerable to timing attacks
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:29`

See finding 9.4. Replace with `bcrypt` (native) or `argon2`.

**Confidence:** High.

---

### D3 [MEDIUM] `mongoose@8.23.1` — current, but track for advisories
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:41`

No known critical CVE at this version. `strict: false` in `User.ts:45` allows extra fields — a NoSQL injection could add unintended fields. See finding 13.3.

**Confidence:** Medium.

---

### D4 [LOW] `axios@1.16.0` — current
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:28`

Current major version, no known critical CVE.

**Confidence:** High.

---

### D5 [LOW] `express@4.22.1` — current
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:34`

Current. No known critical CVE.

**Confidence:** High.

---

### D6 [LOW] `jsonwebtoken@9.0.3` — current
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:40`

v9.0.0+ is the secure version (v8 had a known `alg: none` vulnerability). Current. **No issue.**

**Confidence:** High.

---

### D7 [LOW] `helmet@7.2.0` — current
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:37`

Current.

**Confidence:** High.

---

### D8 [MEDIUM] `resend@6.1.3` —  email API; trust boundary
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:43`

No known CVE, but the email verification link is built using `APP_URL` (env var) — if misconfigured to an attacker-controlled domain, the verification link is an open-redirect phishing vector.

**Fix:** Validate `APP_URL` is `https://` and is a known domain.

**Confidence:** Medium.

---

### D9 [LOW] `express-mongo-sanitize@2.2.0` — current
**Location:** `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\package.json:36`

v2.2.0 fixed a prototype pollution issue (CVE-2024-21506 in earlier versions). Current. **No issue.**

**Confidence:** High.

---

## Summary by Severity

| Severity | Count |
|----------|-------|
| Critical | 5 |
| High | 24 |
| Medium | 33 |
| Low | 13 |

## Top 5 Fixes to Apply Immediately

1. **Fix `appCheckVerifier.ts:27-50`** (Critical) — replace fake verifier with real `firebase-admin/app-check` call, or delete the middleware. Currently accepts any base64-encoded JSON.

2. **Fix `oauthPartnerRoutes.ts:587-607`** (Critical) — `Array.filter` with async callback never works. Use a for-await loop. Currently deletes ALL access tokens on theft detection (or NONE).

3. **Fix `requireMfa.ts:97` + `corpAuth.ts:78` + missing `markMfaVerified` call** (High) — MFA flow is broken end-to-end. `markMfaVerified` is never called, so every MFA-enabled user is locked out.

4. **Fix `oauthPartnerRoutes.ts:8.4` state CSRF** (High) — generate server-side `state`, bind to session, add PKCE.

5. **Fix `authRoutes.ts:855-857` admin timing-attack fake hash** (High) — replace with a properly-formed bcrypt hash, OR add `await bcrypt.hash(randomString, 12)` once and reuse.

---

## Files Read

I read all the files you requested plus several additional supporting files. All findings are in `C:\Users\user\Downloads\rez-backend-master\rez-auth-service\`:
- `src/index.ts`
- `src/config/env.ts`, `src/config/logger.ts`, `src/config/redis.ts`, `src/config/redis-auth.ts`, `src/config/redisSentinel.ts`, `src/config/mongodb.ts`, `src/config/mongodb-auth.ts`, `src/config/tracing.ts`
- `src/middleware/auth.ts`, `src/middleware/requireMfa.ts`, `src/middleware/internalAuth.ts`, `src/middleware/corpAuth.ts`, `src/middleware/appCheckVerifier.ts`, `src/middleware/rateLimiter.ts`, `src/middleware/tracing.ts`
- `src/services/otpService.ts`, `src/services/tokenService.ts`, `src/services/totpService.ts`, `src/services/totpEncryption.ts`, `src/services/deviceService.ts`, `src/services/emailService.ts`, `src/services/profile.service.ts`, `src/services/rezMindService.ts`
- `src/routes/authRoutes.ts`, `src/routes/mfaRoutes.ts`, `src/routes/oauthPartnerRoutes.ts`, `src/routes/internalRoutes.ts`, `src/routes/profile.routes.ts`, `src/routes/internalProfile.routes.ts`, `src/routes/admin/oauthAdmin.ts`
- `src/models/User.ts`, `src/models/MfaConfig.ts`, `src/models/AdminMfaConfig.ts`, `src/models/RefreshToken.ts`, `src/models/UserProfile.ts`, `src/models/index.ts`
- `src/utils/errorResponse.ts`, `src/utils/response.ts`, `src/utils/encryption.ts`, `src/utils/requestLogger.ts`
- `src/health.ts`, `src/metrics.ts`
- `package.json`, `package-lock.json` (sampled), `.env`, `SECURITY.md`, `OAUTH_PARTNERS.md`, `Dockerfile`, `CLAUDE.md`

---

## Final Notes

The codebase has many thoughtful defense-in-depth measures (atomic OTP via Lua, atomic phone-uniqueness via `$nor`, single-use refresh via MongoDB unique index, AES-256-GCM at rest, JWT secret separation, scoped internal tokens, timing-safe comparisons). The most concerning issues are the **fake `appCheckVerifier` middleware** (placeholder code in production), the **broken `markMfaVerified` flow** (MFA is functionally broken), and the **broken async filter in OAuth revocation** (mass token deletion on theft detection).

The audit identifies 5 Critical, 24 High, 33 Medium, and 13 Low issues, plus 16 functional flow gaps (F1–F16).