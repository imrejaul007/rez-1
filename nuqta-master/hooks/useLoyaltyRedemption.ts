/**
 * Loyalty Redemption Hook
 * Complete hook for managing loyalty redemption state and operations
 */

import { colors } from '@/constants/theme';
import { useState, useEffect, useCallback, useRef } from 'react';
import loyaltyRedemptionApi from '@/services/loyaltyRedemptionApi';
import {
  RewardItem,
  PointBalance,
  RedemptionRecord,
  TierConfig,
  PointTransaction,
  RewardCatalog,
  CatalogFilters,
  PointChallenge,
  DailyCheckIn,
  Streak,
  PointExpiryNotification,
  LoyaltyRedemptionState,
  RedemptionRequest,
} from '@/types/loyaltyRedemption.types';
import { useSocket } from '@/contexts/SocketContext';

const devLog = {
  log: __DEV__ ? console.log.bind(console) : () => {},
  warn: __DEV__ ? console.warn.bind(console) : () => {},
  error: __DEV__ ? console.error.bind(console) : () => {},
};

interface UseLoyaltyRedemptionOptions {
  autoLoad?: boolean;
  enableRealTimeUpdates?: boolean;
}

export function useLoyaltyRedemption(options: UseLoyaltyRedemptionOptions = {}) {
  const { autoLoad = true, enableRealTimeUpdates = true } = options;
  const { socket } = useSocket();

  // State
  const [state, setState] = useState<LoyaltyRedemptionState>({
    balance: null,
    rewards: [],
    redemptions: [],
    tierConfig: null,
    loading: false,
    error: null,
    refreshing: false,
  });

  const [catalog, setCatalog] = useState<RewardCatalog | null>(null);
  const [pointHistory, setPointHistory] = useState<PointTransaction[]>([]);
  const [expiryNotification, setExpiryNotification] = useState<PointExpiryNotification | null>(null);
  const [challenges, setChallenges] = useState<PointChallenge[]>([]);
  const [checkInStatus, setCheckInStatus] = useState<{ checkIns: DailyCheckIn[]; streak: Streak } | null>(null);

  const loadingRef = useRef(false);

  // Socket callback refs for proper cleanup
  const socketCallbacksRef = useRef<{
    onPointsUpdated: ((data: { points: number; transaction: PointTransaction }) => void) | null;
    onTierUpdated: ((data: { tier: string; benefits: any[] }) => void) | null;
    onRewardAvailable: ((reward: RewardItem) => void) | null;
    onChallengeCompleted: ((challenge: PointChallenge) => void) | null;
  }>({
    onPointsUpdated: null,
    onTierUpdated: null,
    onRewardAvailable: null,
    onChallengeCompleted: null,
  });

  // Limits to prevent unbounded array growth
  const MAX_POINT_HISTORY = 100;
  const MAX_REWARDS = 50;

  // ==================== Data Loading ====================

  /**
   * Load all loyalty data
   */
  const loadLoyaltyData = useCallback(async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [balanceRes, catalogRes, tierRes, redemptionsRes] = await Promise.all([
        loyaltyRedemptionApi.getPointBalance(),
        loyaltyRedemptionApi.getRewardsCatalog(),
        loyaltyRedemptionApi.getTierInfo(),
        loyaltyRedemptionApi.getRedemptionHistory({ limit: 20 }),
      ]);

      const newState: Partial<LoyaltyRedemptionState> = {};

      if (balanceRes.success && balanceRes.data) {
        newState.balance = balanceRes.data;
      }

      if (catalogRes.success && catalogRes.data) {
        setCatalog(catalogRes.data);
        newState.rewards = catalogRes.data.rewards;
      }

      if (tierRes.success && tierRes.data) {
        newState.tierConfig = tierRes.data;
      }

      if (redemptionsRes.success && redemptionsRes.data) {
        newState.redemptions = redemptionsRes.data.redemptions;
      }

      setState(prev => ({ ...prev, ...newState, loading: false }));
    } catch (error) {
      devLog.error('Error loading loyalty data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load loyalty data',
      }));
    } finally {
      loadingRef.current = false;
    }
  }, []);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await loadLoyaltyData();
    setState(prev => ({ ...prev, refreshing: false }));
  }, [loadLoyaltyData]);

  /**
   * Load point history
   */
  const loadPointHistory = useCallback(async () => {
    try {
      const response = await loyaltyRedemptionApi.getPointHistory({ limit: 50 });
      if (response.success && response.data) {
        setPointHistory(response.data.transactions);
      }
    } catch (error) {
      devLog.error('Error loading point history:', error);
    }
  }, []);

  /**
   * Load expiring points notification
   */
  const loadExpiringPoints = useCallback(async () => {
    try {
      const response = await loyaltyRedemptionApi.getExpiringPoints();
      if (response.success && response.data) {
        setExpiryNotification(response.data);
      }
    } catch (error) {
      devLog.error('Error loading expiring points:', error);
    }
  }, []);

  /**
   * Load challenges
   */
  const loadChallenges = useCallback(async () => {
    try {
      const response = await loyaltyRedemptionApi.getChallenges();
      if (response.success && response.data) {
        setChallenges(response.data.challenges);
      }
    } catch (error) {
      devLog.error('Error loading challenges:', error);
    }
  }, []);

  /**
   * Load check-in status
   */
  const loadCheckInStatus = useCallback(async () => {
    try {
      const response = await loyaltyRedemptionApi.getCheckInStatus();
      if (response.success && response.data) {
        setCheckInStatus({
          checkIns: response.data.checkIns,
          streak: response.data.streak,
        });
      }
    } catch (error) {
      devLog.error('Error loading check-in status:', error);
    }
  }, []);

  // ==================== Redemption Operations ====================

  /**
   * Redeem a reward
   */
  const redeemReward = useCallback(async (request: RedemptionRequest) => {
    try {
      const response = await loyaltyRedemptionApi.redeemReward(request);

      if (response.success && response.data) {
        // Update balance
        setState(prev => ({
          ...prev,
          balance: prev.balance ? {
            ...prev.balance,
            currentPoints: response.data!.newBalance,
          } : null,
        }));

        // Refresh redemption history
        const historyRes = await loyaltyRedemptionApi.getRedemptionHistory({ limit: 20 });
        if (historyRes.success && historyRes.data) {
          setState(prev => ({ ...prev, redemptions: historyRes.data!.redemptions }));
        }

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to redeem reward');
      }
    } catch (error) {
      devLog.error('Error redeeming reward:', error);
      throw error;
    }
  }, []);

  /**
   * Reserve a reward
   */
  const reserveReward = useCallback(async (request: RedemptionRequest) => {
    try {
      const response = await loyaltyRedemptionApi.reserveReward(request);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to reserve reward');
      }
    } catch (error) {
      devLog.error('Error reserving reward:', error);
      throw error;
    }
  }, []);

  /**
   * Cancel reservation
   */
  const cancelReservation = useCallback(async (reservationId: string) => {
    try {
      const response = await loyaltyRedemptionApi.cancelReservation(reservationId);

      if (response.success) {
        await refresh();
        return true;
      } else {
        throw new Error(response.error || 'Failed to cancel reservation');
      }
    } catch (error) {
      devLog.error('Error cancelling reservation:', error);
      throw error;
    }
  }, [refresh]);

  // ==================== Catalog Operations ====================

  /**
   * Filter rewards catalog
   */
  const filterRewards = useCallback(async (filters: CatalogFilters) => {
    try {
      const response = await loyaltyRedemptionApi.getRewardsCatalog(filters);

      if (response.success && response.data) {
        setCatalog(response.data);
        setState(prev => ({ ...prev, rewards: response.data!.rewards }));
      }
    } catch (error) {
      devLog.error('Error filtering rewards:', error);
    }
  }, []);

  /**
   * Search rewards
   */
  const searchRewards = useCallback(async (query: string) => {
    try {
      const response = await loyaltyRedemptionApi.searchRewards(query);

      if (response.success && response.data) {
        setState(prev => ({ ...prev, rewards: response.data!.rewards }));
      }
    } catch (error) {
      devLog.error('Error searching rewards:', error);
    }
  }, []);

  // ==================== Gamification ====================

  /**
   * Perform daily check-in
   */
  const dailyCheckIn = useCallback(async () => {
    try {
      const response = await loyaltyRedemptionApi.dailyCheckIn();

      if (response.success && response.data) {
        // Update balance with new points
        setState(prev => ({
          ...prev,
          balance: prev.balance ? {
            ...prev.balance,
            currentPoints: prev.balance.currentPoints + response.data!.points,
          } : null,
        }));

        // Update check-in status
        await loadCheckInStatus();

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to check in');
      }
    } catch (error) {
      devLog.error('Error during check-in:', error);
      throw error;
    }
  }, [loadCheckInStatus]);

  /**
   * Spin the wheel
   */
  const spinWheel = useCallback(async () => {
    try {
      const response = await loyaltyRedemptionApi.spinWheel();

      if (response.success && response.data) {
        // Update balance
        setState(prev => ({
          ...prev,
          balance: prev.balance ? {
            ...prev.balance,
            currentPoints: response.data!.newBalance,
          } : null,
        }));

        return response.data.reward;
      } else {
        throw new Error(response.error || 'Failed to spin wheel');
      }
    } catch (error) {
      devLog.error('Error spinning wheel:', error);
      throw error;
    }
  }, []);

  /**
   * Reveal scratch card
   */
  const revealScratchCard = useCallback(async (cardId: string) => {
    try {
      const response = await loyaltyRedemptionApi.revealScratchCard(cardId);

      if (response.success && response.data) {
        // Update balance
        setState(prev => ({
          ...prev,
          balance: prev.balance ? {
            ...prev.balance,
            currentPoints: response.data!.newBalance,
          } : null,
        }));

        return response.data.reward;
      } else {
        throw new Error(response.error || 'Failed to reveal scratch card');
      }
    } catch (error) {
      devLog.error('Error revealing scratch card:', error);
      throw error;
    }
  }, []);

  /**
   * Claim challenge
   */
  const claimChallenge = useCallback(async (challengeId: string) => {
    try {
      const response = await loyaltyRedemptionApi.claimChallenge(challengeId);

      if (response.success && response.data) {
        // Update balance
        setState(prev => ({
          ...prev,
          balance: prev.balance ? {
            ...prev.balance,
            currentPoints: prev.balance.currentPoints + response.data!.points,
          } : null,
        }));

        // Refresh challenges
        await loadChallenges();

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to claim challenge');
      }
    } catch (error) {
      devLog.error('Error claiming challenge:', error);
      throw error;
    }
  }, [loadChallenges]);

  // ==================== Helper Functions ====================

  /**
   * Check if user can redeem reward
   */
  const canRedeemReward = useCallback((reward: RewardItem): { canRedeem: boolean; reason?: string } => {
    if (!state.balance) {
      return { canRedeem: false, reason: 'Loading balance...' };
    }

    if (!reward.available) {
      return { canRedeem: false, reason: 'Reward unavailable' };
    }

    if (state.balance.currentPoints < reward.points) {
      return {
        canRedeem: false,
        reason: `Need ${reward.points - state.balance.currentPoints} more points`,
      };
    }

    if (reward.minTier && state.balance.tier) {
      const tierLevels = { Bronze: 1, Silver: 2, Gold: 3, Platinum: 4, Diamond: 5 };
      const userTierLevel = tierLevels[state.balance.tier] || 0;
      const requiredTierLevel = tierLevels[reward.minTier] || 0;

      if (userTierLevel < requiredTierLevel) {
        return { canRedeem: false, reason: `Requires ${reward.minTier} tier` };
      }
    }

    if (reward.stockRemaining !== undefined && reward.stockRemaining <= 0) {
      return { canRedeem: false, reason: 'Out of stock' };
    }

    return { canRedeem: true };
  }, [state.balance]);

  /**
   * Get tier color
   */
  const getTierColor = useCallback((tier: string): string => {
    switch (tier) {
      case 'Bronze':
        return '#CD7F32';
      case 'Silver':
        return '#C0C0C0';
      case 'Gold':
        return colors.brand.goldBright;
      case 'Platinum':
        return '#E5E4E2';
      case 'Diamond':
        return '#B9F2FF';
      default:
        return colors.neutral[500];
    }
  }, []);

  /**
   * Calculate progress to next tier
   */
  const getTierProgress = useCallback((): number => {
    if (!state.balance) return 0;
    if (!state.balance.pointsToNextTier) return 100;

    const tierRanges = {
      Bronze: [0, 999],
      Silver: [1000, 4999],
      Gold: [5000, 9999],
      Platinum: [10000, 49999],
      Diamond: [50000, Infinity],
    };

    const currentRange = tierRanges[state.balance.tier] || [0, 999];
    const rangeSize = currentRange[1] - currentRange[0];
    const progress = state.balance.currentPoints - currentRange[0];

    return Math.min((progress / rangeSize) * 100, 100);
  }, [state.balance]);

  // ==================== Real-time Updates ====================

  useEffect(() => {
    if (!enableRealTimeUpdates || !socket) return;

    // Define callbacks and store in ref for proper cleanup
    socketCallbacksRef.current.onPointsUpdated = (data: { points: number; transaction: PointTransaction }) => {
      setState(prev => ({
        ...prev,
        balance: prev.balance ? {
          ...prev.balance,
          currentPoints: data.points,
        } : null,
      }));

      // Add to history with size limit
      setPointHistory(prev => {
        const updated = [data.transaction, ...prev];
        return updated.length > MAX_POINT_HISTORY ? updated.slice(0, MAX_POINT_HISTORY) : updated;
      });
    };

    socketCallbacksRef.current.onTierUpdated = (data: { tier: string; benefits: any[] }) => {
      setState(prev => ({
        ...prev,
        balance: prev.balance ? {
          ...prev.balance,
          tier: data.tier as any,
        } : null,
      }));
    };

    socketCallbacksRef.current.onRewardAvailable = (reward: RewardItem) => {
      setState(prev => {
        const updatedRewards = [reward, ...prev.rewards];
        return {
          ...prev,
          rewards: updatedRewards.length > MAX_REWARDS ? updatedRewards.slice(0, MAX_REWARDS) : updatedRewards,
        };
      });
    };

    socketCallbacksRef.current.onChallengeCompleted = (challenge: PointChallenge) => {
      setChallenges(prev =>
        prev.map(c => (c._id === challenge._id ? challenge : c))
      );
    };

    // Subscribe with stored callbacks
    socket.on('loyalty:pointsUpdated', socketCallbacksRef.current.onPointsUpdated);
    socket.on('loyalty:tierUpdated', socketCallbacksRef.current.onTierUpdated);
    socket.on('loyalty:rewardAvailable', socketCallbacksRef.current.onRewardAvailable);
    socket.on('loyalty:challengeCompleted', socketCallbacksRef.current.onChallengeCompleted);

    return () => {
      // Cleanup with exact callback references
      if (socketCallbacksRef.current.onPointsUpdated) {
        socket.off('loyalty:pointsUpdated', socketCallbacksRef.current.onPointsUpdated);
      }
      if (socketCallbacksRef.current.onTierUpdated) {
        socket.off('loyalty:tierUpdated', socketCallbacksRef.current.onTierUpdated);
      }
      if (socketCallbacksRef.current.onRewardAvailable) {
        socket.off('loyalty:rewardAvailable', socketCallbacksRef.current.onRewardAvailable);
      }
      if (socketCallbacksRef.current.onChallengeCompleted) {
        socket.off('loyalty:challengeCompleted', socketCallbacksRef.current.onChallengeCompleted);
      }
    };
  }, [socket, enableRealTimeUpdates]);

  // ==================== Initial Load ====================

  useEffect(() => {
    if (autoLoad) {
      loadLoyaltyData();
      loadExpiringPoints();
      loadChallenges();
      loadCheckInStatus();
    }
  }, [autoLoad]);

  return {
    // State
    ...state,
    catalog,
    pointHistory,
    expiryNotification,
    challenges,
    checkInStatus,

    // Data operations
    refresh,
    loadPointHistory,
    loadExpiringPoints,
    loadChallenges,
    loadCheckInStatus,

    // Redemption operations
    redeemReward,
    reserveReward,
    cancelReservation,

    // Catalog operations
    filterRewards,
    searchRewards,

    // Gamification
    dailyCheckIn,
    spinWheel,
    revealScratchCard,
    claimChallenge,

    // Helpers
    canRedeemReward,
    getTierColor,
    getTierProgress,
  };
}

export default useLoyaltyRedemption;
