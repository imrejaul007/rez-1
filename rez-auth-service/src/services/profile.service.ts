import { UserProfile, IUserProfile } from '../models/UserProfile';
import { logger } from '../config/logger';

export class ProfileService {

  static async getOrCreateProfile(userId: string, phone: string): Promise<IUserProfile> {
    let profile = await UserProfile.findOne({ userId });

    if (!profile) {
      profile = await UserProfile.create({
        userId,
        phone,
        verticals: {
          hotel: { totalSpend: 0, transactionCount: 0, lastActivity: null, averageOrderValue: 0 },
          restaurant: { totalSpend: 0, transactionCount: 0, lastActivity: null, averageOrderValue: 0 },
          fashion: { totalSpend: 0, transactionCount: 0, lastActivity: null, averageOrderValue: 0 },
          pharmacy: { totalSpend: 0, transactionCount: 0, lastActivity: null, averageOrderValue: 0 },
          retail: { totalSpend: 0, transactionCount: 0, lastActivity: null, averageOrderValue: 0 },
          d2c: { totalSpend: 0, transactionCount: 0, lastActivity: null, averageOrderValue: 0 },
        },
        firstActivity: new Date(),
        lastActivity: new Date(),
      });
    }

    return profile;
  }

  static async recordTransaction(params: {
    userId: string;
    phone: string;
    vertical: 'hotel' | 'restaurant' | 'fashion' | 'pharmacy' | 'retail' | 'd2c';
    amount: number;
    merchantId: string;
    category: string;
  }): Promise<void> {
    const profile = await this.getOrCreateProfile(params.userId, params.phone);

    const vertical = profile.verticals[params.vertical];
    const newCount = vertical.transactionCount + 1;
    const newTotal = vertical.totalSpend + params.amount;

    vertical.transactionCount = newCount;
    vertical.totalSpend = newTotal;
    vertical.averageOrderValue = newTotal / newCount;
    vertical.lastActivity = new Date();

    const globalNewCount = profile.totalTransactions + 1;
    const globalNewTotal = profile.totalLifetimeSpend + params.amount;
    profile.totalTransactions = globalNewCount;
    profile.totalLifetimeSpend = globalNewTotal;
    profile.averageOrderValue = globalNewTotal / globalNewCount;
    profile.lastActivity = new Date();

    if (!profile.favoriteCategories.includes(params.category)) {
      profile.favoriteCategories = [...profile.favoriteCategories.slice(-9), params.category];
    }
    if (!profile.favoriteMerchants.includes(params.merchantId)) {
      profile.favoriteMerchants = [...profile.favoriteMerchants.slice(-19), params.merchantId];
    }

    profile.lifetimeValue = this.calculateLTV(profile);
    profile.daysActive = Math.floor((Date.now() - (profile.firstActivity?.getTime() || Date.now())) / (1000 * 60 * 60 * 24));

    await profile.save();
    logger.info('[Profile] Updated', { userId: params.userId, vertical: params.vertical, amount: params.amount });
  }

  static async recordEngagement(userId: string, phone: string): Promise<void> {
    const profile = await this.getOrCreateProfile(userId, phone);
    profile.lastAppOpen = new Date();
    profile.lastActivity = new Date();
    profile.engagementScore = this.calculateEngagementScore(profile);
    await profile.save();
  }

  static calculateLTV(profile: IUserProfile): number {
    const avgOrderValue = profile.averageOrderValue || 0;
    const daysSinceFirst = Math.floor((Date.now() - (profile.firstActivity?.getTime() || Date.now())) / (1000 * 60 * 60 * 24));
    const purchaseFrequency = daysSinceFirst > 0 ? profile.totalTransactions / (daysSinceFirst / 30) : 0;
    const customerLifespan = 24;
    const margin = 0.15;
    return Math.round(avgOrderValue * purchaseFrequency * customerLifespan * margin);
  }

  static calculateEngagementScore(profile: IUserProfile): number {
    let score = 0;
    const daysSinceLastActivity = Math.floor((Date.now() - (profile.lastActivity?.getTime() || Date.now())) / (1000 * 60 * 60 * 24));
    if (daysSinceLastActivity <= 7) score += 40;
    else if (daysSinceLastActivity <= 30) score += 20;
    score += Math.min(profile.totalTransactions * 2, 30);
    if (profile.lifetimeValue >= 10000) score += 30;
    else if (profile.lifetimeValue >= 1000) score += 20;
    else if (profile.lifetimeValue >= 100) score += 10;
    return Math.min(score, 100);
  }

  static getTier(lifetimeValue: number): 'bronze' | 'silver' | 'gold' | 'platinum' {
    if (lifetimeValue >= 50000) return 'platinum';
    if (lifetimeValue >= 10000) return 'gold';
    if (lifetimeValue >= 1000) return 'silver';
    return 'bronze';
  }

  static async getProfileSummary(userId: string, phone: string) {
    const profile = await this.getOrCreateProfile(userId, phone);
    return {
      userId: profile.userId,
      phone: profile.phone,
      totalLifetimeSpend: profile.totalLifetimeSpend,
      totalTransactions: profile.totalTransactions,
      averageOrderValue: Math.round(profile.averageOrderValue),
      lifetimeValue: profile.lifetimeValue,
      engagementScore: profile.engagementScore,
      lastActivity: profile.lastActivity,
      daysActive: profile.daysActive,
      verticals: profile.verticals,
      favoriteCategories: profile.favoriteCategories,
      favoriteMerchants: profile.favoriteMerchants,
      tier: this.getTier(profile.lifetimeValue),
    };
  }
}
