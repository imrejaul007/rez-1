/**
 * Offers Theme System - Nuqta
 *
 * Light theme for "Near U" page (/offers) - Uses Nuqta colors
 * Dark theme for "Prive" page (/prive-offers) - Keeps premium gold theme
 */

import { Colors, Shadows, BorderRadius, Spacing } from './DesignSystem';

// Theme mode type
export type OffersThemeMode = 'light' | 'dark';

// Theme interface
export interface OffersThemeColors {
  background: {
    primary: string;
    secondary: string;
    card: string;
    elevated: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    accent: string;
    inverse: string;
  };
  border: {
    light: string;
    medium: string;
    dark: string;
  };
  accent: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    cashback: string;
  };
  gradient: {
    primary: string[];
    secondary: string[];
    lightning: string[];
    cashback: string[];
    exclusive: string[];
  };
  badge: {
    new: string;
    trending: string;
    lightning: string;
    cashback: string;
    exclusive: string;
    freeDelivery: string;
  };
}

export interface OffersTheme {
  mode: OffersThemeMode;
  colors: OffersThemeColors;
}

// Light Theme (Near U) - New Color Palette
export const LightTheme: OffersTheme = {
  mode: 'light',
  colors: {
    background: {
      primary: '#faf1e0',      // Linen (main background)
      secondary: '#dfebf7',    // Lavender Mist
      card: '#FFFFFF',
      elevated: '#FFFFFF',
    },
    text: {
      primary: '#1a3a52',      // Nile Blue
      secondary: '#2A5577',    // Lighter Nile Blue
      tertiary: '#627D98',     // Gray 600
      accent: '#ffcd57',       // Light Mustard
      inverse: '#FFFFFF',
    },
    border: {
      light: '#faf1e0',        // Linen
      medium: '#E8DCC4',
      dark: '#D4C9B0',
    },
    accent: {
      primary: '#ffcd57',      // Light Mustard
      secondary: '#1a3a52',    // Nile Blue
      success: '#2ECC71',
      warning: '#FF9F1C',
      error: '#E74C3C',
      cashback: '#ffcd57',     // Mustard (matches Nuqta)
    },
    gradient: {
      primary: ['#ffcd57', '#E6B84E'],       // Mustard gradient
      secondary: ['#1a3a52', '#2A5577'],     // Nile Blue gradient
      lightning: ['#FFF9E6', '#ffd7b5'],     // Mustard to Peach
      cashback: ['#FFF9E6', '#ffcd57'],      // Light to Mustard
      exclusive: ['#dfebf7', '#ffd7b5'],     // Lavender to Peach
    },
    badge: {
      new: '#1a3a52',          // Nile Blue
      trending: '#EF4444',     // Red (kept for urgency)
      lightning: '#ffcd57',    // Mustard
      cashback: '#1a3a52',     // Nile Blue
      exclusive: '#1a3a52',    // Nile Blue
      freeDelivery: '#1a3a52', // Nile Blue
    },
  },
};

// Dark Theme (Prive)
export const DarkTheme: OffersTheme = {
  mode: 'dark',
  colors: {
    background: {
      primary: '#000000',
      secondary: '#1C1C1E',
      card: '#2C2C2E',
      elevated: '#3A3A3C',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A1A1A6',
      tertiary: '#636366',
      accent: '#ffcd57',       // Mustard (Nuqta)
      inverse: '#000000',
    },
    border: {
      light: '#2C2C2E',
      medium: '#3A3A3C',
      dark: '#48484A',
    },
    accent: {
      primary: '#ffcd57',      // Mustard (Nuqta)
      secondary: '#1a3a52',    // Nile Blue (Nuqta)
      success: '#34D399',
      warning: '#FBBF24',
      error: '#F87171',
      cashback: '#FBBF24',     // Brighter amber for dark theme
    },
    gradient: {
      primary: ['#ffcd57', '#E6B84E'],
      secondary: ['#1C1C1E', '#2C2C2E'],
      lightning: ['rgba(245, 158, 11, 0.2)', 'rgba(239, 68, 68, 0.2)'],
      cashback: ['rgba(245, 158, 11, 0.2)', 'rgba(252, 211, 77, 0.2)'],
      exclusive: ['rgba(139, 92, 246, 0.2)', 'rgba(236, 72, 153, 0.2)'],
    },
    badge: {
      new: '#34D399',          // Brighter emerald
      trending: '#F87171',     // Brighter red
      lightning: '#FBBF24',    // Brighter amber
      cashback: '#34D399',
      exclusive: '#A78BFA',    // Brighter purple
      freeDelivery: '#60A5FA', // Brighter blue
    },
  },
};

// Get theme by mode
export const getOffersTheme = (mode: OffersThemeMode): OffersTheme => {
  return mode === 'light' ? LightTheme : DarkTheme;
};

// Card styles for each theme
export const getCardStyles = (theme: OffersTheme) => ({
  container: {
    backgroundColor: theme.colors.background.card,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    overflow: 'hidden' as const,
  },
  shadow: theme.mode === 'light' ? Shadows.medium : Shadows.none,
});

// Section header styles
export const getSectionHeaderStyles = (theme: OffersTheme) => ({
  title: {
    color: theme.colors.text.primary,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  subtitle: {
    color: theme.colors.text.secondary,
    fontSize: 13,
  },
  viewAll: {
    color: theme.colors.accent.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

// Tab styles
export const getTabStyles = (theme: OffersTheme) => ({
  container: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xs,
  },
  tab: {
    inactive: {
      backgroundColor: 'transparent',
    },
    active: {
      backgroundColor: theme.colors.background.card,
    },
  },
  text: {
    inactive: {
      color: theme.colors.text.tertiary,
    },
    active: {
      color: theme.colors.text.primary,
    },
  },
});

// Discount bucket colors - New Palette
export const DiscountBucketColors = {
  '25': { bg: '#E8F5E8', text: '#2E7D32', icon: '#4CAF50' },    // Green (kept for discount)
  '50': { bg: '#FFF9E6', text: '#1a3a52', icon: '#ffcd57' },    // Light Mustard
  '80': { bg: '#FFE5E5', text: '#C62828', icon: '#EF5350' },    // Red (urgency)
  'freeDelivery': { bg: '#dfebf7', text: '#1a3a52', icon: '#1a3a52' }, // Lavender Mist / Nile Blue
};

// Exclusive category colors - New Palette
export const ExclusiveCategoryColors = {
  student: { bg: '#dfebf7', icon: '#1a3a52', text: '#1a3a52' },    // Lavender Mist / Nile Blue
  corporate: { bg: '#faf1e0', icon: '#1a3a52', text: '#1a3a52' },  // Linen / Nile Blue
  women: { bg: '#ffd7b5', icon: '#1a3a52', text: '#1a3a52' },      // Light Peach / Nile Blue
  birthday: { bg: '#FFF9E6', icon: '#ffcd57', text: '#1a3a52' },   // Light Mustard
};

export default {
  LightTheme,
  DarkTheme,
  getOffersTheme,
  getCardStyles,
  getSectionHeaderStyles,
  getTabStyles,
  DiscountBucketColors,
  ExclusiveCategoryColors,
};
