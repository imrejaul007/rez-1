import { useRouter, useSegments, usePathname } from 'expo-router';
import { useCallback, useMemo } from 'react';

// Types
type NavigationParams = Record<string, any>;

interface NavigationHistory {
  path: string;
  params?: NavigationParams;
  timestamp: number;
}

interface UseNavigationReturn {
  // Basic navigation
  navigate: (path: string, params?: NavigationParams) => void;
  push: (path: string, params?: NavigationParams) => void;
  replace: (path: string, params?: NavigationParams) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  
  // Tab navigation
  navigateToTab: (tabName: string) => void;
  
  // Modal navigation
  presentModal: (path: string, params?: NavigationParams) => void;
  dismissModal: () => void;
  
  // Deep linking helpers
  buildDeepLink: (path: string, params?: NavigationParams) => string;
  parseDeepLink: (url: string) => { path: string; params: NavigationParams } | null;
  
  // Route info
  currentPath: string;
  currentSegments: string[];
  isOnTab: (tabName: string) => boolean;
  isOnPath: (path: string) => boolean;
  
  // Navigation guards
  navigateWithAuth: (path: string, params?: NavigationParams) => void;
  navigateWithOnboarding: (path: string, params?: NavigationParams) => void;
  
  // Utility
  refreshCurrentRoute: () => void;
  getRouteParams: () => NavigationParams;
}

export function useNavigation(): UseNavigationReturn {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  // Basic navigation methods
  const navigate = useCallback((path: string, params?: NavigationParams) => {
    try {
      if (params) {
        router.navigate({ pathname: path as any, params });
      } else {
        router.navigate(path as any);
      }
    } catch (_error) {
      // silently handle
    }
  }, [router]);

  const push = useCallback((path: string, params?: NavigationParams) => {
    try {
      if (params) {
        router.push({ pathname: path as any, params });
      } else {
        router.push(path as any);
      }
    } catch (_error) {
      // silently handle
    }
  }, [router]);

  const replace = useCallback((path: string, params?: NavigationParams) => {
    try {
      if (params) {
        router.replace({ pathname: path as any, params });
      } else {
        router.replace(path as any);
      }
    } catch (_error) {
      // silently handle
    }
  }, [router]);

  const goBack = useCallback(() => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        // Fallback to home if can't go back
        router.replace('/(tabs)/' as any);
      }
    } catch (_error) {
      // silently handle
    }
  }, [router]);

  const canGoBack = useCallback(() => {
    try {
      return router.canGoBack();
    } catch (error) {
      return false;
    }
  }, [router]);

  // Tab navigation
  const navigateToTab = useCallback((tabName: string) => {
    navigate(`/(tabs)/${tabName}`);
  }, [navigate]);

  // Modal navigation
  const presentModal = useCallback((path: string, params?: NavigationParams) => {
    // For now, use push - can be enhanced with actual modal presentation
    push(path, params);
  }, [push]);

  const dismissModal = useCallback(() => {
    goBack();
  }, [goBack]);

  // Deep linking helpers
  const buildDeepLink = useCallback((path: string, params?: NavigationParams) => {
    const baseUrl = 'rez://';
    let url = baseUrl + path.replace(/^\//, '');
    
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }
    
    return url;
  }, []);

  const parseDeepLink = useCallback((url: string) => {
    try {
      const urlObj = new URL(url);
      const path = '/' + urlObj.pathname.replace(/^\//, '');
      const params: NavigationParams = {};
      
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      
      return { path, params };
    } catch (error) {
      return null;
    }
  }, []);

  // Route info
  const currentPath = pathname;
  const currentSegments = segments;

  const isOnTab = useCallback((tabName: string) => {
    return (segments as string[]).includes('(tabs)') && (segments as string[]).includes(tabName);
  }, [segments]);

  const isOnPath = useCallback((path: string) => {
    return pathname === path || pathname.startsWith(path + '/');
  }, [pathname]);

  // Navigation guards
  const navigateWithAuth = useCallback((path: string, params?: NavigationParams) => {
    // This would check authentication status
    // For now, just navigate - can be enhanced with auth check
    navigate(path, params);
  }, [navigate]);

  const navigateWithOnboarding = useCallback((path: string, params?: NavigationParams) => {
    // This would check onboarding status
    // For now, just navigate - can be enhanced with onboarding check
    navigate(path, params);
  }, [navigate]);

  // Utility methods
  const refreshCurrentRoute = useCallback(() => {
    // Force re-render current route
    router.replace(pathname as any);
  }, [router, pathname]);

  const getRouteParams = useCallback((): NavigationParams => {
    // This would extract params from current route
    // Implementation depends on how Expo Router exposes params
    return {};
  }, []);

  // Memoized return object
  const navigationReturn = useMemo((): UseNavigationReturn => ({
    // Basic navigation
    navigate,
    push,
    replace,
    goBack,
    canGoBack,
    
    // Tab navigation
    navigateToTab,
    
    // Modal navigation
    presentModal,
    dismissModal,
    
    // Deep linking helpers
    buildDeepLink,
    parseDeepLink,
    
    // Route info
    currentPath,
    currentSegments,
    isOnTab,
    isOnPath,
    
    // Navigation guards
    navigateWithAuth,
    navigateWithOnboarding,
    
    // Utility
    refreshCurrentRoute,
    getRouteParams,
  }), [
    navigate,
    push,
    replace,
    goBack,
    canGoBack,
    navigateToTab,
    presentModal,
    dismissModal,
    buildDeepLink,
    parseDeepLink,
    currentPath,
    currentSegments,
    isOnTab,
    isOnPath,
    navigateWithAuth,
    navigateWithOnboarding,
    refreshCurrentRoute,
    getRouteParams,
  ]);

  return navigationReturn;
}

// Navigation utilities
export const NavigationUtils = {
  // Common paths
  paths: {
    HOME: '/(tabs)/',
    EXPLORE: '/(tabs)/explore',
    OFFERS: '/offers',
    CART: '/cart',
    WALLET: '/wallet-screen',
    COIN: '/coins',
    FASHION: '/MainCategory/fashion',
    STORE: '/product-page',
    MAIN_STORE: '/MainStorePage',
    STORE_LIST: '/StoreListPage',
    REVIEW: '/ReviewPage',
    UGC_DETAIL: '/UGCDetailScreen',
    
    // Onboarding
    ONBOARDING_SPLASH: '/onboarding/splash',
    ONBOARDING_REGISTRATION: '/onboarding/registration',
    ONBOARDING_OTP: '/onboarding/otp-verification',
    ONBOARDING_LOCATION: '/onboarding/location-permission',
    ONBOARDING_LOADING: '/onboarding/loading',
    ONBOARDING_CATEGORIES: '/onboarding/category-selection',
    ONBOARDING_REWARDS: '/onboarding/rewards-intro',
    ONBOARDING_TRANSACTIONS: '/onboarding/transactions-preview',
  },

  // Tab names
  tabs: {
    HOME: 'index',
    EXPLORE: 'explore',
  },

  // Check if path is a tab
  isTabPath: (path: string): boolean => {
    return path.startsWith('/(tabs)/');
  },

  // Check if path is onboarding
  isOnboardingPath: (path: string): boolean => {
    return path.startsWith('/onboarding/');
  },

  // Get tab name from path
  getTabFromPath: (path: string): string | null => {
    if (!NavigationUtils.isTabPath(path)) return null;
    
    const segments = path.split('/');
    return segments[segments.length - 1] || 'index';
  },
};

export default useNavigation;
