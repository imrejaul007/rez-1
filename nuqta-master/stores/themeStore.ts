import { create } from 'zustand';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  colors,
  darkColors,
  gradients,
  darkGradients,
  shadows,
  darkShadows,
  glass,
  darkGlass,
} from '@/constants/theme';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = '@nuqta_theme_mode';

interface ThemeStoreState {
  themeMode: ThemeMode;
  _loaded: boolean;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  _initialize: () => void;
}

export const useThemeStore = create<ThemeStoreState>((set, get) => ({
  themeMode: 'system',
  _loaded: false,

  _initialize: () => {
    if (get()._loaded) return;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          set({ themeMode: stored, _loaded: true });
        } else {
          set({ _loaded: true });
        }
      })
      .catch(() => set({ _loaded: true }));
  },

  setThemeMode: (mode: ThemeMode) => {
    set({ themeMode: mode });
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode).catch(() => {});
  },

  toggleTheme: () => {
    const { themeMode, setThemeMode } = get();
    setThemeMode(themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'dark' : 'dark');
  },
}));

// Initialize on import (load stored theme preference)
useThemeStore.getState()._initialize();

/**
 * Resolves whether dark mode is active, combining store themeMode + system color scheme.
 * Must be called inside a React component (uses useColorScheme hook).
 */
export function useResolvedTheme() {
  const { themeMode, _loaded, setThemeMode, toggleTheme } = useThemeStore();
  const systemScheme = useColorScheme();

  const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark';

  return {
    themeMode,
    isDark,
    colors: isDark ? darkColors : colors,
    gradients: isDark ? darkGradients : gradients,
    shadows: isDark ? darkShadows : shadows,
    glass: isDark ? darkGlass : glass,
    setThemeMode,
    toggleTheme,
    _loaded,
  };
}
