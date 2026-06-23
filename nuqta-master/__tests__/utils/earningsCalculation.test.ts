/**
 * Earnings Calculation - Unit Tests
 *
 * Tests for earnings calculation utilities including:
 * - Social media earnings
 * - Referral earnings
 * - Cashback calculations
 * - Loyalty points
 * - Tier multipliers
 */

describe('Earnings Calculation Utilities', () => {
  // Mock earnings data
  const mockEarningsConfig = {
    instagram: {
      baseRate: 10,
      followerMultiplier: 0.001,
      engagementBonus: 5,
    },
    referral: {
      tier1: 50,
      tier2: 100,
      tier3: 200,
    },
    cashback: {
      baseRate: 0.02, // 2%
      premiumRate: 0.05, // 5%
    },
    loyalty: {
      pointsPerRupee: 1,
      bonusThreshold: 1000,
      bonusMultiplier: 1.5,
    },
  };

  describe('calculateSocialMediaEarnings', () => {
    const calculateSocialMediaEarnings = (params: {
      platform: 'instagram' | 'facebook' | 'twitter';
      followers: number;
      engagement: number;
      isVerified: boolean;
    }) => {
      const { platform, followers, engagement, isVerified } = params;

      if (platform !== 'instagram') {
        throw new Error('Only Instagram supported');
      }

      let earnings = mockEarningsConfig.instagram.baseRate;

      // Follower bonus
      earnings += followers * mockEarningsConfig.instagram.followerMultiplier;

      // Engagement bonus (if engagement > 5%)
      if (engagement > 0.05) {
        earnings += mockEarningsConfig.instagram.engagementBonus;
      }

      // Verified account bonus (20% increase)
      if (isVerified) {
        earnings *= 1.2;
      }

      return Math.round(earnings * 100) / 100;
    };

    it('should calculate basic Instagram earnings', () => {
      const earnings = calculateSocialMediaEarnings({
        platform: 'instagram',
        followers: 1000,
        engagement: 0.03,
        isVerified: false,
      });

      // Base (10) + followers (1000 * 0.001 = 1) = 11
      expect(earnings).toBe(11);
    });

    it('should apply engagement bonus for high engagement', () => {
      const earnings = calculateSocialMediaEarnings({
        platform: 'instagram',
        followers: 500,
        engagement: 0.08, // 8% engagement
        isVerified: false,
      });

      // Base (10) + followers (500 * 0.001 = 0.5) + engagement (5) = 15.5
      expect(earnings).toBe(15.5);
    });

    it('should apply verified account bonus', () => {
      const earnings = calculateSocialMediaEarnings({
        platform: 'instagram',
        followers: 1000,
        engagement: 0.02,
        isVerified: true,
      });

      // (Base (10) + followers (1)) * 1.2 = 13.2
      expect(earnings).toBe(13.2);
    });

    it('should handle large follower counts', () => {
      const earnings = calculateSocialMediaEarnings({
        platform: 'instagram',
        followers: 100000,
        engagement: 0.10,
        isVerified: true,
      });

      // (Base (10) + followers (100) + engagement (5)) * 1.2 = 138
      expect(earnings).toBe(138);
    });

    it('should round to 2 decimal places', () => {
      const earnings = calculateSocialMediaEarnings({
        platform: 'instagram',
        followers: 333,
        engagement: 0.02,
        isVerified: false,
      });

      expect(earnings).toBe(10.33);
    });
  });

  describe('calculateReferralEarnings', () => {
    const calculateReferralEarnings = (tier: 1 | 2 | 3, referralsCount: number) => {
      const tierRates = {
        1: mockEarningsConfig.referral.tier1,
        2: mockEarningsConfig.referral.tier2,
        3: mockEarningsConfig.referral.tier3,
      };

      return tierRates[tier] * referralsCount;
    };

    it('should calculate Tier 1 referral earnings', () => {
      const earnings = calculateReferralEarnings(1, 5);

      expect(earnings).toBe(250); // 50 * 5
    });

    it('should calculate Tier 2 referral earnings', () => {
      const earnings = calculateReferralEarnings(2, 3);

      expect(earnings).toBe(300); // 100 * 3
    });

    it('should calculate Tier 3 referral earnings', () => {
      const earnings = calculateReferralEarnings(3, 2);

      expect(earnings).toBe(400); // 200 * 2
    });

    it('should return 0 for no referrals', () => {
      const earnings = calculateReferralEarnings(1, 0);

      expect(earnings).toBe(0);
    });
  });

  describe('calculateCashback', () => {
    const calculateCashback = (
      amount: number,
      isPremiumUser: boolean,
      category?: string
    ) => {
      let rate = isPremiumUser
        ? mockEarningsConfig.cashback.premiumRate
        : mockEarningsConfig.cashback.baseRate;

      // Category bonuses
      if (category === 'electronics') {
        rate *= 1.5;
      } else if (category === 'fashion') {
        rate *= 1.2;
      }

      return Math.round(amount * rate * 100) / 100;
    };

    it('should calculate basic cashback', () => {
      const cashback = calculateCashback(1000, false);

      expect(cashback).toBe(20); // 1000 * 0.02
    });

    it('should calculate premium user cashback', () => {
      const cashback = calculateCashback(1000, true);

      expect(cashback).toBe(50); // 1000 * 0.05
    });

    it('should apply category bonus for electronics', () => {
      const cashback = calculateCashback(1000, false, 'electronics');

      expect(cashback).toBe(30); // 1000 * 0.02 * 1.5
    });

    it('should apply category bonus for fashion', () => {
      const cashback = calculateCashback(1000, true, 'fashion');

      expect(cashback).toBe(60); // 1000 * 0.05 * 1.2
    });

    it('should handle decimal amounts', () => {
      const cashback = calculateCashback(1234.56, false);

      expect(cashback).toBe(24.69); // 1234.56 * 0.02
    });

    it('should return 0 for zero amount', () => {
      const cashback = calculateCashback(0, true);

      expect(cashback).toBe(0);
    });
  });

  describe('calculateLoyaltyPoints', () => {
    const calculateLoyaltyPoints = (amount: number, currentPoints: number = 0) => {
      let points = amount * mockEarningsConfig.loyalty.pointsPerRupee;

      // Bonus for large transactions
      if (amount >= mockEarningsConfig.loyalty.bonusThreshold) {
        points *= mockEarningsConfig.loyalty.bonusMultiplier;
      }

      return Math.floor(points);
    };

    it('should calculate basic loyalty points', () => {
      const points = calculateLoyaltyPoints(500);

      expect(points).toBe(500); // 500 * 1
    });

    it('should apply bonus for large transactions', () => {
      const points = calculateLoyaltyPoints(2000);

      expect(points).toBe(3000); // 2000 * 1.5
    });

    it('should floor points to nearest integer', () => {
      const points = calculateLoyaltyPoints(123.45);

      expect(points).toBe(123);
    });

    it('should handle boundary conditions', () => {
      const pointsJustBelow = calculateLoyaltyPoints(999);
      const pointsAtThreshold = calculateLoyaltyPoints(1000);

      expect(pointsJustBelow).toBe(999);
      expect(pointsAtThreshold).toBe(1500); // With bonus
    });
  });

  describe('calculateTotalEarnings', () => {
    const calculateTotalEarnings = (earnings: {
      social?: number;
      referral?: number;
      cashback?: number;
      loyalty?: number;
      bonus?: number;
    }) => {
      return Object.values(earnings).reduce((sum, val) => sum + (val || 0), 0);
    };

    it('should sum all earning types', () => {
      const total = calculateTotalEarnings({
        social: 100,
        referral: 200,
        cashback: 50,
        loyalty: 150,
      });

      expect(total).toBe(500);
    });

    it('should handle missing earning types', () => {
      const total = calculateTotalEarnings({
        social: 100,
        cashback: 50,
      });

      expect(total).toBe(150);
    });

    it('should handle zero earnings', () => {
      const total = calculateTotalEarnings({
        social: 0,
        referral: 0,
      });

      expect(total).toBe(0);
    });

    it('should handle bonus earnings', () => {
      const total = calculateTotalEarnings({
        social: 100,
        bonus: 25,
      });

      expect(total).toBe(125);
    });
  });

  describe('calculateProjectedEarnings', () => {
    const calculateProjectedEarnings = (
      dailyAverage: number,
      days: number,
      growthRate: number = 0
    ) => {
      let total = 0;

      for (let i = 0; i < days; i++) {
        const dailyEarning = dailyAverage * Math.pow(1 + growthRate, i);
        total += dailyEarning;
      }

      return Math.round(total * 100) / 100;
    };

    it('should calculate projected earnings without growth', () => {
      const projected = calculateProjectedEarnings(100, 30);

      expect(projected).toBe(3000); // 100 * 30
    });

    it('should calculate projected earnings with growth', () => {
      const projected = calculateProjectedEarnings(100, 7, 0.1); // 10% daily growth

      // Day 1: 100, Day 2: 110, Day 3: 121, etc.
      expect(projected).toBeGreaterThan(700);
      expect(projected).toBeLessThan(1000);
    });

    it('should handle negative growth (decline)', () => {
      const projected = calculateProjectedEarnings(100, 5, -0.1); // 10% daily decline

      expect(projected).toBeLessThan(500);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative amounts gracefully', () => {
      const calculateCashback = (amount: number) =>
        Math.max(0, amount * mockEarningsConfig.cashback.baseRate);

      expect(calculateCashback(-100)).toBe(0);
    });

    it('should handle very large numbers', () => {
      const amount = 1000000;
      const cashback = amount * mockEarningsConfig.cashback.baseRate;

      expect(cashback).toBe(20000);
    });

    it('should handle floating point precision', () => {
      const amount = 0.1 + 0.2; // Classic floating point issue
      const cashback = Math.round(amount * 100 * mockEarningsConfig.cashback.baseRate) / 100;

      expect(cashback).toBe(0.01);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk calculations efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 1000; i++) {
        calculateSocialMediaEarnings({
          platform: 'instagram',
          followers: Math.random() * 10000,
          engagement: Math.random(),
          isVerified: Math.random() > 0.5,
        });
      }

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });
  });
});

// Helper function (defined outside describe for reusability)
function calculateSocialMediaEarnings(params: {
  platform: 'instagram' | 'facebook' | 'twitter';
  followers: number;
  engagement: number;
  isVerified: boolean;
}) {
  const mockEarningsConfig = {
    instagram: {
      baseRate: 10,
      followerMultiplier: 0.001,
      engagementBonus: 5,
    },
  };

  const { platform, followers, engagement, isVerified } = params;

  if (platform !== 'instagram') {
    throw new Error('Only Instagram supported');
  }

  let earnings = mockEarningsConfig.instagram.baseRate;
  earnings += followers * mockEarningsConfig.instagram.followerMultiplier;

  if (engagement > 0.05) {
    earnings += mockEarningsConfig.instagram.engagementBonus;
  }

  if (isVerified) {
    earnings *= 1.2;
  }

  return Math.round(earnings * 100) / 100;
}
