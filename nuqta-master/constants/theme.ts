/**
 * Nuqta Design System - Single Source of Truth
 *
 * All design tokens for the entire app. Every UI component imports from here.
 * Legacy files (DesignTokens.ts, DesignSystem.ts) re-export from this file.
 *
 * Brand Palette:
 * - Nile Blue: #1a3a52 (Primary dark)
 * - Light Mustard: #ffcd57 (Primary accent)
 * - Linen: #faf1e0 (Light background)
 * - Light Peach: #ffd7b5 (Secondary accent)
 * - Lavender Mist: #dfebf7 (Tertiary accent)
 */

import { Platform } from 'react-native';

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Primary Mustard Palette
  primary: {
    50: '#FFF9E6',
    100: '#FFF3CC',
    200: '#FFE799',
    300: '#FFDB66',
    400: '#FFD433',
    500: '#ffcd57',
    600: '#ffcd57',
    700: '#E6B84E',
    800: '#CCA345',
    900: '#B38F3C',
  },

  // Secondary Nile Blue Palette
  secondary: {
    50: '#E8EEF3',
    100: '#D1DDE7',
    200: '#A3BBCF',
    300: '#7599B7',
    400: '#47779F',
    500: '#2A5577',
    600: '#1a3a52',
    700: '#163148',
    800: '#12283D',
    900: '#0E1F33',
  },

  // Neutral Grays (Nile Blue based)
  gray: {
    50: '#faf1e0',
    100: '#F5ECD8',
    200: '#E8DCC4',
    300: '#D4C9B0',
    400: '#9AA7B2',
    500: '#829AB1',
    600: '#627D98',
    700: '#486581',
    800: '#334E68',
    900: '#1a3a52',
  },

  // Semantic Color Scales (use Colors.errorScale[50] etc. for light shades)
  errorScale: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    400: '#F87171',
    500: '#EF4444',
    700: '#B91C1C',
  },
  warningScale: {
    50: '#FFF9E6',
    100: '#FFF3CC',
    200: '#FDE68A',
    400: '#FBBF24',
    500: '#FF9F1C',
    700: '#E6B84E',
  },
  successScale: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    400: '#34D399',
    500: '#2ECC71',
    700: '#15803D',
  },
  infoScale: {
    50: '#dfebf7',
    100: '#C9DCF0',
    200: '#BFDBFE',
    400: '#60A5FA',
    500: '#1a3a52',
    700: '#0E1F33',
  },

  // Semantic Colors (string values — safe for concatenation and style props)
  error: '#EF4444',
  warning: '#FF9F1C',
  success: '#2ECC71',
  info: '#1a3a52',

  // Brand
  brand: {
    purple: '#7C3AED',
    purpleLight: '#8B5CF6',
    indigo: '#6366F1',
    pink: '#EC4899',
    orange: '#F97316',
    orangeDark: '#EA580C',
    sky: '#0284C7',
    skyDark: '#0369A1',
    cyan: '#06B6D4',
    teal: '#00796B',
    green: '#00C06A',
    greenDark: '#16A34A',
    blue: '#2563EB',
    ios: '#007AFF',
    emerald: '#4CAF50',
    amber: '#EAB308',
    amberDark: '#92400E',
    amberDeep: '#B45309',
    goldBright: '#FFD700',
    goldWarm: '#FFC857',
    goldRich: '#E6B84E',
    goldAccent: '#C9A962',
    sand: '#E8B896',
    caramel: '#D4A07A',
    purpleMedium: '#A855F7',
    purpleSoft: '#A78BFA',
    purpleDeep: '#6D28D9',
    nileBlueLight: '#234b68',
    navyDark: '#0B2240',
  },

  // Extended palette (light background tints)
  tint: {
    pink: '#F3E8FF',
    purple: '#EDE9FE',
    purpleLight: '#F5F3FF',
    blue: '#EFF6FF',
    blueLight: '#DBEAFE',
    orange: '#FFF7ED',
    amber: '#FFFBEB',
    amberLight: '#FEF3C7',
    green: '#D1FAE5',
    greenLight: '#ECFDF5',
    slate: '#F1F5F9',
    warmGray: '#F5F5F5',
    coolGray: '#F8FAFC',
  },

  // Shorthand grays (legacy compat)
  black: '#000000',
  darkGray: '#333333',
  midGray: '#666666',
  midGrayAlt: '#0A0A0A',

  // Extended UI colors
  slateGray: '#64748B',
  slateLight: '#E2E8F0',
  deepPink: '#DB2777',
  cyanDark: '#0891B2',
  offWhite: '#F8F9FA',
  deepNavy: '#1A1A2E',
  tealGreen: '#14B8A6',
  indigoMist: '#EEF2FF',
  pinkMist: '#FCE7F3',
  greenMist: '#E8F5E9',

  // Brand Shortcuts
  nileBlue: '#1a3a52',
  lightMustard: '#ffcd57',
  linen: '#faf1e0',
  lightPeach: '#ffd7b5',
  lavenderMist: '#dfebf7',
  midnightNavy: '#1a3a52',
  gold: '#ffcd57',

  // Background Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#faf1e0',
    tertiary: '#dfebf7',
    dark: '#1a3a52',
    accent: '#FFF9E6',
    accentLight: '#FFFDF5',
    peach: '#ffd7b5',
    lavender: '#dfebf7',
  },

  // Text Colors
  text: {
    primary: '#1a3a52',
    secondary: '#2A5577',
    tertiary: '#9AA7B2',
    inverse: '#FFFFFF',
    white: '#FFFFFF',
    disabled: '#D4C9B0',
    accent: '#ffcd57',
    mustard: '#ffcd57',
    peach: '#ffd7b5',
    green: '#ffcd57',
    teal: '#1a3a52',
    gold: '#ffcd57',
  },

  // Border Colors
  border: {
    light: '#faf1e0',
    default: '#E8DCC4',
    medium: '#E8DCC4',
    dark: '#D4C9B0',
    accent: '#FFE799',
  },

  // Overlay Colors
  overlay: {
    light: 'rgba(26, 58, 82, 0.1)',
    medium: 'rgba(26, 58, 82, 0.3)',
    dark: 'rgba(26, 58, 82, 0.5)',
    darker: 'rgba(26, 58, 82, 0.7)',
  },

  // Nuqta-specific (backward compat with DesignTokens COLORS.nuqta)
  nuqta: {
    nileBlue: '#1a3a52',
    mustard: '#ffcd57',
    linen: '#faf1e0',
    peach: '#ffd7b5',
    lavender: '#dfebf7',
  },

  // Neutral alias (backward compat with DesignTokens COLORS.neutral)
  neutral: {
    50: '#faf1e0',
    100: '#F5ECD8',
    200: '#E8DCC4',
    300: '#D4C9B0',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#1a3a52',
  },
} as const;

// ============================================================================
// GRADIENTS
// ============================================================================

export const gradients = {
  primary: ['#ffcd57', '#E6B84E'] as const,
  primaryVertical: ['#FFF9E6', '#FFFFFF'] as const,
  nileBlue: ['#1a3a52', '#2A5577'] as const,
  nileBlueLight: ['#2A5577', '#47779F'] as const,
  peach: ['#ffd7b5', '#ffcd57'] as const,
  warmAccent: ['#ffcd57', '#ffd7b5'] as const,
  brand: ['#1a3a52', '#ffcd57'] as const,
  brandReverse: ['#ffcd57', '#1a3a52'] as const,
  gold: ['#ffcd57', '#E6B84E'] as const,
  purplePrimary: ['#ffcd57', '#E6B84E'] as const,
  purpleDeep: ['#1a3a52', '#0E1F33'] as const,
  purpleLight: ['#FFE799', '#ffcd57'] as const,
  purpleVertical: ['#FFF9E6', '#FFFFFF'] as const,
  overlayBottom: ['transparent', 'rgba(26, 58, 82, 0.7)'] as const,
  overlayTop: ['rgba(26, 58, 82, 0.7)', 'transparent'] as const,
  overlayFull: ['rgba(26, 58, 82, 0.3)', 'rgba(26, 58, 82, 0.7)'] as const,
  shimmer: ['#faf1e0', '#FFFFFF', '#FFF9E6', '#FFFFFF', '#faf1e0'] as const,
  shimmerDark: ['#1a3a52', '#2A5577', '#1a3a52'] as const,
  linen: ['#faf1e0', '#FFFFFF'] as const,
  lavender: ['#dfebf7', '#FFFFFF'] as const,
} as const;

// ============================================================================
// SPACING (8px grid)
// ============================================================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  // Backward compat aliases for DesignTokens (which used md=16, lg=24, xl=32, xxl=48, xxxl=64)
  xxl: 48,
  xxxl: 64,
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const borderRadius = {
  none: 0,
  xs: 2,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 999,
  circular: (size: number) => size / 2,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: colors.midnightNavy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: colors.midnightNavy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  strong: {
    shadowColor: colors.midnightNavy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  // Branded shadows
  purpleSubtle: {
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  purpleMedium: {
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  purpleStrong: {
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  // DesignTokens backward compat aliases (sm/md/lg/xl)
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Display
  display: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },

  // Headings
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
  },
  h2: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600' as const,
    letterSpacing: 0,
  },

  // Body text
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    letterSpacing: 0,
  },

  // Labels & Buttons
  label: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
  },
  labelSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },
  button: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
  },

  // Caption & Overline
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.2,
  },
  overline: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600' as const,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  },

  // Special
  link: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as const,
    letterSpacing: 0,
  },
  price: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800' as const,
    letterSpacing: 0,
  },
  priceLarge: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
  },
} as const;

// ============================================================================
// TIMING / ANIMATION
// ============================================================================

export const timing = {
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  ripple: 200,
  tooltip: 150,
  modal: 300,
  drawer: 350,
  toast: 250,
  skeleton: 1500,
  springConfig: { damping: 15, stiffness: 150, mass: 1 },
  springBouncy: { damping: 10, stiffness: 100, mass: 0.8 },
  springSmooth: { damping: 20, stiffness: 200, mass: 1 },
  // DesignTokens backward compat
  duration: {
    instant: 0,
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeIn: 'ease-in' as const,
    easeOut: 'ease-out' as const,
    easeInOut: 'ease-in-out' as const,
    linear: 'linear' as const,
  },
} as const;

// ============================================================================
// ICON SIZES
// ============================================================================

export const iconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
} as const;

// ============================================================================
// OPACITY
// ============================================================================

export const opacity = {
  disabled: 0.5,
  muted: 0.6,
  subtle: 0.7,
  medium: 0.8,
  high: 0.9,
  full: 1,
} as const;

// ============================================================================
// Z-INDEX
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  toast: 1500,
  tooltip: 1600,
  // DesignTokens backward compat aliases
  fixed: 1030,
  modalBackdrop: 1040,
} as const;

// ============================================================================
// GLASSMORPHISM
// ============================================================================

export const glass = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  medium: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dark: {
    backgroundColor: 'rgba(26, 58, 82, 0.3)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  accent: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  purple: {
    backgroundColor: 'rgba(255, 205, 87, 0.1)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.2)',
  },
  nileBlue: {
    backgroundColor: 'rgba(26, 58, 82, 0.1)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(26, 58, 82, 0.2)',
  },
};

// ============================================================================
// BUTTON HEIGHTS
// ============================================================================

export const buttonHeight = {
  sm: 40,
  md: 48,
  lg: 56,
} as const;

// ============================================================================
// HIT SLOP
// ============================================================================

export const hitSlop = {
  sm: { top: 8, bottom: 8, left: 8, right: 8 },
  md: { top: 12, bottom: 12, left: 12, right: 12 },
  lg: { top: 16, bottom: 16, left: 16, right: 16 },
} as const;

// ============================================================================
// LAYOUT
// ============================================================================

export const layout = {
  containerMaxWidth: 1280,
  contentMaxWidth: 1024,
  gridColumns: 12,
  gridGutter: 16,
  headerHeight: 56,
  bottomNavHeight: 64,
  cardMinHeight: 120,
  breakpoints: {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1400,
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export const getSpacing = (multiplier: number): number => multiplier * 8;

export const getShadow = (level: 'subtle' | 'medium' | 'strong' | 'none' = 'medium') =>
  shadows[level];

export const getPurpleShadow = (level: 'subtle' | 'medium' | 'strong' = 'medium') => {
  const key = `purple${level.charAt(0).toUpperCase() + level.slice(1)}` as
    | 'purpleSubtle'
    | 'purpleMedium'
    | 'purpleStrong';
  return shadows[key];
};

export const getTextColor = (
  variant:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'white'
    | 'accent'
    | 'mustard'
    | 'peach'
    | 'green'
    | 'teal'
    | 'gold' = 'primary'
) => colors.text[variant];

export const getGradient = (type: keyof typeof gradients) => ({
  colors: gradients[type],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 0 },
});

export const getDisabledOpacity = () => opacity.disabled;

// ============================================================================
// DARK MODE COLORS (Material Design 3 inspired, Nuqta-branded)
// ============================================================================

export const darkColors = {
  // Primary Mustard Palette (slightly muted for dark backgrounds)
  primary: {
    50: '#332A14',
    100: '#4D3F1E',
    200: '#665428',
    300: '#806A32',
    400: '#B38F3C',
    500: '#ffcd57',
    600: '#ffcd57',
    700: '#FFD76E',
    800: '#FFE185',
    900: '#FFEB9C',
  },

  // Secondary Nile Blue Palette (lightened for dark mode)
  secondary: {
    50: '#0E1F33',
    100: '#12283D',
    200: '#163148',
    300: '#1a3a52',
    400: '#2A5577',
    500: '#47779F',
    600: '#7599B7',
    700: '#A3BBCF',
    800: '#D1DDE7',
    900: '#E8EEF3',
  },

  // Neutral Grays (dark mode)
  gray: {
    50: '#121212',
    100: '#1E1E1E',
    200: '#2C2C2C',
    300: '#3A3A3A',
    400: '#5A5A5A',
    500: '#7A7A7A',
    600: '#9A9A9A',
    700: '#B0B0B0',
    800: '#D0D0D0',
    900: '#E1E3E6',
  },

  // Semantic Color Scales (adjusted for dark backgrounds)
  errorScale: {
    50: '#2D1212',
    100: '#3D1818',
    200: '#5C2020',
    400: '#F87171',
    500: '#EF4444',
    700: '#FCA5A5',
  },
  warningScale: {
    50: '#2D2412',
    100: '#3D3118',
    200: '#5C4A20',
    400: '#FBBF24',
    500: '#FF9F1C',
    700: '#FDE68A',
  },
  successScale: {
    50: '#122D1A',
    100: '#183D23',
    200: '#205C35',
    400: '#34D399',
    500: '#2ECC71',
    700: '#BBF7D0',
  },
  infoScale: {
    50: '#0E1F33',
    100: '#12283D',
    200: '#1a3a52',
    400: '#60A5FA',
    500: '#7599B7',
    700: '#D1DDE7',
  },

  // Semantic Colors
  error: '#EF4444',
  warning: '#FF9F1C',
  success: '#2ECC71',
  info: '#7599B7',

  // Brand
  brand: {
    purple: '#8B5CF6',
    purpleLight: '#A78BFA',
  },

  // Brand Shortcuts
  nileBlue: '#7599B7',
  lightMustard: '#ffcd57',
  linen: '#1E1E1E',
  lightPeach: '#4D3328',
  lavenderMist: '#1A2633',
  midnightNavy: '#E1E3E6',
  gold: '#ffcd57',

  // Background Colors
  background: {
    primary: '#121212',
    secondary: '#1E1E1E',
    tertiary: '#1A2633',
    dark: '#0A0A0A',
    accent: '#2D2412',
    accentLight: '#1E1A12',
    peach: '#4D3328',
    lavender: '#1A2633',
  },

  // Text Colors
  text: {
    primary: '#E1E3E6',
    secondary: '#A0AEC0',
    tertiary: '#6B7280',
    inverse: '#121212',
    white: '#FFFFFF',
    disabled: '#4A4A4A',
    accent: '#ffcd57',
    mustard: '#ffcd57',
    peach: '#ffd7b5',
    green: '#ffcd57',
    teal: '#7599B7',
    gold: '#ffcd57',
  },

  // Border Colors
  border: {
    light: '#2C2C2C',
    default: '#3A3A3A',
    medium: '#3A3A3A',
    dark: '#5A5A5A',
    accent: '#665428',
  },

  // Overlay Colors
  overlay: {
    light: 'rgba(0, 0, 0, 0.2)',
    medium: 'rgba(0, 0, 0, 0.4)',
    dark: 'rgba(0, 0, 0, 0.6)',
    darker: 'rgba(0, 0, 0, 0.8)',
  },

  // Nuqta-specific
  nuqta: {
    nileBlue: '#7599B7',
    mustard: '#ffcd57',
    linen: '#1E1E1E',
    peach: '#ffd7b5',
    lavender: '#1A2633',
  },

  // Neutral alias
  neutral: {
    50: '#121212',
    100: '#1E1E1E',
    200: '#2C2C2C',
    300: '#3A3A3A',
    400: '#5A5A5A',
    500: '#7A7A7A',
    600: '#9A9A9A',
    700: '#B0B0B0',
    800: '#D0D0D0',
    900: '#E1E3E6',
  },
} as const;

// Dark mode gradients
export const darkGradients = {
  primary: ['#ffcd57', '#B38F3C'] as const,
  primaryVertical: ['#1E1A12', '#121212'] as const,
  nileBlue: ['#2A5577', '#1a3a52'] as const,
  nileBlueLight: ['#47779F', '#2A5577'] as const,
  peach: ['#4D3328', '#332A14'] as const,
  warmAccent: ['#ffcd57', '#4D3328'] as const,
  brand: ['#1a3a52', '#ffcd57'] as const,
  brandReverse: ['#ffcd57', '#1a3a52'] as const,
  gold: ['#ffcd57', '#B38F3C'] as const,
  purplePrimary: ['#ffcd57', '#B38F3C'] as const,
  purpleDeep: ['#0A0A0A', '#121212'] as const,
  purpleLight: ['#332A14', '#1E1A12'] as const,
  purpleVertical: ['#1E1A12', '#121212'] as const,
  overlayBottom: ['transparent', 'rgba(0, 0, 0, 0.8)'] as const,
  overlayTop: ['rgba(0, 0, 0, 0.8)', 'transparent'] as const,
  overlayFull: ['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.8)'] as const,
  shimmer: ['#1E1E1E', '#2C2C2C', '#3A3A3A', '#2C2C2C', '#1E1E1E'] as const,
  shimmerDark: ['#1E1E1E', '#2C2C2C', '#1E1E1E'] as const,
  linen: ['#1E1E1E', '#121212'] as const,
  lavender: ['#1A2633', '#121212'] as const,
} as const;

// Dark mode shadows (lighter shadow colors for dark backgrounds)
export const darkShadows = {
  ...shadows,
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 8,
  },
} as const;

// Dark mode glassmorphism
export const darkGlass = {
  light: {
    backgroundColor: 'rgba(30, 30, 30, 0.7)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  medium: {
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  dark: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(20px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.03)',
  },
  accent: {
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  purple: {
    backgroundColor: 'rgba(255, 205, 87, 0.08)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(255, 205, 87, 0.15)',
  },
  nileBlue: {
    backgroundColor: 'rgba(117, 153, 183, 0.08)',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(10px)' } : {}),
    borderWidth: 1,
    borderColor: 'rgba(117, 153, 183, 0.15)',
  },
};

// ============================================================================
// COMBINED THEME OBJECT
// ============================================================================

export const theme = {
  colors,
  darkColors,
  gradients,
  darkGradients,
  spacing,
  borderRadius,
  shadows,
  darkShadows,
  typography,
  timing,
  iconSize,
  opacity,
  zIndex,
  glass,
  darkGlass,
  buttonHeight,
  hitSlop,
  layout,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type SpacingKey = keyof typeof spacing;
export type TypographyKey = keyof typeof typography;
export type ThemeColors = typeof colors;
export type ColorKey = keyof typeof colors;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;

export default theme;
