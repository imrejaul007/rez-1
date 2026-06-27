// @ts-nocheck
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import subscriptionApi from '@/services/subscriptionApi';
import type { CurrentSubscription, SubscriptionTier } from '@/services/subscriptionApi';
import { useToastStore } from './toastStore';

// Feature flags for gradual rollout
const FEATURE_FLAGS = {
  ENABLE_SUBSCRIPTIONS: true,
  ENABLE_TIER_BENEFITS: true,
  ENABLE_CASHBACK_MULTIPLIER: true,
  ENABLE_FREE_DELIVERY: true,
};

interface SubscriptionState {
  currentSubscription: CurrentSubscription | null;
  availableTiers: SubscriptionTier[];
  isLoading: boolean;
  isSubscribing: boolean;
  error: string | null;
  lastFetched: string | null;
  featureFlags: typeof FEATURE_FLAGS;
}

interface SubscriptionStoreState {
  state: SubscriptionState;
  actions: {
    loadSubscription: (forceRefresh?: boolean) => Promise<void>;
    refreshSubscription: () => Promise<void>;
    clearError: () => void;
    subscribe: (tier: 'premium' | 'vip', billingCycle: 'monthly' | 'yearly', paymentMethod?: string, promoCode?: string, source?: string) => Promise<{ subscription: CurrentSubscription; paymentUrl: string }>;
    upgrade: (newTier: 'premium' | 'vip', billingCycle?: string, paymentGateway?: string) => Promise<{ upgradeId: string; fromTier: string; toTier: string; proratedAmount: number; newTierPrice: number; creditFromCurrentPlan: number; billingCycle: string; expiresAt: string }>;
    confirmUpgrade: (upgradeId: string, paymentId?: string, paymentIntentId?: string) => Promise<{ subscription: CurrentSubscription; upgrade: { fromTier: string; toTier: string; proratedAmount: number } }>;
    cancelSubscription: (options?: { reason?: string; feedback?: string; cancelImmediately?: boolean }) => Promise<{ subscription: CurrentSubscription; accessUntil: string; reactivationEligibleUntil: string }>;
    renewSubscription: () => Promise<CurrentSubscription>;
    toggleAutoRenew: (autoRenew: boolean) => Promise<CurrentSubscription>;
  };
  computed: {
    isSubscribed: boolean;
    isPremium: boolean;
    isVIP: boolean;
    cashbackMultiplier: number;
    hasFreeDelivery: boolean;
    daysRemaining: number;
    canApplyBenefit: (benefit: string) => boolean;
  };
}

const CACHE_DURATION = 5 * 60 * 1000;

const initialState: SubscriptionState = {
  currentSubscription: null,
  availableTiers: [],
  isLoading: false,
  isSubscribing: false,
  error: null,
  lastFetched: null,
  featureFlags: FEATURE_FLAGS,
};

const freeTierDefault = (userId: string): CurrentSubscription => ({
  _id: 'free-default',
  user: userId,
  tier: 'free',
  status: 'active',
  billingCycle: 'monthly',
  price: 0,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  autoRenew: false,
  benefits: {
    cashbackMultiplier: 1,
    freeDelivery: false,
    prioritySupport: false,
    exclusiveDeals: false,
  },
  usage: {
    totalSavings: 0,
    ordersThisMonth: 0,
    ordersAllTime: 0,
    cashbackEarned: 0,
    deliveryFeesSaved: 0,
    exclusiveDealsUsed: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const useSubscriptionStore = create<SubscriptionStoreState>((set, get) => ({
  state: initialState,

  actions: {
    loadSubscription: async (forceRefresh = false) => {
      const { state } = get();
      if (!state.featureFlags.ENABLE_SUBSCRIPTIONS) return;

      try {
        set(s => ({
          state: { ...s.state, isLoading: true, error: null },
        }));

        // Check cache first (unless force refresh)
        if (!forceRefresh) {
          try {
            const cached = await AsyncStorage.multiGet([
              'subscription_cache_time',
              'subscription_data',
            ]);
            const cacheTime = cached[0][1];
            const cachedData = cached[1][1];

            if (cacheTime && cachedData) {
              const timeDiff = Date.now() - parseInt(cacheTime, 10);
              if (timeDiff < CACHE_DURATION) {
                const { subscription, tiers } = JSON.parse(cachedData);
                set({
                  state: {
                    ...get().state,
                    currentSubscription: subscription,
                    availableTiers: tiers,
                    isLoading: false,
                    error: null,
                    lastFetched: new Date().toISOString(),
                  },
                });
                return;
              }
            }
          } catch {
            // Cache read failed, continue to fresh fetch
          }
        }

        const results = await Promise.allSettled([
          subscriptionApi.getCurrentSubscription(),
          subscriptionApi.getAvailableTiers(),
        ]);

        const subscription = results[0].status === 'fulfilled' ? results[0].value : null;
        const tiers = results[1].status === 'fulfilled' ? results[1].value : [];

        if (!subscription) {
          set({
            state: {
              ...get().state,
              currentSubscription: freeTierDefault(''),
              availableTiers: tiers,
              isLoading: false,
              error: null,
              lastFetched: new Date().toISOString(),
            },
          });
          return;
        }

        // Cache the data
        await AsyncStorage.multiSet([
          ['subscription_data', JSON.stringify({ subscription, tiers })],
          ['subscription_cache_time', Date.now().toString()],
        ]);

        set({
          state: {
            ...get().state,
            currentSubscription: subscription,
            availableTiers: tiers,
            isLoading: false,
            error: null,
            lastFetched: new Date().toISOString(),
          },
        });
      } catch (error) {
        set({
          state: {
            ...get().state,
            currentSubscription: freeTierDefault(''),
            availableTiers: [],
            isLoading: false,
            error: error instanceof Error ? error.message : 'Failed to load subscription',
            lastFetched: new Date().toISOString(),
          },
        });
      }
    },

    refreshSubscription: async () => {
      await get().actions.loadSubscription(true);
    },

    clearError: () => {
      set(s => ({ state: { ...s.state, error: null } }));
    },

    subscribe: async (tier, billingCycle, paymentMethod, promoCode, source) => {
      const prev = get().state;
      // Optimistic update: set subscribing flag
      set(s => ({
        state: {
          ...s.state,
          isSubscribing: true,
          error: null,
        },
      }));
      try {
        const result = await subscriptionApi.subscribeToPlan(tier, billingCycle, paymentMethod, promoCode, source);
        // Update subscription with new data
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: result.subscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showSuccess('Successfully subscribed!');
        return result;
      } catch (error) {
        // Rollback to previous state
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: prev.currentSubscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showError('Failed to subscribe. Please try again.');
        throw error;
      }
    },

    upgrade: async (newTier, billingCycle, paymentGateway) => {
      const prev = get().state;
      // Optimistic update: mark as subscribing
      set(s => ({
        state: {
          ...s.state,
          isSubscribing: true,
          error: null,
        },
      }));
      try {
        const result = await subscriptionApi.initiateUpgrade(newTier, billingCycle, paymentGateway);
        set(s => ({
          state: {
            ...s.state,
            isSubscribing: false,
          },
        }));
        return result;
      } catch (error) {
        // Rollback
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: prev.currentSubscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showError('Failed to initiate upgrade. Please try again.');
        throw error;
      }
    },

    confirmUpgrade: async (upgradeId, paymentId, paymentIntentId) => {
      const prev = get().state;
      // Optimistic update
      set(s => ({
        state: {
          ...s.state,
          isSubscribing: true,
          error: null,
        },
      }));
      try {
        const result = await subscriptionApi.confirmUpgrade(upgradeId, paymentId, paymentIntentId);
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: result.subscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showSuccess('Upgrade successful!');
        return result;
      } catch (error) {
        // Rollback
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: prev.currentSubscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showError('Failed to confirm upgrade. Please contact support.');
        throw error;
      }
    },

    cancelSubscription: async (options) => {
      const prev = get().state;
      // Optimistic update: mark as cancelling
      set(s => ({
        state: {
          ...s.state,
          isSubscribing: true,
          error: null,
        },
      }));
      try {
        const result = await subscriptionApi.cancelSubscription(options || {});
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: result.subscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showSuccess('Subscription cancelled successfully.');
        return result;
      } catch (error) {
        // Rollback
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: prev.currentSubscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showError('Failed to cancel subscription. Please try again.');
        throw error;
      }
    },

    renewSubscription: async () => {
      const prev = get().state;
      set(s => ({
        state: {
          ...s.state,
          isSubscribing: true,
          error: null,
        },
      }));
      try {
        const result = await subscriptionApi.renewSubscription();
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: result,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showSuccess('Subscription renewed!');
        return result;
      } catch (error) {
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: prev.currentSubscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showError('Failed to renew subscription. Please try again.');
        throw error;
      }
    },

    toggleAutoRenew: async (autoRenew) => {
      const prev = get().state;
      set(s => ({
        state: {
          ...s.state,
          isSubscribing: true,
          error: null,
        },
      }));
      try {
        const result = await subscriptionApi.toggleAutoRenew(autoRenew);
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: result,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showSuccess(autoRenew ? 'Auto-renewal enabled.' : 'Auto-renewal disabled.');
        return result;
      } catch (error) {
        set(s => ({
          state: {
            ...s.state,
            currentSubscription: prev.currentSubscription,
            isSubscribing: false,
          },
        }));
        useToastStore.getState().showError('Failed to update auto-renewal. Please try again.');
        throw error;
      }
    },
  },

  computed: {
    get isSubscribed() {
      const s = get().state;
      const activeStatuses = ['active', 'trial', 'grace_period'];
      return s.currentSubscription?.tier !== 'free' && activeStatuses.includes(s.currentSubscription?.status || '');
    },
    get isPremium() {
      const s = get().state;
      const activeStatuses = ['active', 'trial', 'grace_period'];
      return s.currentSubscription?.tier === 'premium' && activeStatuses.includes(s.currentSubscription?.status || '');
    },
    get isVIP() {
      const s = get().state;
      const activeStatuses = ['active', 'trial', 'grace_period'];
      return s.currentSubscription?.tier === 'vip' && activeStatuses.includes(s.currentSubscription?.status || '');
    },
    get cashbackMultiplier() {
      const s = get().state;
      return s.featureFlags.ENABLE_CASHBACK_MULTIPLIER
        ? s.currentSubscription?.benefits?.cashbackMultiplier || 1
        : 1;
    },
    get hasFreeDelivery() {
      const s = get().state;
      return s.featureFlags.ENABLE_FREE_DELIVERY
        ? s.currentSubscription?.benefits?.freeDelivery || false
        : false;
    },
    get daysRemaining() {
      return get().state.currentSubscription?.daysRemaining || 0;
    },
    canApplyBenefit: (benefit: string): boolean => {
      const s = get().state;
      if (!s.featureFlags.ENABLE_TIER_BENEFITS) return false;
      if (!s.currentSubscription) return false;
      return s.currentSubscription.benefits?.[benefit] === true;
    },
  },
}));
