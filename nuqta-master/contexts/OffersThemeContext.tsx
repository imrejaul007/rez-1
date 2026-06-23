/**
 * Offers Theme Context
 *
 * Provides theme context for offers pages (Near U / Prive)
 */

import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import {
  OffersTheme,
  OffersThemeMode,
  LightTheme,
  DarkTheme,
  getOffersTheme,
} from '@/constants/OffersTheme';

interface OffersThemeContextValue {
  theme: OffersTheme;
  mode: OffersThemeMode;
  isDark: boolean;
}

const OffersThemeContext = createContext<OffersThemeContextValue | undefined>(undefined);

interface OffersThemeProviderProps {
  children: ReactNode;
  mode: OffersThemeMode;
}

export const OffersThemeProvider: React.FC<OffersThemeProviderProps> = ({
  children,
  mode,
}) => {
  const theme = getOffersTheme(mode);

  const value = useMemo<OffersThemeContextValue>(() => ({
    theme,
    mode,
    isDark: mode === 'dark',
  }), [theme, mode]);

  return (
    <OffersThemeContext.Provider value={value}>
      {children}
    </OffersThemeContext.Provider>
  );
};

// Lazy import to avoid circular deps
let __useOffersThemeStore: () => any;
try {
  const { useOffersThemeStore } = require('@/stores/offersThemeStore');
  __useOffersThemeStore = useOffersThemeStore;
} catch {
  __useOffersThemeStore = () => ({ theme: LightTheme, mode: 'light' as const, isDark: false });
}

export const useOffersTheme = (): OffersThemeContextValue => {
  const context = useContext(OffersThemeContext);
  const store = __useOffersThemeStore();
  if (context) return context;
  return store as unknown as OffersThemeContextValue;
};

// Convenience exports
export { LightTheme, DarkTheme };
export default OffersThemeContext;
