import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { TabId } from '@/components/homepage/HomeTabSection';

// Legacy type alias for backward compatibility
export type HomeTabId = 'rez' | 'rez-mall' | 'cash-store';

const TAB_STORAGE_KEY = '@rez_active_tab';

const TAB_TO_LEGACY: Record<TabId, HomeTabId> = {
  'near-u': 'rez',
  'mall': 'rez-mall',
  'cash': 'cash-store',
  'prive': 'rez',
};

const LEGACY_TO_TAB: Record<HomeTabId, TabId> = {
  'rez': 'near-u',
  'rez-mall': 'mall',
  'cash-store': 'cash',
};

interface PriveEligibility {
  isEligible: boolean;
  score: number;
  tier: 'none' | 'entry' | 'signature' | 'elite';
  pillars: any[];
  trustScore: number;
  hasSeenGlowThisSession: boolean;
}

const DEFAULT_PRIVE_ELIGIBILITY: PriveEligibility = {
  isEligible: false,
  score: 0,
  tier: 'none',
  pillars: [],
  trustScore: 0,
  hasSeenGlowThisSession: false,
};

interface HomeTabState {
  activeTab: TabId;
  isLoaded: boolean;
  isTransitioning: boolean;
  priveEligibility: PriveEligibility;

  // Derived (computed from activeTab)
  activeHomeTab: HomeTabId;
  isNearUActive: boolean;
  isMallActive: boolean;
  isCashActive: boolean;
  isPriveActive: boolean;
  isRezMallActive: boolean;
  isCashStoreActive: boolean;
  isPriveEligible: boolean;

  // Actions
  setActiveTab: (tab: TabId) => void;
  setActiveHomeTab: (tab: HomeTabId) => void;
  refreshPriveEligibility: () => Promise<void>;
  markPriveGlowSeen: () => void;
  loadPersistedTab: () => void;

  // Scroll to top
  scrollToTop: () => void;
  registerScrollToTop: (callback: () => void) => void;
}

// Scroll callback stored outside Zustand (ref-like behavior)
let _scrollToTopCallback: (() => void) | null = null;
let _transitionTimer: ReturnType<typeof setTimeout> | null = null;

export const useHomeTabStore = create<HomeTabState>((set) => ({
  activeTab: 'near-u',
  isLoaded: false,
  isTransitioning: false,
  priveEligibility: DEFAULT_PRIVE_ELIGIBILITY,

  // Derived
  activeHomeTab: 'rez',
  isNearUActive: true,
  isMallActive: false,
  isCashActive: false,
  isPriveActive: false,
  isRezMallActive: false,
  isCashStoreActive: false,
  isPriveEligible: false,

  setActiveTab: (tab: TabId) => {
    set({
      activeTab: tab,
      isTransitioning: true,
      activeHomeTab: TAB_TO_LEGACY[tab],
      isNearUActive: tab === 'near-u',
      isMallActive: tab === 'mall',
      isCashActive: tab === 'cash',
      isPriveActive: tab === 'prive',
      isRezMallActive: tab === 'mall',
      isCashStoreActive: tab === 'cash',
    });

    // Persist
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TAB_STORAGE_KEY, tab);
      }
      AsyncStorage.setItem(TAB_STORAGE_KEY, tab).catch(() => {});
    } catch {}

    // End transition
    if (_transitionTimer) clearTimeout(_transitionTimer);
    _transitionTimer = setTimeout(() => {
      set({ isTransitioning: false });
    }, 250);
  },

  setActiveHomeTab: (tab: HomeTabId) => {
    const newTab = LEGACY_TO_TAB[tab] || 'near-u';
    useHomeTabStore.getState().setActiveTab(newTab);
  },

  refreshPriveEligibility: async () => {
    // TODO: Fetch from backend API /api/prive/eligibility
  },

  markPriveGlowSeen: () => {
    set((state) => ({
      priveEligibility: {
        ...state.priveEligibility,
        hasSeenGlowThisSession: true,
      },
    }));
  },

  loadPersistedTab: () => {
    const validTabs = ['near-u', 'mall', 'cash', 'prive'];

    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      try {
        const storedTab = window.localStorage.getItem(TAB_STORAGE_KEY);
        if (storedTab && validTabs.includes(storedTab)) {
          const tab = storedTab as TabId;
          set({
            activeTab: tab,
            activeHomeTab: TAB_TO_LEGACY[tab],
            isNearUActive: tab === 'near-u',
            isMallActive: tab === 'mall',
            isCashActive: tab === 'cash',
            isPriveActive: tab === 'prive',
            isRezMallActive: tab === 'mall',
            isCashStoreActive: tab === 'cash',
          });
        }
      } catch {}
      set({ isLoaded: true });
      return;
    }

    AsyncStorage.getItem(TAB_STORAGE_KEY).then(storedTab => {
      if (storedTab && validTabs.includes(storedTab)) {
        const tab = storedTab as TabId;
        set({
          activeTab: tab,
          activeHomeTab: TAB_TO_LEGACY[tab],
          isNearUActive: tab === 'near-u',
          isMallActive: tab === 'mall',
          isCashActive: tab === 'cash',
          isPriveActive: tab === 'prive',
          isRezMallActive: tab === 'mall',
          isCashStoreActive: tab === 'cash',
        });
      }
    }).catch(() => {}).finally(() => set({ isLoaded: true }));
  },

  scrollToTop: () => {
    if (_scrollToTopCallback) _scrollToTopCallback();
  },

  registerScrollToTop: (callback: () => void) => {
    _scrollToTopCallback = callback;
  },
}));

// Auto-load persisted tab on import
useHomeTabStore.getState().loadPersistedTab();
