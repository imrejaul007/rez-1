// @ts-nocheck
/**
 * QR Resolve — Phase I backend route.
 *
 *   GET  /api/qr/resolve?token=<shortToken>
 *        Returns the canonical QrPayload for a rez.money/q/<token> short URL.
 *        Increments the hit counter. Public — no auth required (QR scans
 *        happen pre-login).
 *
 *   POST /api/qr/shortlinks (auth'd — merchant)
 *        Creates a shortlink for a validated QrPayload. Returns the
 *        token + full `rez.money/q/<token>` URL.
 *
 * Feature flag: QR_UNIFIED_SCANNER_MODE (off|shadow|primary).
 *   off     → 503 on resolve, 409 on create.
 *   shadow  → operate normally but tag responses with mode:'shadow'
 *             so the UI knows it's still in rollout.
 *   primary → full path.
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';

import { authMiddleware as merchantAuth } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import { parseQrPayload, QrPayloadSchema } from '../utils/qrPayload';
import QrShortLink from '../models/QrShortLink';

type Mode = 'off' | 'shadow' | 'primary';

function getMode(): Mode {
  const raw = (process.env.QR_UNIFIED_SCANNER_MODE ?? '').toLowerCase();
  if (raw === 'shadow' || raw === 'primary') return raw;
  return 'off';
}

const router = Router();

// Token format: 11 chars of URL-safe base64 (8 random bytes).
function newToken(): string {
  return crypto.randomBytes(8).toString('base64url');
}

// ─── GET /api/qr/resolve ─────────────────────────────────────────────────────

router.get(
  '/resolve',
  asyncHandler(async (req: Request, res: Response) => {
    const mode = getMode();
    if (mode === 'off') {
      return res.status(503).json({ success: false, message: 'QR resolver disabled' });
    }

    const token = String((req.query as { token?: string }).token ?? '').trim();
    if (!token) {
      return res.status(400).json({ success: false, message: 'token is required' });
    }

    const link: any = await QrShortLink.findOne({ token, isActive: true }).lean();
    if (!link) {
      return res.status(404).json({ success: false, message: 'token not found or expired' });
    }

    // Best-effort hit increment — don't fail the resolve on analytics error.
    QrShortLink.updateOne({ token }, { $inc: { hits: 1 } }).catch((err) => {
      logger.warn('[qr-resolve] hit counter increment failed', {
        token,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    // Re-validate the stored payload against the canonical schema — if
    // somebody wrote a bad row manually, we'd rather 500 here than
    // ship a malformed payload to the scanner.
    const parse = QrPayloadSchema.safeParse(link.payload);
    if (!parse.success) {
      logger.error('[qr-resolve] stored payload fails schema validation', {
        token,
        issues: parse.error.issues,
      });
      return res.status(500).json({ success: false, message: 'stored payload invalid' });
    }

    return res.json({
      success: true,
      mode,
      data: { payload: parse.data },
    });
  }),
);

// ─── POST /api/qr/shortlinks ────────────────────────────────────────────────

router.post(
  '/shortlinks',
  merchantAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const mode = getMode();
    if (mode === 'off') {
      return res
        .status(409)
        .json({ success: false, message: 'QR_UNIFIED_SCANNER_MODE is off — shortlink creation disabled' });
    }

    const merchantId = String((req as any).merchant?._id || (req as any).merchantId);
    const { payload, expiresAt, storeId } = req.body as {
      payload?: unknown;
      expiresAt?: string;
      storeId?: string;
    };

    // Validate — accepts either a raw object OR a raw JSON string.
    const parseResult = parseQrPayload(typeof payload === 'string' ? payload : JSON.stringify(payload));
    if (!parseResult.ok || parseResult.payload.intent === 'short-url') {
      return res.status(400).json({
        success: false,
        message: 'payload must be a valid typed QrPayload (not a short-url)',
        details: parseResult.ok ? 'short-url not allowed here' : parseResult.reason,
      });
    }

    const token = newToken();
    const doc = await QrShortLink.create({
      token,
      payload: parseResult.payload,
      merchantId,
      storeId: storeId || undefined,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      isActive: true,
    });

    logger.info('[qr-resolve] shortlink created', {
      merchantId,
      token,
      intent: (parseResult.payload as { intent: string }).intent,
      expiresAt: doc.expiresAt?.toISOString() ?? null,
    });

    const baseUrl = (process.env.QR_SHORT_URL_BASE || 'https://rez.money/q').replace(/\/$/, '');
    return res.status(201).json({
      success: true,
      mode,
      data: {
        token,
        url: `${baseUrl}/${token}`,
        expiresAt: doc.expiresAt?.toISOString() ?? null,
      },
    });
  }),
);

export default router;

export const __testOnly = {
  getMode,
  newToken,
};
