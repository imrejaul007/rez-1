import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient, { setRegionGetter } from '@/services/apiClient';
import { setEventsApiRegionGetter } from '@/services/eventsApi';
import { setEventReviewApiRegionGetter } from '@/services/eventReviewApi';
import { setCategoryCurrencyGetter } from '@/contexts/CategoryContext';

// Lazy-loaded: homepageDataService imports 9+ API services + cacheService + pako
let _setHomepageCurrencyGetter: any = null;
const initHomepageSetter = import('@/services/homepageDataService').then((m) => {
  _setHomepageCurrencyGetter = m.setHomepageCurrencyGetter;
  return m;
});
const getHomepageDataService = async () => (await initHomepageSetter).default;

// ── Types ──

export type RegionId = 'bangalore' | 'dubai';

export interface RegionConfig {
  id: RegionId;
  name: string;
  displayName: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  countryCode: string;
  defaultCoordinates: {
    longitude: number;
    latitude: number;
  };
}

// ── Constants ──

const REGION_STORAGE_KEY = 'user_region';
const DEFAULT_REGION: RegionId = 'bangalore';

const DEFAULT_CONFIGS: Record<RegionId, RegionConfig> = {
  bangalore: {
    id: 'bangalore',
    name: 'Bangalore',
    displayName: 'Bangalore, India',
    currency: 'INR',
    currencySymbol: '\u20B9',
    locale: 'en-IN',
    timezone: 'Asia/Kolkata',
    countryCode: 'IN',
    defaultCoordinates: { latitude: 12.9716, longitude: 77.5946 },
  },
  dubai: {
    id: 'dubai',
    name: 'Dubai',
    displayName: 'Dubai, UAE',
    currency: 'AED',
    currencySymbol: '\u062F.\u0625',
    locale: 'en-AE',
    timezone: 'Asia/Dubai',
    countryCode: 'AE',
    defaultCoordinates: { latitude: 25.2048, longitude: 55.2708 },
  },
};

// ── Utilities ──

function isValidRegion(region: string): region is RegionId {
  return ['bangalore', 'dubai'].includes(region);
}

// Cart clear callback (set by CartContext)
let onRegionChangeCallback: (() => Promise<void>) | null = null;

export function setOnRegionChangeCallback(callback: (() => Promise<void>) | null) {
  onRegionChangeCallback = callback;
}

// ── Store ──

interface RegionState {
  currentRegion: RegionId;
  regionConfig: RegionConfig | null;
  availableRegions: RegionConfig[];
  isLoading: boolean;
  isDetecting: boolean;
  error: string | null;
  isInitialized: boolean;
}

interface RegionStoreState {
  state: RegionState;

  // Actions
  setRegion: (regionId: RegionId, skipCartClear?: boolean) => Promise<void>;
  detectRegion: () => Promise<RegionId>;
  getRegionHeader: () => Record<string, string>;
  clearError: () => void;
  formatPrice: (amount: number) => string;
  getCurrency: () => string;
  getCurrencySymbol: () => string;
  getLocale: () => string;
  _initialize: () => void;

  // Convenience accessors (for components that destructure e.g. { currentRegion, currency })
  currentRegion: RegionId;
  currency: string;
}

// Cache timestamps to avoid redundant API calls
let regionConfigFetchedAt: Record<string, number> = {};
let availableRegionsFetchedAt = 0;
const REGION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchRegionConfigFromServer(regionId: RegionId) {
  const now = Date.now();
  if (now - (regionConfigFetchedAt[regionId] || 0) < REGION_CACHE_TTL) return;
  try {
    const response = await apiClient.get(`/location/region/${regionId}`);
    if (response.success && response.data?.region) {
      regionConfigFetchedAt[regionId] = now;
      const serverConfig = response.data.region as RegionConfig;
      useRegionStore.setState((s) => ({
        state: {
          ...s.state,
          currentRegion: regionId,
          regionConfig: serverConfig,
          isLoading: false,
          isDetecting: false,
          error: null,
        },
      }));
    }
  } catch {
    // silently handle
  }
}

async function fetchAvailableRegions() {
  const now = Date.now();
  if (now - availableRegionsFetchedAt < REGION_CACHE_TTL) return;
  try {
    const response = await apiClient.get('/location/regions');
    if (response.success && response.data?.regions) {
      availableRegionsFetchedAt = now;
      useRegionStore.setState((s) => ({
        state: { ...s.state, availableRegions: response.data.regions },
      }));
    }
  } catch {
    // silently handle
  }
}

/** Update all region getter callbacks */
function syncRegionGetters(regionId: RegionId, config: RegionConfig | null) {
  // Update global apiClient region
  apiClient.setRegion(regionId);

  const regionGetter = () => regionId;
  const currencySymbolGetter = () =>
    config?.currencySymbol || DEFAULT_CONFIGS[DEFAULT_REGION].currencySymbol;

  setRegionGetter(regionGetter);
  setEventsApiRegionGetter(regionGetter);
  setEventReviewApiRegionGetter(regionGetter);
  setCategoryCurrencyGetter(currencySymbolGetter);

  if (_setHomepageCurrencyGetter) {
    _setHomepageCurrencyGetter(currencySymbolGetter);
  } else {
    initHomepageSetter.then(() => _setHomepageCurrencyGetter?.(currencySymbolGetter));
  }
}

export const useRegionStore = create<RegionStoreState>((set, get) => ({
  state: {
    currentRegion: DEFAULT_REGION,
    regionConfig: DEFAULT_CONFIGS[DEFAULT_REGION],
    availableRegions: Object.values(DEFAULT_CONFIGS),
    isLoading: true,
    isDetecting: false,
    error: null,
    isInitialized: false,
  },

  // Convenience accessors
  currentRegion: DEFAULT_REGION,
  currency: DEFAULT_CONFIGS[DEFAULT_REGION].currency,

  _initialize: async () => {
    try {
      // Read stored region
      let stored: string | null = null;
      if (typeof window !== 'undefined' && window.localStorage) {
        stored = window.localStorage.getItem(REGION_STORAGE_KEY);
      }
      if (!stored) {
        stored = await AsyncStorage.getItem(REGION_STORAGE_KEY);
      }
      const regionId: RegionId = stored && isValidRegion(stored) ? stored : DEFAULT_REGION;
      const config = DEFAULT_CONFIGS[regionId];

      // Sync getters immediately
      syncRegionGetters(regionId, config);

      set({
        state: {
          ...get().state,
          currentRegion: regionId,
          regionConfig: config,
          isLoading: false,
          isDetecting: false,
          error: null,
          isInitialized: true,
        },
        currentRegion: regionId,
        currency: config.currency,
      });

      // Only write to storage if it wasn't already set
      if (!stored) {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(REGION_STORAGE_KEY, regionId);
        }
        AsyncStorage.setItem(REGION_STORAGE_KEY, regionId).catch(() => {});
      }

      // Fetch fresh configs from server
      fetchRegionConfigFromServer(regionId);
      fetchAvailableRegions();
    } catch {
      const config = DEFAULT_CONFIGS[DEFAULT_REGION];
      syncRegionGetters(DEFAULT_REGION, config);
      set({
        state: {
          ...get().state,
          currentRegion: DEFAULT_REGION,
          regionConfig: config,
          isLoading: false,
          isInitialized: true,
        },
        currentRegion: DEFAULT_REGION,
        currency: config.currency,
      });
    }
  },

  setRegion: async (regionId: RegionId, skipCartClear = false) => {
    try {
      set((s) => ({ state: { ...s.state, isLoading: true } }));

      const config = DEFAULT_CONFIGS[regionId] || null;
      if (!config) throw new Error('Invalid region');

      const prevRegion = get().state.currentRegion;

      // Clear cart when switching regions (different currencies)
      if (!skipCartClear && prevRegion !== regionId && onRegionChangeCallback) {
        try {
          await onRegionChangeCallback();
        } catch {
          // silently handle
        }
      }

      // Clear homepage cache when switching regions
      if (prevRegion !== regionId) {
        try {
          await (await getHomepageDataService()).clearCache();
        } catch {
          // silently handle
        }
        try {
          apiClient.cancelAllRequests();
        } catch {
          // silently handle
        }
      }

      // Sync getters FIRST before state change
      syncRegionGetters(regionId, config);

      set({
        state: {
          ...get().state,
          currentRegion: regionId,
          regionConfig: config,
          isLoading: false,
          isDetecting: false,
          error: null,
        },
        currentRegion: regionId,
        currency: config.currency,
      });

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(REGION_STORAGE_KEY, regionId);
      }
      await AsyncStorage.setItem(REGION_STORAGE_KEY, regionId);

      fetchRegionConfigFromServer(regionId);
    } catch {
      set((s) => ({
        state: { ...s.state, error: 'Failed to set region', isLoading: false },
      }));
    }
  },

  detectRegion: async (): Promise<RegionId> => {
    try {
      set((s) => ({ state: { ...s.state, isDetecting: true } }));

      const response = await apiClient.get('/location/region/detect');
      if (response.success && response.data?.region) {
        const { region, config } = response.data;
        syncRegionGetters(region, config);

        set({
          state: {
            ...get().state,
            currentRegion: region,
            regionConfig: config,
            isDetecting: false,
          },
          currentRegion: region,
          currency: config?.currency || DEFAULT_CONFIGS[DEFAULT_REGION].currency,
        });

        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(REGION_STORAGE_KEY, region);
        }
        await AsyncStorage.setItem(REGION_STORAGE_KEY, region);
        return region;
      }

      throw new Error('Invalid response from region detection');
    } catch {
      const config = DEFAULT_CONFIGS[DEFAULT_REGION];
      syncRegionGetters(DEFAULT_REGION, config);
      set({
        state: {
          ...get().state,
          currentRegion: DEFAULT_REGION,
          regionConfig: config,
          isDetecting: false,
        },
        currentRegion: DEFAULT_REGION,
        currency: config.currency,
      });
      return DEFAULT_REGION;
    }
  },

  getRegionHeader: (): Record<string, string> => {
    return { 'X-Rez-Region': get().state.currentRegion };
  },

  clearError: () => {
    set((s) => ({ state: { ...s.state, error: null } }));
  },

  formatPrice: (amount: number): string => {
    const config = get().state.regionConfig || DEFAULT_CONFIGS[DEFAULT_REGION];
    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${config.currencySymbol}${amount.toFixed(2)}`;
    }
  },

  getCurrency: (): string => {
    return get().state.regionConfig?.currency || DEFAULT_CONFIGS[DEFAULT_REGION].currency;
  },

  getCurrencySymbol: (): string => {
    return (
      get().state.regionConfig?.currencySymbol || DEFAULT_CONFIGS[DEFAULT_REGION].currencySymbol
    );
  },

  getLocale: (): string => {
    return get().state.regionConfig?.locale || DEFAULT_CONFIGS[DEFAULT_REGION].locale;
  },
}));

// Initialize on import — reads stored region, sets apiClient headers
useRegionStore.getState()._initialize();

/**
 * Global getter for non-React code that needs current region.
 * (e.g. apiClient region getter)
 */
export function getCurrentRegion(): RegionId {
  return useRegionStore.getState().state.currentRegion;
}
