/**
 * useServiceSection Hook
 * Custom hook for the homepage "Service" section
 * Handles subcategory selection, API fetching for stores, and caching
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import storesApi from '@/services/storesApi';
import { SERVICE_SUBCATEGORIES, SERVICE_SECTION_CONFIG } from '@/config/serviceSectionConfig';

// Store type for the Service section
export interface ServiceSectionStore {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  banner: string | null;
  rating: {
    average: number;
    count: number;
  };
  category: string[];
  distance?: string;
  earnAmount: number;
  priceLevel?: string;
  location: {
    address: string;
    city: string;
  };
}

export interface UseServiceSectionReturn {
  activeSubcategory: string;
  stores: ServiceSectionStore[];
  loading: boolean;
  error: string | null;
  setActiveSubcategory: (id: string) => void;
  refreshStores: () => Promise<void>;
}

// Helper function to map backend store to section store
const mapBackendStoreToSection = (store: any): ServiceSectionStore => {
  // Extract image - prefer banner[0], then logo
  let banner: string | null = null;
  if (Array.isArray(store.banner) && store.banner.length > 0) {
    banner = store.banner[0];
  } else if (typeof store.banner === 'string') {
    banner = store.banner;
  }

  const logo = store.logo || null;

  // Calculate earn amount from cashback percentage
  const cashbackPercent = store.offers?.cashback || 0;
  const earnAmount = Math.round((cashbackPercent * SERVICE_SECTION_CONFIG.avgOrderValue) / 100);

  // Extract category/tags
  const category: string[] = [];
  if (Array.isArray(store.tags)) {
    category.push(...store.tags.slice(0, 3));
  }
  if (store.category?.name && !category.includes(store.category.name)) {
    category.unshift(store.category.name);
  }

  // Determine price level from minOrderAmount or tags
  let priceLevel = '₹₹';
  if (store.operationalInfo?.minimumOrder) {
    const minOrder = store.operationalInfo.minimumOrder;
    if (minOrder < 100) priceLevel = '₹';
    else if (minOrder < 300) priceLevel = '₹₹';
    else if (minOrder < 500) priceLevel = '₹₹₹';
    else priceLevel = '₹₹₹₹';
  }

  return {
    id: store._id || store.id,
    name: store.name,
    slug: store.slug,
    logo,
    banner,
    rating: {
      average: store.ratings?.average || 0,
      count: store.ratings?.count || 0,
    },
    category: category.slice(0, 3),
    distance: store.distance ? `${store.distance.toFixed(1)} km` : undefined,
    earnAmount,
    priceLevel,
    location: {
      address: store.location?.address || '',
      city: store.location?.city || '',
    },
  };
};

export function useServiceSection(): UseServiceSectionReturn {
  const [activeSubcategory, setActiveSubcategoryState] = useState(SERVICE_SUBCATEGORIES[0].id);
  const [stores, setStores] = useState<ServiceSectionStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cache stores by subcategory to avoid redundant API calls
  const cache = useRef<Record<string, ServiceSectionStore[]>>({});
  const fetchInProgress = useRef<Record<string, boolean>>({});

  const fetchStores = useCallback(async (subcategorySlug: string) => {
    // Check cache first
    if (cache.current[subcategorySlug] && cache.current[subcategorySlug].length > 0) {
      setStores(cache.current[subcategorySlug]);
      setLoading(false);
      setError(null);
      return;
    }

    // Prevent duplicate fetches
    if (fetchInProgress.current[subcategorySlug]) {
      return;
    }

    fetchInProgress.current[subcategorySlug] = true;
    setLoading(true);
    setError(null);

    try {
      const response = await storesApi.getStoresBySubcategorySlug(
        subcategorySlug,
        SERVICE_SECTION_CONFIG.storesPerCategory
      );


      if (response.success && response.data) {
        const rawStores = Array.isArray(response.data)
          ? response.data
          : (response.data.stores || []);

        if (rawStores.length > 0) {
        }

        const mappedStores = rawStores.map(mapBackendStoreToSection);

        if (mappedStores.length > 0) {
        }

        // Cache the results
        cache.current[subcategorySlug] = mappedStores;
        setStores(mappedStores);
        setError(null);
      } else {
        // If API returns no stores, set empty array (not an error)
        cache.current[subcategorySlug] = [];
        setStores([]);
        setError(null);
      }
    } catch (err: any) {
      setError('Failed to load. Tap to retry.');
      setStores([]);
    } finally {
      setLoading(false);
      fetchInProgress.current[subcategorySlug] = false;
    }
  }, []);

  const setActiveSubcategory = useCallback((id: string) => {
    setActiveSubcategoryState(id);
    const subcategory = SERVICE_SUBCATEGORIES.find(s => s.id === id);
    if (subcategory) {
      fetchStores(subcategory.slug);
    }
  }, [fetchStores]);

  const refreshStores = useCallback(async () => {
    // Clear cache for current subcategory and refetch
    const subcategory = SERVICE_SUBCATEGORIES.find(s => s.id === activeSubcategory);
    if (subcategory) {
      delete cache.current[subcategory.slug];
      await fetchStores(subcategory.slug);
    }
  }, [activeSubcategory, fetchStores]);

  // Fetch initial stores on mount
  useEffect(() => {
    const initialSubcategory = SERVICE_SUBCATEGORIES[0];
    if (initialSubcategory) {
      fetchStores(initialSubcategory.slug);
    }
  }, [fetchStores]);

  return {
    activeSubcategory,
    stores,
    loading,
    error,
    setActiveSubcategory,
    refreshStores,
  };
}

export default useServiceSection;
