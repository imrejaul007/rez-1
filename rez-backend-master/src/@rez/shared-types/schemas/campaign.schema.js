"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignListResponseSchema = exports.CampaignResponseSchema = exports.MerchantCampaignResponseSchema = exports.UpdateMerchantCampaignSchema = exports.CreateMerchantCampaignSchema = exports.AdCampaignResponseSchema = exports.UpdateAdCampaignSchema = exports.CreateAdCampaignSchema = exports.MarketingCampaignResponseSchema = exports.UpdateMarketingCampaignSchema = exports.CreateMarketingCampaignSchema = exports.BaseCampaignSchema = exports.CampaignTriggerSchema = exports.CampaignActionSchema = exports.CampaignConditionSchema = exports.AudienceTargetingSchema = exports.CAMPAIGN_CHANNEL = exports.CAMPAIGN_STATUS = void 0;
const zod_1 = require("zod");
const DateOrString = zod_1.z.union([zod_1.z.date(), zod_1.z.string()]);
// ─── Enums ────────────────────────────────────────────────────────────────────
exports.CAMPAIGN_STATUS = zod_1.z.enum([
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
exports.CAMPAIGN_CHANNEL = zod_1.z.enum([
    'email',
    'sms',
    'push',
    'in_app',
    'whatsapp',
    'social',
    'web',
    'api',
]);
// ─── Typed shapes (replacing `any`) ───────────────────────────────────────────
exports.AudienceTargetingSchema = zod_1.z
    .object({
    segment: zod_1.z.enum(['all', 'recent', 'lapsed', 'high_value', 'stamp_card']).optional(),
    daysInactive: zod_1.z.number().int().positive().optional(),
    minSpend: zod_1.z.number().min(0).optional(),
    location: zod_1.z
        .object({
        city: zod_1.z.string().optional(),
        area: zod_1.z.string().optional(),
        pincode: zod_1.z.string().optional(),
        radiusKm: zod_1.z.number().positive().optional(),
    })
        .optional(),
    interests: zod_1.z.array(zod_1.z.string()).optional(),
    institution: zod_1.z.string().optional(),
    keyword: zod_1.z.string().optional(),
    estimatedCount: zod_1.z.number().int().min(0).optional(),
})
    .strict();
const CampaignMetadataSchema = zod_1.z.record(zod_1.z.string(), zod_1.z.union([
    zod_1.z.string(),
    zod_1.z.number(),
    zod_1.z.boolean(),
    zod_1.z.null(),
    zod_1.z.array(zod_1.z.string()),
    zod_1.z.array(zod_1.z.number()),
]));
exports.CampaignConditionSchema = zod_1.z
    .object({
    field: zod_1.z.string().min(1),
    operator: zod_1.z.enum([
        'eq',
        'neq',
        'gt',
        'gte',
        'lt',
        'lte',
        'in',
        'not_in',
        'contains',
        'exists',
    ]),
    value: zod_1.z
        .union([
        zod_1.z.string(),
        zod_1.z.number(),
        zod_1.z.boolean(),
        zod_1.z.null(),
        zod_1.z.array(zod_1.z.union([zod_1.z.string(), zod_1.z.number()])),
    ])
        .optional(),
})
    .strict();
exports.CampaignActionSchema = zod_1.z
    .object({
    kind: zod_1.z.enum([
        'credit_coins',
        'grant_badge',
        'send_notification',
        'award_voucher',
        'issue_coupon',
    ]),
    params: CampaignMetadataSchema.optional(),
})
    .strict();
exports.CampaignTriggerSchema = zod_1.z
    .object({
    event: zod_1.z.enum([
        'order.placed',
        'order.delivered',
        'visit.completed',
        'signup',
        'referral.invite',
        'cron',
        'manual',
    ]),
    filters: zod_1.z.array(exports.CampaignConditionSchema).optional(),
})
    .strict();
// ─── Base Campaign ────────────────────────────────────────────────────────────
exports.BaseCampaignSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Campaign name is required'),
    description: zod_1.z.string().optional(),
    status: exports.CAMPAIGN_STATUS,
    startDate: DateOrString,
    endDate: DateOrString.optional(),
    channel: exports.CAMPAIGN_CHANNEL.optional(),
    targetAudience: exports.AudienceTargetingSchema.optional(),
    budget: zod_1.z.number().min(0).optional(),
    spent: zod_1.z.number().min(0).optional(),
    createdBy: zod_1.z.string().optional(),
});
// ─── Marketing Campaign ───────────────────────────────────────────────────────
exports.CreateMarketingCampaignSchema = exports.BaseCampaignSchema.extend({
    type: zod_1.z.literal('marketing').optional(),
    merchantId: zod_1.z.string().optional(),
    objective: zod_1.z.enum(['awareness', 'engagement', 'sales', 'win_back']).optional(),
    message: zod_1.z.string().optional(),
    templateName: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().url('Invalid image URL').optional(),
    ctaUrl: zod_1.z.string().url('Invalid CTA URL').optional(),
    ctaText: zod_1.z.string().optional(),
    audience: exports.AudienceTargetingSchema.optional(),
    scheduledAt: DateOrString.optional(),
    dailyBudget: zod_1.z.number().min(0).optional(),
    attributionWindowDays: zod_1.z.number().int().positive().optional(),
});
exports.UpdateMarketingCampaignSchema = exports.CreateMarketingCampaignSchema.partial();
exports.MarketingCampaignResponseSchema = exports.CreateMarketingCampaignSchema.extend({
    _id: zod_1.z.string().optional(),
    sentAt: DateOrString.optional(),
    stats: zod_1.z
        .object({
        sent: zod_1.z.number().optional(),
        delivered: zod_1.z.number().optional(),
        failed: zod_1.z.number().optional(),
        deduped: zod_1.z.number().optional(),
        opened: zod_1.z.number().optional(),
        clicked: zod_1.z.number().optional(),
        converted: zod_1.z.number().optional(),
    })
        .optional(),
    errorMessage: zod_1.z.string().optional(),
    totalSpent: zod_1.z.number().min(0).optional(),
    createdAt: DateOrString.optional(),
    updatedAt: DateOrString.optional(),
});
// ─── Ad Campaign ──────────────────────────────────────────────────────────────
exports.CreateAdCampaignSchema = exports.BaseCampaignSchema.extend({
    type: zod_1.z.literal('ad').optional(),
    merchantId: zod_1.z.string().optional(),
    storeId: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    headline: zod_1.z.string().optional(),
    ctaText: zod_1.z.string().optional(),
    ctaUrl: zod_1.z.string().url('Invalid CTA URL').optional(),
    imageUrl: zod_1.z.string().url('Invalid image URL').optional(),
    placement: zod_1.z
        .enum(['home_banner', 'explore_feed', 'store_listing', 'search_result'])
        .optional(),
    targetSegment: zod_1.z.enum(['all', 'new', 'loyal', 'lapsed', 'nearby']).optional(),
    targetLocation: zod_1.z
        .object({
        city: zod_1.z.string().optional(),
        radiusKm: zod_1.z.number().positive().optional(),
    })
        .optional(),
    targetInterests: zod_1.z.array(zod_1.z.string()).optional(),
    bidType: zod_1.z.enum(['CPC', 'CPM']).optional(),
    bidAmount: zod_1.z.number().min(0).optional(),
    dailyBudget: zod_1.z.number().min(0).optional(),
    totalBudget: zod_1.z.number().min(0).optional(),
    frequencyCapDays: zod_1.z.number().int().positive().optional(),
});
exports.UpdateAdCampaignSchema = exports.CreateAdCampaignSchema.partial();
exports.AdCampaignResponseSchema = exports.CreateAdCampaignSchema.extend({
    _id: zod_1.z.string().optional(),
    totalSpent: zod_1.z.number().min(0).optional(),
    impressions: zod_1.z.number().optional(),
    clicks: zod_1.z.number().optional(),
    ctr: zod_1.z.number().optional(),
    reviewedBy: zod_1.z.string().optional(),
    reviewedAt: DateOrString.optional(),
    rejectionReason: zod_1.z.string().optional(),
    createdAt: DateOrString.optional(),
    updatedAt: DateOrString.optional(),
});
// ─── Merchant Campaign (rules-engine shaped) ──────────────────────────────────
exports.CreateMerchantCampaignSchema = exports.BaseCampaignSchema.extend({
    type: zod_1.z.literal('merchant').optional(),
    merchantId: zod_1.z.string().optional(),
    storeId: zod_1.z.string().optional(),
    title: zod_1.z.string().optional(),
    discountPercentage: zod_1.z.number().min(0).max(100).optional(),
    maxRedemptions: zod_1.z.number().int().positive().optional(),
    appliedProducts: zod_1.z.array(zod_1.z.string()).optional(),
    rewardValue: zod_1.z.number().min(0).optional(),
    rewardType: zod_1.z.string().optional(),
    durationDays: zod_1.z.number().int().positive().optional(),
    conditions: zod_1.z.array(exports.CampaignConditionSchema).optional(),
    actions: zod_1.z.array(exports.CampaignActionSchema).optional(),
    triggers: zod_1.z.array(exports.CampaignTriggerSchema).optional(),
    priority: zod_1.z.number().int().optional(),
    cooldownDays: zod_1.z.number().int().optional(),
});
exports.UpdateMerchantCampaignSchema = exports.CreateMerchantCampaignSchema.partial();
exports.MerchantCampaignResponseSchema = exports.CreateMerchantCampaignSchema.extend({
    _id: zod_1.z.string().optional(),
    redemptionCount: zod_1.z.number().optional(),
    createdAt: DateOrString.optional(),
    updatedAt: DateOrString.optional(),
});
exports.CampaignResponseSchema = zod_1.z.union([
    exports.MarketingCampaignResponseSchema,
    exports.AdCampaignResponseSchema,
    exports.MerchantCampaignResponseSchema,
]);
exports.CampaignListResponseSchema = zod_1.z.array(exports.CampaignResponseSchema);
//# sourceMappingURL=campaign.schema.js.map