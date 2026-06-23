import { SubscriptionTier as SubscriptionTierModel, ISubscriptionTier } from '../models/SubscriptionTier';
import { ISubscriptionBenefits } from '../models/Subscription';

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

interface ITierConfig {
  tier: string;
  name: string;
  pricing: {
    monthly: number;
    yearly: number;
    yearlyDiscount: number;
  };
  benefits: ISubscriptionBenefits;
  description: string;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  trialDays: number;
}

class TierConfigService {
  private cache: Map<string, CacheEntry<ITierConfig>> = new Map();
  private allTiersCache: CacheEntry<ITierConfig[]> | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Map SubscriptionTier DB document to normalized ITierConfig with full ISubscriptionBenefits
   */
  private mapTierToConfig(tier: ISubscriptionTier): ITierConfig {
    return {
      tier: tier.tier,
      name: tier.name,
      pricing: {
        monthly: tier.pricing.monthly,
        yearly: tier.pricing.yearly,
        yearlyDiscount: tier.pricing.yearlyDiscount,
      },
      benefits: {
        cashbackMultiplier: tier.benefits.cashbackMultiplier ?? 1,
        freeDelivery: tier.benefits.freeDelivery ?? false,
        prioritySupport: tier.benefits.prioritySupport ?? false,
        exclusiveDeals: tier.benefits.exclusiveDeals ?? false,
        unlimitedWishlists: tier.benefits.unlimitedWishlists ?? false,
        earlyFlashSaleAccess: tier.benefits.earlyFlashSaleAccess ?? false,
        personalShopper: tier.benefits.personalShopper ?? false,
        premiumEvents: tier.benefits.premiumEvents ?? false,
        conciergeService: tier.benefits.conciergeService ?? false,
        birthdayOffer: tier.benefits.birthdayOffer ?? false,
        anniversaryOffer: tier.benefits.anniversaryOffer ?? false,
      },
      description: tier.description,
      features: tier.features,
      isActive: tier.isActive,
      sortOrder: tier.sortOrder,
      trialDays: tier.trialDays ?? 0,
    };
  }

  private isCacheValid<T>(entry: CacheEntry<T> | null | undefined): entry is CacheEntry<T> {
    if (!entry) return false;
    return Date.now() < entry.expiry;
  }

  /**
   * Get config for a specific tier. Throws if tier not found or inactive.
   */
  async getTierConfig(tier: string): Promise<ITierConfig> {
    const cacheKey = `tier_${tier}`;
    const cached = this.cache.get(cacheKey);
    if (this.isCacheValid(cached)) {
      return cached.data;
    }

    const tierDoc = await SubscriptionTierModel.findOne({ tier, isActive: true }).lean().exec();
    if (!tierDoc) {
      throw new Error(`Subscription tier '${tier}' not found or inactive. Run seed script: npm run seed:tiers`);
    }

    const config = this.mapTierToConfig(tierDoc as unknown as ISubscriptionTier);
    this.cache.set(cacheKey, { data: config, expiry: Date.now() + this.CACHE_TTL });
    return config;
  }

  /**
   * Get all active tiers sorted by sortOrder
   */
  async getAllActiveTiers(): Promise<ITierConfig[]> {
    if (this.isCacheValid(this.allTiersCache)) {
      return this.allTiersCache.data;
    }

    const tiers = await SubscriptionTierModel.find({ isActive: true })
      .sort({ sortOrder: 1 })
      .lean()
      .exec();

    const configs = tiers.map(t => this.mapTierToConfig(t as unknown as ISubscriptionTier));
    this.allTiersCache = { data: configs, expiry: Date.now() + this.CACHE_TTL };
    return configs;
  }

  /**
   * Get price for a tier and billing cycle. Never trust client-sent prices.
   */
  async getTierPrice(tier: string, billingCycle: string): Promise<number> {
    if (tier === 'free') return 0;
    const config = await this.getTierConfig(tier);
    return billingCycle === 'yearly' ? config.pricing.yearly : config.pricing.monthly;
  }

  /**
   * Get benefits for a tier. Returns full ISubscriptionBenefits object.
   */
  async getTierBenefits(tier: string): Promise<ISubscriptionBenefits> {
    if (tier === 'free') {
      return {
        cashbackMultiplier: 1,
        freeDelivery: false,
        prioritySupport: false,
        exclusiveDeals: false,
        unlimitedWishlists: false,
        earlyFlashSaleAccess: false,
        personalShopper: false,
        premiumEvents: false,
        conciergeService: false,
        birthdayOffer: false,
        anniversaryOffer: false,
      };
    }
    const config = await this.getTierConfig(tier);
    return config.benefits;
  }

  /**
   * Check if a tier upgrade path is valid
   */
  isValidUpgrade(fromTier: string, toTier: string): boolean {
    const tierOrder: Record<string, number> = { free: 0, premium: 1, vip: 2 };
    const fromLevel = tierOrder[fromTier];
    const toLevel = tierOrder[toTier];
    if (fromLevel === undefined || toLevel === undefined) return false;
    return toLevel > fromLevel;
  }

  /**
   * Check if a tier downgrade path is valid
   */
  isValidDowngrade(fromTier: string, toTier: string): boolean {
    const tierOrder: Record<string, number> = { free: 0, premium: 1, vip: 2 };
    const fromLevel = tierOrder[fromTier];
    const toLevel = tierOrder[toTier];
    if (fromLevel === undefined || toLevel === undefined) return false;
    return toLevel < fromLevel;
  }

  /**
   * Invalidate all cached tier data. Call after admin updates.
   */
  invalidateCache(): void {
    this.cache.clear();
    this.allTiersCache = null;
  }
}

const tierConfigService = new TierConfigService();
export default tierConfigService;
export type { ITierConfig };
