// @ts-nocheck
// usePostOrderRewards - Shared hook for post-order rewards eligibility and actions
// Used by order-confirmation.tsx and pay-in-store/success.tsx
//
// Reward eligibility by order type:
// | Type         | Share       | Review              |
// |-------------|-------------|---------------------|
// | Pay-in-store | Immediately | Immediately         |
// | Dine-in      | Immediately | Immediately         |
// | Pickup       | Immediately | After pickup        |
// | Drive-thru   | Immediately | After pickup        |
// | Delivery     | Immediately | After delivery      |
//
// Share is always immediate (marketing action, doesn't require receiving product)
// Review requires experiencing the product/service first

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { useIsAuthenticated, useAuthLoading } from '@/stores/selectors';
import shareApi from '@/services/shareApi';
import reviewService from '@/services/reviewsApi';
import apiClient from '@/services/apiClient';

interface UsePostOrderRewardsParams {
  orderId?: string;
  storeId?: string;
  storeName?: string;
  storeLogo?: string;
  // Earned reward amounts
  cashbackEarned?: number;
  coinsEarned?: number;
  bonusCoins?: number;
  firstVisitBonus?: number;
  // Order total (for calculating 5% share coins)
  orderTotal?: number;
  // Store reward rules (defaults if unknown)
  reviewBonusCoins?: number;
  socialShareBonusCoins?: number;
  // Whether review is allowed (depends on fulfillment type + order status)
  // Pay-in-store & dine-in: always true (user is at the store)
  // Pickup/drive-thru/delivery: true only after status = 'delivered'
  reviewAllowed?: boolean;
}

export interface RewardChecklistItem {
  id: 'cashback' | 'review' | 'share';
  label: string;
  description: string;
  coinAmount: number;
  status: 'completed' | 'available' | 'locked';
  isLoading?: boolean;
}

export interface UsePostOrderRewardsReturn {
  // Totals
  totalEarned: number;
  totalPossible: number;
  progressPercent: number;
  // Checklist items
  checklistItems: RewardChecklistItem[];
  // Actions
  handleReview: () => void;
  handleShare: () => void;
  // States
  hasShared: boolean;
  hasReviewed: boolean;
  shareCoinsEarned: number | null;
}

const DEFAULT_REVIEW_COINS = 5;
const DEFAULT_SHARE_COINS = 10;

export function usePostOrderRewards({
  orderId,
  storeId,
  storeName,
  storeLogo,
  cashbackEarned = 0,
  coinsEarned = 0,
  bonusCoins = 0,
  firstVisitBonus = 0,
  orderTotal = 0,
  reviewBonusCoins,
  socialShareBonusCoins,
  reviewAllowed = true,
}: UsePostOrderRewardsParams): UsePostOrderRewardsReturn {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const [hasShared, setHasShared] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [shareCoinsEarned, setShareCoinsEarned] = useState<number | null>(null);
  const [isCheckingShare, setIsCheckingShare] = useState(false);
  const [isCheckingReview, setIsCheckingReview] = useState(false);

  // Calculate share coins: 5% of order total, or use provided/default
  const shareCoins = useMemo(() => {
    if (socialShareBonusCoins != null) return socialShareBonusCoins;
    if (orderTotal > 0) return Math.round(orderTotal * 0.05);
    return DEFAULT_SHARE_COINS;
  }, [socialShareBonusCoins, orderTotal]);

  const reviewCoins = reviewBonusCoins ?? DEFAULT_REVIEW_COINS;

  // Check share eligibility on mount (share is always allowed, just check if already shared)
  const isMongoId = orderId && /^[a-f\d]{24}$/i.test(orderId);

  useEffect(() => {
    if (!orderId || authLoading || !isAuthenticated) return;

    let cancelled = false;
    setIsCheckingShare(true);

    if (isMongoId) {
      // MongoDB Order ID — use canShareOrder API
      shareApi.canShareOrder(orderId).then((response) => {
        if (cancelled) return;
        if (response.success && response.data) {
          if (!response.data.canShare) {
            setHasShared(true);
          }
        }
      }).finally(() => {
        if (!cancelled) setIsCheckingShare(false);
      });
    } else {
      // StorePayment ID (SP-xxx) — single DB query via dedicated endpoint
      apiClient.get('/social-media/shared-status', { orderId }).then((response) => {
        if (cancelled) return;
        if (response.success && response.data?.hasShared) {
          setHasShared(true);
        }
      }).catch(() => {
        // Silently handle — shared status check is non-critical
      }).finally(() => {
        if (!cancelled) setIsCheckingShare(false);
      });
    }

    return () => { cancelled = true; };
  }, [orderId, isAuthenticated, authLoading]);

  // Check review status on mount
  useEffect(() => {
    if (!storeId || authLoading || !isAuthenticated) return;

    let cancelled = false;
    setIsCheckingReview(true);

    reviewService.canUserReviewStore(storeId).then((response) => {
      if (cancelled) return;
      if (response.success && response.data) {
        if (response.data.hasReviewed) {
          setHasReviewed(true);
        }
      }
    }).catch(() => {
      // On error, default to not reviewed (optimistic)
    }).finally(() => {
      if (!cancelled) setIsCheckingReview(false);
    });

    return () => { cancelled = true; };
  }, [storeId, isAuthenticated, authLoading]);

  // Totals
  const totalEarned = cashbackEarned + coinsEarned + bonusCoins + firstVisitBonus
    + (hasReviewed ? reviewCoins : 0)
    + (hasShared ? (shareCoinsEarned ?? shareCoins) : 0);
  const totalPossible = totalEarned
    + (hasShared ? 0 : shareCoins)
    + (hasReviewed ? 0 : reviewCoins);
  const progressPercent = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 100;

  // Navigate to review page
  const handleReview = useCallback(() => {
    if (hasReviewed) return;
    if (storeId) {
      const params = new URLSearchParams({
        storeId,
        storeName: storeName || '',
        fromStore: 'true',
        reviewBonusCoins: String(reviewCoins),
      });
      if (storeLogo) params.set('storeLogo', storeLogo);
      router.push(`/ReviewPage?${params.toString()}` as any);
    } else {
      router.push('/ReviewPage' as any);
    }
  }, [storeId, storeName, storeLogo, reviewCoins, router, hasReviewed]);

  // Navigate to social media earn page
  const handleShare = useCallback(async () => {
    if (hasShared) return;
    router.push(`/earn-from-social-media?orderId=${orderId || ''}` as any);
  }, [orderId, hasShared, router]);

  // Build checklist items
  const checklistItems: RewardChecklistItem[] = useMemo(() => {
    const items: RewardChecklistItem[] = [];

    // 1. Purchase Rewards - always completed if any earned
    if (totalEarned > 0) {
      items.push({
        id: 'cashback',
        label: 'Purchase Rewards',
        description: 'Cashback & coins from your purchase',
        coinAmount: totalEarned,
        status: 'completed',
      });
    }

    // 2. Write a Review - gated by reviewAllowed (fulfillment-type-aware)
    items.push({
      id: 'review',
      label: 'Write a Review',
      description: hasReviewed
        ? 'Review submitted! Coins pending approval'
        : !reviewAllowed
          ? 'Available after you receive your order'
          : 'Share your experience and earn coins',
      coinAmount: reviewCoins,
      status: hasReviewed ? 'completed' : reviewAllowed ? 'available' : 'locked',
      isLoading: isCheckingReview,
    });

    // 3. Share & Earn - always available (share is a marketing action)
    items.push({
      id: 'share',
      label: 'Share & Earn',
      description: hasShared
        ? 'Shared successfully! Coins pending approval'
        : 'Share your purchase on social media',
      coinAmount: shareCoinsEarned ?? shareCoins,
      status: hasShared ? 'completed' : 'available',
      isLoading: isCheckingShare,
    });

    return items;
  }, [totalEarned, reviewCoins, shareCoins, hasShared, hasReviewed, reviewAllowed, isCheckingShare, isCheckingReview, shareCoinsEarned]);

  return {
    totalEarned,
    totalPossible,
    progressPercent,
    checklistItems,
    handleReview,
    handleShare,
    hasShared,
    hasReviewed,
    shareCoinsEarned,
  };
}

export default usePostOrderRewards;
