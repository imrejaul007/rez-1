import { create } from 'zustand';
import {
  OffersTheme,
  OffersThemeMode,
  LightTheme,
  getOffersTheme,
} from '@/constants/OffersTheme';

interface OffersThemeStoreState {
  theme: OffersTheme;
  mode: OffersThemeMode;
  isDark: boolean;
  setMode: (mode: OffersThemeMode) => void;
}

export const useOffersThemeStore = create<OffersThemeStoreState>((set) => ({
  theme: LightTheme,
  mode: 'light',
  isDark: false,

  setMode: (mode: OffersThemeMode) => {
    set({
      theme: getOffersTheme(mode),
      mode,
      isDark: mode === 'dark',
    });
  },
}));
