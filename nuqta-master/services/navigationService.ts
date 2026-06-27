// Navigation Service
// Centralized navigation service with error handling and event management

import { Href, Router } from 'expo-router';
import {
  INavigationService,
  NavigationOptions,
  NavigationResult,
  NavigationGuard,
  NavigationEvent,
  NavigationEventListener,
  NavigationHistoryEntry,
  NavigationMethod,
  NavigationErrorType,
  NavigationQueueItem,
} from '@/types/navigation.types';
import {
  navigationHistory,
  getDefaultFallbackRoute,
  isValidRoute,
  normalizeRoute,
  createNavigationResult,
  createNavigationError,
  logNavigation,
  getPlatform,
  retryWithBackoff,
  getFallbackChain,
  routesEqual,
} from '@/utils/navigationHelper';

/**
 * Navigation Service Implementation
 */
// Limits to prevent memory leaks
const MAX_GUARDS = 20;
const MAX_LISTENERS_PER_EVENT = 50;
const MAX_QUEUE_SIZE = 20;

class NavigationService implements INavigationService {
  private router: Router | null = null;
  private guards: NavigationGuard[] = [];
  private listeners: Map<NavigationEvent, Set<(data: any) => void>> = new Map();
  private currentRoute: string = '/';
  private isNavigating: boolean = false;
  private navigationQueue: NavigationQueueItem[] = [];
  private queueProcessing: boolean = false;

  /**
   * Initialize the service with router instance
   */
  initialize(router: Router): void {
    this.router = router;
    this.currentRoute = this.getCurrentRoute();

  }

  /**
   * Check if service is ready
   */
  private isReady(): boolean {
    return this.router !== null;
  }

  /**
   * Emit navigation event
   */
  private emit(event: NavigationEvent, data: any): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (_error) {
          // silently handle
        }
      });
    }
  }

  /**
   * Run navigation guards
   */
  private async runGuards(to: string, from: string): Promise<boolean> {
    for (const guard of this.guards) {
      try {
        const result = await guard(to, from);
        if (!result) {
          this.emit(NavigationEvent.NAVIGATION_BLOCKED, { to, from });
          return false;
        }
      } catch (error) {
        return false;
      }
    }
    return true;
  }

  /**
   * Add navigation to history
   */
  private addToHistory(route: string, method: NavigationMethod): void {
    navigationHistory.add({
      route,
      timestamp: Date.now(),
      method,
    });
  }

  /**
   * Navigate to a route
   */
  async navigate(
    route: Href,
    options: NavigationOptions = {}
  ): Promise<NavigationResult> {
    if (!this.isReady()) {
      const error = createNavigationError(
        NavigationErrorType.UNKNOWN,
        'Navigation service not initialized'
      );
      return createNavigationResult('failed', undefined, error);
    }

    if (!isValidRoute(route)) {
      const error = createNavigationError(
        NavigationErrorType.INVALID_ROUTE,
        'Invalid route provided',
        String(route)
      );
      logNavigation('navigate', String(route), false, error);
      return createNavigationResult('failed', undefined, error);
    }

    const routeStr = normalizeRoute(route);
    const from = this.currentRoute;

    // Emit before navigate event
    this.emit(NavigationEvent.BEFORE_NAVIGATE, { to: routeStr, from });

    // Run guards
    const guardsPassed = await this.runGuards(routeStr, from);
    if (!guardsPassed) {
      const error = createNavigationError(
        NavigationErrorType.NAVIGATION_BLOCKED,
        'Navigation blocked by guard',
        routeStr
      );
      return createNavigationResult('failed', routeStr, error);
    }

    // Attempt navigation with retry
    try {
      this.isNavigating = true;

      await retryWithBackoff(async () => {
        if (options.replace) {
          this.router!.replace(route);
        } else {
          this.router!.push(route);
        }
      });

      this.currentRoute = routeStr;
      this.addToHistory(routeStr, options.replace ? 'replace' : 'push');

      logNavigation('navigate', routeStr, true);
      this.emit(NavigationEvent.AFTER_NAVIGATE, { to: routeStr, from });

      if (options.onSuccess) {
        options.onSuccess();
      }

      return createNavigationResult('success', routeStr);
    } catch (error) {

      // Try fallback
      if (options.fallbackRoute) {

        try {
          this.router!.push(options.fallbackRoute);
          const fallbackStr = normalizeRoute(options.fallbackRoute);
          this.currentRoute = fallbackStr;
          this.addToHistory(fallbackStr, 'push');
          logNavigation('navigate', fallbackStr, true);
          return createNavigationResult('fallback', fallbackStr, undefined, true);
        } catch (_fallbackError) {
          // silently handle
        }
      }

      const navError = error as Error;
      this.emit(NavigationEvent.NAVIGATION_ERROR, { route: routeStr, error: navError });

      if (options.onError) {
        options.onError(navError);
      }

      logNavigation('navigate', routeStr, false, navError);
      return createNavigationResult('failed', routeStr, navError);
    } finally {
      this.isNavigating = false;
    }
  }

  /**
   * Go back in navigation history
   */
  async goBack(fallbackRoute?: Href): Promise<NavigationResult> {
    if (!this.isReady()) {
      const error = createNavigationError(
        NavigationErrorType.UNKNOWN,
        'Navigation service not initialized'
      );
      return createNavigationResult('failed', undefined, error);
    }

    try {
      this.isNavigating = true;

      // Check if we can go back
      if (this.router!.canGoBack()) {
        this.router!.back();
        this.addToHistory('[back]', 'back');
        logNavigation('goBack', '[back]', true);
        return createNavigationResult('success', '[back]');
      }

      // Try fallback route
      const fallback = fallbackRoute || getDefaultFallbackRoute();

      return await this.navigate(fallback, { replace: true });
    } catch (error) {

      // Try fallback chain
      const fallbackChain = getFallbackChain(this.currentRoute);
      for (const fallback of fallbackChain) {
        try {
          this.router!.push(fallback);
          const fallbackStr = normalizeRoute(fallback);
          this.currentRoute = fallbackStr;
          this.addToHistory(fallbackStr, 'push');
          logNavigation('goBack', fallbackStr, true);
          return createNavigationResult('fallback', fallbackStr, undefined, true);
        } catch (_fallbackError) {
          // silently handle
        }
      }

      const navError = error as Error;
      logNavigation('goBack', '[back]', false, navError);
      return createNavigationResult('failed', '[back]', navError);
    } finally {
      this.isNavigating = false;
    }
  }

  /**
   * Replace current route
   */
  async replace(
    route: Href,
    options: NavigationOptions = {}
  ): Promise<NavigationResult> {
    return this.navigate(route, { ...options, replace: true });
  }

  /**
   * Check if can go back
   */
  canGoBack(): boolean {
    if (!this.isReady()) return false;
    return this.router!.canGoBack() || navigationHistory.canGoBack();
  }

  /**
   * Get current route
   */
  getCurrentRoute(): string {
    if (!this.isReady()) return '/';

    try {
      // Try to get from router
      const segments = (this.router as any)?.state?.routes;
      if (segments && segments.length > 0) {
        const currentSegment = segments[segments.length - 1];
        return currentSegment.path || currentSegment.name || this.currentRoute;
      }
    } catch (_error) {
      // silently handle
    }

    return this.currentRoute;
  }

  /**
   * Get navigation history
   */
  getHistory(): NavigationHistoryEntry[] {
    return navigationHistory.getAll();
  }

  /**
   * Clear navigation history
   */
  clearHistory(): void {
    navigationHistory.clear();
  }

  /**
   * Add navigation guard
   */
  addGuard(guard: NavigationGuard): void {
    // Limit guards to prevent memory leak
    if (this.guards.length >= MAX_GUARDS) {
      this.guards.shift();
    }
    this.guards.push(guard);
  }

  /**
   * Remove navigation guard
   */
  removeGuard(guard: NavigationGuard): void {
    const index = this.guards.indexOf(guard);
    if (index > -1) {
      this.guards.splice(index, 1);
    }
  }

  /**
   * Remove all navigation guards
   */
  removeAllGuards(): void {
    this.guards = [];
  }

  /**
   * Add event listener
   */
  addEventListener(
    event: NavigationEvent,
    handler: (data: any) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const handlers = this.listeners.get(event)!;

    // Limit listeners per event to prevent memory leak
    if (handlers.size >= MAX_LISTENERS_PER_EVENT) {
      const handlersArray = Array.from(handlers);
      handlers.clear();
      // Keep the most recent half
      handlersArray.slice(-MAX_LISTENERS_PER_EVENT / 2).forEach(h => handlers.add(h));
    }

    handlers.add(handler);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: NavigationEvent): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Remove event listener
   */
  removeEventListener(
    event: NavigationEvent,
    handler: (data: any) => void
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Queue navigation for later
   */
  queueNavigation(
    route: Href,
    options: NavigationOptions = {},
    priority: number = 0
  ): string {
    // Limit queue size to prevent memory leak
    if (this.navigationQueue.length >= MAX_QUEUE_SIZE) {
      // Remove the lowest priority item at the end
      this.navigationQueue.pop();
    }

    const id = `nav_${Date.now()}_${Math.random()}`;
    const item: NavigationQueueItem = {
      id,
      route,
      options,
      priority,
      timestamp: Date.now(),
      attempts: 0,
    };

    this.navigationQueue.push(item);
    this.navigationQueue.sort((a, b) => b.priority - a.priority);

    // Process queue if not already processing
    if (!this.queueProcessing) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process navigation queue
   */
  private async processQueue(): Promise<void> {
    if (this.queueProcessing || this.navigationQueue.length === 0) {
      return;
    }

    this.queueProcessing = true;

    while (this.navigationQueue.length > 0) {
      const item = this.navigationQueue.shift()!;

      if (item.attempts >= 3) {
        continue;
      }

      item.attempts++;

      try {
        const result = await this.navigate(item.route, item.options);
        if (result.status === 'failed') {
          // Re-queue with lower priority
          item.priority = Math.max(0, item.priority - 1);
          this.navigationQueue.push(item);
        }
      } catch (_error) {
        // silently handle
      }

      // Add delay between queue items
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.queueProcessing = false;
  }

  /**
   * Cancel queued navigation
   */
  cancelQueuedNavigation(id: string): boolean {
    const index = this.navigationQueue.findIndex(item => item.id === id);
    if (index > -1) {
      this.navigationQueue.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Check if currently navigating
   */
  isCurrentlyNavigating(): boolean {
    return this.isNavigating;
  }

  /**
   * Reset service
   */
  reset(): void {
    this.guards = [];
    this.listeners.clear();
    this.navigationQueue = [];
    this.queueProcessing = false;
    this.currentRoute = '/';
    this.isNavigating = false;
    navigationHistory.clear();
  }
}

// Export singleton instance
export const navigationService = new NavigationService();
export default navigationService;
