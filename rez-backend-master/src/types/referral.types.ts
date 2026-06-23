export interface ReferralTier {
  name: string;
  referralsRequired: number;
  badge: string;
  rewards: {
    tierBonus?: number;
    perReferral?: number;
    voucher?: {
      type: string;
      amount: number;
    };
    lifetimePremium?: boolean;
  };
}

export interface ReferralReward {
  type: 'coins' | 'voucher' | 'premium';
  amount?: number;
  voucherCode?: string;
  voucherType?: string;
  claimed: boolean;
  claimedAt?: Date;
  expiresAt?: Date;
}

export interface QualificationCriteria {
  minOrders: number;
  minSpend: number;
  timeframeDays: number;
}

export const REFERRAL_TIERS: Record<string, ReferralTier> = {
  STARTER: {
    name: 'REZ Starter',
    referralsRequired: 0,
    badge: 'Starter',
    rewards: {
      perReferral: 50
    }
  },
  PRO: {
    name: 'REZ Pro',
    referralsRequired: 5,
    badge: 'Pro',
    rewards: {
      tierBonus: 500,
      perReferral: 100
    }
  },
  ELITE: {
    name: 'REZ Elite',
    referralsRequired: 10,
    badge: 'Elite',
    rewards: {
      tierBonus: 1000,
      perReferral: 150,
      voucher: { type: 'Amazon', amount: 200 }
    }
  },
  CHAMPION: {
    name: 'REZ Champion',
    referralsRequired: 20,
    badge: 'Champion',
    rewards: {
      tierBonus: 2000,
      perReferral: 200,
      voucher: { type: 'Amazon', amount: 1000 }
    }
  },
  LEGEND: {
    name: 'REZ Legend',
    referralsRequired: 50,
    badge: 'Legend',
    rewards: {
      tierBonus: 5000,
      perReferral: 300,
      voucher: { type: 'Amazon', amount: 5000 },
      lifetimePremium: true
    }
  }
};

export const DEFAULT_QUALIFICATION_CRITERIA: QualificationCriteria = {
  minOrders: 1,
  minSpend: 500,
  timeframeDays: 30
};

export enum ReferralStatus {
  PENDING = 'pending',
  REGISTERED = 'registered',
  ACTIVE = 'active',
  QUALIFIED = 'qualified',
  EXPIRED = 'expired'
}

export interface ReferralStats {
  totalReferrals: number;
  qualifiedReferrals: number;
  pendingReferrals: number;
  lifetimeEarnings: number;
  currentTier: string;
  nextTier: string | null;
  progressToNextTier: number;
  successRate: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  totalReferrals: number;
  tier: string;
  rank: number;
}

export interface ShareTemplate {
  type: 'whatsapp' | 'facebook' | 'twitter' | 'sms' | 'email';
  message: string;
  subject?: string;
}
