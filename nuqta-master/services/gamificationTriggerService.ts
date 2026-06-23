/**
 * Gamification Trigger Service
 * Centralized service for triggering gamification events across the app
 * This service should be called from API services, NOT from UI components
 */

import achievementApi from './achievementApi';
import pointsApi from './pointsApi';
import { Achievement } from './achievementApi';
import { showPointsNotification } from '@/components/gamification/PointsNotificationManager';

export type GamificationEventType =
  | 'ORDER_PLACED'
  | 'ORDER_COMPLETED'
  | 'REVIEW_SUBMITTED'
  | 'VIDEO_UPLOADED'
  | 'REFERRAL_SUCCESS'
  | 'BILL_UPLOADED'
  | 'DAILY_LOGIN'
  | 'FIRST_PURCHASE'
  | 'MILESTONE_REACHED'
  | 'CHALLENGE_COMPLETED';

export interface GamificationEvent {
  type: GamificationEventType;
  data?: any;
  userId?: string;
  timestamp: string;
}

export interface GamificationReward {
  coins: number;
  achievements: Achievement[];
  challenges: any[];
  tierProgress?: {
    current: number;
    next: number;
    progress: number;
  };
}

class GamificationTriggerService {
  /**
   * Trigger gamification checks for an event
   * Returns any rewards earned (coins, achievements, challenges)
   */
  async triggerEvent(
    eventType: GamificationEventType,
    data?: any
  ): Promise<GamificationReward> {

    const reward: GamificationReward = {
      coins: 0,
      achievements: [],
      challenges: [],
    };

    try {
      // Calculate coin rewards based on event type
      const coinAmount = this.calculateCoinReward(eventType, data);

      if (coinAmount > 0) {
        // Award coins via API
        const earnResponse = await pointsApi.earnPoints({
          amount: coinAmount,
          source: this.mapEventTypeToSource(eventType),
          description: this.getRewardDescription(eventType, data),
          metadata: data,
        });

        if (earnResponse.success && earnResponse.data) {
          reward.coins = coinAmount;

          // Show notification
          showPointsNotification({
            amount: coinAmount,
            type: 'earned',
            reason: this.getRewardDescription(eventType, data),
            icon: 'add-circle',
          });
        }
      }

      // Check for achievement unlocks
      const achievementsResponse = await achievementApi.recalculateAchievements();
      if (achievementsResponse.data) {
        reward.achievements = achievementsResponse.data.filter((a) => a.unlocked);
      }

      // TODO: Check for challenge completion
      // TODO: Check for tier progress

      return reward;
    } catch (error) {
      return reward;
    }
  }

  /**
   * Calculate coin rewards for different events
   */
  private calculateCoinReward(eventType: GamificationEventType, data?: any): number {
    switch (eventType) {
      case 'ORDER_PLACED':
        // 1% of order value as coins
        return Math.floor((data?.orderValue || 0) * 0.01);

      case 'ORDER_COMPLETED':
        // Bonus 50 coins for completed order
        return 50;

      case 'REVIEW_SUBMITTED':
        // 50 coins per review
        return 50;

      case 'VIDEO_UPLOADED':
        // 100 coins for video upload
        return 100;

      case 'REFERRAL_SUCCESS':
        // Tier-based referral rewards
        const tier = data?.tier || 'free';
        if (tier === 'vip') return 500;
        if (tier === 'premium') return 200;
        return 100;

      case 'BILL_UPLOADED':
        // 100 coins for verified bill upload
        return 100;

      case 'DAILY_LOGIN':
        // Streak-based login reward
        const streak = data?.streak || 1;
        return 10 + Math.min(streak * 5, 50); // Cap at 60 coins

      case 'FIRST_PURCHASE':
        // One-time 200 coin bonus
        return 200;

      case 'CHALLENGE_COMPLETED':
        // Challenge-specific reward
        return data?.reward || 0;

      default:
        return 0;
    }
  }

  /**
   * Trigger order-related gamification
   * Called after successful order placement
   */
  async onOrderPlaced(orderId: string, orderValue: number, items: any[]): Promise<GamificationReward> {
    return this.triggerEvent('ORDER_PLACED', {
      orderId,
      orderValue,
      itemCount: items.length,
    });
  }

  /**
   * Trigger review submission gamification
   * Called after successful review submission
   */
  async onReviewSubmitted(reviewId: string, rating: number, productId: string): Promise<GamificationReward> {
    return this.triggerEvent('REVIEW_SUBMITTED', {
      reviewId,
      rating,
      productId,
    });
  }

  /**
   * Trigger referral success gamification
   * Called when referee makes first purchase
   */
  async onReferralSuccess(
    referrerId: string,
    refereeId: string,
    tier: 'free' | 'premium' | 'vip'
  ): Promise<GamificationReward> {
    return this.triggerEvent('REFERRAL_SUCCESS', {
      referrerId,
      refereeId,
      tier,
    });
  }

  /**
   * Trigger bill upload gamification
   * Called after successful bill verification
   */
  async onBillUploaded(billId: string, amount: number, verified: boolean): Promise<GamificationReward> {
    if (!verified) {

      return { coins: 0, achievements: [], challenges: [] };
    }

    return this.triggerEvent('BILL_UPLOADED', {
      billId,
      amount,
      verified,
    });
  }

  /**
   * Trigger daily login gamification
   * Called on app launch
   */
  async onDailyLogin(streak: number, lastLoginDate: string): Promise<GamificationReward> {
    return this.triggerEvent('DAILY_LOGIN', {
      streak,
      lastLoginDate,
    });
  }

  /**
   * Batch trigger multiple events
   * Useful for complex operations that trigger multiple gamification events
   */
  async triggerMultiple(events: GamificationEvent[]): Promise<GamificationReward> {

    const rewards: GamificationReward = {
      coins: 0,
      achievements: [],
      challenges: [],
    };

    for (const event of events) {
      const eventReward = await this.triggerEvent(event.type, event.data);
      rewards.coins += eventReward.coins;
      rewards.achievements.push(...eventReward.achievements);
      rewards.challenges.push(...eventReward.challenges);
    }

    return rewards;
  }

  /**
   * Map event type to points source
   */
  private mapEventTypeToSource(eventType: GamificationEventType): any {
    const mapping: Record<GamificationEventType, string> = {
      ORDER_PLACED: 'purchase',
      ORDER_COMPLETED: 'purchase',
      REVIEW_SUBMITTED: 'review',
      VIDEO_UPLOADED: 'video_upload',
      REFERRAL_SUCCESS: 'referral',
      BILL_UPLOADED: 'bill_upload',
      DAILY_LOGIN: 'daily_login',
      FIRST_PURCHASE: 'purchase',
      MILESTONE_REACHED: 'achievement',
      CHALLENGE_COMPLETED: 'challenge',
    };
    return mapping[eventType] || 'bonus';
  }

  /**
   * Get human-readable reward description
   */
  private getRewardDescription(eventType: GamificationEventType, data?: any): string {
    switch (eventType) {
      case 'ORDER_PLACED':
        return `Order placed - ${data?.orderValue ? `₹${data.orderValue}` : ''}`;
      case 'ORDER_COMPLETED':
        return 'Order completed successfully!';
      case 'REVIEW_SUBMITTED':
        return 'Thank you for your review!';
      case 'VIDEO_UPLOADED':
        return 'Video uploaded successfully!';
      case 'REFERRAL_SUCCESS':
        return 'Friend joined via your referral!';
      case 'BILL_UPLOADED':
        return 'Bill uploaded and verified!';
      case 'DAILY_LOGIN':
        return `Daily login bonus (${data?.streak || 1} day streak)`;
      case 'FIRST_PURCHASE':
        return 'Welcome bonus for first purchase!';
      case 'CHALLENGE_COMPLETED':
        return 'Challenge completed!';
      default:
        return 'Bonus points earned!';
    }
  }

  /**
   * Show reward notification
   * Helper method to display rewards to user
   */
  showRewardNotification(reward: GamificationReward): void {
    if (reward.coins > 0) {

      showPointsNotification({
        amount: reward.coins,
        type: 'earned',
        reason: 'Rewards earned!',
      });
    }

    if (reward.achievements.length > 0) {

      // Achievement toasts are handled by GamificationContext
    }

    if (reward.challenges.length > 0) {

      // TODO: Trigger challenge completion notification
    }
  }
}

// Singleton pattern using globalThis to persist across SSR module re-evaluations
const GAMIFICATION_TRIGGER_SERVICE_KEY = '__rezGamificationTriggerService__';

function getGamificationTriggerService(): GamificationTriggerService {
  if (typeof globalThis !== 'undefined') {
    if (!(globalThis as any)[GAMIFICATION_TRIGGER_SERVICE_KEY]) {
      (globalThis as any)[GAMIFICATION_TRIGGER_SERVICE_KEY] = new GamificationTriggerService();
    }
    return (globalThis as any)[GAMIFICATION_TRIGGER_SERVICE_KEY];
  }
  return new GamificationTriggerService();
}

export default getGamificationTriggerService();
