// @ts-nocheck
/**
 * Prefetch Service
 *
 * Intelligent prefetching of homepage sections and data
 * Features:
 * - Sequential prefetching (next 2 sections)
 * - Predictive prefetching based on user behavior
 * - Background refresh of stale data
 * - Network-aware prefetching
 * - Priority-based queue
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import imageCacheService from './imageCacheService';
import imagePreloadService from './imagePreloadService';
import { HomepageSection, HomepageSectionItem } from '@/types/homepage.types';

export enum PrefetchPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

export enum NetworkType {
  WIFI = 'wifi',
  CELLULAR_5G = '5g',
  CELLULAR_4G = '4g',
  CELLULAR_3G = '3g',
  CELLULAR_2G = '2g',
  OFFLINE = 'offline',
  UNKNOWN = 'unknown',
}

interface PrefetchConfig {
  enabled: boolean;
  lookAhead: number; // How many sections to prefetch
  networkTypes: NetworkType[]; // Allowed network types
  priority: PrefetchPriority;
  maxConcurrent: number; // Max concurrent prefetch operations
  cacheExpiry: number; // Cache expiry in milliseconds
}

interface PrefetchTask {
  id: string;
  sectionId: string;
  priority: PrefetchPriority;
  timestamp: number;
  execute: () => Promise<void>;
}

interface UserContext {
  recentSections: string[];
  preferences: string[];
  browsing_history: string[];
}

/**
 * Prefetch Service Class
 */
class PrefetchService {
  private config: PrefetchConfig = {
    enabled: true,
    lookAhead: 2,
    networkTypes: [NetworkType.WIFI, NetworkType.CELLULAR_5G, NetworkType.CELLULAR_4G],
    priority: PrefetchPriority.NORMAL,
    maxConcurrent: 3,
    cacheExpiry: 5 * 60 * 1000, // 5 minutes
  };

  private currentNetwork: NetworkType = NetworkType.UNKNOWN;
  private networkUnsubscribe: (() => void) | null = null;
  private prefetchQueue: PrefetchTask[] = [];
  private activeTasks = new Set<string>();
  private prefetchedSections = new Map<string, number>(); // sectionId -> timestamp
  private userBehavior: UserContext = {
    recentSections: [],
    preferences: [],
    browsing_history: [],
  };

  constructor() {
    this.initNetworkListener();
  }

  /**
   * Initialize network state listener
   */
  private initNetworkListener(): void {
    // Clean up existing listener before adding new one
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    this.networkUnsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      this.currentNetwork = this.mapNetworkType(state);

      // Pause/resume prefetching based on network
      if (this.shouldPrefetch()) {
        this.processPrefetchQueue();
      } else {
      }
    });
  }

  /**
   * Destroy service and cleanup resources
   */
  public destroy(): void {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
    this.prefetchQueue = [];
    this.activeTasks.clear();
    this.prefetchedSections.clear();
  }

  /**
   * Map NetInfo state to NetworkType
   */
  private mapNetworkType(state: NetInfoState): NetworkType {
    if (!state.isConnected) return NetworkType.OFFLINE;

    const type = state.type;
    if (type === 'wifi') return NetworkType.WIFI;
    if (type === 'cellular') {
      // Try to determine cellular generation
      const details = state.details as any;
      if (details?.cellularGeneration) {
        const gen = details.cellularGeneration;
        if (gen === '5g') return NetworkType.CELLULAR_5G;
        if (gen === '4g') return NetworkType.CELLULAR_4G;
        if (gen === '3g') return NetworkType.CELLULAR_3G;
        if (gen === '2g') return NetworkType.CELLULAR_2G;
      }
      // Default to 4G if unknown
      return NetworkType.CELLULAR_4G;
    }

    return NetworkType.UNKNOWN;
  }

  /**
   * Update configuration
   */
  public configure(config: Partial<PrefetchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if prefetching should happen based on network
   */
  public shouldPrefetch(): boolean {
    if (!this.config.enabled) return false;
    if (this.currentNetwork === NetworkType.OFFLINE) return false;

    return this.config.networkTypes.includes(this.currentNetwork);
  }

  /**
   * Prefetch next sections sequentially
   */
  public async prefetchNextSections(
    currentSection: string,
    allSections: HomepageSection[]
  ): Promise<void> {
    if (!this.shouldPrefetch()) {
      return;
    }

    const currentIndex = allSections.findIndex(s => s.id === currentSection);
    if (currentIndex === -1) return;

    const nextSections = allSections.slice(
      currentIndex + 1,
      currentIndex + 1 + this.config.lookAhead
    );


    for (const section of nextSections) {
      await this.queueSectionPrefetch(section, PrefetchPriority.NORMAL);
    }

    this.processPrefetchQueue();
  }

  /**
   * Predictive prefetch based on user behavior
   */
  public async predictivePrefetch(
    userContext: UserContext,
    allSections: HomepageSection[]
  ): Promise<void> {
    if (!this.shouldPrefetch()) return;

    // Update user behavior tracking
    this.userBehavior = userContext;

    // Predict next likely sections based on patterns
    const predictions = this.predictNextSections(allSections);


    for (const sectionId of predictions) {
      const section = allSections.find(s => s.id === sectionId);
      if (section) {
        await this.queueSectionPrefetch(section, PrefetchPriority.LOW);
      }
    }

    this.processPrefetchQueue();
  }

  /**
   * Predict next sections user might view
   */
  private predictNextSections(allSections: HomepageSection[]): string[] {
    const predictions: string[] = [];

    // Pattern 1: Recent sections (user might go back)
    if (this.userBehavior.recentSections.length > 0) {
      const lastSection = this.userBehavior.recentSections[
        this.userBehavior.recentSections.length - 1
      ];
      const section = allSections.find(s => s.id === lastSection);
      if (section) {
        predictions.push(section.id);
      }
    }

    // Pattern 2: User preferences (prefetch preferred categories)
    if (this.userBehavior.preferences.length > 0) {
      const preferredSections = allSections.filter(s =>
        this.userBehavior.preferences.some(pref =>
          s.type.toLowerCase().includes(pref.toLowerCase())
        )
      );
      predictions.push(...preferredSections.slice(0, 2).map(s => s.id));
    }

    // Pattern 3: Common navigation patterns
    // e.g., trending -> new_arrivals -> just_for_you
    const commonPatterns = ['trending_stores', 'new_arrivals', 'just_for_you'];
    for (const pattern of commonPatterns) {
      if (allSections.find(s => s.id === pattern)) {
        predictions.push(pattern);
      }
    }

    return [...new Set(predictions)]; // Remove duplicates
  }

  /**
   * Queue section for prefetching
   */
  private async queueSectionPrefetch(
    section: HomepageSection,
    priority: PrefetchPriority
  ): Promise<void> {
    // Check if already prefetched recently
    const lastPrefetch = this.prefetchedSections.get(section.id);
    if (lastPrefetch && Date.now() - lastPrefetch < this.config.cacheExpiry) {
      return;
    }

    const task: PrefetchTask = {
      id: `${section.id}-${Date.now()}`,
      sectionId: section.id,
      priority,
      timestamp: Date.now(),
      execute: async () => {
        await this.prefetchSectionData(section);
      },
    };

    this.prefetchQueue.push(task);
    this.sortPrefetchQueue();
  }

  /**
   * Sort prefetch queue by priority
   */
  private sortPrefetchQueue(): void {
    const priorityOrder = {
      [PrefetchPriority.CRITICAL]: 0,
      [PrefetchPriority.HIGH]: 1,
      [PrefetchPriority.NORMAL]: 2,
      [PrefetchPriority.LOW]: 3,
    };

    this.prefetchQueue.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.timestamp - b.timestamp; // FIFO for same priority
    });
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    while (
      this.prefetchQueue.length > 0 &&
      this.activeTasks.size < this.config.maxConcurrent &&
      this.shouldPrefetch()
    ) {
      const task = this.prefetchQueue.shift();
      if (!task) break;

      this.activeTasks.add(task.id);

      // Execute task asynchronously
      task
        .execute()
        .then(() => {
          this.prefetchedSections.set(task.sectionId, Date.now());
        })
        .catch(() => {})
        .finally(() => {
          this.activeTasks.delete(task.id);
          // Process next task
          this.processPrefetchQueue();
        });
    }
  }

  /**
   * Prefetch section data (images, etc.)
   */
  private async prefetchSectionData(section: HomepageSection): Promise<void> {

    // Extract all image URLs from section items
    const imageUrls = this.extractImageUrls(section.items);

    // Prefetch images based on priority
    await this.prefetchImages(imageUrls, section.id);
  }

  /**
   * Extract image URLs from section items
   */
  private extractImageUrls(items: HomepageSectionItem[]): string[] {
    const urls: string[] = [];

    for (const item of items) {
      // Main image
      if (item.image) {
        urls.push(item.image);
      }

      // Additional images (if any)
      const itemAny = item as any;
      if (itemAny.images && Array.isArray(itemAny.images)) {
        urls.push(...itemAny.images.filter((img: any) => typeof img === 'string'));
      }
      if (itemAny.logo) {
        urls.push(itemAny.logo);
      }
      if (itemAny.brandLogo) {
        urls.push(itemAny.brandLogo);
      }
    }

    return urls;
  }

  /**
   * Prefetch images with priority
   */
  private async prefetchImages(imageUrls: string[], sectionId: string): Promise<void> {
    if (imageUrls.length === 0) return;


    // Prefetch first 5 images with high priority
    const criticalImages = imageUrls.slice(0, 5);
    const backgroundImages = imageUrls.slice(5);

    // Critical images in parallel
    await Promise.all(
      criticalImages.map(url =>
        imageCacheService.preload(url, 'high').catch(() => {})
      )
    );

    // Background images sequentially (don't block)
    for (const url of backgroundImages) {
      imageCacheService.preload(url, 'low').catch(() => {});
    }
  }

  /**
   * Background refresh of cached data
   */
  public async backgroundRefresh(sections: HomepageSection[]): Promise<void> {
    if (!this.shouldPrefetch()) return;


    for (const section of sections) {
      const lastPrefetch = this.prefetchedSections.get(section.id);

      // Refresh if older than cache expiry
      if (!lastPrefetch || Date.now() - lastPrefetch > this.config.cacheExpiry) {
        await this.queueSectionPrefetch(section, PrefetchPriority.LOW);
      }
    }

    this.processPrefetchQueue();
  }

  /**
   * Clear prefetch cache
   */
  public clearCache(): void {
    this.prefetchQueue = [];
    this.prefetchedSections.clear();
  }

  /**
   * Get prefetch statistics
   */
  public getStats(): {
    queueLength: number;
    activeTasks: number;
    prefetchedSections: number;
    currentNetwork: NetworkType;
    prefetchEnabled: boolean;
  } {
    return {
      queueLength: this.prefetchQueue.length,
      activeTasks: this.activeTasks.size,
      prefetchedSections: this.prefetchedSections.size,
      currentNetwork: this.currentNetwork,
      prefetchEnabled: this.shouldPrefetch(),
    };
  }
}

// Export singleton instance
const prefetchService = new PrefetchService();
export default prefetchService;
