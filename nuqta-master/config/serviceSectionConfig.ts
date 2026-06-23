/**
 * Service Section Configuration
 * Defines subcategories and settings for the homepage "Service" section
 */

export interface ServiceSubcategory {
  id: string;
  label: string;
  slug: string;
  icon: string;
}

// 4 Service subcategories (mix of home services and beauty/wellness)
export const SERVICE_SUBCATEGORIES: ServiceSubcategory[] = [
  { id: 'ac-repair', label: 'AC Repair', slug: 'ac-repair', icon: 'snow-outline' },
  { id: 'salons', label: 'Salons', slug: 'salons', icon: 'cut-outline' },
  { id: 'cleaning', label: 'Cleaning', slug: 'cleaning', icon: 'sparkles-outline' },
  { id: 'spa-massage', label: 'Spa & Massage', slug: 'spa-massage', icon: 'leaf-outline' },
];

// Section configuration
export const SERVICE_SECTION_CONFIG = {
  title: 'Services',
  subtitle: 'Expert services at your doorstep',
  storesPerCategory: 6,
  cardWidth: 200,
  cardHeight: 240,
  cardGap: 12,
  imageHeight: 120,
  avgOrderValue: 500, // Used to calculate earn amount from cashback %
};

// Nuqta Brand Colors for the section
export const SERVICE_COLORS = {
  primary: '#ffcd57',
  primaryDark: '#1a3a52',
  gold: '#ffcd57',
  textPrimary: '#1a3a52',
  textSecondary: '#1F2D3D',
  textMuted: '#9AA7B2',
  white: '#FFFFFF',
  surface: '#faf1e0',
  cashbackGradient: ['#ffcd57', '#e6b84e'] as [string, string],
};

export default {
  subcategories: SERVICE_SUBCATEGORIES,
  config: SERVICE_SECTION_CONFIG,
  colors: SERVICE_COLORS,
};
