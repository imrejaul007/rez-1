/**
 * Push Notifications Hook
 * Initializes and manages push notifications
 */

import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import pushNotificationService from '@/services/pushNotificationService';
import { handleNotificationDeepLink } from '@/utils/notificationDeepLinkHandler';
import { useAuthUser, useIsAuthenticated } from '@/stores/selectors';

export function usePushNotifications() {
  const user = useAuthUser();
  const isAuthenticated = useIsAuthenticated();
  const appState = useRef(AppState.currentState);
  const initialized = useRef(false);
  const disableWebDevPush = Platform.OS === 'web' && __DEV__;

  useEffect(() => {
    if (disableWebDevPush || !isAuthenticated || !user || initialized.current) {
      return;
    }

    // Initialize push notifications
    initializePushNotifications();

    // Setup app state listener
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App has come to the foreground
        // You can refresh notification badge here if needed
      }
      appState.current = nextAppState;
    });

    initialized.current = true;

    return () => {
      subscription.remove();
      pushNotificationService.cleanup();
    };
  }, [disableWebDevPush, isAuthenticated, user]);

  const initializePushNotifications = async () => {
    try {
      // Set navigation handler for deep linking
      pushNotificationService.setNavigationHandler((data) => {
        handleNotificationDeepLink(data);
      });

      // Initialize with user ID
      await pushNotificationService.initialize(user?.id);
    } catch (_error) {
      // silently handle
    }
  };

  // Update token when user changes
  useEffect(() => {
    if (!disableWebDevPush && isAuthenticated && user && initialized.current) {
      pushNotificationService.updateToken(user.id);
    }
  }, [disableWebDevPush, user, isAuthenticated]);

  // Cleanup on logout
  useEffect(() => {
    if (!isAuthenticated && initialized.current) {
      pushNotificationService.unregisterToken();
      initialized.current = false;
    }
  }, [isAuthenticated]);

  return {
    initialized: initialized.current,
  };
}

export default usePushNotifications;
