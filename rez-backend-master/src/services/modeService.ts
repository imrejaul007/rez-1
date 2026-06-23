/**
 * Mode Service
 *
 * Handles mode-specific filtering for the 4-mode system:
 * - near-u: Local stores, nearby deals, location-based
 * - mall: Curated brands, Store.deliveryCategories.mall === true
 * - cash: Cashback deals, Store.deliveryCategories.cashStore === true
 * - prive: Exclusive stores/products (requires eligibility)
 */

import { FilterQuery } from 'mongoose';

// Mode types
export type ModeId = 'near-u' | 'mall' | 'cash' | 'prive';

// Filter criteria for stores
export interface StoreFilterCriteria {
  'deliveryCategories.mall'?: boolean;
  'deliveryCategories.cashStore'?: boolean;
  'deliveryCategories.premium'?: boolean;
  isActive?: boolean;
  [key: string]: any;
}

// Filter criteria for products
export interface ProductFilterCriteria {
  isActive?: boolean;
  store?: { $in: string[] };
  [key: string]: any;
}

// Homepage sections per mode
export interface ModeHomepageSections {
  sections: string[];
  excludeSections?: string[];
}

// Mode configuration
interface ModeConfig {
  id: ModeId;
  storeFilter: StoreFilterCriteria;
  productFilter: ProductFilterCriteria;
  homepageSections: ModeHomepageSections;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Mode configurations
const MODE_CONFIGS: Record<ModeId, ModeConfig> = {
  'near-u': {
    id: 'near-u',
    storeFilter: {
      isActive: true,
    },
    productFilter: {
      isActive: true,
    },
    homepageSections: {
      sections: [
        'nearbyOffers',
        'featuredProducts',
        'trendingStores',
        'newArrivals',
        'categories',
        'megaOffers',
        'studentOffers',
      ],
    },
    sortBy: 'distance',
    sortOrder: 'asc',
  },
  'mall': {
    id: 'mall',
    storeFilter: {
      isActive: true,
      'deliveryCategories.mall': true,
    },
    productFilter: {
      isActive: true,
    },
    homepageSections: {
      sections: [
        'featuredBrands',
        'mallExclusives',
        'curatedCollections',
        'newArrivals',
        'trendingProducts',
        'topBrands',
      ],
      excludeSections: ['nearbyOffers', 'studentOffers'],
    },
    sortBy: 'popularity',
    sortOrder: 'desc',
  },
  'cash': {
    id: 'cash',
    storeFilter: {
      isActive: true,
      'deliveryCategories.cashStore': true,
    },
    productFilter: {
      isActive: true,
    },
    homepageSections: {
      sections: [
        'topCashback',
        'cashbackDeals',
        'limitedTimeOffers',
        'featuredProducts',
        'categories',
      ],
      excludeSections: ['nearbyOffers', 'mallExclusives'],
    },
    sortBy: 'cashbackPercent',
    sortOrder: 'desc',
  },
  'prive': {
    id: 'prive',
    storeFilter: {
      isActive: true,
      'deliveryCategories.premium': true,
    },
    productFilter: {
      isActive: true,
    },
    homepageSections: {
      sections: [
        'priveExclusives',
        'premiumBrands',
        'memberOnlyDeals',
        'luxuryCollections',
        'earlyAccess',
      ],
      excludeSections: ['nearbyOffers', 'studentOffers', 'cashbackDeals'],
    },
    sortBy: 'exclusivity',
    sortOrder: 'desc',
  },
};

class ModeService {
  /**
   * Validate mode ID
   */
  isValidMode(mode: string): mode is ModeId {
    return ['near-u', 'mall', 'cash', 'prive'].includes(mode);
  }

  /**
   * Get mode config
   */
  getModeConfig(mode: ModeId): ModeConfig {
    return MODE_CONFIGS[mode] || MODE_CONFIGS['near-u'];
  }

  /**
   * Get store filter criteria for a mode
   */
  getStoreFilter(mode: ModeId): StoreFilterCriteria {
    return this.getModeConfig(mode).storeFilter;
  }

  /**
   * Get product filter criteria for a mode
   */
  getProductFilter(mode: ModeId): ProductFilterCriteria {
    return this.getModeConfig(mode).productFilter;
  }

  /**
   * Get homepage sections for a mode
   */
  getHomepageSections(mode: ModeId): string[] {
    return this.getModeConfig(mode).homepageSections.sections;
  }

  /**
   * Check if a section should be shown for a mode
   */
  shouldShowSection(mode: ModeId, section: string): boolean {
    const config = this.getModeConfig(mode);
    const { sections, excludeSections } = config.homepageSections;

    // If explicitly excluded, don't show
    if (excludeSections?.includes(section)) {
      return false;
    }

    // If sections list is empty or section is in list, show it
    return sections.length === 0 || sections.includes(section);
  }

  /**
   * Apply mode filter to store query
   */
  applyModeToStoreQuery(query: FilterQuery<any>, mode: ModeId): FilterQuery<any> {
    const modeFilter = this.getStoreFilter(mode);
    return {
      ...query,
      ...modeFilter,
    };
  }

  /**
   * Apply mode filter to product query
   */
  applyModeToProductQuery(query: FilterQuery<any>, mode: ModeId): FilterQuery<any> {
    const modeFilter = this.getProductFilter(mode);
    return {
      ...query,
      ...modeFilter,
    };
  }

  /**
   * Get sort configuration for mode
   */
  getSortConfig(mode: ModeId): { sortBy: string; sortOrder: 'asc' | 'desc' } {
    const config = this.getModeConfig(mode);
    return {
      sortBy: config.sortBy || 'createdAt',
      sortOrder: config.sortOrder || 'desc',
    };
  }

  /**
   * Apply location filter for near-u mode
   */
  applyLocationFilter(
    query: FilterQuery<any>,
    mode: ModeId,
    location?: { lat: number; lng: number; radiusKm?: number }
  ): FilterQuery<any> {
    if (mode !== 'near-u' || !location) {
      return query;
    }

    const radiusInMeters = (location.radiusKm || 10) * 1000; // Default 10km

    return {
      ...query,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [location.lng, location.lat],
          },
          $maxDistance: radiusInMeters,
        },
      },
    };
  }

  /**
   * Get mode from request query or user settings
   */
  getModeFromRequest(
    queryMode?: string,
    userActiveMode?: string
  ): ModeId {
    // Priority: query param > user preference > default
    if (queryMode && this.isValidMode(queryMode)) {
      return queryMode;
    }
    if (userActiveMode && this.isValidMode(userActiveMode)) {
      return userActiveMode;
    }
    return 'near-u';
  }

  /**
   * Filter homepage data by mode
   */
  filterHomepageData<T extends { section?: string; type?: string }>(
    data: T[],
    mode: ModeId
  ): T[] {
    const config = this.getModeConfig(mode);
    const { excludeSections } = config.homepageSections;

    if (!excludeSections || excludeSections.length === 0) {
      return data;
    }

    return data.filter(item => {
      const section = item.section || item.type;
      return !section || !excludeSections.includes(section);
    });
  }

  /**
   * Get cashback sort for cash mode
   */
  getCashbackSort(): { [key: string]: 1 | -1 } {
    return { 'cashback.percentage': -1, 'cashback.amount': -1 };
  }

  /**
   * Get premium sort for prive mode
   */
  getPremiumSort(): { [key: string]: 1 | -1 } {
    return { isPremium: -1, 'ratings.average': -1, 'ratings.count': -1 };
  }
}

// Export singleton instance
export const modeService = new ModeService();
export default modeService;
