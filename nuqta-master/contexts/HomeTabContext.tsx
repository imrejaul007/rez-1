/**
 * HomeTabContext
 *
 * 4-mode system (near-u, mall, cash, prive) with Privé eligibility gating
 * and legacy API compatibility for the rez/rez-mall/cash-store tab names.
 *
 * - Loads persisted mode on mount via useModePersistence
 * - Reads Privé eligibility via usePriveEligibility
 * - Blocks switching to prive when not eligible
 * - Exposes legacy setActiveHomeTab / isRezMallActive / isCashStoreActive for
 *   backward compatibility with code that still uses the old tab names.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ModeId } from '@/types/mode.types';
import { useModePersistence } from '@/hooks/useModePersistence';
import { usePriveEligibility } from '@/hooks/usePriveEligibility';

// Legacy tab names that older code still uses.
export type HomeTabId = 'rez' | 'rez-mall' | 'cash-store';

// Mapping: ModeId -> legacy tab name
const MODE_TO_LEGACY: Record<ModeId, HomeTabId> = {
  'near-u': 'rez',
  mall: 'rez-mall',
  cash: 'cash-store',
  prive: 'rez',
};

// Mapping: legacy tab name -> ModeId
const LEGACY_TO_MODE: Record<HomeTabId, ModeId> = {
  rez: 'near-u',
  'rez-mall': 'mall',
  'cash-store': 'cash',
};

export interface HomeTabContextValue {
  // Core mode state
  activeMode: ModeId;
  previousMode: ModeId | null;
  isLoaded: boolean;

  // Mode flags
  isNearUActive: boolean;
  isMallActive: boolean;
  isCashActive: boolean;
  isPriveActive: boolean;

  // Legacy compatibility
  activeHomeTab: HomeTabId;
  isRezMallActive: boolean;
  isCashStoreActive: boolean;

  // Privé
  isPriveEligible: boolean;

  // Actions
  setActiveMode: (mode: ModeId) => void;
  setActiveHomeTab: (tab: HomeTabId) => void;
  // Convenience alias: many callers use `setActiveTab(mode)` from the
  // older Zustand store API; we expose it here so the same call sites work
  // against the context-based implementation.
  setActiveTab: (tab: ModeId | HomeTabId) => void;
  // Registered scroll-to-top callback (matches Zustand store API).
  scrollToTop: () => void;
  registerScrollToTop: (callback: () => void) => void;
}

const HomeTabContext = createContext<HomeTabContextValue | undefined>(undefined);

export interface HomeTabProviderProps {
  children: React.ReactNode;
}

export const HomeTabProvider: React.FC<HomeTabProviderProps> = ({ children }) => {
  const { storedMode, isLoaded: persistenceLoaded, saveMode } = useModePersistence();
  const { isEligible: isPriveEligible } = usePriveEligibility();

  const [activeMode, setActiveModeState] = useState<ModeId>(storedMode);
  const [previousMode, setPreviousMode] = useState<ModeId | null>(null);

  // Sync the active mode once persistence has loaded. If the persisted mode
  // is 'prive' but the user is not eligible, fall back to 'near-u'.
  useEffect(() => {
    if (!persistenceLoaded) return;

    let nextMode: ModeId = storedMode;
    if (storedMode === 'prive' && !isPriveEligible) {
      nextMode = 'near-u';
    }

    setActiveModeState((prev) => {
      if (prev !== nextMode) {
        setPreviousMode(prev);
      }
      return nextMode;
    });
  }, [persistenceLoaded, storedMode, isPriveEligible]);

  const setActiveMode = useCallback(
    (mode: ModeId) => {
      // Privé is gated by eligibility.
      if (mode === 'prive' && !isPriveEligible) {
        return;
      }

      setActiveModeState((prev) => {
        if (prev !== mode) {
          setPreviousMode(prev);
        }
        return mode;
      });

      // Persist asynchronously; fire-and-forget.
      saveMode(mode).catch(() => {});
    },
    [isPriveEligible, saveMode]
  );

  const setActiveHomeTab = useCallback(
    (tab: HomeTabId) => {
      const mapped = LEGACY_TO_MODE[tab] ?? 'near-u';
      setActiveMode(mapped);
    },
    [setActiveMode]
  );

  // Convenience alias used by older call sites that pass a ModeId directly
  // (e.g. setActiveTab('mall') or setActiveTab('cash')).
  const setActiveTab = useCallback(
    (tab: ModeId | HomeTabId) => {
      // If it looks like a legacy tab name, translate; otherwise treat as a ModeId.
      if ((tab as HomeTabId) in LEGACY_TO_MODE) {
        setActiveHomeTab(tab as HomeTabId);
      } else {
        setActiveMode(tab as ModeId);
      }
    },
    [setActiveMode, setActiveHomeTab]
  );

  // Scroll-to-top registration (matches the Zustand store API so consumers
  // can keep using the same call pattern).
  const scrollToTopCallbackRef = useRef<(() => void) | null>(null);
  const scrollToTop = useCallback(() => {
    if (scrollToTopCallbackRef.current) {
      scrollToTopCallbackRef.current();
    }
  }, []);
  const registerScrollToTop = useCallback((callback: () => void) => {
    scrollToTopCallbackRef.current = callback;
  }, []);

  const value = useMemo<HomeTabContextValue>(() => {
    const activeHomeTab: HomeTabId = MODE_TO_LEGACY[activeMode] ?? 'rez';

    return {
      activeMode,
      previousMode,
      isLoaded: persistenceLoaded,

      isNearUActive: activeMode === 'near-u',
      isMallActive: activeMode === 'mall',
      isCashActive: activeMode === 'cash',
      isPriveActive: activeMode === 'prive',

      activeHomeTab,
      isRezMallActive: activeMode === 'mall',
      isCashStoreActive: activeMode === 'cash',

      isPriveEligible,

      setActiveMode,
      setActiveHomeTab,
      setActiveTab,
      scrollToTop,
      registerScrollToTop,
    };
  }, [
    activeMode,
    previousMode,
    persistenceLoaded,
    isPriveEligible,
    setActiveMode,
    setActiveHomeTab,
    setActiveTab,
    scrollToTop,
    registerScrollToTop,
  ]);

  return <HomeTabContext.Provider value={value}>{children}</HomeTabContext.Provider>;
};

export const useHomeTab = (): HomeTabContextValue => {
  const ctx = useContext(HomeTabContext);
  if (!ctx) {
    throw new Error('useHomeTab must be used within a HomeTabProvider');
  }
  return ctx;
};

export default HomeTabProvider;
