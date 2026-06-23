// @ts-nocheck
/**
 * Theme Context — now backed by Zustand (themeStore).
 *
 * The provider is no longer needed in the tree. `useTheme()` reads directly
 * from the Zustand store + `useColorScheme()` to resolve dark/light mode.
 *
 * ThemeProvider is kept as a passthrough for backwards compat during migration.
 */
import React from 'react';
import {
  colors,
  gradients,
  shadows,
  glass,
} from '@/constants/theme';
import { useResolvedTheme } from '@/stores/themeStore';
import type { ThemeMode } from '@/stores/themeStore';

export type { ThemeMode };

interface ThemeContextValue {
  themeMode: ThemeMode;
  isDark: boolean;
  colors: typeof colors;
  gradients: typeof gradients;
  shadows: typeof shadows;
  glass: typeof glass;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

/**
 * ThemeProvider — now a passthrough. Kept for backwards compatibility.
 * Remove once all imports are cleaned up.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

/**
 * Hook to get theme values. Now reads from Zustand store.
 * Works with or without ThemeProvider in the tree.
 */
export function useTheme(): ThemeContextValue {
  return useResolvedTheme();
}

export default {};
