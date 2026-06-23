/**
 * Memory Manager
 *
 * Tracks and manages memory usage for components
 * Features:
 * - Component registration/cleanup
 * - Memory usage tracking
 * - Automatic cleanup of off-screen components
 * - Memory trimming on low memory
 * - Performance monitoring
 */

import { Platform, AppState, AppStateStatus } from 'react-native';

interface ComponentData {
  id: string;
  type: string;
  mountTime: number;
  lastActiveTime: number;
  memoryEstimate: number; // Estimated memory in bytes
  data?: any;
  isActive: boolean;
}

interface MemoryStats {
  activeComponents: number;
  totalComponents: number;
  estimatedMemoryUsage: number; // in MB
  cachedData: number;
  componentsCleanedUp: number;
}

type MemoryLevel = 'low' | 'moderate' | 'critical';

/**
 * Memory Manager Class
 */
class MemoryManager {
  private components = new Map<string, ComponentData>();
  private componentData = new Map<string, any>();
  private cleanupCallbacks = new Map<string, () => void>();
  private cleanupThreshold = 50; // Max inactive components before cleanup
  private memoryWarningThreshold = 100 * 1024 * 1024; // 100MB
  private totalCleanups = 0;
  private appState: AppStateStatus = 'active';
  private periodicCleanupInterval: ReturnType<typeof setInterval> | null = null;
  private appStateSubscription: any = null;

  constructor() {
    this.initAppStateListener();
    this.startPeriodicCleanup();
  }

  /**
   * Initialize app state listener
   */
  private initAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  /**
   * Handle app state changes
   */
  private handleAppStateChange = (nextAppState: AppStateStatus): void => {
    const previousState = this.appState;
    this.appState = nextAppState;

    if (previousState === 'active' && nextAppState.match(/inactive|background/)) {
      this.trimMemory('moderate');
    }
  };

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Clear any existing interval first
    if (this.periodicCleanupInterval) {
      clearInterval(this.periodicCleanupInterval);
    }
    // Run cleanup every 30 seconds
    this.periodicCleanupInterval = setInterval(() => {
      this.periodicCleanup();
    }, 30000);
  }

  /**
   * Periodic cleanup of inactive components
   */
  private periodicCleanup(): void {
    const inactiveComponents = Array.from(this.components.values()).filter(
      comp => !comp.isActive && Date.now() - comp.lastActiveTime > 60000 // 1 minute
    );

    if (inactiveComponents.length > this.cleanupThreshold) {
      for (const comp of inactiveComponents) {
        this.unregisterComponent(comp.id);
      }
    }
  }

  /**
   * Register a component
   */
  public registerComponent(
    id: string,
    type: string = 'unknown',
    data?: any,
    memoryEstimate: number = 0
  ): void {
    const existing = this.components.get(id);

    if (existing) {
      // Update existing component
      existing.isActive = true;
      existing.lastActiveTime = Date.now();
      this.components.set(id, existing);
    } else {
      // Register new component
      const componentData: ComponentData = {
        id,
        type,
        mountTime: Date.now(),
        lastActiveTime: Date.now(),
        memoryEstimate: memoryEstimate || this.estimateMemoryUsage(type),
        data,
        isActive: true,
      };

      this.components.set(id, componentData);

      if (data) {
        this.componentData.set(id, data);
      }
    }

    // Check if we need to clean up
    this.checkMemoryUsage();
  }

  /**
   * Unregister a component
   */
  public unregisterComponent(id: string): void {
    const component = this.components.get(id);

    if (component) {
      // Execute cleanup callback if exists
      const cleanupCallback = this.cleanupCallbacks.get(id);
      if (cleanupCallback) {
        try {
          cleanupCallback();
        } catch (_error) {
          // silently handle cleanup errors
        }
        this.cleanupCallbacks.delete(id);
      }

      // Remove component data
      this.componentData.delete(id);
      this.components.delete(id);
      this.totalCleanups++;
    }
  }

  /**
   * Mark component as inactive (but keep it registered)
   */
  public markInactive(id: string): void {
    const component = this.components.get(id);
    if (component) {
      component.isActive = false;
      component.lastActiveTime = Date.now();
      this.components.set(id, component);
    }
  }

  /**
   * Mark component as active
   */
  public markActive(id: string): void {
    const component = this.components.get(id);
    if (component) {
      component.isActive = true;
      component.lastActiveTime = Date.now();
      this.components.set(id, component);
    }
  }

  /**
   * Register cleanup callback for component
   */
  public registerCleanupCallback(id: string, callback: () => void): void {
    this.cleanupCallbacks.set(id, callback);
  }

  /**
   * Estimate memory usage for component type
   */
  private estimateMemoryUsage(type: string): number {
    // Rough estimates in bytes
    const estimates: Record<string, number> = {
      image: 500 * 1024, // 500KB per image
      video: 5 * 1024 * 1024, // 5MB per video
      list: 100 * 1024, // 100KB per list
      card: 50 * 1024, // 50KB per card
      section: 200 * 1024, // 200KB per section
      unknown: 50 * 1024, // 50KB default
    };

    return estimates[type] || estimates.unknown;
  }

  /**
   * Get memory statistics
   */
  public getMemoryStats(): MemoryStats {
    const components = Array.from(this.components.values());
    const activeComponents = components.filter(c => c.isActive);
    const totalMemoryEstimate = components.reduce(
      (sum, comp) => sum + comp.memoryEstimate,
      0
    );

    return {
      activeComponents: activeComponents.length,
      totalComponents: components.length,
      estimatedMemoryUsage: totalMemoryEstimate / (1024 * 1024), // Convert to MB
      cachedData: this.componentData.size,
      componentsCleanedUp: this.totalCleanups,
    };
  }

  /**
   * Check memory usage and trigger cleanup if needed
   */
  private checkMemoryUsage(): void {
    const stats = this.getMemoryStats();
    const estimatedBytes = stats.estimatedMemoryUsage * 1024 * 1024;

    if (estimatedBytes > this.memoryWarningThreshold) {
      this.trimMemory('moderate');
    }
  }

  /**
   * Trim memory based on level
   */
  public trimMemory(level: MemoryLevel = 'low'): void {

    const components = Array.from(this.components.values());
    const inactiveComponents = components
      .filter(c => !c.isActive)
      .sort((a, b) => a.lastActiveTime - b.lastActiveTime); // Oldest first

    const componentsToCleanup: ComponentData[] = [];

    switch (level) {
      case 'low':
        // Clean up 25% of inactive components
        componentsToCleanup.push(...inactiveComponents.slice(
          0,
          Math.ceil(inactiveComponents.length * 0.25)
        ));
        break;

      case 'moderate':
        // Clean up 50% of inactive components
        componentsToCleanup.push(...inactiveComponents.slice(
          0,
          Math.ceil(inactiveComponents.length * 0.5)
        ));
        break;

      case 'critical': {
        // Clean up all inactive components + oldest active components
        componentsToCleanup.push(...inactiveComponents);

        const activeComponents = components
          .filter(c => c.isActive)
          .sort((a, b) => a.lastActiveTime - b.lastActiveTime);

        componentsToCleanup.push(
          ...activeComponents.slice(0, Math.ceil(activeComponents.length * 0.25))
        );
        break;
      }
    }

    for (const comp of componentsToCleanup) {
      this.unregisterComponent(comp.id);
    }
  }

  /**
   * Force cleanup all components
   */
  public cleanup(): void {
    // Clear periodic cleanup interval
    if (this.periodicCleanupInterval) {
      clearInterval(this.periodicCleanupInterval);
      this.periodicCleanupInterval = null;
    }

    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Execute all cleanup callbacks
    for (const [, callback] of this.cleanupCallbacks.entries()) {
      try {
        callback();
      } catch (_error) {
        // silently handle cleanup errors
      }
    }

    // Clear all maps
    this.components.clear();
    this.componentData.clear();
    this.cleanupCallbacks.clear();
  }

  /**
   * Get component data
   */
  public getComponentData(id: string): any {
    return this.componentData.get(id);
  }

  /**
   * Update component data
   */
  public updateComponentData(id: string, data: any): void {
    this.componentData.set(id, data);

    const component = this.components.get(id);
    if (component) {
      component.data = data;
      component.lastActiveTime = Date.now();
      this.components.set(id, component);
    }
  }

  /**
   * Get all active components
   */
  public getActiveComponents(): ComponentData[] {
    return Array.from(this.components.values()).filter(c => c.isActive);
  }

  /**
   * Get all inactive components
   */
  public getInactiveComponents(): ComponentData[] {
    return Array.from(this.components.values()).filter(c => !c.isActive);
  }

  /**
   * Get component by ID
   */
  public getComponent(id: string): ComponentData | undefined {
    return this.components.get(id);
  }

  /**
   * Check if component is registered
   */
  public isRegistered(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * Get performance report
   */
  public getPerformanceReport(): {
    stats: MemoryStats;
    activeComponents: ComponentData[];
    inactiveComponents: ComponentData[];
    oldestComponents: ComponentData[];
    largestComponents: ComponentData[];
  } {
    const stats = this.getMemoryStats();
    const components = Array.from(this.components.values());

    return {
      stats,
      activeComponents: components.filter(c => c.isActive).slice(0, 10),
      inactiveComponents: components.filter(c => !c.isActive).slice(0, 10),
      oldestComponents: [...components]
        .sort((a, b) => a.mountTime - b.mountTime)
        .slice(0, 10),
      largestComponents: [...components]
        .sort((a, b) => b.memoryEstimate - a.memoryEstimate)
        .slice(0, 10),
    };
  }
}

// Export singleton instance
const memoryManager = new MemoryManager();
export default memoryManager;

// Export types
export type { ComponentData, MemoryStats, MemoryLevel };
