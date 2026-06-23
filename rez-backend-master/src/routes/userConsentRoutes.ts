// @ts-nocheck
/**
 * User Consent Routes — Phase D.
 *
 * Implements DPDP §12 — right to withdraw consent with ease comparable
 * to granting. Three endpoints:
 *
 *   GET  /api/user/consent              — current state for every category
 *   POST /api/user/consent              — grant OR withdraw one category
 *   GET  /api/user/consent/history      — append-only ledger (audit)
 *
 * All writes go through UserConsent.record() which appends a new ledger
 * row — existing rows are never mutated. That preserves the §8(5)
 * evidence-of-consent audit trail DPDP requires.
 */

import { Router, Request, Response } from 'express';

import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import UserConsent, {
  CONSENT_CATEGORIES,
  CONSENT_STATUSES,
  type ConsentCategory,
  type ConsentStatus,
} from '../models/UserConsent';

const router = Router();
router.use(authenticate);

function getUserId(req: Request): string {
  // `authenticate` populates either req.userId or req.user._id.
  const fromAuth = (req as any).userId;
  if (fromAuth) return String(fromAuth);
  const user = (req as any).user;
  if (user?._id) return String(user._id);
  throw new Error('authenticated user id missing from request');
}

function isConsentCategory(v: unknown): v is ConsentCategory {
  return typeof v === 'string' && (CONSENT_CATEGORIES as readonly string[]).includes(v);
}

function isConsentStatus(v: unknown): v is ConsentStatus {
  return typeof v === 'string' && (CONSENT_STATUSES as readonly string[]).includes(v);
}

// ─── GET /api/user/consent ────────────────────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    // Fetch the latest row per category. Simple approach — one query per
    // category. Categories are small (<10), so this is fine; if we add
    // many more we can switch to an aggregation with $group+$first.
    const entries = await Promise.all(
      CONSENT_CATEGORIES.map(async (category) => {
        const latest: any = await UserConsent.findOne({ userId, category })
          .sort({ createdAt: -1 })
          .select('status source legalBasis copyVersion createdAt')
          .lean();
        return {
          category,
          status: latest?.status ?? 'withdrawn', // absence = withdrawn/never granted
          source: latest?.source ?? null,
          legalBasis: latest?.legalBasis ?? null,
          copyVersion: latest?.copyVersion ?? null,
          decidedAt: latest?.createdAt ?? null,
        };
      }),
    );

    return res.json({ success: true, data: { entries } });
  }),
);

// ─── POST /api/user/consent ───────────────────────────────────────────────────

router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { category, status, copyVersion, note } = req.body as {
      category?: string;
      status?: string;
      copyVersion?: number;
      note?: string;
    };

    if (!isConsentCategory(category)) {
      return res.status(400).json({
        success: false,
        message: 'invalid or missing category',
        validCategories: CONSENT_CATEGORIES,
      });
    }
    if (!isConsentStatus(status)) {
      return res.status(400).json({
        success: false,
        message: 'invalid or missing status',
        validStatuses: CONSENT_STATUSES,
      });
    }

    // Capture IP + UA for dispute resolution — DPDP §8(5) evidence trail.
    const ipAddress =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      undefined;
    const userAgent = req.headers['user-agent'];

    const row = await UserConsent.record({
      userId,
      category,
      status,
      source: 'app_settings',
      copyVersion,
      ipAddress,
      userAgent: typeof userAgent === 'string' ? userAgent : undefined,
      note,
    });

    logger.info('[consent] recorded', {
      userId,
      category,
      status,
      source: 'app_settings',
      copyVersion,
      consentId: String((row as any)._id),
    });

    return res.status(201).json({
      success: true,
      data: {
        consentId: String((row as any)._id),
        category,
        status,
        decidedAt: (row as any).createdAt,
      },
    });
  }),
);

// ─── GET /api/user/consent/history ────────────────────────────────────────────

router.get(
  '/history',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const { category } = req.query as { category?: string };

    const filter: Record<string, unknown> = { userId };
    if (category && isConsentCategory(category)) {
      filter.category = category;
    }

    const rows = await UserConsent.find(filter)
      .sort({ createdAt: -1 })
      .select('category status source legalBasis copyVersion note createdAt')
      .limit(500)
      .lean();

    return res.json({
      success: true,
      data: {
        history: rows.map((r: any) => ({
          category: r.category,
          status: r.status,
          source: r.source,
          legalBasis: r.legalBasis,
          copyVersion: r.copyVersion,
          note: r.note,
          decidedAt: r.createdAt,
        })),
      },
    });
  }),
);

export default router;

// Exported for tests
export const __testOnly = {
  isConsentCategory,
  isConsentStatus,
  getUserId,
};
