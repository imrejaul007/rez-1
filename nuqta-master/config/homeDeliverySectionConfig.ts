/**
 * Home Delivery Section Configuration
 * Defines subcategories and settings for the homepage "Home Delivery" section
 */

export interface HomeDeliverySubcategory {
  id: string;
  label: string;
  slug: string;
  icon: string;
}

// 4 Mixed (Food + Grocery) subcategories for the Home Delivery section
export const HOME_DELIVERY_SUBCATEGORIES: HomeDeliverySubcategory[] = [
  { id: 'cloud-kitchens', label: 'Cloud Kitchens', slug: 'cloud-kitchens', icon: 'cloud-outline' },
  { id: 'supermarkets', label: 'Supermarkets', slug: 'supermarkets', icon: 'cart-outline' },
  { id: 'pharmacy', label: 'Pharmacy', slug: 'pharmacy', icon: 'medkit-outline' },
  { id: 'fresh-vegetables', label: 'Fresh Vegetables', slug: 'fresh-vegetables', icon: 'leaf-outline' },
];

// Section configuration
export const HOME_DELIVERY_SECTION_CONFIG = {
  title: 'Home Delivery',
  subtitle: 'Everything delivered to your door',
  storesPerCategory: 6,
  cardWidth: 200,
  cardHeight: 240,
  cardGap: 12,
  imageHeight: 120,
  avgOrderValue: 500, // Used to calculate earn amount from cashback %
};

// Nuqta Brand Colors for the section
export const HOME_DELIVERY_COLORS = {
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
  subcategories: HOME_DELIVERY_SUBCATEGORIES,
  config: HOME_DELIVERY_SECTION_CONFIG,
  colors: HOME_DELIVERY_COLORS,
};
