import { Types } from 'mongoose';
import { CoinTransaction } from '../models/CoinTransaction';
import { UserReputation } from '../models/UserReputation';
import { ELIGIBILITY_THRESHOLDS } from '../models/UserReputation';

class PriveAnalyticsService {
  async getAnalytics(userId: string, periodDays: number = 30) {
    const userObjectId = new Types.ObjectId(userId);
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const [currentEarnings, previousEarnings, reputation] = await Promise.all([
      // Current period earnings
      CoinTransaction.aggregate([
        { $match: { user: userObjectId, type: { $in: ['earned', 'bonus'] }, createdAt: { $gte: periodStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).catch(() => []),

      // Previous period earnings
      CoinTransaction.aggregate([
        { $match: { user: userObjectId, type: { $in: ['earned', 'bonus'] }, createdAt: { $gte: prevPeriodStart, $lt: periodStart } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).catch(() => []),

      // Reputation with history
      UserReputation.findOne({ userId: userObjectId }).lean().catch(() => null),
    ]);

    const current = currentEarnings[0]?.total || 0;
    const previous = previousEarnings[0]?.total || 0;
    const changePercent = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

    // Pillar momentum (compare current vs earliest in history within period)
    const pillarMomentum: Record<string, { current: number; delta: number; direction: string }> = {};
    if (reputation?.pillars) {
      const oldSnapshot = (reputation as any).history?.find((h: any) => new Date(h.date) >= periodStart) || (reputation as any).history?.[0];

      for (const pillarId of ['engagement', 'trust', 'influence', 'economicValue', 'brandAffinity', 'network']) {
        const currentScore = (reputation.pillars as any)[pillarId]?.score || 0;
        const prevScore = oldSnapshot?.pillars ? (oldSnapshot.pillars as any)[pillarId] || currentScore : currentScore;
        const delta = Math.round((currentScore - prevScore) * 10) / 10;
        pillarMomentum[pillarId] = {
          current: currentScore,
          delta,
          direction: delta > 2 ? 'up' : delta < -2 ? 'down' : 'stable',
        };
      }
    }

    // Reputation trend
    const recentHistory = ((reputation as any)?.history || []).slice(-5);
    let trendDirection = 'stable';
    if (recentHistory.length >= 2) {
      const first = recentHistory[0].totalScore;
      const last = recentHistory[recentHistory.length - 1].totalScore;
      if (last - first > 3) trendDirection = 'up';
      else if (first - last > 3) trendDirection = 'down';
    }

    // Projected tier date
    let projectedTierDate: string | null = null;
    if (reputation && (reputation as any).tier !== 'elite') {
      const nextThreshold = (reputation as any).tier === 'none' ? ELIGIBILITY_THRESHOLDS.ENTRY_TIER
        : (reputation as any).tier === 'entry' ? ELIGIBILITY_THRESHOLDS.SIGNATURE_TIER
        : ELIGIBILITY_THRESHOLDS.ELITE_TIER;
      const gap = nextThreshold - (reputation as any).totalScore;

      if (gap > 0 && recentHistory.length >= 2) {
        const daysBetween = (new Date(recentHistory[recentHistory.length - 1].date).getTime() - new Date(recentHistory[0].date).getTime()) / (1000 * 60 * 60 * 24);
        const scoreDelta = recentHistory[recentHistory.length - 1].totalScore - recentHistory[0].totalScore;

        if (scoreDelta > 0 && daysBetween > 0) {
          const ratePerDay = scoreDelta / daysBetween;
          const daysNeeded = Math.ceil(gap / ratePerDay);
          projectedTierDate = `At your current pace, you'll reach ${(reputation as any).tier === 'none' ? 'Entry' : (reputation as any).tier === 'entry' ? 'Signature' : 'Elite'} in ~${daysNeeded} days`;
        } else {
          projectedTierDate = 'Increase your activity to progress to the next tier';
        }
      }
    }

    return {
      earningsVelocity: {
        current,
        previous,
        changePercent: Math.round(changePercent * 10) / 10,
        period: periodDays,
      },
      reputationTrend: {
        direction: trendDirection,
        currentScore: (reputation as any)?.totalScore || 0,
        currentTier: (reputation as any)?.tier || 'none',
      },
      projectedTierDate,
      pillarMomentum,
    };
  }
}

export const priveAnalyticsService = new PriveAnalyticsService();
export default priveAnalyticsService;
