/**
 * Campaign Templates — merchant-facing routes (Phase C).
 *
 * GET  /api/merchant/campaign-templates
 *      List active templates. Filtered by the merchant's active-store
 *      vertical when available (so a salon owner doesn't see
 *      restaurant-only templates). Returns a light DTO — no IDs
 *      exposed externally; templateId is the slug used for launch.
 *
 * POST /api/merchant/campaign-templates/:templateId/launch
 *      One-tap launch. Creates:
 *        1. A Coupon row (the offer)
 *        2. A BroadcastCampaign row (the campaign to customers)
 *      and returns both IDs. Idempotent per (merchantId, storeId,
 *      templateId, day) via a synthetic idempotency key so accidental
 *      double-taps don't create two campaigns.
 *
 * The actual broadcast enqueueing is deferred to the existing
 * BroadcastCampaign workflow — this route creates the row in status
 * 'queued' and lets the broadcast worker pick it up.
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';

import { authMiddleware } from '../middleware/merchantauth';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../config/logger';
import CampaignTemplate from '../models/CampaignTemplate';
import { Coupon } from '../models/Coupon';
import { BroadcastCampaign } from '../models/BroadcastCampaign';
import { Store } from '../models/Store';

const router = Router();
router.use(authMiddleware);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMerchantId(req: Request): string {
  return String((req as any).merchant?._id || (req as any).merchantId);
}

/** Resolve the merchant's vertical from their active store, fallback to general. */
async function resolveMerchantVertical(
  merchantId: string,
  storeId?: string,
): Promise<string> {
  try {
    const filter: Record<string, any> = storeId
      ? { _id: storeId, merchantId }
      : { merchantId };
    const store = await Store.findOne(filter).select('category businessCategory').lean();
    const cat = (store as any)?.category?.slug || (store as any)?.category?.name || (store as any)?.businessCategory;
    if (!cat) return 'general';
    const lower = String(cat).toLowerCase();
    if (lower.includes('restaurant') || lower.includes('food') || lower.includes('cafe')) return 'restaurant';
    if (lower.includes('salon') || lower.includes('spa') || lower.includes('beauty')) return 'salon';
    if (lower.includes('hotel')) return 'hotel';
    if (lower.includes('grocery') || lower.includes('kirana') || lower.includes('supermarket')) return 'grocery';
    return 'general';
  } catch {
    return 'general';
  }
}

/** Interpolate {{variable}} placeholders. Missing variables stay literal. */
function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key) => {
    return key in vars ? vars[key] : match;
  });
}

function dayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Idempotency key for a launch attempt — prevents double-tap duplicates. */
function launchIdempotencyKey(merchantId: string, storeId: string, templateId: string, day: string): string {
  return `campaign-template-launch:${merchantId}:${storeId}:${templateId}:${day}`;
}

/** Map the template's audience rule to a BroadcastCampaign segment + extras. */
function mapAudience(rule: string): {
  segment: 'all' | 'recent' | 'lapsed' | 'high_value' | 'stamp_card';
  daysInactive?: number;
  minSpend?: number;
} {
  switch (rule) {
    case 'new-customers':
      return { segment: 'recent' };
    case 'lapsed-30d':
      return { segment: 'lapsed', daysInactive: 30 };
    case 'lapsed-60d':
      return { segment: 'lapsed', daysInactive: 60 };
    case 'high-spenders':
      return { segment: 'high_value' };
    case 'all-customers':
    default:
      return { segment: 'all' };
  }
}

// ─── GET /api/merchant/campaign-templates ─────────────────────────────────────

router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    const { storeId } = req.query as { storeId?: string };
    const vertical = await resolveMerchantVertical(merchantId, storeId);

    // Either the template explicitly lists this vertical, or it has no
    // verticals restriction (empty array / missing field = available to all).
    const templates = await CampaignTemplate.find({
      isActive: true,
      $or: [{ verticals: vertical }, { verticals: { $size: 0 } }, { verticals: { $exists: false } }],
    })
      .select('templateId title description icon tags offer campaign predictedImpact')
      .sort({ templateId: 1 })
      .lean();

    return res.json({
      success: true,
      data: {
        vertical,
        templates: templates.map((t) => ({
          templateId: t.templateId,
          title: t.title,
          description: t.description,
          icon: t.icon,
          tags: t.tags,
          // Flatten a light preview for the merchant UI — not the full template.
          preview: {
            discountType: t.offer?.discountType,
            discountValue: t.offer?.discountValue,
            validityHours: t.offer?.validityHours,
            channels: t.campaign?.channels,
            audience: t.campaign?.audienceRule,
          },
          predictedImpact: t.predictedImpact,
        })),
      },
    });
  }),
);

// ─── POST /api/merchant/campaign-templates/:templateId/launch ─────────────────

router.post(
  '/:templateId/launch',
  asyncHandler(async (req: Request, res: Response) => {
    const merchantId = getMerchantId(req);
    const { templateId } = req.params;
    const { storeId } = req.body as { storeId?: string };

    if (!storeId) {
      return res.status(400).json({
        success: false,
        message: 'storeId is required to scope the launched campaign',
      });
    }

    // Verify store ownership.
    const store = await Store.findOne({ _id: storeId, merchantId }).select('_id name').lean();
    if (!store) {
      return res.status(404).json({ success: false, message: 'Store not found or access denied' });
    }
    const storeName = (store as any).name || 'our store';

    const template = await CampaignTemplate.findOne({ templateId, isActive: true }).lean();
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found or disabled' });
    }

    // Idempotency guard — same merchant+store+template in the same UTC day
    // only creates one pair of (Coupon, BroadcastCampaign). Second call
    // returns the existing IDs.
    const day = dayKey(new Date());
    const idemKey = launchIdempotencyKey(merchantId, String(store._id), templateId, day);

    // Check if a BroadcastCampaign with this idem key already exists.
    const existing = await BroadcastCampaign.findOne({
      merchantId,
      'templateLaunch.idempotencyKey': idemKey,
    })
      .select('_id templateLaunch')
      .lean();
    if (existing) {
      const tl = (existing as any).templateLaunch || {};
      return res.json({
        success: true,
        idempotent: true,
        data: {
          campaignId: String(existing._id),
          couponId: tl.couponId ? String(tl.couponId) : undefined,
          couponCode: tl.couponCode,
        },
      });
    }

    // Generate the coupon code — CSPRNG, 6-char hex suffix. Prefix with
    // template slug short-form so merchants can recognise it in reports.
    const slug = templateId.replace(/-/g, '').slice(0, 6).toUpperCase();
    const codeSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const couponCode = `${slug}${codeSuffix}`;

    const validFrom = new Date();
    const validTo = new Date(validFrom.getTime() + template.offer.validityHours * 3600 * 1000);

    // Interpolate campaign strings.
    const vars = {
      storeName,
      discount: String(template.offer.discountValue),
      menuLink: `https://menu.rez.money/${(store as any).slug ?? String(store._id)}`,
      couponCode,
    };
    const campaignName = interpolate(template.campaign.name, vars);
    const messageBody = interpolate(template.campaign.messageBody, vars);

    // Create the coupon.
    const coupon = await Coupon.create({
      couponCode,
      title: template.title,
      description: template.description,
      discountType: template.offer.discountType,
      discountValue: template.offer.discountValue,
      minOrderValue: template.offer.minOrderValue ?? 0,
      maxDiscountCap: template.offer.maxDiscountCap,
      validFrom,
      validTo,
      status: 'active',
      usageLimit: { totalUsage: 0, perUser: 1, usedCount: 0 }, // unlimited total, 1 per user
      applicableTo: { categories: [], products: [], stores: [store._id], userTiers: [] },
      // Tagging so we can trace back to the template.
      createdBy: merchantId,
      metadata: {
        source: 'campaign-template',
        templateId,
        launchedAt: validFrom.toISOString(),
      },
    });

    // Map template audience rule → BroadcastCampaign segment shape.
    const audienceShape = mapAudience(template.campaign.audienceRule);

    // Create the broadcast campaign (queued for the existing broadcast worker).
    const broadcast = await BroadcastCampaign.create({
      merchantId,
      storeId: store._id,
      name: campaignName,
      message: messageBody,
      // Pick the first channel for the row — future work: fan out to multiple.
      channel: template.campaign.channels[0] ?? 'whatsapp',
      audience: {
        segment: audienceShape.segment,
        daysInactive: audienceShape.daysInactive,
        minSpend: audienceShape.minSpend,
        estimatedCount: 0, // will be refreshed at dispatch time from snapshot
      },
      status: 'queued',
      type: 'campaign-template',
      templateLaunch: {
        templateId,
        storeId: store._id,
        couponId: coupon._id,
        couponCode,
        idempotencyKey: idemKey,
      },
    });

    logger.info('[campaign-template] launched', {
      merchantId,
      storeId: String(store._id),
      templateId,
      couponCode,
      campaignId: String(broadcast._id),
    });

    return res.status(201).json({
      success: true,
      data: {
        campaignId: String(broadcast._id),
        couponId: String(coupon._id),
        couponCode,
        validTo: validTo.toISOString(),
      },
    });
  }),
);

export default router;

// Exported for tests
export const __testOnly = {
  interpolate,
  dayKey,
  launchIdempotencyKey,
  resolveMerchantVertical,
  mapAudience,
};
