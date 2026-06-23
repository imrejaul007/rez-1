import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, useColorScheme as useNativeColorScheme } from 'react-native';

// Types
type ColorScheme = 'light' | 'dark' | 'auto';
type Language = 'en' | 'hi' | 'te' | 'ta' | 'bn' | 'es' | 'fr' | 'de' | 'zh' | 'ja';

interface AppSettings {
  colorScheme: ColorScheme;
  language: Language;
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
    offers: boolean;
    orders: boolean;
  };
  privacy: {
    analytics: boolean;
    locationTracking: boolean;
    personalizedAds: boolean;
  };
  preferences: {
    currency: string;
    defaultLocation: string;
    autoLogin: boolean;
  };
}

interface AppState {
  settings: AppSettings;
  isFirstLaunch: boolean;
  appVersion: string;
  buildNumber: string;
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}

type AppAction =
  | { type: 'APP_LOADING'; payload: boolean }
  | { type: 'APP_LOADED'; payload: Partial<AppSettings> }
  | { type: 'APP_ERROR'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_COLOR_SCHEME'; payload: ColorScheme }
  | { type: 'SET_LANGUAGE'; payload: Language }
  | { type: 'UPDATE_NOTIFICATIONS'; payload: Partial<AppSettings['notifications']> }
  | { type: 'UPDATE_PRIVACY'; payload: Partial<AppSettings['privacy']> }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<AppSettings['preferences']> }
  | { type: 'SET_FIRST_LAUNCH'; payload: boolean }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RESET_SETTINGS' };

// Storage keys
const STORAGE_KEYS = {
  APP_SETTINGS: 'app_settings',
  FIRST_LAUNCH: 'first_launch',
};

// Default settings
const defaultSettings: AppSettings = {
  colorScheme: 'auto',
  language: 'en',
  notifications: {
    push: true,
    email: true,
    sms: false,
    offers: true,
    orders: true,
  },
  privacy: {
    analytics: true,
    locationTracking: true,
    personalizedAds: true,
  },
  preferences: {
    currency: 'AED',
    defaultLocation: 'Dubai',
    autoLogin: true,
  },
};

// Initial state
const initialState: AppState = {
  settings: defaultSettings,
  isFirstLaunch: true,
  appVersion: '1.0.0',
  buildNumber: '1',
  lastUpdated: null,
  isLoading: true,
  error: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'APP_LOADING':
      return { ...state, isLoading: action.payload, error: null };
    
    case 'APP_LOADED':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      };
    
    case 'APP_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
        lastUpdated: new Date().toISOString(),
      };
    
    case 'SET_COLOR_SCHEME':
      return {
        ...state,
        settings: { ...state.settings, colorScheme: action.payload },
        lastUpdated: new Date().toISOString(),
      };
    
    case 'SET_LANGUAGE':
      return {
        ...state,
        settings: { ...state.settings, language: action.payload },
        lastUpdated: new Date().toISOString(),
      };
    
    case 'UPDATE_NOTIFICATIONS':
      return {
        ...state,
        settings: {
          ...state.settings,
          notifications: { ...state.settings.notifications, ...action.payload },
        },
        lastUpdated: new Date().toISOString(),
      };
    
    case 'UPDATE_PRIVACY':
      return {
        ...state,
        settings: {
          ...state.settings,
          privacy: { ...state.settings.privacy, ...action.payload },
        },
        lastUpdated: new Date().toISOString(),
      };
    
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        settings: {
          ...state.settings,
          preferences: { ...state.settings.preferences, ...action.payload },
        },
        lastUpdated: new Date().toISOString(),
      };
    
    case 'SET_FIRST_LAUNCH':
      return { ...state, isFirstLaunch: action.payload };
    
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    
    case 'RESET_SETTINGS':
      return {
        ...state,
        settings: defaultSettings,
        lastUpdated: new Date().toISOString(),
      };
    
    default:
      return state;
  }
}

// Context
interface AppContextType {
  state: AppState;
  actions: {
    loadSettings: () => Promise<void>;
    updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
    setColorScheme: (scheme: ColorScheme) => Promise<void>;
    setLanguage: (language: Language) => Promise<void>;
    updateNotifications: (notifications: Partial<AppSettings['notifications']>) => Promise<void>;
    updatePrivacy: (privacy: Partial<AppSettings['privacy']>) => Promise<void>;
    updatePreferences: (preferences: Partial<AppSettings['preferences']>) => Promise<void>;
    resetSettings: () => Promise<void>;
    clearError: () => void;
    markAppAsLaunched: () => Promise<void>;
  };
  computed: {
    effectiveColorScheme: 'light' | 'dark';
    isFirstTime: boolean;
    formattedCurrency: (amount: number) => string;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider
interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const nativeColorScheme = useNativeColorScheme();

  // Use ref to prevent duplicate loading
  const isLoadingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Actions - Memoized with useCallback
  const loadSettings = useCallback(async () => {
    // Prevent duplicate loads
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    try {
      dispatch({ type: 'APP_LOADING', payload: true });

      let settings: any = {};
      let isFirstLaunch = true;

      // On web, read synchronously from localStorage (avoids async overhead)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          const raw = window.localStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
          settings = raw ? JSON.parse(raw) : {};
          isFirstLaunch = window.localStorage.getItem(STORAGE_KEYS.FIRST_LAUNCH) !== 'false';
        } catch {}
      } else {
        const [savedSettings, firstLaunch] = await AsyncStorage.multiGet([
          STORAGE_KEYS.APP_SETTINGS,
          STORAGE_KEYS.FIRST_LAUNCH,
        ]);
        settings = savedSettings[1] ? JSON.parse(savedSettings[1]) : {};
        isFirstLaunch = firstLaunch[1] !== 'false';
      }

      dispatch({ type: 'SET_FIRST_LAUNCH', payload: isFirstLaunch });
      dispatch({ type: 'APP_LOADED', payload: settings });
    } catch (error) {
      dispatch({
        type: 'APP_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load settings'
      });
    } finally {
      isLoadingRef.current = false;
    }
  }, []);

  const saveSettings = useCallback(async () => {
    try {
      const serialized = JSON.stringify(state.settings);
      // Write to localStorage on web (sync, for instant reads on next load)
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.APP_SETTINGS, serialized);
      }
      await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, serialized);
    } catch (error) {
      // silently handle
    }
  }, [state.settings]);

  const updateSettings = useCallback(async (settings: Partial<AppSettings>) => {
    try {
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    } catch (error) {
      dispatch({
        type: 'APP_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update settings'
      });
    }
  }, []);

  const setColorScheme = useCallback(async (scheme: ColorScheme) => {
    try {
      dispatch({ type: 'SET_COLOR_SCHEME', payload: scheme });
    } catch (error) {
      dispatch({
        type: 'APP_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update color scheme'
      });
    }
  }, []);

  const setLanguage = useCallback(async (language: Language) => {
    try {
      dispatch({ type: 'SET_LANGUAGE', payload: language });
    } catch (error) {
      dispatch({
        type: 'APP_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update language'
      });
    }
  }, []);

  const updateNotifications = useCallback(async (notifications: Partial<AppSettings['notifications']>) => {
    try {
      dispatch({ type: 'UPDATE_NOTIFICATIONS', payload: notifications });
    } catch (error) {
      dispatch({
        type: 'APP_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update notifications'
      });
    }
  }, []);

  const updatePrivacy = useCallback(async (privacy: Partial<AppSettings['privacy']>) => {
    try {
      dispatch({ type: 'UPDATE_PRIVACY', payload: privacy });
    } catch (error) {
      dispatch({
        type: 'APP_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update privacy settings'
      });
    }
  }, []);

  const updatePreferences = useCallback(async (preferences: Partial<AppSettings['preferences']>) => {
    try {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
    } catch (error) {
      dispatch({
        type: 'APP_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update preferences'
      });
    }
  }, []);

  const resetSettings = useCallback(async () => {
    try {
      dispatch({ type: 'RESET_SETTINGS' });
      await AsyncStorage.removeItem(STORAGE_KEYS.APP_SETTINGS);
    } catch (error) {
      dispatch({
        type: 'APP_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to reset settings'
      });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const markAppAsLaunched = useCallback(async () => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'false');
      }
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_LAUNCH, 'false');
      dispatch({ type: 'SET_FIRST_LAUNCH', payload: false });
    } catch (error) {
      // silently handle
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings whenever they change (debounced)
  useEffect(() => {
    if (state.lastUpdated) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Debounce save operation
      saveTimeoutRef.current = setTimeout(() => {
        saveSettings();
      }, 500);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state.settings, state.lastUpdated, saveSettings]);

  // Computed values - Memoized
  const effectiveColorScheme: 'light' | 'dark' = useMemo(
    () => state.settings.colorScheme === 'auto'
      ? (nativeColorScheme ?? 'light')
      : state.settings.colorScheme,
    [state.settings.colorScheme, nativeColorScheme]
  );

  const isFirstTime = useMemo(() => state.isFirstLaunch, [state.isFirstLaunch]);

  const formattedCurrency = useCallback((amount: number): string => {
    const { currency } = state.settings.preferences;

    const formatters: Record<string, Intl.NumberFormat> = {
      AED: new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }),
      INR: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }),
      USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
      EUR: new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }),
      CNY: new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }),
    };

    const formatter = formatters[currency] || formatters.AED;
    return formatter.format(amount);
  }, [state.settings.preferences]);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue: AppContextType = useMemo(() => ({
    state,
    actions: {
      loadSettings,
      updateSettings,
      setColorScheme,
      setLanguage,
      updateNotifications,
      updatePrivacy,
      updatePreferences,
      resetSettings,
      clearError,
      markAppAsLaunched,
    },
    computed: {
      effectiveColorScheme,
      isFirstTime,
      formattedCurrency,
    },
  }), [
    state,
    loadSettings,
    updateSettings,
    setColorScheme,
    setLanguage,
    updateNotifications,
    updatePrivacy,
    updatePreferences,
    resetSettings,
    clearError,
    markAppAsLaunched,
    effectiveColorScheme,
    isFirstTime,
    formattedCurrency,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

/**
 * Hook to access app context.
 * Now backed by Zustand store — works with or without AppProvider in tree.
 */
export function useApp() {
  const context = useContext(AppContext);
  const store = __useAppStore();
  if (context) return context;
  return store as unknown as AppContextType;
}

// Lazy import to avoid circular deps
let __useAppStore: () => any;
try {
  const { useAppStore } = require('@/stores/appStore');
  __useAppStore = useAppStore;
} catch {
  __useAppStore = () => ({});
}

export { AppContext };
export type { AppSettings, Language, ColorScheme };