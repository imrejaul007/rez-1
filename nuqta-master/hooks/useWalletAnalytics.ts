// Wallet Analytics Hook
// Tracks wallet-related user interactions and system performance

import { useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletAnalytics {
  // User interactions
  walletViewed: number;
  topupsInitiated: number;
  topupsCompleted: number;
  topupsFailed: number;
  transactionsViewed: number;
  withdrawalsInitiated: number;
  withdrawalsCompleted: number;
  withdrawalsFailed: number;
  
  // System performance
  apiResponseTime: number[];
  errorCount: number;
  lastError: string | null;
  
  // User preferences
  preferredTopupAmounts: Record<string, number>;
  preferredWithdrawalMethods: Record<string, number>;
  mostUsedFeatures: Record<string, number>;
  
  // Timestamps
  firstUse: string;
  lastUse: string;
  sessionCount: number;
}

interface AnalyticsEvent {
  type: 'wallet_viewed' | 'topup_initiated' | 'topup_completed' | 'topup_failed' | 'transaction_viewed' | 'withdrawal_initiated' | 'withdrawal_completed' | 'withdrawal_failed' | 'api_call' | 'error';
  data?: any;
  timestamp: string;
}

const STORAGE_KEY = 'wallet_analytics';
const MAX_RESPONSE_TIMES = 100; // Keep last 100 response times

export function useWalletAnalytics() {
  const analyticsRef = useRef<WalletAnalytics | null>(null);
  const isInitialized = useRef(false);

  // Initialize analytics
  const initializeAnalytics = async () => {
    if (isInitialized.current) return;
    
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        analyticsRef.current = JSON.parse(stored);
      } else {
        analyticsRef.current = {
          walletViewed: 0,
          topupsInitiated: 0,
          topupsCompleted: 0,
          topupsFailed: 0,
          transactionsViewed: 0,
          withdrawalsInitiated: 0,
          withdrawalsCompleted: 0,
          withdrawalsFailed: 0,
          apiResponseTime: [],
          errorCount: 0,
          lastError: null,
          preferredTopupAmounts: {},
          preferredWithdrawalMethods: {},
          mostUsedFeatures: {},
          firstUse: new Date().toISOString(),
          lastUse: new Date().toISOString(),
          sessionCount: 1
        };
      }
      
      // Update session info
      if (analyticsRef.current) {
        analyticsRef.current.lastUse = new Date().toISOString();
        analyticsRef.current.sessionCount += 1;
      }
      
      isInitialized.current = true;
    } catch (_error) {
      // silently handle
    }
  };

  // Track an event
  const trackEvent = async (event: AnalyticsEvent) => {
    if (!analyticsRef.current) return;
    
    try {
      switch (event.type) {
        case 'wallet_viewed':
          analyticsRef.current.walletViewed += 1;
          analyticsRef.current.mostUsedFeatures['wallet_view'] = 
            (analyticsRef.current.mostUsedFeatures['wallet_view'] || 0) + 1;
          break;
          
        case 'topup_initiated':
          analyticsRef.current.topupsInitiated += 1;
          if (event.data?.amount) {
            const amount = event.data.amount.toString();
            analyticsRef.current.preferredTopupAmounts[amount] = 
              (analyticsRef.current.preferredTopupAmounts[amount] || 0) + 1;
          }
          break;
          
        case 'topup_completed':
          analyticsRef.current.topupsCompleted += 1;
          break;
          
        case 'topup_failed':
          analyticsRef.current.topupsFailed += 1;
          break;
          
        case 'transaction_viewed':
          analyticsRef.current.transactionsViewed += 1;
          analyticsRef.current.mostUsedFeatures['transaction_history'] = 
            (analyticsRef.current.mostUsedFeatures['transaction_history'] || 0) + 1;
          break;
          
        case 'withdrawal_initiated':
          analyticsRef.current.withdrawalsInitiated += 1;
          if (event.data?.method) {
            analyticsRef.current.preferredWithdrawalMethods[event.data.method] = 
              (analyticsRef.current.preferredWithdrawalMethods[event.data.method] || 0) + 1;
          }
          break;
          
        case 'withdrawal_completed':
          analyticsRef.current.withdrawalsCompleted += 1;
          break;
          
        case 'withdrawal_failed':
          analyticsRef.current.withdrawalsFailed += 1;
          break;
          
        case 'api_call':
          if (event.data?.responseTime) {
            analyticsRef.current.apiResponseTime.push(event.data.responseTime);
            // Keep only the last N response times
            if (analyticsRef.current.apiResponseTime.length > MAX_RESPONSE_TIMES) {
              analyticsRef.current.apiResponseTime = analyticsRef.current.apiResponseTime.slice(-MAX_RESPONSE_TIMES);
            }
          }
          break;
          
        case 'error':
          analyticsRef.current.errorCount += 1;
          analyticsRef.current.lastError = event.data?.message || 'Unknown error';
          break;
      }
      
      // Save to storage
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(analyticsRef.current));
    } catch (_error) {
      // silently handle
    }
  };

  // Track wallet view
  const trackWalletViewed = useCallback(async () => {
    await trackEvent({
      type: 'wallet_viewed',
      timestamp: new Date().toISOString()
    });
  }, []);

  // Track topup events
  const trackTopupInitiated = useCallback(async (amount: number) => {
    await trackEvent({
      type: 'topup_initiated',
      data: { amount },
      timestamp: new Date().toISOString()
    });
  }, []);

  const trackTopupCompleted = useCallback(async (amount: number) => {
    await trackEvent({
      type: 'topup_completed',
      data: { amount },
      timestamp: new Date().toISOString()
    });
  }, []);

  const trackTopupFailed = useCallback(async (amount: number, error: string) => {
    await trackEvent({
      type: 'topup_failed',
      data: { amount, error },
      timestamp: new Date().toISOString()
    });
  }, []);

  // Track transaction events
  const trackTransactionViewed = useCallback(async () => {
    await trackEvent({
      type: 'transaction_viewed',
      timestamp: new Date().toISOString()
    });
  }, []);

  // Track withdrawal events
  const trackWithdrawalInitiated = useCallback(async (amount: number, method: string) => {
    await trackEvent({
      type: 'withdrawal_initiated',
      data: { amount, method },
      timestamp: new Date().toISOString()
    });
  }, []);

  const trackWithdrawalCompleted = useCallback(async (amount: number, method: string) => {
    await trackEvent({
      type: 'withdrawal_completed',
      data: { amount, method },
      timestamp: new Date().toISOString()
    });
  }, []);

  const trackWithdrawalFailed = useCallback(async (amount: number, method: string, error: string) => {
    await trackEvent({
      type: 'withdrawal_failed',
      data: { amount, method, error },
      timestamp: new Date().toISOString()
    });
  }, []);

  // Track API response time
  const trackApiResponseTime = useCallback(async (responseTime: number) => {
    await trackEvent({
      type: 'api_call',
      data: { responseTime },
      timestamp: new Date().toISOString()
    });
  }, []);

  // Track error
  const trackError = useCallback(async (error: Error, context?: string) => {
    await trackEvent({
      type: 'error',
      data: {
        message: error.message,
        stack: error.stack,
        context
      },
      timestamp: new Date().toISOString()
    });
  }, []);

  // Get analytics data
  const getAnalytics = (): WalletAnalytics | null => {
    return analyticsRef.current;
  };

  // Get performance metrics
  const getPerformanceMetrics = () => {
    if (!analyticsRef.current) return null;
    
    const responseTimes = analyticsRef.current.apiResponseTime;
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;
    
    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    
    return {
      averageResponseTime: avgResponseTime,
      maxResponseTime,
      minResponseTime,
      totalApiCalls: responseTimes.length,
      errorRate: analyticsRef.current.errorCount / Math.max(analyticsRef.current.topupsInitiated + analyticsRef.current.withdrawalsInitiated, 1)
    };
  };

  // Get user behavior insights
  const getUserInsights = () => {
    if (!analyticsRef.current) return null;
    
    const mostUsedFeature = Object.entries(analyticsRef.current.mostUsedFeatures)
      .sort(([,a], [,b]) => b - a)[0];
    
    const mostUsedTopupAmount = Object.entries(analyticsRef.current.preferredTopupAmounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    const mostUsedWithdrawalMethod = Object.entries(analyticsRef.current.preferredWithdrawalMethods)
      .sort(([,a], [,b]) => b - a)[0];
    
    const topupSuccessRate = analyticsRef.current.topupsInitiated > 0 
      ? analyticsRef.current.topupsCompleted / analyticsRef.current.topupsInitiated 
      : 0;
    
    const withdrawalSuccessRate = analyticsRef.current.withdrawalsInitiated > 0 
      ? analyticsRef.current.withdrawalsCompleted / analyticsRef.current.withdrawalsInitiated 
      : 0;
    
    return {
      mostUsedFeature: mostUsedFeature ? { feature: mostUsedFeature[0], count: mostUsedFeature[1] } : null,
      mostUsedTopupAmount: mostUsedTopupAmount ? { amount: mostUsedTopupAmount[0], count: mostUsedTopupAmount[1] } : null,
      mostUsedWithdrawalMethod: mostUsedWithdrawalMethod ? { method: mostUsedWithdrawalMethod[0], count: mostUsedWithdrawalMethod[1] } : null,
      topupSuccessRate,
      withdrawalSuccessRate,
      totalSessions: analyticsRef.current.sessionCount,
      daysSinceFirstUse: Math.floor((Date.now() - new Date(analyticsRef.current.firstUse).getTime()) / (1000 * 60 * 60 * 24))
    };
  };

  // Clear analytics data
  const clearAnalytics = async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      analyticsRef.current = null;
      isInitialized.current = false;
    } catch (_error) {
      // silently handle
    }
  };

  // Initialize on mount
  useEffect(() => {
    initializeAnalytics();
  }, []);

  return {
    trackWalletViewed,
    trackTopupInitiated,
    trackTopupCompleted,
    trackTopupFailed,
    trackTransactionViewed,
    trackWithdrawalInitiated,
    trackWithdrawalCompleted,
    trackWithdrawalFailed,
    trackApiResponseTime,
    trackError,
    getAnalytics,
    getPerformanceMetrics,
    getUserInsights,
    clearAnalytics
  };
}
