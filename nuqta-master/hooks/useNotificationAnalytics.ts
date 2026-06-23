// Notification Analytics Hook
// Tracks notification-related user interactions and system performance

import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationAnalytics {
  // User interactions
  settingsViewed: number;
  settingsChanged: number;
  notificationsReceived: number;
  notificationsRead: number;
  notificationsDismissed: number;
  
  // System performance
  apiResponseTime: number[];
  errorCount: number;
  lastError: string | null;
  
  // User preferences
  mostUsedSettings: Record<string, number>;
  preferredChannels: Record<string, number>;
  
  // Timestamps
  firstUse: string;
  lastUse: string;
  sessionCount: number;
}

interface AnalyticsEvent {
  type: 'settings_viewed' | 'settings_changed' | 'notification_received' | 'notification_read' | 'notification_dismissed' | 'api_call' | 'error';
  data?: any;
  timestamp: string;
}

const STORAGE_KEY = 'notification_analytics';
const MAX_RESPONSE_TIMES = 100; // Keep last 100 response times

export function useNotificationAnalytics() {
  const analyticsRef = useRef<NotificationAnalytics | null>(null);
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
          settingsViewed: 0,
          settingsChanged: 0,
          notificationsReceived: 0,
          notificationsRead: 0,
          notificationsDismissed: 0,
          apiResponseTime: [],
          errorCount: 0,
          lastError: null,
          mostUsedSettings: {},
          preferredChannels: {},
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
        case 'settings_viewed':
          analyticsRef.current.settingsViewed += 1;
          break;
          
        case 'settings_changed':
          analyticsRef.current.settingsChanged += 1;
          if (event.data?.setting) {
            analyticsRef.current.mostUsedSettings[event.data.setting] = 
              (analyticsRef.current.mostUsedSettings[event.data.setting] || 0) + 1;
          }
          break;
          
        case 'notification_received':
          analyticsRef.current.notificationsReceived += 1;
          if (event.data?.channel) {
            analyticsRef.current.preferredChannels[event.data.channel] = 
              (analyticsRef.current.preferredChannels[event.data.channel] || 0) + 1;
          }
          break;
          
        case 'notification_read':
          analyticsRef.current.notificationsRead += 1;
          break;
          
        case 'notification_dismissed':
          analyticsRef.current.notificationsDismissed += 1;
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

  // Track API response time
  const trackApiResponseTime = async (responseTime: number) => {
    await trackEvent({
      type: 'api_call',
      data: { responseTime },
      timestamp: new Date().toISOString()
    });
  };

  // Track settings view
  const trackSettingsViewed = async () => {
    await trackEvent({
      type: 'settings_viewed',
      timestamp: new Date().toISOString()
    });
  };

  // Track settings change
  const trackSettingsChanged = async (setting: string, value: any) => {
    await trackEvent({
      type: 'settings_changed',
      data: { setting, value },
      timestamp: new Date().toISOString()
    });
  };

  // Track notification received
  const trackNotificationReceived = async (channel: string, type: string) => {
    await trackEvent({
      type: 'notification_received',
      data: { channel, type },
      timestamp: new Date().toISOString()
    });
  };

  // Track notification read
  const trackNotificationRead = async (notificationId: string) => {
    await trackEvent({
      type: 'notification_read',
      data: { notificationId },
      timestamp: new Date().toISOString()
    });
  };

  // Track notification dismissed
  const trackNotificationDismissed = async (notificationId: string) => {
    await trackEvent({
      type: 'notification_dismissed',
      data: { notificationId },
      timestamp: new Date().toISOString()
    });
  };

  // Track error
  const trackError = async (error: Error, context?: string) => {
    await trackEvent({
      type: 'error',
      data: { 
        message: error.message, 
        stack: error.stack,
        context 
      },
      timestamp: new Date().toISOString()
    });
  };

  // Get analytics data
  const getAnalytics = (): NotificationAnalytics | null => {
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
      errorRate: analyticsRef.current.errorCount / Math.max(analyticsRef.current.settingsChanged + analyticsRef.current.notificationsReceived, 1)
    };
  };

  // Get user behavior insights
  const getUserInsights = () => {
    if (!analyticsRef.current) return null;
    
    const mostUsedSetting = Object.entries(analyticsRef.current.mostUsedSettings)
      .sort(([,a], [,b]) => b - a)[0];
    
    const mostUsedChannel = Object.entries(analyticsRef.current.preferredChannels)
      .sort(([,a], [,b]) => b - a)[0];
    
    const readRate = analyticsRef.current.notificationsReceived > 0 
      ? analyticsRef.current.notificationsRead / analyticsRef.current.notificationsReceived 
      : 0;
    
    return {
      mostUsedSetting: mostUsedSetting ? { setting: mostUsedSetting[0], count: mostUsedSetting[1] } : null,
      mostUsedChannel: mostUsedChannel ? { channel: mostUsedChannel[0], count: mostUsedChannel[1] } : null,
      readRate,
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
    trackApiResponseTime,
    trackSettingsViewed,
    trackSettingsChanged,
    trackNotificationReceived,
    trackNotificationRead,
    trackNotificationDismissed,
    trackError,
    getAnalytics,
    getPerformanceMetrics,
    getUserInsights,
    clearAnalytics
  };
}
