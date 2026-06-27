// Consolidated theme exports - reads directly from Zustand
export { useTheme, ThemeProvider } from '@/contexts/ThemeContext';
export type { ThemeMode } from '@/stores/themeStore';

// Re-export useThemeColor for components that need it
export { useThemeColor } from '@/hooks/useThemeColor';
