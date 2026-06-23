// @ts-nocheck
// Safe Navigation Hook
// React hook for safe navigation with error handling and fallbacks

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter, useSegments, Href } from 'expo-router';
import { Platform, BackHandler } from 'react-native';
import { navigationService } from '@/services/navigationService';
import {
  NavigationOptions,
  NavigationResult,
  NavigationEvent,
} from '@/types/navigation.types';
import {
  getPlatform,
  getDefaultFallbackRoute,
  handleBrowserBack,
  isWeb,
} from '@/utils/navigationHelper';

/**
 * Safe Navigation Hook
 */
export const useSafeNavigation = () => {
  const router = useRouter();
  const segments = useSegments();
  const [isNavigating, setIsNavigating] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const initialized = useRef(false);

  // Initialize navigation service
  useEffect(() => {
    if (!initialized.current) {
      navigationService.initialize(router);
      initialized.current = true;
    }
  }, [router]);

  // Update canGoBack state
  useEffect(() => {
    setCanGoBack(navigationService.canGoBack());
  }, [segments]);

  /**
   * Safe navigate function
   */
  const navigate = useCallback(
    async (
      route: Href,
      options?: NavigationOptions
    ): Promise<NavigationResult> => {
      setIsNavigating(true);
      try {
        const result = await navigationService.navigate(route, options);
        return result;
      } finally {
        setIsNavigating(false);
      }
    },
    []
  );

  /**
   * Safe go back function
   */
  const goBack = useCallback(
    async (fallbackRoute?: Href): Promise<NavigationResult> => {
      setIsNavigating(true);
      try {
        const result = await navigationService.goBack(
          fallbackRoute || getDefaultFallbackRoute()
        );
        return result;
      } finally {
        setIsNavigating(false);
      }
    },
    []
  );

  /**
   * Safe replace function
   */
  const replace = useCallback(
    async (
      route: Href,
      options?: NavigationOptions
    ): Promise<NavigationResult> => {
      setIsNavigating(true);
      try {
        const result = await navigationService.replace(route, options);
        return result;
      } finally {
        setIsNavigating(false);
      }
    },
    []
  );

  /**
   * Navigate with confirmation
   */
  const navigateWithConfirmation = useCallback(
    async (
      route: Href,
      message: string,
      options?: NavigationOptions
    ): Promise<NavigationResult | null> => {
      if (isWeb()) {
        if (window.confirm(message)) {
          return navigate(route, options);
        }
        return null;
      } else {
        // For mobile, you would show a native alert
        // For now, just navigate
        return navigate(route, options);
      }
    },
    [navigate]
  );

  /**
   * Go to home
   */
  const goToHome = useCallback(async (): Promise<NavigationResult> => {
    return navigationService.replace('/(tabs)' as Href);
  }, []);

  /**
   * Go to profile
   */
  const goToProfile = useCallback(async (): Promise<NavigationResult> => {
    return navigationService.navigate('/profile' as Href);
  }, []);

  /**
   * Go to previous screen with auto-fallback
   */
  const goBackOrFallback = useCallback(
    async (fallbackRoute?: Href): Promise<NavigationResult> => {
      if (canGoBack) {
        return navigationService.goBack(
          fallbackRoute || getDefaultFallbackRoute()
        );
      } else {
        return navigationService.navigate(
          (fallbackRoute || getDefaultFallbackRoute()) as Href
        );
      }
    },
    [canGoBack]
  );

  return {
    // Navigation functions
    navigate,
    goBack,
    replace,
    navigateWithConfirmation,
    goToHome,
    goToProfile,
    goBackOrFallback,

    // State
    isNavigating,
    canGoBack,
    platform: getPlatform(),

    // Service access
    getCurrentRoute: () => navigationService.getCurrentRoute(),
    getHistory: () => navigationService.getHistory(),
    clearHistory: () => navigationService.clearHistory(),

    // Guards
    addGuard: (guard: any) => navigationService.addGuard(guard),
    removeGuard: (guard: any) => navigationService.removeGuard(guard),

    // Events
    addEventListener: (event: NavigationEvent, handler: any) =>
      navigationService.addEventListener(event, handler),
    removeEventListener: (event: NavigationEvent, handler: any) =>
      navigationService.removeEventListener(event, handler),
  };
};

/**
 * Hook for handling back button
 */
export const useBackButton = (
  onBackPress?: () => boolean,
  enabled: boolean = true
) => {
  // Use the navigation service directly so this hook remains independent
  // of useSafeNavigation state. This makes it usable in places where the
  // safe-navigation context is not available (e.g. background listeners,
  // early-mount components).
  const handlePress = useCallback(() => {
    if (onBackPress) {
      return onBackPress();
    }
    return navigationService.goBack(getDefaultFallbackRoute());
  }, [onBackPress]);

  useEffect(() => {
    if (!enabled) return;

    // Android hardware back button
    if (Platform.OS === 'android') {
      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        handlePress
      );
      return () => backHandler.remove();
    }

    // Web browser back button
    if (isWeb()) {
      return handleBrowserBack(() => {
        if (onBackPress) {
          onBackPress();
        } else {
          navigationService.goBack(getDefaultFallbackRoute());
        }
      });
    }
  }, [enabled, onBackPress, handlePress]);
};

/**
 * Hook for navigation guards
 */
export const useNavigationGuard = (
  guard: (to: string, from?: string) => boolean | Promise<boolean>,
  deps: any[] = []
) => {
  useEffect(() => {
    navigationService.addGuard(guard);
    return () => navigationService.removeGuard(guard);
  }, deps);
};

/**
 * Hook for navigation events
 */
export const useNavigationEvent = (
  event: NavigationEvent,
  handler: (data: any) => void,
  deps: any[] = []
) => {
  useEffect(() => {
    navigationService.addEventListener(event, handler);
    return () => navigationService.removeEventListener(event, handler);
  }, deps);
};

/**
 * Hook for route-specific behavior
 */
export const useRouteEffect = (
  route: string,
  effect: () => void | (() => void),
  deps: any[] = []
) => {
  const currentRoute = navigationService.getCurrentRoute();

  useEffect(() => {
    if (currentRoute === route) {
      return effect();
    }
  }, [currentRoute, ...deps]);
};

/**
 * Hook for getting current route
 */
export const useCurrentRoute = () => {
  const segments = useSegments();
  const [route, setRoute] = useState(navigationService.getCurrentRoute());

  useEffect(() => {
    setRoute('/' + segments.join('/'));
  }, [segments]);

  return route;
};

/**
 * Hook for navigation state
 */
export const useNavigationState = () => {
  const { canGoBack, isNavigating } = useSafeNavigation();
  const currentRoute = useCurrentRoute();

  return {
    currentRoute,
    canGoBack,
    isNavigating,
    platform: getPlatform(),
  };
};

export default useSafeNavigation;
