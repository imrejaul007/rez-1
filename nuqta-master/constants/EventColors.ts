/**
 * Event Colors - Nuqta Design System
 * Shared color constants for Events & Experiences section
 *
 * Nuqta Colors:
 * - Nile Blue: #1a3a52
 * - Light Mustard: #ffcd57
 * - Linen: #faf1e0
 * - Light Peach: #ffd7b5
 * - Lavender Mist: #dfebf7
 */

export const EVENT_COLORS = {
  // Primary brand colors - Nuqta
  primary: '#ffcd57',           // Light Mustard
  primaryDark: '#E6B84E',
  primaryLight: '#FFF9E6',
  primaryGradient: ['#ffcd57', '#E6B84E'] as const,

  // Accent color - Nile Blue
  accent: '#1a3a52',
  accentLight: '#dfebf7',       // Lavender Mist

  // Background colors - Nuqta
  background: '#FFFFFF',
  surface: '#faf1e0',           // Linen
  surfaceElevated: '#FFFFFF',

  // Text colors - Nuqta
  text: '#1a3a52',              // Nile Blue
  textSecondary: '#2A5577',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',

  // Border colors - Nuqta
  border: '#E8DCC4',
  borderLight: '#faf1e0',       // Linen

  // Status colors
  success: '#ffcd57',
  successLight: '#faf1e0',
  warning: '#ffcd57',           // Mustard
  warningLight: '#FFF9E6',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#1a3a52',              // Nile Blue
  infoLight: '#dfebf7',         // Lavender Mist

  // Special colors - Nuqta
  star: '#ffcd57',              // Mustard for ratings
  starEmpty: '#E8DCC4',
  cashback: '#ffcd57',          // Mustard
  verified: '#1a3a52',          // Nile Blue

  // Category-specific gradients - Nuqta themed
  categoryGradients: {
    movies: ['#1a3a52', '#ffd7b5'] as const,
    concerts: ['#ffcd57', '#1a3a52'] as const,
    parks: ['#faf1e0', '#ffcd57'] as const,
    workshops: ['#ffcd57', '#faf1e0'] as const,
    gaming: ['#1a3a52', '#ffcd57'] as const,
    sports: ['#1a3a52', '#dfebf7'] as const,
    entertainment: ['#ffd7b5', '#ffcd57'] as const,
    arts: ['#ffcd57', '#ffd7b5'] as const,
    music: ['#ffcd57', '#1a3a52'] as const,
  },

  // Category icons
  categoryIcons: {
    movies: '🎬',
    concerts: '🎵',
    parks: '🎢',
    workshops: '🎨',
    gaming: '🎮',
    sports: '⚽',
    entertainment: '🎭',
    arts: '🖼️',
    music: '🎤',
  } as Record<string, string>,
};

// Typography constants for events
export const EVENT_TYPOGRAPHY = {
  // Font sizes
  titleLarge: 24,
  titleMedium: 20,
  titleSmall: 18,
  bodyLarge: 16,
  bodyMedium: 14,
  bodySmall: 13,
  caption: 12,
  tiny: 11,

  // Font weights
  bold: '700' as const,
  semibold: '600' as const,
  medium: '500' as const,
  regular: '400' as const,
};

// Spacing constants
export const EVENT_SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius constants
export const EVENT_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

// Shadow presets
export const EVENT_SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
};

export default EVENT_COLORS;
