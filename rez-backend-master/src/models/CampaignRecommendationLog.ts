import { Schema, model, Document, Types } from 'mongoose';

/**
 * CampaignRecommendationLog — tracks merchant interactions with AI campaign suggestions.
 *
 * Enables the campaign recommendation feedback loop:
 * 1. Log when a suggestion is shown to the merchant
 * 2. Log when merchant accepts/dismisses/ignores
 * 3. After 7 days, log the outcome (reach, conversions, revenue impact)
 * 4. Use historical accept rates + conversion rates to rank future suggestions
 *
 * v3 Architecture: Part 10 — Campaign Recommendation Feedback Loop
 */
export interface ICampaignRecommendationLog extends Document {
  merchantId: Types.ObjectId;
  recommendationType: string; // 'winback', 'slow_day', 'food_cost', 'repeat_boost'
  generatedAt: Date;
  shownAt?: Date; // when merchant saw it on dashboard
  action: 'accepted' | 'dismissed' | 'ignored' | null;
  actionAt?: Date;

  // Outcome tracking (filled 7 days after action by scheduledQueue job)
  outcome?: {
    campaignId?: Types.ObjectId; // if accepted + campaign created
    customerReach: number; // customers who received the campaign message
    conversions: number; // customers who visited within 7 days
    conversionRate: number; // conversions / customerReach
    revenueImpact: number; // revenue attributed to converted customers (₹)
    coinsIssued: number; // total coins issued by the campaign
  };

  createdAt: Date;
  updatedAt: Date;
}

const CampaignRecommendationLogSchema = new Schema<ICampaignRecommendationLog>(
  {
    merchantId: { type: Schema.Types.ObjectId, ref: 'Merchant', required: true, index: true },
    recommendationType: { type: String, required: true, index: true },
    generatedAt: { type: Date, required: true, default: Date.now },
    shownAt: { type: Date },
    action: { type: String, enum: ['accepted', 'dismissed', 'ignored', null], default: null },
    actionAt: { type: Date },

    outcome: {
      campaignId: { type: Schema.Types.ObjectId, ref: 'BroadcastCampaign' },
      customerReach: { type: Number, default: 0 },
      conversions: { type: Number, default: 0 },
      conversionRate: { type: Number, default: 0 },
      revenueImpact: { type: Number, default: 0 },
      coinsIssued: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  },
);

// ── Indexes ──────────────────────────────────────────────────────────────
CampaignRecommendationLogSchema.index({ merchantId: 1, createdAt: -1 });
// For feedback aggregation: group by type to compute accept/conversion rates
CampaignRecommendationLogSchema.index({ merchantId: 1, recommendationType: 1 });
// For outcome tracking job: find accepted recommendations without outcomes
CampaignRecommendationLogSchema.index({ action: 1, 'outcome.conversionRate': 1 }, { sparse: true });

export const CampaignRecommendationLog = model<ICampaignRecommendationLog>(
  'CampaignRecommendationLog',
  CampaignRecommendationLogSchema,
);

// ─────────────────────────────────────────────────────────────────────────────
// Feedback analytics helper — used by recommendation engine to rank suggestions
// ─────────────────────────────────────────────────────────────────────────────

export interface RecommendationPerformance {
  type: string;
  acceptRate: number; // % of times merchant accepted
  conversionRate: number; // avg conversion rate when accepted
  score: number; // acceptRate × conversionRate (higher = show first)
}

/**
 * Get historical performance of each recommendation type for a merchant.
 * Used to rank future recommendations (higher score = show earlier in list).
 */
export async function getRecommendationPerformance(merchantId: string): Promise<RecommendationPerformance[]> {
  const history = await CampaignRecommendationLog.aggregate([
    { $match: { merchantId, action: { $ne: null } } },
    {
      $group: {
        _id: '$recommendationType',
        acceptRate: {
          $avg: { $cond: [{ $eq: ['$action', 'accepted'] }, 1, 0] },
        },
        conversionRate: { $avg: '$outcome.conversionRate' },
        count: { $sum: 1 },
      },
    },
  ]);

  return history
    .map((h: any) => ({
      type: h._id,
      acceptRate: h.acceptRate ?? 0,
      conversionRate: h.conversionRate ?? 0,
      score: (h.acceptRate ?? 0) * (h.conversionRate ?? 0),
    }))
    .sort((a: RecommendationPerformance, b: RecommendationPerformance) => b.score - a.score);
}

export default CampaignRecommendationLog;
