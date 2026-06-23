import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import asyncStorageService from '@/services/asyncStorageService';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
  isOfflineMode: boolean;
}

/**
 * Hook to track network connectivity status
 */
export function useNetworkStatus() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
    type: null,
    isOfflineMode: false
  });

  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Load offline mode from storage
    const loadOfflineMode = async () => {
      const offlineMode = await asyncStorageService.getOfflineMode();
      setNetworkStatus(prev => ({ ...prev, isOfflineMode: offlineMode }));
    };

    loadOfflineMode();

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {

      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable;

      setNetworkStatus(prev => {
        // Track if we were offline and are now online
        if (!prev.isConnected && isConnected) {
          setWasOffline(true);
        } else if (prev.isConnected && !isConnected) {
          // Was online, now offline
        }

        return {
          ...prev,
          isConnected,
          isInternetReachable,
          type: state.type
        };
      });
    });

    // Initial check
    NetInfo.fetch().then(state => {
      setNetworkStatus(prev => ({
        ...prev,
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type
      }));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Reset the wasOffline flag
   */
  const resetWasOffline = () => {
    setWasOffline(false);
  };

  /**
   * Toggle offline mode manually
   */
  const toggleOfflineMode = async (forceOffline?: boolean) => {
    const newOfflineMode = forceOffline ?? !networkStatus.isOfflineMode;
    await asyncStorageService.setOfflineMode(newOfflineMode);
    setNetworkStatus(prev => ({ ...prev, isOfflineMode: newOfflineMode }));

  };

  /**
   * Check if we're effectively offline (no connection or offline mode enabled)
   */
  const isOffline = () => {
    return !networkStatus.isConnected || networkStatus.isOfflineMode;
  };

  /**
   * Check if we're online
   */
  const isOnline = () => {
    return networkStatus.isConnected && !networkStatus.isOfflineMode;
  };

  /**
   * Get connection quality
   */
  const getConnectionQuality = (): 'excellent' | 'good' | 'poor' | 'offline' => {
    if (!networkStatus.isConnected) {
      return 'offline';
    }

    switch (networkStatus.type) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        // Could be enhanced to check for 4G/5G vs 3G
        return 'good';
      case 'ethernet':
        return 'excellent';
      default:
        return 'poor';
    }
  };

  /**
   * Wait for network to be available
   */
  const waitForNetwork = (timeout: number = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      if (isOnline()) {
        resolve(true);
        return;
      }

      let unsubscribe: (() => void) | null = null;

      const timeoutId = setTimeout(() => {
        // Clean up listener when timeout fires
        if (unsubscribe) {
          unsubscribe();
        }
        resolve(false);
      }, timeout);

      unsubscribe = NetInfo.addEventListener(state => {
        if (state.isConnected) {
          clearTimeout(timeoutId);
          if (unsubscribe) {
            unsubscribe();
          }
          resolve(true);
        }
      });
    });
  };

  return {
    // Network status
    networkStatus,
    isConnected: networkStatus.isConnected,
    isInternetReachable: networkStatus.isInternetReachable,
    connectionType: networkStatus.type,
    isOfflineMode: networkStatus.isOfflineMode,

    // Computed states
    isOffline: isOffline(),
    isOnline: isOnline(),
    wasOffline,
    connectionQuality: getConnectionQuality(),

    // Actions
    resetWasOffline,
    toggleOfflineMode,
    waitForNetwork
  };
}

export default useNetworkStatus;
