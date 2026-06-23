import { Types } from 'mongoose';
import PriveAccess from '../models/PriveAccess';
import { getCachedWalletConfig } from './walletCacheService';
import { logger } from '../config/logger';

interface MultiplierResult {
  multiplier: number;
  tier: string;
  bonusAmount: number;
  finalAmount: number;
}

class PriveMultiplierService {
  /**
   * Get the coin multiplier for a user based on their Prive tier
   */
  async getMultiplier(userId: string): Promise<{ multiplier: number; tier: string }> {
    const access = await PriveAccess.findOne({
      userId: new Types.ObjectId(userId),
      status: 'active'
    }).lean();

    if (!access) {
      return { multiplier: 1.0, tier: 'none' };
    }

    const tier = access.tierOverride || 'entry';

    // Look up multiplier from config
    try {
      const config = await getCachedWalletConfig();
      const tierConfig = config?.priveProgramConfig?.tiers?.find((t: any) => t.tier === tier);
      if (tierConfig) {
        return { multiplier: tierConfig.coinMultiplier, tier };
      }
    } catch (err) { logger.warn('[PriveMultiplier] Failed to load tier config', { error: (err as Error).message }); }

    // Fallback defaults
    const defaultMultipliers: Record<string, number> = {
      entry: 1.0,
      signature: 1.5,
      elite: 2.0,
    };

    return { multiplier: defaultMultipliers[tier] || 1.0, tier };
  }

  /**
   * Apply multiplier to a base coin amount
   */
  async applyMultiplier(userId: string, baseAmount: number): Promise<MultiplierResult> {
    const { multiplier, tier } = await this.getMultiplier(userId);
    const finalAmount = Math.round(baseAmount * multiplier);
    const bonusAmount = finalAmount - baseAmount;

    return {
      multiplier,
      tier,
      bonusAmount,
      finalAmount,
    };
  }
}

export const priveMultiplierService = new PriveMultiplierService();
export default priveMultiplierService;
