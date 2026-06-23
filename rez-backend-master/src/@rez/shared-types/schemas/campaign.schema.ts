// @ts-nocheck
/**
 * Campaign zod schemas — unified surface for three services:
 *
 *   - rez-marketing-service
 *   - rez-merchant-service
 *   - rez-ads-service
 *
 * v2 hardening: `z.record(z.any())` replaced with typed audience /
 * condition / action / trigger sub-schemas so drift can't hide here
 * either. Anything still opaque rides on `ICampaignMetadata` —
 * scalar-only index signature.
 */

import { z } from 'zod';

const DateOrString = z.union([z.date(), z.string()]);

// ─── Enums ────────────────────────────────────────────────────────────────────

export const CAMPAIGN_STATUS = z.enum([
  'draft',
  'scheduled',
  'sending',
  'sent',
  'pending_review',
  'active',
  'paused',
  'completed',
  'expired',
  'rejected',
  'failed',
  'cancelled',
]);

export const CAMPAIGN_CHANNEL = z.enum(['email', 'sms', 'push', 'in_app', 'whatsapp', 'social', 'web', 'api']);

// ─── Typed shapes (replacing `any`) ───────────────────────────────────────────

export const AudienceTargetingSchema = z
  .object({
    segment: z.enum(['all', 'recent', 'lapsed', 'high_value', 'stamp_card']).optional(),
    daysInactive: z.number().int().positive().optional(),
    minSpend: z.number().min(0).optional(),
    location: z
      .object({
        city: z.string().optional(),
        area: z.string().optional(),
        pincode: z.string().optional(),
        radiusKm: z.number().positive().optional(),
      })
      .optional(),
    interests: z.array(z.string()).optional(),
    institution: z.string().optional(),
    keyword: z.string().optional(),
    estimatedCount: z.number().int().min(0).optional(),
  })
  .strict();

const CampaignMetadataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.string()), z.array(z.number())]),
);

export const CampaignConditionSchema = z
  .object({
    field: z.string().min(1),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'not_in', 'contains', 'exists']),
    value: z
      .union([z.string(), z.number(), z.boolean(), z.null(), z.array(z.union([z.string(), z.number()]))])
      .optional(),
  })
  .strict();

export const CampaignActionSchema = z
  .object({
    kind: z.enum(['credit_coins', 'grant_badge', 'send_notification', 'award_voucher', 'issue_coupon']),
    params: CampaignMetadataSchema.optional(),
  })
  .strict();

export const CampaignTriggerSchema = z
  .object({
    event: z.enum([
      'order.placed',
      'order.delivered',
      'visit.completed',
      'signup',
      'referral.invite',
      'cron',
      'manual',
    ]),
    filters: z.array(CampaignConditionSchema).optional(),
  })
  .strict();

// ─── Base Campaign ────────────────────────────────────────────────────────────

export const BaseCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  status: CAMPAIGN_STATUS,
  startDate: DateOrString,
  endDate: DateOrString.optional(),
  channel: CAMPAIGN_CHANNEL.optional(),
  targetAudience: AudienceTargetingSchema.optional(),
  budget: z.number().min(0).optional(),
  spent: z.number().min(0).optional(),
  createdBy: z.string().optional(),
});

// ─── Marketing Campaign ───────────────────────────────────────────────────────

export const CreateMarketingCampaignSchema = BaseCampaignSchema.extend({
  type: z.literal('marketing').optional(),
  merchantId: z.string().optional(),
  objective: z.enum(['awareness', 'engagement', 'sales', 'win_back']).optional(),
  message: z.string().optional(),
  templateName: z.string().optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  ctaUrl: z.string().url('Invalid CTA URL').optional(),
  ctaText: z.string().optional(),
  audience: AudienceTargetingSchema.optional(),
  scheduledAt: DateOrString.optional(),
  dailyBudget: z.number().min(0).optional(),
  attributionWindowDays: z.number().int().positive().optional(),
});

export const UpdateMarketingCampaignSchema = CreateMarketingCampaignSchema.partial();

export const MarketingCampaignResponseSchema = CreateMarketingCampaignSchema.extend({
  _id: z.string().optional(),
  sentAt: DateOrString.optional(),
  stats: z
    .object({
      sent: z.number().optional(),
      delivered: z.number().optional(),
      failed: z.number().optional(),
      deduped: z.number().optional(),
      opened: z.number().optional(),
      clicked: z.number().optional(),
      converted: z.number().optional(),
    })
    .optional(),
  errorMessage: z.string().optional(),
  totalSpent: z.number().min(0).optional(),
  createdAt: DateOrString.optional(),
  updatedAt: DateOrString.optional(),
});

// ─── Ad Campaign ──────────────────────────────────────────────────────────────

export const CreateAdCampaignSchema = BaseCampaignSchema.extend({
  type: z.literal('ad').optional(),
  merchantId: z.string().optional(),
  storeId: z.string().optional(),
  title: z.string().optional(),
  headline: z.string().optional(),
  ctaText: z.string().optional(),
  ctaUrl: z.string().url('Invalid CTA URL').optional(),
  imageUrl: z.string().url('Invalid image URL').optional(),
  placement: z.enum(['home_banner', 'explore_feed', 'store_listing', 'search_result']).optional(),
  targetSegment: z.enum(['all', 'new', 'loyal', 'lapsed', 'nearby']).optional(),
  targetLocation: z
    .object({
      city: z.string().optional(),
      radiusKm: z.number().positive().optional(),
    })
    .optional(),
  targetInterests: z.array(z.string()).optional(),
  bidType: z.enum(['CPC', 'CPM']).optional(),
  bidAmount: z.number().min(0).optional(),
  dailyBudget: z.number().min(0).optional(),
  totalBudget: z.number().min(0).optional(),
  frequencyCapDays: z.number().int().positive().optional(),
});

export const UpdateAdCampaignSchema = CreateAdCampaignSchema.partial();

export const AdCampaignResponseSchema = CreateAdCampaignSchema.extend({
  _id: z.string().optional(),
  totalSpent: z.number().min(0).optional(),
  impressions: z.number().optional(),
  clicks: z.number().optional(),
  ctr: z.number().optional(),
  reviewedBy: z.string().optional(),
  reviewedAt: DateOrString.optional(),
  rejectionReason: z.string().optional(),
  createdAt: DateOrString.optional(),
  updatedAt: DateOrString.optional(),
});

// ─── Merchant Campaign (rules-engine shaped) ──────────────────────────────────

export const CreateMerchantCampaignSchema = BaseCampaignSchema.extend({
  type: z.literal('merchant').optional(),
  merchantId: z.string().optional(),
  storeId: z.string().optional(),
  title: z.string().optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  maxRedemptions: z.number().int().positive().optional(),
  appliedProducts: z.array(z.string()).optional(),
  rewardValue: z.number().min(0).optional(),
  rewardType: z.string().optional(),
  durationDays: z.number().int().positive().optional(),
  conditions: z.array(CampaignConditionSchema).optional(),
  actions: z.array(CampaignActionSchema).optional(),
  triggers: z.array(CampaignTriggerSchema).optional(),
  priority: z.number().int().optional(),
  cooldownDays: z.number().int().optional(),
});

export const UpdateMerchantCampaignSchema = CreateMerchantCampaignSchema.partial();

export const MerchantCampaignResponseSchema = CreateMerchantCampaignSchema.extend({
  _id: z.string().optional(),
  redemptionCount: z.number().optional(),
  createdAt: DateOrString.optional(),
  updatedAt: DateOrString.optional(),
});

export const CampaignResponseSchema = z.union([
  MarketingCampaignResponseSchema,
  AdCampaignResponseSchema,
  MerchantCampaignResponseSchema,
]);

export const CampaignListResponseSchema = z.array(CampaignResponseSchema);

// ─── Inferred types ───────────────────────────────────────────────────────────

export type CreateMarketingCampaignRequest = z.infer<typeof CreateMarketingCampaignSchema>;
export type UpdateMarketingCampaignRequest = z.infer<typeof UpdateMarketingCampaignSchema>;
export type MarketingCampaignResponse = z.infer<typeof MarketingCampaignResponseSchema>;

export type CreateAdCampaignRequest = z.infer<typeof CreateAdCampaignSchema>;
export type UpdateAdCampaignRequest = z.infer<typeof UpdateAdCampaignSchema>;
export type AdCampaignResponse = z.infer<typeof AdCampaignResponseSchema>;

export type CreateMerchantCampaignRequest = z.infer<typeof CreateMerchantCampaignSchema>;
export type UpdateMerchantCampaignRequest = z.infer<typeof UpdateMerchantCampaignSchema>;
export type MerchantCampaignResponse = z.infer<typeof MerchantCampaignResponseSchema>;

export type CampaignResponse = z.infer<typeof CampaignResponseSchema>;
export type CampaignListResponse = z.infer<typeof CampaignListResponseSchema>;
export type CampaignStatus = z.infer<typeof CAMPAIGN_STATUS>;
export type CampaignChannel = z.infer<typeof CAMPAIGN_CHANNEL>;
