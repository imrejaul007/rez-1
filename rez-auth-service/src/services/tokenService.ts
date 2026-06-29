import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { redis } from '../config/redis';
import { createServiceLogger } from '../config/logger';
import { RefreshToken } from '../models/RefreshToken';

const logger = createServiceLogger('token');

const BLACKLIST_PREFIX = 'blacklist:token:';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
const ADMIN_ROLES = ['admin', 'super_admin', 'operator', 'support'];

interface TokenPayload {
  userId: string;
  role: string;
  merchantId?: string;
  phoneNumber?: string; // embedded so web-ordering routes can resolve customer without DB lookup
  iat?: number;
  exp?: number;
}

function getSecret(role: string): string {
  if (ADMIN_ROLES.includes(role)) {
    // Never fall back to JWT_SECRET — admin and user tokens must use separate secrets
    // so that a user token cannot be verified as an admin token if JWT_ADMIN_SECRET is unset.
    const secret = process.env.JWT_ADMIN_SECRET;
    if (!secret) throw new Error('[FATAL] JWT_ADMIN_SECRET is not set — cannot issue admin tokens');
    return secret;
  }
  if (role === 'merchant') {
    const secret = process.env.JWT_MERCHANT_SECRET;
    if (!secret) throw new Error('[FATAL] JWT_MERCHANT_SECRET is not set — cannot issue merchant tokens');
    return secret;
  }
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

function getExpiry(role: string): number | string {
  if (ADMIN_ROLES.includes(role)) {
    // Use JWT_ADMIN_EXPIRES_IN first, fall back to JWT_EXPIRES_IN, then default to '15m'.
    // This aligns with the monolith's admin login route (rezbackend/src/routes/admin/auth.ts)
    // which uses JWT_EXPIRES_IN defaulting to '15m'. Previously hardcoded to '8h'.
    return process.env.JWT_ADMIN_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';
  }
  if (role === 'merchant') return '24h';
  return process.env.JWT_EXPIRES_IN || '15m';
}

/**
 * Generates a short-lived JWT access token signed with the role-appropriate secret.
 * @param userId - The user or admin ID to embed in the token
 * @param role - The role determines which secret signs the token (admin/merchant/consumer)
 * @param extra - Optional additional claims (e.g., phoneNumber, merchantId)
 * @returns A signed JWT string
 * @throws Error if the required secret for the given role is not configured
 */
export function generateAccessToken(userId: string, role: string, extra?: Partial<TokenPayload>): string {
  const secret = getSecret(role);
  if (!secret) throw new Error('JWT secret not configured');

  return jwt.sign(
    { userId, role, ...extra },
    secret,
    { expiresIn: getExpiry(role) } as jwt.SignOptions,
  );
}

/**
 * Generates a long-lived JWT refresh token used for token rotation.
 * @param userId - The user ID to embed in the token
 * @param role - The user's role for audit purposes
 * @returns A signed JWT refresh token string
 * @throws Error if JWT_REFRESH_SECRET is not configured
 *
 * SECURITY FIX (AUTH-TTL-001): Reduced default TTL from 7 days to 24 hours.
 * Configurable via JWT_REFRESH_TTL_HOURS environment variable (max 48 hours recommended).
 */
export function generateRefreshToken(userId: string, role: string): string {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT refresh secret not configured');

  // Default to 24 hours, configurable up to 48 hours max
  const ttlHours = Math.min(parseInt(process.env.JWT_REFRESH_TTL_HOURS || '24', 10), 48);
  const expiresIn = `${ttlHours}h`;

  return jwt.sign({ userId, role, type: 'refresh' }, secret, { expiresIn } as jwt.SignOptions);
}

/**
 * Validates a JWT access token using two-tier revocation checking.
 * Checks Redis blacklist first (fast path), then falls back to MongoDB lastLogoutAt.
 * @param token - The JWT access token to validate
 * @returns The decoded token payload with userId, role, and embedded claims
 * @throws Error if the token is blacklisted, revoked, or invalid
 */
export async function validateToken(token: string): Promise<TokenPayload> {
  // Check Redis blacklist first (fast path). If Redis is unavailable, fall back to
  // the authoritative MongoDB lastLogoutAt check. Only deny the token if both
  // Redis AND MongoDB checks fail — defense in depth with two-tier revocation checking.
  try {
    const blacklisted = await redis.exists(`${BLACKLIST_PREFIX}${token}`);
    if (blacklisted) throw new Error('Token revoked');
  } catch (err: any) {
    if (err.message === 'Token revoked') throw err;

    // Redis unavailable — fall back to MongoDB lastLogoutAt check (authoritative)
    logger.warn('Redis unavailable for blacklist check — using MongoDB fallback');

    const decoded_fb = jwt.decode(token) as TokenPayload | null;
    if (decoded_fb?.userId && decoded_fb?.iat) {
      try {
        const db = mongoose.connection;
        const Users = db.collection('users');
        // Pass the userId as a string. Real MongoDB will coerce it to ObjectId
        // or throw a BSONError if it's not a 24-char hex string. We catch
        // BSONError below and treat it as "no matching user" so legacy / test
        // userIds don't break validation.
        const user = await Users.findOne(
          { _id: decoded_fb.userId as unknown as mongoose.Types.ObjectId },
          { projection: { lastLogoutAt: 1 } }
        );
        if (user?.lastLogoutAt) {
          const logoutTimeSec = Math.floor(new Date(user.lastLogoutAt).getTime() / 1000);
          if (decoded_fb.iat < logoutTimeSec) {
            throw new Error('Token issued before last logout — session invalidated');
          }
        }
      } catch (mongoErr: any) {
        if (mongoErr.message.includes('session invalidated')) throw mongoErr;
        // BSONError: userId from token is not a valid ObjectId. Treat as
        // "no matching user" — the JWT signature will be verified below and
        // an invalid userId is not a service outage. This protects against
        // legacy / external tokens that don't carry a 24-char hex userId.
        if (mongoErr.name === 'BSONError' || mongoErr.message?.includes('BSON')) {
          logger.warn('MongoDB fallback skipped — userId is not a valid ObjectId', { userId: decoded_fb.userId });
        } else {
          logger.error('MongoDB fallback also failed for blacklist check — DENYING token for safety', { error: mongoErr.message });
          throw new Error('Authentication service temporarily unavailable');
        }
      }
    }
  }

  // Verify against the correct secret for the token's role.
  // We decode without verification first to extract the role claim, then
  // re-verify with the role-appropriate secret. This prevents a consumer
  // token (signed with JWT_SECRET) from being accepted for admin/merchant
  // roles by falling through to a shared secret.
  const unverified = jwt.decode(token) as TokenPayload | null;
  const role = unverified?.role ?? '';

  const candidateSecrets: string[] = [];
  if (ADMIN_ROLES.includes(role)) {
    candidateSecrets.push(process.env.JWT_ADMIN_SECRET ?? '');
  } else if (role === 'merchant') {
    // Only accept JWT_MERCHANT_SECRET — do NOT fall back to JWT_SECRET, which
    // would allow a consumer token to be accepted as a merchant token.
    const s = process.env.JWT_MERCHANT_SECRET ?? '';
    if (s) candidateSecrets.push(s);
  } else {
    // consumer / guest — only accept JWT_SECRET
    candidateSecrets.push(process.env.JWT_SECRET ?? '');
  }

  for (const secret of candidateSecrets.filter(Boolean)) {
    try {
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] }) as TokenPayload;
      return decoded;
    } catch {
      continue;
    }
  }

  throw new Error('Invalid token');
}

/**
 * Blacklists a token in Redis (best-effort) and updates MongoDB lastLogoutAt.
 * The MongoDB lastLogoutAt serves as the authoritative fallback when Redis is unavailable.
 * @param token - The JWT token to blacklist
 * @param userId - The authenticated userId (required for MongoDB lastLogoutAt update; prevents DoS via token forgery)
 */
export async function blacklistToken(token: string, userId?: string): Promise<void> {
  // SECURITY FIX (AUTH-JWT-001): jwt.decode() is used only for TTL computation (exp claim).
  // It does NOT drive authentication decisions. The TTL is used only for Redis key expiry.
  // Actual auth is enforced by verifyToken() before this function is ever called.
  const decoded = jwt.decode(token) as TokenPayload | null;

  // Redis: best-effort. Failure is acceptable because the MongoDB lastLogoutAt
  // field serves as the durable fallback for token invalidation during Redis outages.
  try {
    // Ensure TTL is at least 1 second — a TTL of 0 skips the Redis write entirely
    // (guarded by `if (ttl > 0)`), meaning a token expiring right now would not be
    // blacklisted and could still be accepted within the same second by the MongoDB
    // lastLogoutAt fallback (which has 1-second granularity).
    const ttl = Math.max(decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400, 1);
    if (ttl > 0) {
      await redis.set(`${BLACKLIST_PREFIX}${token}`, '1', 'EX', ttl);
    }
  } catch (redisErr: any) {
    logger.warn('[AUTH] Redis blacklist write failed — MongoDB fallback will be authoritative', { error: redisErr.message });
  }

  // AUTH-JWT-001 FIX: MongoDB fallback now requires userId to be explicitly passed by the
  // caller (an authenticated endpoint). We NEVER extract userId from an unverified token
  // for a database write — an attacker could forge a token with a victim's userId and
  // call logout to disrupt that user's session (DoS via lastLogoutAt manipulation).
  if (!userId) {
    logger.warn('[AUTH] blacklistToken called without userId — skipping MongoDB lastLogoutAt update');
    return;
  }

  // Validate userId is a valid ObjectId before constructing — non-hex strings
  // (e.g. legacy/test userIds like 'user_test_13') would otherwise throw a
  // BSONError that bubbles up as a 500. Pass the userId as a string and let
  // MongoDB coerce it; catch BSONError below so legacy tokens don't break
  // logout. The Redis blacklist above is the primary invalidation path.
  const db = mongoose.connection;
  try {
    await db.collection('users').updateOne(
      { _id: userId as unknown as mongoose.Types.ObjectId },
      { $set: { lastLogoutAt: new Date() } }
    );
  } catch (mongoErr: any) {
    if (mongoErr.name === 'BSONError' || mongoErr.message?.includes('BSON')) {
      logger.warn('[AUTH] blacklistToken — userId is not a valid ObjectId, lastLogoutAt not updated', { userId });
    } else {
      throw mongoErr;
    }
  }
}

/**
 * @deprecated Use rotateRefreshToken() instead. rotateRefreshToken() blacklists
 * the used refresh token (token rotation) preventing replay attacks.
 * refreshAccessToken() issues a new access token but did NOT invalidate the
 * supplied refresh token, meaning a stolen refresh token remained valid for its
 * full 7-day lifetime.  This function is no longer called by any route
 * (routes call rotateRefreshToken exclusively) but is retained for compatibility.
 * It now blacklists the old refresh token to be rotation-safe if it is ever
 * called directly.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; userId: string; role: string }> {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('[FATAL] JWT_REFRESH_SECRET is not configured — cannot verify refresh tokens');

  // Check blacklist before issuing new access token — fail-closed with MongoDB fallback
  try {
    const blacklisted = await redis.exists(`${BLACKLIST_PREFIX}${refreshToken}`);
    if (blacklisted) throw new Error('Refresh token revoked');
  } catch (err: any) {
    if (err.message === 'Refresh token revoked') throw err;

    // Redis unavailable — fall back to MongoDB lastLogoutAt check
    logger.warn('Redis unavailable for refresh blacklist check — using MongoDB fallback', { error: err.message });
    const decoded_fb = jwt.decode(refreshToken) as TokenPayload | null;
    if (decoded_fb?.userId && decoded_fb?.iat) {
      try {
        const db = mongoose.connection;
        const user = await db.collection('users').findOne(
          { _id: decoded_fb.userId as unknown as mongoose.Types.ObjectId },
          { projection: { lastLogoutAt: 1 } }
        );
        if (user?.lastLogoutAt) {
          const logoutTimeSec = Math.floor(new Date(user.lastLogoutAt).getTime() / 1000);
          if (decoded_fb.iat < logoutTimeSec) {
            throw new Error('Refresh token issued before last logout — session invalidated');
          }
        }
      } catch (mongoErr: any) {
        if (mongoErr.message.includes('session invalidated')) throw mongoErr;
        if (mongoErr.name === 'BSONError' || mongoErr.message?.includes('BSON')) {
          logger.warn('MongoDB fallback skipped — userId is not a valid ObjectId', { userId: decoded_fb.userId });
        } else {
          logger.error('MongoDB fallback also failed for refresh blacklist check — DENYING for safety', { error: mongoErr.message });
          throw new Error('Authentication service temporarily unavailable');
        }
      }
    }
  }

  const decoded = jwt.verify(refreshToken, secret, { algorithms: ['HS256'] }) as TokenPayload & { type?: string };
  if (decoded.type !== 'refresh') throw new Error('Not a refresh token');

  // Invalidate the used refresh token so it cannot be replayed.
  // A stolen refresh token must not remain valid after it has been used to
  // obtain a new access token.  Use SET NX so concurrent calls are safe.
  // Default TTL: 24 hours (matches configurable refresh token TTL)
  const defaultTtl = parseInt(process.env.JWT_REFRESH_TTL_HOURS || '24', 10) * 3600;
  const oldTtl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : defaultTtl;
  if (oldTtl > 0) {
    try {
      await redis.set(`${BLACKLIST_PREFIX}${refreshToken}`, '1', 'EX', oldTtl, 'NX');
    } catch (redisErr: any) {
      logger.warn('[AUTH] Redis blacklist write failed in refreshAccessToken — token not invalidated in Redis', { error: redisErr.message });
    }
  }

  const accessToken = generateAccessToken(decoded.userId, decoded.role);
  return { accessToken, userId: decoded.userId, role: decoded.role };
}

/**
 * Full token rotation: verifies refresh token, blacklists it, issues new access
 * token (15 min) and new refresh token (configurable, default 24h).
 */
export async function rotateRefreshToken(
  oldRefreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('[FATAL] JWT_REFRESH_SECRET is not configured — cannot rotate refresh tokens');

  // Check blacklist FIRST — before JWT verification. A revoked token must be
  // rejected even if cryptographically valid. Checking after verify meant a
  // Redis error could bypass the blacklist and allow reuse of a rotated token.
  // Decode without verify to extract userId for the MongoDB fallback.
  const peeked = jwt.decode(oldRefreshToken) as (TokenPayload & { type?: string }) | null;
  try {
    const blacklisted = await redis.exists(`${BLACKLIST_PREFIX}${oldRefreshToken}`);
    if (blacklisted) throw new Error('Refresh token already used');
  } catch (err: any) {
    if (err.message === 'Refresh token already used') throw err;

    // Redis unavailable — fall back to MongoDB checks
    logger.warn('Redis unavailable for refresh token rotation blacklist check — using MongoDB fallback', { error: err.message });

    // Check MongoDB RefreshToken collection for explicit per-token revocation first.
    // This catches rotation replay during a Redis outage where lastLogoutAt is insufficient.
    try {
      const record = await RefreshToken.findOne({ tokenHash: hashToken(oldRefreshToken) });
      if (record?.isRevoked) {
        throw new Error('Refresh token already used');
      }
    } catch (tokenLookupErr: any) {
      if (tokenLookupErr.message === 'Refresh token already used') throw tokenLookupErr;
      // RefreshToken collection unavailable — fall through to lastLogoutAt check
      logger.warn('MongoDB RefreshToken lookup failed during Redis outage — falling back to lastLogoutAt', { error: tokenLookupErr.message });
    }

    if (peeked?.userId && peeked?.iat) {
      try {
        const db = mongoose.connection;
        const user = await db.collection('users').findOne(
          { _id: peeked.userId as unknown as mongoose.Types.ObjectId },
          { projection: { lastLogoutAt: 1 } }
        );
        if (user?.lastLogoutAt) {
          const logoutTimeSec = Math.floor(new Date(user.lastLogoutAt).getTime() / 1000);
          if (peeked.iat < logoutTimeSec) {
            throw new Error('Refresh token issued before last logout — session invalidated');
          }
        }
      } catch (mongoErr: any) {
        if (mongoErr.message.includes('session invalidated')) throw mongoErr;
        if (mongoErr.name === 'BSONError' || mongoErr.message?.includes('BSON')) {
          logger.warn('MongoDB fallback skipped — userId is not a valid ObjectId', { userId: peeked.userId });
        } else {
          logger.error('MongoDB fallback also failed for rotation blacklist check — DENYING for safety', { error: mongoErr.message });
          throw new Error('Authentication service temporarily unavailable');
        }
      }
    }
  }

  // Verify old refresh token after blacklist check passes
  const decoded = jwt.verify(oldRefreshToken, secret, { algorithms: ['HS256'] }) as TokenPayload & { type?: string };
  if (decoded.type !== 'refresh') throw new Error('Not a refresh token');

  // Blacklist the old refresh token BEFORE issuing new tokens.
  // This closes a race window where a concurrent request could use the same
  // old token between the blacklist write and new-token issuance.
  // Fail-closed: if Redis is down AND the token was already used, the MongoDB
  // lastLogoutAt fallback above will catch it on the next attempt.
  const oldTtl = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400 * 7;
  if (oldTtl > 0) {
    // SET NX: only write if not already blacklisted — if it returns null the token
    // was already used by a concurrent request, so we reject this rotation attempt.
    try {
      const setResult = await redis.set(`${BLACKLIST_PREFIX}${oldRefreshToken}`, '1', 'EX', oldTtl, 'NX');
      if (setResult === null) {
        // Key already existed — concurrent rotation already consumed this token.
        // Throw a distinct error type so the route can return 409 Conflict.
        const err: any = new Error('Refresh token already used');
        err.code = 'CONCURRENT_REFRESH';
        throw err;
      }
    } catch (err: any) {
      if (err.message === 'Refresh token already used') throw err;
      // Redis unavailable — log and continue; MongoDB fallback above already ran
      logger.warn('Redis unavailable — could not atomically blacklist old refresh token before rotation', { error: err.message });
    }
  }

  // MongoDB single-use enforcement — atomic duplicate-key guard prevents replay
  // even when Redis is unavailable. The unique index on tokenHash ensures only the
  // FIRST request to use this token can insert a record; concurrent requests get
  // duplicate key error (code 11000) and are rejected as replay attacks.
  const tokenHash = hashToken(oldRefreshToken);
  try {
    await RefreshToken.create({
      tokenHash,
      userId: decoded.userId,
      isRevoked: true,
      expiresAt: new Date((decoded.exp ?? Math.floor(Date.now() / 1000) + 86400 * 7) * 1000),
    });
  } catch (err: any) {
    if (err.code === 11000) {
      // Duplicate key — this token was already used (rotation replay attack)
      throw new Error('Refresh token already used — possible replay attack');
    }
    // Other DB error — log but don't block (Redis covers the common case)
    logger.warn('MongoDB refresh token record failed — relying on Redis for single-use enforcement', { error: err.message });
  }

  // Issue new access token (15 min)
  const accessSecret = getSecret(decoded.role);
  if (!accessSecret) throw new Error('JWT secret not configured');
  const accessToken = jwt.sign(
    { userId: decoded.userId, role: decoded.role },
    accessSecret,
    { expiresIn: '15m' },
  );

  // Issue new refresh token (configurable TTL, default 24h)
  const ttlHours = Math.min(parseInt(process.env.JWT_REFRESH_TTL_HOURS || '24', 10), 48);
  const refreshExpiresIn = `${ttlHours}h` as const;
  const newRefreshToken = jwt.sign(
    { userId: decoded.userId, role: decoded.role, type: 'refresh' },
    secret,
    { expiresIn: refreshExpiresIn },
  );

  // Record the new refresh token in MongoDB so it can be looked up on next rotation.
  // Non-fatal: Redis is the primary single-use guard; this is the durable backup.
  try {
    await RefreshToken.create({
      tokenHash: hashToken(newRefreshToken),
      userId: decoded.userId,
      isRevoked: false,
      expiresAt: new Date(Date.now() + ttlHours * 60 * 60 * 1000),
    });
  } catch {
    logger.warn('Failed to record new refresh token in MongoDB — Redis remains primary guard');
  }

  return { accessToken, refreshToken: newRefreshToken, expiresIn: 900 };
}
