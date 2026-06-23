/**
 * Nuqta Color System
 *
 * Color palette based on Nuqta brand identity:
 * - Nile Blue: #1a3a52 (Primary dark)
 * - Light Mustard: #ffcd57 (Primary accent)
 * - Linen: #faf1e0 (Light background)
 * - Light Peach: #ffd7b5 (Secondary accent)
 * - Lavender Mist: #dfebf7 (Tertiary accent)
 */

// Nuqta Brand Colors
export const NuqtaColors = {
  nileBlue: '#1a3a52',
  lightMustard: '#ffcd57',
  linen: '#faf1e0',
  lightPeach: '#ffd7b5',
  lavenderMist: '#dfebf7',
} as const;

const tintColorLight = '#ffcd57'; // Nuqta Mustard
const tintColorDark = '#ffcd57';

export const Colors = {
  light: {
    text: '#1a3a52', // Nile Blue
    background: '#FFFFFF',
    tint: '#ffcd57', // Nuqta Mustard
    icon: '#9AA7B2', // Cool Gray
    tabIconDefault: '#9AA7B2',
    tabIconSelected: '#ffcd57', // Nuqta Mustard
    surface: '#FFFFFF',
    surfaceSecondary: '#faf1e0', // Linen
    border: '#E8DCC4',
    primary: '#ffcd57', // Nuqta Mustard
    secondary: '#1a3a52', // Nile Blue
    accent: '#1a3a52', // Nile Blue
    success: '#2ECC71',
    warning: '#FF9F1C',
    error: '#E74C3C',
    textSecondary: '#2A5577', // Lighter Nile Blue
    textMuted: '#9AA7B2',
    gold: '#ffcd57', // Nuqta Mustard
    // Nuqta specific
    nileBlue: '#1a3a52',
    mustard: '#ffcd57',
    linen: '#faf1e0',
    peach: '#ffd7b5',
    lavender: '#dfebf7',
  },
  dark: {
    text: '#E1E3E6',
    background: '#121212',
    tint: '#ffcd57',
    icon: '#6B7280',
    tabIconDefault: '#6B7280',
    tabIconSelected: '#ffcd57',
    surface: '#1E1E1E',
    surfaceSecondary: '#2C2C2C',
    border: '#3A3A3A',
    primary: '#ffcd57',
    secondary: '#7599B7',
    accent: '#7599B7',
    success: '#2ECC71',
    warning: '#FF9F1C',
    error: '#EF4444',
    textSecondary: '#A0AEC0',
    textMuted: '#6B7280',
    gold: '#ffcd57',
    // Nuqta specific
    nileBlue: '#7599B7',
    mustard: '#ffcd57',
    linen: '#1E1E1E',
    peach: '#ffd7b5',
    lavender: '#1A2633',
  },
};
