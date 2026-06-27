/**
 * resolveCustomerIdentity — shared phone→User._id resolver used by the three
 * Sprint 0 order-creation patches (B4 aggregator, B6 web order, B7 POS).
 *
 * Purpose
 * ───────
 * Each of the three order-creation paths needs to turn `customerPhone` into a
 * stable `User._id` before calling `emitOrderPlaced()`. Without a shared
 * helper, each path would reimplement phone normalisation + upsert + edge
 * cases slightly differently (they already do; the patch specs documented it).
 * That divergence was how we ended up with THREE distinct regexes for "+91"
 * handling in User.findOne callers and a quietly-broken aggregator path that
 * never linked phones to users at all.
 *
 * Contract
 * ────────
 *  - Pass `customerId` directly if you already have it (rare, but supported
 *    for B7 POS when the cashier selected a known customer). The helper then
 *    validates it's a real User._id and returns it unchanged.
 *  - Pass `customerPhone` for every other case. The helper normalises the
 *    input (trim, strip formatting, handle +91 prefix variations) and does a
 *    `findOneAndUpdate({ phoneNumber: normalised }, { $setOnInsert: ... },
 *    { upsert: true })`. Returns the resolved `_id`.
 *  - Pass neither when emitting for a true walk-in (POS identityCaptureMode
 *    'optional' + cashier tapped 'Walk-in'). Returns `{ customerId: null,
 *    resolution: 'anonymous' }` — caller then emits with `customerId: null`
 *    per hybrid-nullable canonical schema.
 *
 * Never throws
 * ────────────
 *  - Invalid customerId string (not a valid ObjectId) → treated as if not
 *    provided; falls through to phone resolution.
 *  - DB errors (Mongo down, index violation, etc.) → logged, returns
 *    `{ customerId: null, resolution: 'error' }`. The caller decides whether
 *    to continue emitting (with null) or reject the request — resolution
 *    policy is NOT the helper's business.
 *
 * Safe for the order-creation hot path.
 */

import * as mongoose from 'mongoose';
import { logger } from '../config/logger';

// User model import — use dynamic require so a circular init order doesn't
// break the emitter. Resolve on first call.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _UserModel: mongoose.Model<any> | null = null;
function getUserModel(): mongoose.Model<any> {
  if (_UserModel) return _UserModel;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../models/User');
    _UserModel = mod.User ?? mod.default ?? mod;
    if (!_UserModel || typeof (_UserModel.findOneAndUpdate as Function | undefined) !== 'function') {
      throw new Error('User model resolved but missing findOneAndUpdate');
    }
    return _UserModel;
  } catch (err) {
    throw new Error(
      `[resolveCustomerIdentity] Failed to load User model: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type IdentitySource =
  | 'pos'
  | 'web'
  | 'aggregator-swiggy'
  | 'aggregator-zomato'
  | 'aggregator-dunzo'
  | 'appointment';

export interface ResolveInput {
  customerId?: string | null;
  customerPhone?: string | null;
  source: IdentitySource;
  /** Optional name from the request — stored on $setOnInsert only. */
  customerName?: string | null;
}

export type Resolution =
  /** User was already known (either customerId passed in or existing phone row). */
  | 'existing'
  /** New User row created by this call. */
  | 'created'
  /** Passed customerId was invalid — fell back to phone, which also didn't resolve. */
  | 'invalid-id'
  /** No identity input — walk-in path. */
  | 'anonymous'
  /** DB error or lookup failure. */
  | 'error';

export interface ResolveResult {
  /** String User._id, or null for anonymous / error paths. */
  customerId: string | null;
  resolution: Resolution;
  /** Normalised phone that was used for lookup (useful for logs + analytics). */
  normalisedPhone?: string;
}

// ─── Phone normalisation ──────────────────────────────────────────────────────
//
// India-first: inputs arrive as "+91 98765 43210", "91-98765-43210",
// "9876543210", "+919876543210" and a dozen other variants depending on
// which aggregator / OTP provider / manual entry produced them. We normalise
// to canonical "+91XXXXXXXXXX" so the User.phoneNumber unique index does its
// job. Non-Indian numbers pass through untouched.

const IN_DIGIT_COUNT = 10;

export function normalisePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/[^\d+]/g, '');
  if (!stripped) return null;

  // Already canonical E.164 with + prefix (any country)
  if (/^\+[1-9]\d{6,14}$/.test(stripped)) return stripped;

  const digits = stripped.replace(/^\+/, '');

  // 91-prefixed 12-digit Indian number → +91XXXXXXXXXX
  if (digits.length === IN_DIGIT_COUNT + 2 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  // Bare 10-digit Indian number → +91XXXXXXXXXX
  if (digits.length === IN_DIGIT_COUNT && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  // Anything else: return stripped as-is with + if needed (don't invent data)
  if (digits.length >= 7 && digits.length <= 15) {
    return stripped.startsWith('+') ? stripped : `+${digits}`;
  }
  return null;
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function resolveCustomerIdentity(input: ResolveInput): Promise<ResolveResult> {
  // Fast path 1: customerId already provided + looks valid
  if (input.customerId) {
    if (mongoose.Types.ObjectId.isValid(input.customerId)) {
      try {
        const User = getUserModel();
        const existing = await User.findById(input.customerId).select('_id').lean() as { _id: mongoose.Types.ObjectId } | null;
        if (existing) {
          return { customerId: String(existing._id), resolution: 'existing' };
        }
      } catch (err) {
        logger.warn('[resolveCustomerIdentity] findById failed', {
          customerId: input.customerId,
          source: input.source,
          err: err instanceof Error ? err.message : String(err),
        });
      }
      // Passed id was a valid ObjectId format but no matching row — fall
      // through to phone resolution so we don't silently swallow a legit
      // phone-based request.
    } else {
      // Malformed id: ignore, fall through to phone.
      if (!input.customerPhone) {
        return { customerId: null, resolution: 'invalid-id' };
      }
    }
  }

  // Fast path 2: neither input — walk-in
  if (!input.customerPhone) {
    return { customerId: null, resolution: 'anonymous' };
  }

  const normalised = normalisePhone(input.customerPhone);
  if (!normalised) {
    logger.warn('[resolveCustomerIdentity] phone failed normalisation', {
      rawLength: input.customerPhone?.length,
      source: input.source,
    });
    return { customerId: null, resolution: 'invalid-id' };
  }

  // Upsert path: find by normalised phone, insert if missing.
  try {
    const User = getUserModel();
    const doc = await User.findOneAndUpdate(
      { phoneNumber: normalised },
      {
        $setOnInsert: {
          phoneNumber: normalised,
          source: input.source,
          ...(input.customerName ? { name: input.customerName } : {}),
          createdAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
        projection: { _id: 1 },
        setDefaultsOnInsert: true,
      },
    ).lean() as { _id: mongoose.Types.ObjectId } | null;

    if (!doc) {
      logger.error('[resolveCustomerIdentity] upsert returned null doc', {
        source: input.source,
        normalisedPhone: normalised,
      });
      return { customerId: null, resolution: 'error', normalisedPhone: normalised };
    }

    // `new: true + upsert: true` returns the doc whether it pre-existed or was
    // just created. Mongoose doesn't expose the upsert flag cleanly on the
    // lean result, so we use a sentinel check against the ObjectId timestamp
    // to distinguish. ObjectId.getTimestamp() returns creation time; if it's
    // within the last second we can be confident we just made it.
    const id = doc._id;
    const justCreated = Date.now() - id.getTimestamp().getTime() < 1000;

    return {
      customerId: String(id),
      resolution: justCreated ? 'created' : 'existing',
      normalisedPhone: normalised,
    };
  } catch (err) {
    logger.error('[resolveCustomerIdentity] upsert failed', {
      source: input.source,
      normalisedPhone: normalised,
      err: err instanceof Error ? err.message : String(err),
    });
    return { customerId: null, resolution: 'error', normalisedPhone: normalised };
  }
}
