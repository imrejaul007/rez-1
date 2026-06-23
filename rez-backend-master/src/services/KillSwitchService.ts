import redisService from './redisService';

export type KillSwitchScope = 'platform' | 'merchant' | 'campaign' | 'feature';
export type KillSwitchTarget =
  | 'rewards'
  | 'cashback'
  | 'coins'
  | 'referral'
  | 'bbps'
  | 'recharge'
  | 'wallet_topup'
  | 'booking'
  | 'orders';

export class KillSwitchService {
  /** Check if a feature is killed at any level */
  static async isKilled(
    target: KillSwitchTarget,
    context?: {
      merchantId?: string;
      campaignId?: string;
    },
  ): Promise<{ killed: boolean; scope?: KillSwitchScope; reason?: string }> {
    const redis = redisService;

    // Platform level (highest priority)
    const platformKill = await redis.get<string>(`killswitch:platform:${target}`);
    if (platformKill) return { killed: true, scope: 'platform', reason: platformKill };

    // Merchant level
    if (context?.merchantId) {
      const merchantKill = await redis.get<string>(`killswitch:merchant:${context.merchantId}:${target}`);
      if (merchantKill) return { killed: true, scope: 'merchant', reason: merchantKill };
    }

    // Campaign level
    if (context?.campaignId) {
      const campaignKill = await redis.get<string>(`killswitch:campaign:${context.campaignId}:${target}`);
      if (campaignKill) return { killed: true, scope: 'campaign', reason: campaignKill };
    }

    return { killed: false };
  }

  static async setPlatformKill(target: KillSwitchTarget, reason: string): Promise<void> {
    const redis = redisService;
    await redis.set(`killswitch:platform:${target}`, reason);
  }

  static async clearPlatformKill(target: KillSwitchTarget): Promise<void> {
    const redis = redisService;
    await redis.del(`killswitch:platform:${target}`);
  }

  static async setMerchantKill(merchantId: string, target: KillSwitchTarget, reason: string): Promise<void> {
    const redis = redisService;
    await redis.set(`killswitch:merchant:${merchantId}:${target}`, reason);
    await redis.expire(`killswitch:merchant:${merchantId}:${target}`, 30 * 24 * 60 * 60); // 30 days
  }

  static async clearMerchantKill(merchantId: string, target: KillSwitchTarget): Promise<void> {
    const redis = redisService;
    await redis.del(`killswitch:merchant:${merchantId}:${target}`);
  }

  static async setCampaignKill(campaignId: string, reason: string): Promise<void> {
    const redis = redisService;
    await redis.set(`killswitch:campaign:${campaignId}:rewards`, reason);
  }

  /** Admin API to list all active kill switches */
  static async listAllKillSwitches(): Promise<Array<{ key: string; reason: string }>> {
    const client = redisService.getClient() as any;
    const keys: string[] = client ? await client.keys('killswitch:*') : [];
    if (keys.length === 0) return [];
    const values: Array<string | null> = await Promise.all(keys.map((k: string) => redisService.get<string>(k)));
    return keys
      .map((key: string, i: number) => ({ key, reason: values[i] || '' }))
      .filter((k: { key: string; reason: string }) => k.reason);
  }
}
