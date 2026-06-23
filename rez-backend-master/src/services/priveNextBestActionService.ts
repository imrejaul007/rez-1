import { Types } from 'mongoose';
import { UserReputation, PillarId, PILLAR_WEIGHTS, ELIGIBILITY_THRESHOLDS } from '../models/UserReputation';
import { getCachedWalletConfig } from './walletCacheService';
import { logger } from '../config/logger';

interface NextAction {
  id: string;
  actionType: string;
  pillarAffected: PillarId;
  estimatedPointGain: number;
  effort: 'low' | 'medium' | 'high';
  efficiencyScore: number;
  title: string;
  description: string;
  deepLink: string;
  urgency: 'low' | 'medium' | 'high';
  urgencyReason?: string;
}

interface NextActionsResponse {
  weakestPillar: { id: PillarId; score: number; weight: number; gap: number };
  currentTier: string;
  nextTier: string;
  pointsToNextTier: number;
  actions: NextAction[];
}

// Action templates: what a user can do to improve each pillar
const ACTION_TEMPLATES: Array<{
  id: string;
  actionType: string;
  pillar: PillarId;
  estimatedPointGain: number;
  effort: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  deepLink: string;
}> = [
  { id: 'write_review', actionType: 'review', pillar: 'influence', estimatedPointGain: 5, effort: 'low', title: 'Write a Review', description: 'Share your experience with a recent order', deepLink: '/prive/review-earn' },
  { id: 'refer_friend', actionType: 'referral', pillar: 'network', estimatedPointGain: 10, effort: 'medium', title: 'Refer a Friend', description: 'Invite someone to join the platform', deepLink: '/referral' },
  { id: 'place_order', actionType: 'order', pillar: 'engagement', estimatedPointGain: 5, effort: 'medium', title: 'Place an Order', description: 'Shop from any store to boost engagement', deepLink: '/explore/stores' },
  { id: 'complete_checkin', actionType: 'check_in', pillar: 'engagement', estimatedPointGain: 2, effort: 'low', title: 'Daily Check-in', description: 'Check in daily to build your streak', deepLink: '/prive' },
  { id: 'verify_identity', actionType: 'verify', pillar: 'trust', estimatedPointGain: 10, effort: 'high', title: 'Verify Your Identity', description: 'Complete identity verification for a trust boost', deepLink: '/profile/verification' },
  { id: 'add_to_wishlist', actionType: 'wishlist', pillar: 'brandAffinity', estimatedPointGain: 3, effort: 'low', title: 'Explore & Wishlist', description: 'Add products to your wishlist', deepLink: '/explore' },
  { id: 'social_share', actionType: 'social_share', pillar: 'influence', estimatedPointGain: 3, effort: 'low', title: 'Share on Social', description: 'Share a product or review on social media', deepLink: '/explore' },
  { id: 'redeem_coins', actionType: 'redeem', pillar: 'economicValue', estimatedPointGain: 3, effort: 'medium', title: 'Redeem Your Coins', description: 'Use your coins for vouchers or experiences', deepLink: '/prive/redeem' },
  { id: 'invite_prive', actionType: 'invite', pillar: 'network', estimatedPointGain: 8, effort: 'medium', title: 'Invite to Prive', description: 'Share your Prive invite code', deepLink: '/prive/invite-dashboard' },
  { id: 'shop_new_category', actionType: 'order', pillar: 'economicValue', estimatedPointGain: 4, effort: 'medium', title: 'Try a New Category', description: 'Order from a category you haven\'t tried yet', deepLink: '/explore' },
];

class PriveNextBestActionService {
  async getNextActions(userId: string): Promise<NextActionsResponse> {
    const userObjectId = new Types.ObjectId(userId);
    const reputation = await UserReputation.findOne({ userId: userObjectId }).lean();

    if (!reputation) {
      return this.getDefaultResponse();
    }

    // Get config for thresholds
    let thresholds: { entry: number; signature: number; elite: number } = {
      entry: ELIGIBILITY_THRESHOLDS.ENTRY_TIER,
      signature: ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER,
      elite: ELIGIBILITY_THRESHOLDS.ELITE_TIER,
    };
    try {
      const config = await getCachedWalletConfig();
      if (config?.priveProgramConfig?.tierThresholds) {
        const t = config.priveProgramConfig.tierThresholds;
        thresholds = { entry: t.entryTier, signature: t.signatureTier, elite: t.eliteTier };
      }
    } catch (err) { logger.warn('[PriveNextBestAction] Failed to load tier thresholds', { error: (err as Error).message }); }

    const weights = PILLAR_WEIGHTS;
    const currentTier = reputation.tier;

    // Determine next tier
    let nextTier = 'entry';
    let nextTierThreshold = thresholds.entry;
    if (currentTier === 'entry') { nextTier = 'signature'; nextTierThreshold = thresholds.signature; }
    else if (currentTier === 'signature') { nextTier = 'elite'; nextTierThreshold = thresholds.elite; }
    else if (currentTier === 'elite') { nextTier = 'elite'; nextTierThreshold = 100; }

    const pointsToNextTier = Math.max(0, nextTierThreshold - reputation.totalScore);

    // Find weakest pillar (by weighted contribution gap)
    const pillarGaps = (Object.entries(weights) as [PillarId, number][]).map(([id, weight]) => ({
      id,
      score: reputation.pillars[id].score,
      weight,
      gap: 100 - reputation.pillars[id].score,
      weightedGap: (100 - reputation.pillars[id].score) * weight,
    }));

    pillarGaps.sort((a, b) => b.weightedGap - a.weightedGap);
    const weakest = pillarGaps[0];

    // Build and rank actions
    const actions: NextAction[] = ACTION_TEMPLATES.map(template => {
      const pillarWeight = weights[template.pillar];

      // Efficiency = weighted point gain / effort cost
      const effortCost = template.effort === 'low' ? 1 : template.effort === 'medium' ? 2 : 3;
      const weightedGain = template.estimatedPointGain * pillarWeight;
      const efficiencyScore = Math.round((weightedGain / effortCost) * 100) / 100;

      // Urgency based on distance to next tier
      let urgency: 'low' | 'medium' | 'high' = 'low';
      let urgencyReason: string | undefined;
      if (pointsToNextTier <= 5) {
        urgency = 'high';
        urgencyReason = `${pointsToNextTier.toFixed(1)} points from ${nextTier} tier`;
      } else if (pointsToNextTier <= 15) {
        urgency = 'medium';
        urgencyReason = `${pointsToNextTier.toFixed(1)} points from ${nextTier} tier`;
      }

      return {
        id: `${template.id}_${template.pillar}`,
        actionType: template.actionType,
        pillarAffected: template.pillar,
        estimatedPointGain: template.estimatedPointGain,
        effort: template.effort,
        efficiencyScore,
        title: template.title,
        description: template.description,
        deepLink: template.deepLink,
        urgency,
        urgencyReason,
      };
    });

    // Sort by efficiency (highest first), then by whether they target the weakest pillar
    actions.sort((a, b) => {
      if (a.pillarAffected === weakest.id && b.pillarAffected !== weakest.id) return -1;
      if (b.pillarAffected === weakest.id && a.pillarAffected !== weakest.id) return 1;
      return b.efficiencyScore - a.efficiencyScore;
    });

    return {
      weakestPillar: { id: weakest.id, score: weakest.score, weight: weakest.weight, gap: weakest.gap },
      currentTier,
      nextTier,
      pointsToNextTier: Math.round(pointsToNextTier * 100) / 100,
      actions: actions.slice(0, 8), // Top 8 actions
    };
  }

  private getDefaultResponse(): NextActionsResponse {
    return {
      weakestPillar: { id: 'engagement', score: 0, weight: 0.25, gap: 100 },
      currentTier: 'none',
      nextTier: 'entry',
      pointsToNextTier: ELIGIBILITY_THRESHOLDS.ENTRY_TIER,
      actions: ACTION_TEMPLATES.slice(0, 5).map(t => ({
        id: t.id,
        actionType: t.actionType,
        pillarAffected: t.pillar,
        estimatedPointGain: t.estimatedPointGain,
        effort: t.effort,
        efficiencyScore: 1,
        title: t.title,
        description: t.description,
        deepLink: t.deepLink,
        urgency: 'low' as const,
      })),
    };
  }
}

export const priveNextBestActionService = new PriveNextBestActionService();
export default priveNextBestActionService;
