import { CategoryColors } from '@/types/earnPage.types';

// Category Color Palette - Based on Screenshots
export const CATEGORY_COLORS: CategoryColors = {
  purple: {
    background: 'linear-gradient(135deg, #8B5CF6, #A855F7)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  teal: {
    background: 'linear-gradient(135deg, #ffcd57, #06B6D4)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  pink: {
    background: 'linear-gradient(135deg, #EC4899, #F472B6)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  blue: {
    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  green: {
    background: 'linear-gradient(135deg, #1a3a52, #ffcd57)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
  orange: {
    background: 'linear-gradient(135deg, #F59E0B, #F97316)',
    text: '#FFFFFF',
    icon: '#FFFFFF',
  },
};

// Solid colors for React Native (gradients handled separately)
export const CATEGORY_SOLID_COLORS = {
  purple: '#8B5CF6',
  teal: '#ffcd57',
  pink: '#EC4899',
  blue: '#3B82F6',
  green: '#1a3a52',
  orange: '#F59E0B',
} as const;

// Earn Page Color Palette - Nuqta Design System
export const EARN_COLORS = {
  // Primary Colors - Nuqta Mustard
  primary: '#ffcd57',
  primaryLight: '#FFE799',
  primaryDark: '#E6B84E',

  // Secondary Colors - Nile Blue
  secondary: '#1a3a52',
  secondaryLight: '#2A5577',
  secondaryDark: '#0E1F33',

  // Gold Accent - for rewards/coins (same as primary for Nuqta)
  gold: '#ffcd57',
  goldLight: '#FFE799',
  goldDark: '#E6B84E',

  // Accent Colors - Peach
  accent: '#ffd7b5',
  accentLight: '#FFE5CC',
  accentDark: '#E6C1A3',

  // Nile Blue - for dark text
  navy: '#1a3a52',
  slate: '#2A5577',
  muted: '#9AA7B2',

  // Background Colors - Nuqta
  background: '#faf1e0',       // Linen
  backgroundSecondary: '#FFFFFF',
  backgroundCard: '#FFFFFF',

  // Glass Effects
  glassWhite: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
  glassHighlight: 'rgba(255, 255, 255, 0.5)',

  // Text Colors - Nuqta
  textPrimary: '#1a3a52',      // Nile Blue
  textSecondary: '#2A5577',
  textTertiary: '#9AA7B2',
  textLight: '#FFFFFF',

  // Status Colors
  success: '#2ECC71',
  warning: '#ffcd57',          // Mustard
  error: '#EF4444',
  info: '#1a3a52',             // Nile Blue

  // Border Colors
  border: '#E8DCC4',
  borderLight: '#faf1e0',      // Linen
  borderDark: '#D4C9B0',

  // Shadow Colors
  shadowLight: 'rgba(0, 0, 0, 0.05)',
  shadowMedium: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.15)',
  shadowAccent: 'rgba(255, 205, 87, 0.3)', // Mustard shadow
} as const;

// Category Color Mapping for specific categories
export const CATEGORY_COLOR_MAP = {
  'graphics-design': 'pink',
  'meme-marketing': 'purple', 
  'brand-storyteller': 'teal',
  'review': 'purple',
  'social-share': 'teal',
  'ugc-content': 'pink',
  'research': 'pink',
  'games': 'purple',
  'sales': 'teal',
  'video-creation': 'purple',
  'website-design': 'teal',
  'social-media-marketing': 'pink',
  'mobile-app-development': 'pink',
  'voice-over': 'teal',
  'influencer': 'pink',
} as const;

// Gradient definitions for React Native LinearGradient
export const CATEGORY_GRADIENTS = {
  purple: ['#8B5CF6', '#A855F7'],
  teal: ['#ffcd57', '#06B6D4'],
  pink: ['#EC4899', '#F472B6'],
  blue: ['#3B82F6', '#6366F1'],
  green: ['#1a3a52', '#ffcd57'],
  orange: ['#F59E0B', '#F97316'],
} as const;

// Notification Colors
export const NOTIFICATION_COLORS = {
  info: {
    background: '#EFF6FF',
    border: '#DBEAFE',
    text: '#1E40AF',
    icon: '#3B82F6',
  },
  success: {
    background: '#F0FDF4',
    border: '#DCFCE7',
    text: '#166534',
    icon: '#ffcd57',
  },
  warning: {
    background: '#FFFBEB',
    border: '#FEF3C7',
    text: '#92400E',
    icon: '#F59E0B',
  },
  error: {
    background: '#FEF2F2',
    border: '#FECACA',
    text: '#991B1B',
    icon: '#EF4444',
  },
} as const;

// Project Status Colors
export const PROJECT_STATUS_COLORS = {
  'complete-now': {
    background: '#8B5CF6',
    text: '#FFFFFF',
    count: '#FFFFFF',
  },
  'in-review': {
    background: '#F59E0B',
    text: '#FFFFFF', 
    count: '#FFFFFF',
  },
  'completed': {
    background: '#ffcd57',
    text: '#FFFFFF',
    count: '#FFFFFF',
  },
} as const;

export type CategoryColorKey = keyof typeof CATEGORY_SOLID_COLORS;
export type EarnColorKey = keyof typeof EARN_COLORS;