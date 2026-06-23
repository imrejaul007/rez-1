/**
 * QR Payload — canonical discriminated-union for every ReZ QR code.
 *
 * Every QR code a ReZ surface ever generates (store placards, deal
 * tickets, stamp cards, in-app wallet share sheets) MUST serialise to
 * one of the shapes below. Scanners use `parseQrPayload()` to route
 * to the right screen without a waterfall of "is this a store? is
 * this a deal?" checks.
 *
 * Wire format
 * ───────────
 *  - JSON string:  {"intent":"pay-bill","storeId":"abc","v":1}
 *  - Short URL:    https://rez.money/q/<token>
 *                  (resolves server-side to a JSON payload; see
 *                  backend GET /api/qr/resolve)
 *  - Legacy bare:  {"intent":"store-visit","storeId":"abc","v":1}
 *                  already covered by JSON; no special handling
 *
 * The parser returns a discriminated `ParseResult` — success with the
 * typed payload, or failure with a machine-readable reason. The
 * consumer app's UnifiedQrScanner inspects the failure reason to
 * decide whether to show "not a ReZ QR" vs "needs server resolve".
 *
 * Versioning: `v: 1` is the only currently-accepted schema version.
 * When we bump, parseQrPayload should keep accepting v1 for a
 * deprecation window.
 */

import { z } from 'zod';

// ─── Leaf schemas ────────────────────────────────────────────────────────────

const Version = z.literal(1);

/**
 * A trimmed non-empty string. Matches the consumer-side
 * `isNonEmptyString(x.trim().length > 0)` so a whitespace-only
 * `storeId: "   "` is rejected by both parsers identically.
 * See Audit Round K — previously the two sides drifted on this.
 */
const NonBlankString = z.string().refine((s) => s.trim().length > 0, {
  message: 'must be a non-blank string',
});

export const StoreVisitIntent = z.object({
  intent: z.literal('store-visit'),
  v: Version,
  storeId: NonBlankString,
  /** Optional human-readable slug used for fallback URLs. */
  storeSlug: NonBlankString.optional(),
});
export type StoreVisitIntent = z.infer<typeof StoreVisitIntent>;

export const PayBillIntent = z.object({
  intent: z.literal('pay-bill'),
  v: Version,
  storeId: NonBlankString,
  billId: NonBlankString.optional(),
  /** Optional preset amount in ₹ when the QR encodes a fixed bill. */
  amount: z.number().nonnegative().optional(),
});
export type PayBillIntent = z.infer<typeof PayBillIntent>;

export const RedeemDealIntent = z.object({
  intent: z.literal('redeem-deal'),
  v: Version,
  dealId: NonBlankString,
  storeId: NonBlankString.optional(),
});
export type RedeemDealIntent = z.infer<typeof RedeemDealIntent>;

export const RedeemVoucherIntent = z.object({
  intent: z.literal('redeem-voucher'),
  v: Version,
  voucherId: NonBlankString,
});
export type RedeemVoucherIntent = z.infer<typeof RedeemVoucherIntent>;

export const ClaimStampIntent = z.object({
  intent: z.literal('claim-stamp'),
  v: Version,
  stampCardId: NonBlankString,
  storeId: NonBlankString,
});
export type ClaimStampIntent = z.infer<typeof ClaimStampIntent>;

export const EventCheckinIntent = z.object({
  intent: z.literal('event-checkin'),
  v: Version,
  eventId: NonBlankString,
});
export type EventCheckinIntent = z.infer<typeof EventCheckinIntent>;

export const ReferralIntent = z.object({
  intent: z.literal('referral'),
  v: Version,
  referralCode: NonBlankString,
});
export type ReferralIntent = z.infer<typeof ReferralIntent>;

export const WalletTransferIntent = z.object({
  intent: z.literal('wallet-transfer'),
  v: Version,
  toUserId: NonBlankString,
  amount: z.number().nonnegative().optional(),
});
export type WalletTransferIntent = z.infer<typeof WalletTransferIntent>;

// ─── Union ───────────────────────────────────────────────────────────────────

export const QrPayloadSchema = z.discriminatedUnion('intent', [
  StoreVisitIntent,
  PayBillIntent,
  RedeemDealIntent,
  RedeemVoucherIntent,
  ClaimStampIntent,
  EventCheckinIntent,
  ReferralIntent,
  WalletTransferIntent,
]);
export type QrPayload = z.infer<typeof QrPayloadSchema>;

export type QrIntent = QrPayload['intent'];

// ─── Short-URL handling ─────────────────────────────────────────────────────

/** All short-URL hosts the parser will treat as "please resolve server-side". */
export const SHORT_URL_HOSTS = ['rez.money', 'www.rez.money', 'rez.link'] as const;
export const SHORT_URL_PATH_PREFIX = '/q/';

export interface ShortUrlIntent {
  intent: 'short-url';
  token: string;
}

function tryParseShortUrl(raw: string): ShortUrlIntent | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (!(SHORT_URL_HOSTS as readonly string[]).includes(url.hostname.toLowerCase())) return null;
    if (!url.pathname.startsWith(SHORT_URL_PATH_PREFIX)) return null;
    const token = url.pathname.slice(SHORT_URL_PATH_PREFIX.length).replace(/\/$/, '');
    if (!token) return null;
    return { intent: 'short-url', token };
  } catch {
    return null;
  }
}

// ─── Parser ─────────────────────────────────────────────────────────────────

export type ParseResult =
  | { ok: true; payload: QrPayload }
  | { ok: true; payload: ShortUrlIntent }
  | { ok: false; reason: 'empty' }
  | { ok: false; reason: 'not-json' }
  | { ok: false; reason: 'invalid-schema'; issues: string[] }
  | { ok: false; reason: 'unsupported-version'; version: unknown };

/**
 * Parse a raw QR-code string into either a typed payload, a short-URL
 * token (caller should fetch the inflated payload from the backend),
 * or a structured error. Never throws.
 */
export function parseQrPayload(raw: string | null | undefined): ParseResult {
  if (!raw || typeof raw !== 'string') return { ok: false, reason: 'empty' };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, reason: 'empty' };

  // Short URL?
  const short = tryParseShortUrl(trimmed);
  if (short) return { ok: true, payload: short };

  // JSON payload?
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, reason: 'not-json' };
  }

  // Version check before schema — a future v2 payload gets a distinct
  // error so clients can prompt the user to update.
  if (
    parsed &&
    typeof parsed === 'object' &&
    'v' in parsed &&
    (parsed as { v: unknown }).v !== 1
  ) {
    return { ok: false, reason: 'unsupported-version', version: (parsed as { v: unknown }).v };
  }

  const result = QrPayloadSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      reason: 'invalid-schema',
      issues: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  }
  return { ok: true, payload: result.data };
}
