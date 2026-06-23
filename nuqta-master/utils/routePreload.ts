/**
 * Route Preloading Strategies
 *
 * Intelligent preloading based on user behavior, network conditions,
 * and application state to optimize performance.
 */

import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { preloadComponent, preloadComponents } from './lazyLoad';

// ============================================================================
// Types
// ============================================================================

export interface PreloadStrategy {
  /** Priority level (1-10, higher = more important) */
  priority: number;
  /** Delay before preloading (ms) */
  delay?: number;
  /** Only preload on specific network types */
  networkConditions?: ('wifi' | 'cellular' | 'ethernet')[];
  /** Only preload when battery is above this level (0-100) */
  minBatteryLevel?: number;
  /** Only preload on specific platforms */
  platforms?: ('web' | 'ios' | 'android')[];
}

interface PreloadTask {
  component: any;
  strategy: PreloadStrategy;
  executed: boolean;
}

// ============================================================================
// Route Preload Manager
// ============================================================================

class RoutePreloadManager {
  private preloadQueue: PreloadTask[] = [];
  private preloadedComponents = new Set<string>();
  private isPreloading = false;
  private networkType: string | null = null;
  private networkUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initNetworkListener();
  }

  /**
   * Initialize network listener for intelligent preloading
   */
  private initNetworkListener() {
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      this.networkType = state.type;

      // If WiFi connected, start preloading high-priority items
      if (state.type === 'wifi' && !this.isPreloading) {
        this.processQueue();
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.preloadQueue = [];
    this.preloadedComponents.clear();
  }

  /**
   * Add component to preload queue
   */
  addToQueue(component: any, strategy: PreloadStrategy): void {
    const componentName = component.displayName || component.name || 'Unknown';

    if (this.preloadedComponents.has(componentName)) {
      return;
    }

    if (strategy.platforms && !strategy.platforms.includes(Platform.OS as any)) {
      return;
    }

    this.preloadQueue.push({
      component,
      strategy,
      executed: false,
    });

    this.preloadQueue.sort((a, b) => b.strategy.priority - a.strategy.priority);
  }

  /**
   * Process preload queue based on strategies
   */
  async processQueue(): Promise<void> {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    for (const task of this.preloadQueue) {
      if (task.executed) continue;

      // Check network conditions
      if (!this.shouldPreloadNow(task.strategy)) {
        continue;
      }

      // Apply delay if specified
      if (task.strategy.delay) {
        await this.delay(task.strategy.delay);
      }

      // Preload component
      try {
        const componentName =
          task.component.displayName || task.component.name || 'Unknown';
        await preloadComponent(task.component);
        this.preloadedComponents.add(componentName);
        task.executed = true;
      } catch (_error) {
        // skip failed preloads
      }

      // Small delay between preloads to avoid blocking
      await this.delay(100);
    }

    // Remove executed tasks
    this.preloadQueue = this.preloadQueue.filter(task => !task.executed);
    this.isPreloading = false;
  }

  /**
   * Check if should preload based on strategy
   */
  private shouldPreloadNow(strategy: PreloadStrategy): boolean {
    // Check network conditions
    if (strategy.networkConditions) {
      if (!this.networkType || !strategy.networkConditions.includes(this.networkType as any)) {
        return false;
      }
    }

    // Web platform always allows preloading
    if (Platform.OS === 'web') {
      return true;
    }

    // Native: respect battery level if specified
    // Note: Would require expo-battery package for actual implementation
    // For now, we'll allow preloading on all network types

    return true;
  }

  /**
   * Preload immediately (bypass queue)
   */
  async preloadNow(component: any): Promise<void> {
    const componentName = component.displayName || component.name || 'Unknown';

    if (this.preloadedComponents.has(componentName)) {
      return;
    }

    try {
      await preloadComponent(component);
      this.preloadedComponents.add(componentName);
    } catch (_error) {
      // skip failed preloads
    }
  }

  /**
   * Preload multiple components immediately
   */
  async preloadMultiple(components: any[]): Promise<void> {
    const unpreloadedComponents = components.filter(
      c => !this.preloadedComponents.has(c.displayName || c.name || 'Unknown')
    );

    if (unpreloadedComponents.length === 0) {
      return;
    }

    try {
      await preloadComponents(unpreloadedComponents);

      unpreloadedComponents.forEach(c => {
        const name = c.displayName || c.name || 'Unknown';
        this.preloadedComponents.add(name);
      });
    } catch (_error) {
      // skip failed preloads
    }
  }

  /**
   * Clear preload queue
   */
  clearQueue(): void {
    this.preloadQueue = [];
  }

  /**
   * Reset preloaded components tracking
   */
  reset(): void {
    this.preloadedComponents.clear();
    this.preloadQueue = [];
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.preloadQueue.length,
      preloadedCount: this.preloadedComponents.size,
      isPreloading: this.isPreloading,
      networkType: this.networkType,
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const routePreloadManager = new RoutePreloadManager();

// ============================================================================
// Preload Strategy Presets
// ============================================================================

/**
 * High priority - preload immediately on WiFi
 */
export const PRELOAD_HIGH_PRIORITY: PreloadStrategy = {
  priority: 10,
  delay: 0,
  networkConditions: ['wifi', 'ethernet'],
};

/**
 * Medium priority - preload after 2s on WiFi
 */
export const PRELOAD_MEDIUM_PRIORITY: PreloadStrategy = {
  priority: 5,
  delay: 2000,
  networkConditions: ['wifi', 'ethernet'],
};

/**
 * Low priority - preload after 5s on WiFi only
 */
export const PRELOAD_LOW_PRIORITY: PreloadStrategy = {
  priority: 1,
  delay: 5000,
  networkConditions: ['wifi', 'ethernet'],
};

/**
 * Eager - preload immediately regardless of network
 */
export const PRELOAD_EAGER: PreloadStrategy = {
  priority: 10,
  delay: 0,
};

/**
 * Lazy - preload after 10s on WiFi only
 */
export const PRELOAD_LAZY: PreloadStrategy = {
  priority: 1,
  delay: 10000,
  networkConditions: ['wifi', 'ethernet'],
};

// ============================================================================
// Preload Hooks
// ============================================================================

/**
 * Preload on user interaction (hover, focus, press-in)
 *
 * @example
 * ```tsx
 * <Pressable onPressIn={() => preloadOnInteraction(MyComponent)}>
 *   Open Modal
 * </Pressable>
 * ```
 */
export function preloadOnInteraction(component: any): void {
  routePreloadManager.preloadNow(component);
}

/**
 * Preload on idle (after user inactivity)
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   const cleanup = preloadOnIdle([Component1, Component2]);
 *   return cleanup;
 * }, []);
 * ```
 */
export function preloadOnIdle(
  components: any[],
  idleTime: number = 3000
): () => void {
  let timeoutId: NodeJS.Timeout;

  const schedulePreload = () => {
    timeoutId = setTimeout(() => {
      routePreloadManager.preloadMultiple(components);
    }, idleTime);
  };

  const resetTimer = () => {
    clearTimeout(timeoutId);
    schedulePreload();
  };

  // Start timer
  schedulePreload();

  // Return cleanup function
  return () => {
    clearTimeout(timeoutId);
  };
}

/**
 * Preload based on current route
 * Predicts and preloads likely next routes
 *
 * @example
 * ```tsx
 * preloadForRoute('/home', {
 *   '/profile': ProfileComponent,
 *   '/settings': SettingsComponent,
 * });
 * ```
 */
export function preloadForRoute(
  currentRoute: string,
  routeMap: Record<string, any>,
  strategy: PreloadStrategy = PRELOAD_MEDIUM_PRIORITY
): void {
  // Route prediction logic (simplified)
  const predictedRoutes = getPredictedRoutes(currentRoute);

  predictedRoutes.forEach(route => {
    const component = routeMap[route];
    if (component) {
      routePreloadManager.addToQueue(component, strategy);
    }
  });

  // Process queue
  routePreloadManager.processQueue();
}

/**
 * Simple route prediction based on common navigation patterns
 */
function getPredictedRoutes(currentRoute: string): string[] {
  const predictions: Record<string, string[]> = {
    '/': ['/profile', '/search', '/offers'],
    '/home': ['/profile', '/cart', '/wishlist'],
    '/profile': ['/profile/edit', '/settings', '/wallet'],
    '/cart': ['/checkout', '/payment'],
    '/checkout': ['/payment', '/order-confirmation'],
    '/product': ['/cart', '/reviews', '/store'],
    '/store': ['/product', '/reviews', '/offers'],
    '/games': ['/games/slots', '/games/trivia', '/leaderboard'],
  };

  return predictions[currentRoute] || [];
}

// ============================================================================
// Route Groups for Batch Preloading
// ============================================================================

export const ROUTE_GROUPS = {
  /** Critical routes - preload on app start */
  CRITICAL: ['home', 'profile', 'cart'],

  /** Shopping flow routes */
  SHOPPING: ['product', 'cart', 'checkout', 'payment'],

  /** Social features */
  SOCIAL: ['feed', 'messages', 'profile', 'ugc'],

  /** Gaming features */
  GAMING: ['games', 'challenges', 'leaderboard', 'achievements'],

  /** Account management */
  ACCOUNT: ['profile', 'settings', 'wallet', 'orders'],

  /** Admin features */
  ADMIN: ['admin/faqs', 'admin/social-media-posts'],
};

// ============================================================================
// Exports
// ============================================================================

export default {
  routePreloadManager,
  preloadOnInteraction,
  preloadOnIdle,
  preloadForRoute,
  PRELOAD_HIGH_PRIORITY,
  PRELOAD_MEDIUM_PRIORITY,
  PRELOAD_LOW_PRIORITY,
  PRELOAD_EAGER,
  PRELOAD_LAZY,
  ROUTE_GROUPS,
};
