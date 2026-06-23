/**
 * useModePersistence Hook
 *
 * Handles AsyncStorage persistence for the active mode.
 * - Loads persisted mode on mount
 * - Saves mode changes to storage
 * - Defaults to 'near-u' for first-time users
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ModeId, MODE_STORAGE_KEYS } from '@/types/mode.types';

// Valid modes for validation
const VALID_MODES: ModeId[] = ['near-u', 'mall', 'cash', 'prive'];

// Default mode for first-time users
const DEFAULT_MODE: ModeId = 'near-u';

interface UseModePersistenceReturn {
  storedMode: ModeId;
  isLoaded: boolean;
  saveMode: (mode: ModeId) => Promise<void>;
  clearMode: () => Promise<void>;
}

export const useModePersistence = (): UseModePersistenceReturn => {
  const [storedMode, setStoredMode] = useState<ModeId>(DEFAULT_MODE);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load persisted mode on mount
  useEffect(() => {
    const loadMode = async () => {
      try {
        const saved = await AsyncStorage.getItem(MODE_STORAGE_KEYS.ACTIVE_MODE);

        if (saved) {
          // Parse and validate the saved mode
          const parsedMode = JSON.parse(saved) as string;

          if (VALID_MODES.includes(parsedMode as ModeId)) {
            setStoredMode(parsedMode as ModeId);
          } else {
            // Invalid mode, use default
            setStoredMode(DEFAULT_MODE);
          }
        } else {
          // No saved mode, use default
          setStoredMode(DEFAULT_MODE);
        }
      } catch (error) {
        setStoredMode(DEFAULT_MODE);
      } finally {
        setIsLoaded(true);
      }
    };

    loadMode();

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Save mode to storage (debounced to prevent rapid writes)
  const saveMode = useCallback(async (mode: ModeId): Promise<void> => {
    // Validate mode
    if (!VALID_MODES.includes(mode)) {
      return;
    }

    // Update local state immediately
    setStoredMode(mode);

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the actual storage write
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          MODE_STORAGE_KEYS.ACTIVE_MODE,
          JSON.stringify(mode)
        );
      } catch (_error) {
        // silently handle
      }
    }, 100); // 100ms debounce
  }, []);

  // Clear persisted mode
  const clearMode = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(MODE_STORAGE_KEYS.ACTIVE_MODE);
      setStoredMode(DEFAULT_MODE);
    } catch (_error) {
      // silently handle
    }
  }, []);

  return {
    storedMode,
    isLoaded,
    saveMode,
    clearMode,
  };
};

/**
 * usePriveGlowSession Hook
 *
 * Tracks whether the Privé glow animation has been shown this session.
 * Resets when app is fully closed and reopened.
 */
export const usePriveGlowSession = () => {
  const [hasSeenGlow, setHasSeenGlow] = useState(false);

  // Mark glow as seen (only persists for this session)
  const markGlowSeen = useCallback(() => {
    setHasSeenGlow(true);
  }, []);

  // Reset (for testing)
  const resetGlow = useCallback(() => {
    setHasSeenGlow(false);
  }, []);

  return {
    hasSeenGlow,
    markGlowSeen,
    resetGlow,
  };
};

export default useModePersistence;
