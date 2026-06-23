/**
 * Category-based theme configuration for EventPage - Nuqta Design
 * Each category uses Nuqta palette variations for brand consistency
 *
 * Nuqta Colors:
 * - Nile Blue: #1a3a52
 * - Light Mustard: #ffcd57
 * - Linen: #faf1e0
 * - Light Peach: #ffd7b5
 * - Lavender Mist: #dfebf7
 */

export interface CategoryTheme {
  primaryColor: string;
  secondaryColor: string;
  gradientColors: [string, string];
  icon: string;
  accentColor: string;
  darkText: string;
  lightText: string;
  badgeBackground: string;
  buttonGradient: [string, string];
}

export const CATEGORY_THEMES: Record<string, CategoryTheme> = {
  // Nuqta-themed lowercase categories
  movies: {
    primaryColor: '#1a3a52',     // Nile Blue
    secondaryColor: '#ffd7b5',   // Light Peach
    gradientColors: ['#1a3a52', '#ffd7b5'],
    icon: 'film-outline',
    accentColor: '#dfebf7',      // Lavender Mist
    darkText: '#0E1F33',
    lightText: '#faf1e0',
    badgeBackground: 'rgba(26, 58, 82, 0.9)',
    buttonGradient: ['#1a3a52', '#2A5577'],
  },
  concerts: {
    primaryColor: '#ffcd57',     // Light Mustard
    secondaryColor: '#1a3a52',   // Nile Blue
    gradientColors: ['#ffcd57', '#1a3a52'],
    icon: 'musical-notes-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFE799',
    badgeBackground: 'rgba(255, 205, 87, 0.9)',
    buttonGradient: ['#ffcd57', '#E6B84E'],
  },
  sports: {
    primaryColor: '#1a3a52',     // Nile Blue
    secondaryColor: '#dfebf7',   // Lavender Mist
    gradientColors: ['#1a3a52', '#dfebf7'],
    icon: 'football-outline',
    accentColor: '#dfebf7',
    darkText: '#0E1F33',
    lightText: '#faf1e0',
    badgeBackground: 'rgba(26, 58, 82, 0.9)',
    buttonGradient: ['#1a3a52', '#2A5577'],
  },
  parks: {
    primaryColor: '#faf1e0',     // Linen
    secondaryColor: '#ffcd57',   // Light Mustard
    gradientColors: ['#faf1e0', '#ffcd57'],
    icon: 'leaf-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFFFFF',
    badgeBackground: 'rgba(255, 205, 87, 0.9)',
    buttonGradient: ['#ffcd57', '#E6B84E'],
  },
  workshops: {
    primaryColor: '#ffcd57',     // Light Mustard
    secondaryColor: '#faf1e0',   // Linen
    gradientColors: ['#ffcd57', '#faf1e0'],
    icon: 'brush-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFE799',
    badgeBackground: 'rgba(255, 205, 87, 0.9)',
    buttonGradient: ['#ffcd57', '#E6B84E'],
  },
  gaming: {
    primaryColor: '#1a3a52',     // Nile Blue
    secondaryColor: '#ffcd57',   // Light Mustard
    gradientColors: ['#1a3a52', '#ffcd57'],
    icon: 'game-controller-outline',
    accentColor: '#dfebf7',
    darkText: '#0E1F33',
    lightText: '#faf1e0',
    badgeBackground: 'rgba(26, 58, 82, 0.9)',
    buttonGradient: ['#1a3a52', '#2A5577'],
  },
  entertainment: {
    primaryColor: '#ffd7b5',     // Light Peach
    secondaryColor: '#ffcd57',   // Light Mustard
    gradientColors: ['#ffd7b5', '#ffcd57'],
    icon: 'sparkles-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFFFFF',
    badgeBackground: 'rgba(255, 215, 181, 0.9)',
    buttonGradient: ['#ffd7b5', '#ffcd57'],
  },

  // Legacy title case categories - Nuqta themed
  Music: {
    primaryColor: '#ffcd57',     // Light Mustard
    secondaryColor: '#1a3a52',
    gradientColors: ['#ffcd57', '#1a3a52'],
    icon: 'musical-note-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFE799',
    badgeBackground: 'rgba(255, 205, 87, 0.9)',
    buttonGradient: ['#ffcd57', '#E6B84E'],
  },
  Technology: {
    primaryColor: '#1a3a52',     // Nile Blue
    secondaryColor: '#dfebf7',
    gradientColors: ['#1a3a52', '#dfebf7'],
    icon: 'hardware-chip-outline',
    accentColor: '#dfebf7',
    darkText: '#0E1F33',
    lightText: '#faf1e0',
    badgeBackground: 'rgba(26, 58, 82, 0.9)',
    buttonGradient: ['#1a3a52', '#2A5577'],
  },
  Wellness: {
    primaryColor: '#ffd7b5',     // Light Peach
    secondaryColor: '#1a3a52',
    gradientColors: ['#ffd7b5', '#1a3a52'],
    icon: 'fitness-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFFFFF',
    badgeBackground: 'rgba(255, 215, 181, 0.9)',
    buttonGradient: ['#ffd7b5', '#ffcd57'],
  },
  Sports: {
    primaryColor: '#1a3a52',     // Nile Blue
    secondaryColor: '#dfebf7',
    gradientColors: ['#1a3a52', '#dfebf7'],
    icon: 'trophy-outline',
    accentColor: '#dfebf7',
    darkText: '#0E1F33',
    lightText: '#faf1e0',
    badgeBackground: 'rgba(26, 58, 82, 0.9)',
    buttonGradient: ['#1a3a52', '#2A5577'],
  },
  Education: {
    primaryColor: '#1a3a52',     // Nile Blue
    secondaryColor: '#ffcd57',
    gradientColors: ['#1a3a52', '#ffcd57'],
    icon: 'school-outline',
    accentColor: '#dfebf7',
    darkText: '#0E1F33',
    lightText: '#faf1e0',
    badgeBackground: 'rgba(26, 58, 82, 0.9)',
    buttonGradient: ['#1a3a52', '#2A5577'],
  },
  Business: {
    primaryColor: '#1a3a52',     // Nile Blue
    secondaryColor: '#faf1e0',
    gradientColors: ['#1a3a52', '#faf1e0'],
    icon: 'briefcase-outline',
    accentColor: '#dfebf7',
    darkText: '#0E1F33',
    lightText: '#faf1e0',
    badgeBackground: 'rgba(26, 58, 82, 0.9)',
    buttonGradient: ['#1a3a52', '#2A5577'],
  },
  Arts: {
    primaryColor: '#ffcd57',     // Light Mustard
    secondaryColor: '#ffd7b5',
    gradientColors: ['#ffcd57', '#ffd7b5'],
    icon: 'color-palette-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFE799',
    badgeBackground: 'rgba(255, 205, 87, 0.9)',
    buttonGradient: ['#ffcd57', '#E6B84E'],
  },
  Food: {
    primaryColor: '#ffd7b5',     // Light Peach
    secondaryColor: '#ffcd57',
    gradientColors: ['#ffd7b5', '#ffcd57'],
    icon: 'restaurant-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFFFFF',
    badgeBackground: 'rgba(255, 215, 181, 0.9)',
    buttonGradient: ['#ffd7b5', '#ffcd57'],
  },
  Entertainment: {
    primaryColor: '#ffd7b5',     // Light Peach
    secondaryColor: '#ffcd57',
    gradientColors: ['#ffd7b5', '#ffcd57'],
    icon: 'sparkles-outline',
    accentColor: '#FFF9E6',
    darkText: '#1a3a52',
    lightText: '#FFFFFF',
    badgeBackground: 'rgba(255, 215, 181, 0.9)',
    buttonGradient: ['#ffd7b5', '#ffcd57'],
  },
  Other: {
    primaryColor: '#1a3a52',     // Nile Blue
    secondaryColor: '#ffcd57',
    gradientColors: ['#1a3a52', '#ffcd57'],
    icon: 'ellipsis-horizontal-outline',
    accentColor: '#dfebf7',
    darkText: '#0E1F33',
    lightText: '#faf1e0',
    badgeBackground: 'rgba(26, 58, 82, 0.9)',
    buttonGradient: ['#1a3a52', '#2A5577'],
  },
};

// Default theme for unknown categories - Nuqta branded
export const DEFAULT_THEME: CategoryTheme = {
  primaryColor: '#1a3a52',     // Nile Blue
  secondaryColor: '#ffcd57',   // Light Mustard
  gradientColors: ['#1a3a52', '#ffcd57'],
  icon: 'calendar-outline',
  accentColor: '#dfebf7',      // Lavender Mist
  darkText: '#0E1F33',
  lightText: '#faf1e0',
  badgeBackground: 'rgba(26, 58, 82, 0.9)',
  buttonGradient: ['#1a3a52', '#2A5577'],
};

/**
 * Get theme for a category
 * @param category - The event category
 * @returns CategoryTheme object
 */
export const getCategoryTheme = (category: string | undefined): CategoryTheme => {
  if (!category) return DEFAULT_THEME;
  return CATEGORY_THEMES[category] || CATEGORY_THEMES[category.toLowerCase()] || DEFAULT_THEME;
};

/**
 * Get category icon name
 * @param category - The event category
 * @returns Ionicons icon name
 */
export const getCategoryIcon = (category: string | undefined): string => {
  const theme = getCategoryTheme(category);
  return theme.icon;
};
