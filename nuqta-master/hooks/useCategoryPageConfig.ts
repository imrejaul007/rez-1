/**
 * Hook for Dynamic Category Page Configuration
 * Fetches page configuration from the backend for any category slug.
 * Returns theme, tabs, sections, service types, and all layout data
 * needed to render a fully dynamic category page.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import categoriesApi, {
  Category,
  CategoryVibe,
  CategoryOccasion,
  CategoryHashtag,
  CategoryPageConfig,
} from '@/services/categoriesApi';
import { colors } from '@/constants/theme';

interface UseCategoryPageConfigResult {
  // Page config (main return)
  pageConfig: CategoryPageConfig | null;

  // Extracted top-level fields for convenience
  category: Category | null;
  childCategories: Category[];
  vibes: CategoryVibe[];
  occasions: CategoryOccasion[];
  trendingHashtags: CategoryHashtag[];
  stats: {
    storeCount: number;
    productCount: number;
  };

  // Loading & Error States
  isLoading: boolean;
  error: string | null;

  // Actions
  refetch: () => Promise<void>;
}

// In-memory cache for page configs to avoid redundant fetches within a session
const configCache: Record<string, { config: CategoryPageConfig; category: Category | null; timestamp: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_ENTRIES = 50;

function evictExpiredCache() {
  const now = Date.now();
  const keys = Object.keys(configCache);
  for (const key of keys) {
    if (now - configCache[key].timestamp > CACHE_TTL_MS) {
      delete configCache[key];
    }
  }
  // If still over limit, remove oldest
  const remaining = Object.keys(configCache);
  if (remaining.length > MAX_CACHE_ENTRIES) {
    remaining
      .sort((a, b) => configCache[a].timestamp - configCache[b].timestamp)
      .slice(0, remaining.length - MAX_CACHE_ENTRIES)
      .forEach(key => delete configCache[key]);
  }
}

export const useCategoryPageConfig = (slug: string): UseCategoryPageConfigResult => {
  // Initialize from cache if available (prevents loading flash on remount from DeferredProviders)
  const cachedEntry = slug ? configCache[slug] : undefined;
  const hasFreshCache = cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS;

  const [pageConfig, setPageConfig] = useState<CategoryPageConfig | null>(() => hasFreshCache ? cachedEntry!.config : null);
  const [category, setCategory] = useState<Category | null>(() => hasFreshCache ? cachedEntry!.category : null);
  const [childCategories, setChildCategories] = useState<Category[]>(() => hasFreshCache && cachedEntry!.category?.childCategories ? cachedEntry!.category.childCategories : []);
  const [vibes, setVibes] = useState<CategoryVibe[]>(() => hasFreshCache && cachedEntry!.category?.vibes ? cachedEntry!.category.vibes : []);
  const [occasions, setOccasions] = useState<CategoryOccasion[]>(() => hasFreshCache && cachedEntry!.category?.occasions ? cachedEntry!.category.occasions : []);
  const [trendingHashtags, setTrendingHashtags] = useState<CategoryHashtag[]>(() => hasFreshCache && cachedEntry!.category?.trendingHashtags ? cachedEntry!.category.trendingHashtags : []);
  const [stats, setStats] = useState<{ storeCount: number; productCount: number }>(() => hasFreshCache && cachedEntry!.category ? { storeCount: cachedEntry!.category.storeCount || 0, productCount: cachedEntry!.category.productCount || 0 } : { storeCount: 0, productCount: 0 });
  const [isLoading, setIsLoading] = useState(() => !hasFreshCache);
  const [error, setError] = useState<string | null>(null);

  // Track if component is mounted to avoid state updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Fetch page config from backend, with cache check
   */
  const fetchPageConfig = useCallback(async () => {
    if (!slug) return;

    // Check cache first
    const cached = configCache[slug];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      if (mountedRef.current) {
        applyConfig(cached.config, cached.category);
        setIsLoading(false);
      }
      return;
    }

    try {
      if (mountedRef.current) {
        setIsLoading(true);
        setError(null);
      }


      // Fetch page config and category data in parallel
      const [configRes, categoryRes] = await Promise.all([
        categoriesApi.getPageConfig(slug),
        categoriesApi.getCategoryPageData(slug),
      ]);

      if (!mountedRef.current) return;

      let configData: CategoryPageConfig | null = null;
      let categoryData: Category | null = null;

      // Process category data
      if (categoryRes.success && categoryRes.data) {
        categoryData = categoryRes.data;
        setCategory(categoryData);

        // Extract child categories
        if (categoryData.childCategories && Array.isArray(categoryData.childCategories)) {
          setChildCategories(categoryData.childCategories);
        }

        // Extract vibes, occasions, hashtags
        setVibes(categoryData.vibes || []);
        setOccasions(categoryData.occasions || []);
        setTrendingHashtags(categoryData.trendingHashtags || []);

        // Extract stats
        setStats({
          storeCount: categoryData.storeCount || 0,
          productCount: categoryData.productCount || 0,
        });
      }

      // Process page config
      // Backend returns { category, pageConfig, childCategories, vibes, ... }
      // Extract the nested pageConfig and merge with category info
      if (configRes.success && configRes.data) {
        const raw = configRes.data as any;
        const nestedConfig = raw.pageConfig || raw;
        const catInfo = raw.category || {};
        const categoryName = nestedConfig.categoryName || catInfo.name || slug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
        const primaryColor = nestedConfig.theme?.primaryColor || catInfo.metadata?.color || '#FF6B35';

        // Fallback defaults for tabs/sections when DB hasn't been configured
        const defaultTabs = [
          { id: 'all', label: 'All', icon: 'grid-outline', enabled: true, sortOrder: 0 },
          { id: 'offers', label: 'Offers', icon: 'pricetag-outline', sectionOverride: 'offers', enabled: true, sortOrder: 1 },
          { id: 'experiences', label: 'Experiences', icon: 'sparkles-outline', sectionOverride: 'experiences', enabled: true, sortOrder: 2 },
        ];
        const defaultSections = [
          { id: 'browse-grid', type: 'browse-grid', title: 'Browse Categories', sortOrder: 1, enabled: true },
          { id: 'stores-list', type: 'stores-list', title: `All ${categoryName}`, sortOrder: 2, enabled: true },
          { id: 'loyalty-hub', type: 'loyalty-hub', title: 'Loyalty Hub', sortOrder: 3, enabled: true },
          { id: 'ugc-social', type: 'ugc-social', title: 'What People Are Saying', sortOrder: 4, enabled: true },
        ];

        configData = {
          ...nestedConfig,
          categorySlug: nestedConfig.categorySlug || catInfo.slug || slug,
          categoryName,
          theme: nestedConfig.theme?.primaryColor ? nestedConfig.theme : {
            primaryColor,
            gradientColors: [primaryColor, lightenColor(primaryColor, 20), lightenColor(primaryColor, 50)],
            accentColor: primaryColor,
            backgroundColor: colors.tint.warmGray,
          },
          tabs: nestedConfig.tabs?.length ? nestedConfig.tabs : defaultTabs,
          sections: nestedConfig.sections?.length ? nestedConfig.sections : defaultSections,
        };
        setPageConfig(configData);

        // Also extract child categories / vibes / stats from config response if category response failed
        if (!categoryData && raw.childCategories) {
          setChildCategories(raw.childCategories);
        }
        if (!categoryData && raw.vibes) setVibes(raw.vibes);
        if (!categoryData && raw.occasions) setOccasions(raw.occasions);
        if (!categoryData && raw.trendingHashtags) setTrendingHashtags(raw.trendingHashtags);
        if (!categoryData && raw.stats) {
          setStats({
            storeCount: raw.stats.totalStores || 0,
            productCount: raw.stats.productCount || 0,
          });
        }
      } else {
        // Config endpoint may not exist yet for this category - build a fallback config
        configData = buildFallbackConfig(slug, categoryData);
        setPageConfig(configData);
      }

      // Cache the result
      if (configData) {
        evictExpiredCache();
        configCache[slug] = {
          config: configData,
          category: categoryData,
          timestamp: Date.now(),
        };
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load page configuration');

        // Build fallback config from whatever category data we have
        const fallbackConfig = buildFallbackConfig(slug, category);
        setPageConfig(fallbackConfig);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [slug]);

  /**
   * Apply a config + category to all state fields
   */
  const applyConfig = (config: CategoryPageConfig, cat: Category | null) => {
    setPageConfig(config);
    if (cat) {
      setCategory(cat);
      setChildCategories(cat.childCategories || []);
      setVibes(cat.vibes || []);
      setOccasions(cat.occasions || []);
      setTrendingHashtags(cat.trendingHashtags || []);
      setStats({
        storeCount: cat.storeCount || 0,
        productCount: cat.productCount || 0,
      });
    }
  };

  /**
   * Build a fallback config when the backend page-config endpoint is not available.
   * Uses category data + sensible defaults.
   */
  const buildFallbackConfig = (categorySlug: string, cat: Category | null): CategoryPageConfig => {
    const categoryName = cat?.name || categorySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    const primaryColor = cat?.metadata?.color || '#FF6B35';

    return {
      categorySlug,
      categoryName,
      theme: {
        primaryColor,
        gradientColors: [primaryColor, lightenColor(primaryColor, 20), lightenColor(primaryColor, 50)],
        accentColor: primaryColor,
        backgroundColor: colors.tint.warmGray,
      },
      banner: {
        title: categoryName,
        subtitle: 'Explore the best',
        discount: '',
        tag: 'TRENDING',
      },
      tabs: [
        { id: 'all', label: 'All', icon: 'grid-outline' },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', sectionOverride: 'offers' },
        { id: 'experiences', label: 'Experiences', icon: 'sparkles-outline', sectionOverride: 'experiences' },
      ],
      quickActions: [],
      sections: [
        { id: 'browse-grid', type: 'browse-grid', title: 'Browse Categories', sortOrder: 1, enabled: true },
        { id: 'stores-list', type: 'stores-list', title: `All ${categoryName}`, sortOrder: 2, enabled: true },
        { id: 'loyalty-hub', type: 'loyalty-hub', title: 'Loyalty Hub', sortOrder: 3, enabled: true },
        { id: 'ugc-social', type: 'ugc-social', title: 'What People Are Saying', sortOrder: 4, enabled: true },
      ],
      serviceTypes: [],
      searchPlaceholders: {
        all: [`Search in ${categoryName}...`, `Find the best ${categoryName.toLowerCase()}...`],
      },
      valuePropItems: [
        { icon: 'cash-outline', text: 'Cashback on every order', color: colors.successScale[400] },
        { icon: 'wallet-outline', text: 'Earn coins to reuse', color: colors.warningScale[400] },
        { icon: 'gift-outline', text: 'Loyalty rewards', color: '#F472B6' },
      ],
    };
  };

  /**
   * Refetch: clears cache and refetches
   */
  const refetch = useCallback(async () => {
    // Clear cache for this slug
    delete configCache[slug];
    await fetchPageConfig();
  }, [slug, fetchPageConfig]);

  // Initial fetch
  useEffect(() => {
    fetchPageConfig();
  }, [fetchPageConfig]);

  return {
    pageConfig,
    category,
    childCategories,
    vibes,
    occasions,
    trendingHashtags,
    stats,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Simple color lightening utility. Takes a hex color and lightens it by a percentage.
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + Math.round(255 * percent / 100));
  const g = Math.min(255, ((num >> 8) & 0xFF) + Math.round(255 * percent / 100));
  const b = Math.min(255, (num & 0xFF) + Math.round(255 * percent / 100));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export default useCategoryPageConfig;
