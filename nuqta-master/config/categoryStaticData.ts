/**
 * Category Static Data Configuration
 * Centralizes all static data used in category pages
 * This allows easy updates and keeps components clean
 */

import { Ionicons } from '@expo/vector-icons';

// Common icon type
type IoniconsName = keyof typeof Ionicons.glyphMap;

// ===========================================
// FOOD & DINING
// ===========================================

export interface TabItem {
  id: string;
  label: string;
  icon: IoniconsName;
}

export const FOOD_TABS: TabItem[] = [
  { id: 'food', label: 'Food', icon: 'fast-food-outline' },
  { id: 'dining', label: 'Dining', icon: 'restaurant-outline' },
  { id: 'offers', label: 'Offers', icon: 'pricetag-outline' },
  { id: 'experiences', label: 'Experiences', icon: 'sparkles-outline' },
];

// ===========================================
// GROCERY
// ===========================================

export const GROCERY_TABS: TabItem[] = [
  { id: 'all', label: 'All', icon: 'apps-outline' },
  { id: 'fresh', label: 'Fresh', icon: 'leaf-outline' },
  { id: 'dairy', label: 'Dairy', icon: 'water-outline' },
  { id: 'snacks', label: 'Snacks', icon: 'fast-food-outline' },
];

// ===========================================
// ENTERTAINMENT
// ===========================================

export const EVENT_CATEGORIES: TabItem[] = [
  { id: 'movies', label: 'Movies', icon: 'film-outline' },
  { id: 'live', label: 'Live Events', icon: 'mic-outline' },
  { id: 'festivals', label: 'Festivals', icon: 'musical-notes-outline' },
  { id: 'gaming', label: 'Gaming', icon: 'game-controller-outline' },
];

// ===========================================
// TRAVEL
// ===========================================

export const TRAVEL_TABS: TabItem[] = [
  { id: 'flights', label: 'Flights', icon: 'airplane-outline' },
  { id: 'hotels', label: 'Hotels', icon: 'bed-outline' },
  { id: 'destinations', label: 'Destinations', icon: 'map-outline' },
  { id: 'taxis', label: 'Taxis', icon: 'car-outline' },
];

// ===========================================
// FINANCIAL SERVICES
// ===========================================

export interface FinancialSection {
  id: string;
  label: string;
  icon: IoniconsName;
}

export const FINANCIAL_SECTIONS: FinancialSection[] = [
  { id: 'payments', label: 'Payments & Bills', icon: 'receipt-outline' },
  { id: 'savings', label: 'Savings', icon: 'wallet-outline' },
  { id: 'credit', label: 'Credit', icon: 'card-outline' },
];

export interface BillType {
  name: string;
  icon: IoniconsName;
  color: string;
}

export const BILL_TYPES: BillType[] = [
  { name: 'Electricity', icon: 'flash-outline', color: '#F59E0B' },
  { name: 'Water', icon: 'water-outline', color: '#3B82F6' },
  { name: 'Gas', icon: 'flame-outline', color: '#EF4444' },
  { name: 'Internet', icon: 'wifi-outline', color: '#8B5CF6' },
  { name: 'Mobile', icon: 'phone-portrait-outline', color: '#1a3a52' },
  { name: 'Broadband', icon: 'tv-outline', color: '#EC4899' },
];

export const RECHARGE_AMOUNTS = ['99', '199', '299', '499', '599', '799'];

// ===========================================
// HOME SERVICES
// ===========================================

export const SERVICE_FILTERS: TabItem[] = [
  { id: 'near-me', label: 'Near Me', icon: 'location-outline' },
  { id: 'urgent', label: 'Urgent', icon: 'flash-outline' },
  { id: 'scheduled', label: 'Scheduled', icon: 'calendar-outline' },
  { id: 'verified', label: 'Verified', icon: 'checkmark-circle-outline' },
];

// ===========================================
// COMMON COLORS
// ===========================================

export const CATEGORY_COLORS = {
  primaryMustard: '#ffcd57',
  primaryGold: '#ffcd57',
  textPrimary: '#1a3a52',
  textSecondary: '#6B7280',
  white: '#FFFFFF',
  background: '#faf1e0',
  error: '#EF4444',
  success: '#ffcd57',
  warning: '#F59E0B',
  info: '#1a3a52',
};

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

export const getCategoryStaticData = (slug: string) => {
  switch (slug) {
    case 'food-dining':
      return { tabs: FOOD_TABS };
    case 'grocery-essentials':
      return { tabs: GROCERY_TABS };
    case 'entertainment':
      return { categories: EVENT_CATEGORIES };
    case 'travel-experiences':
      return { tabs: TRAVEL_TABS };
    case 'financial-lifestyle':
      return { sections: FINANCIAL_SECTIONS, bills: BILL_TYPES };
    case 'home-services':
      return { filters: SERVICE_FILTERS };
    default:
      return {};
  }
};

export default {
  FOOD_TABS,
  GROCERY_TABS,
  EVENT_CATEGORIES,
  TRAVEL_TABS,
  FINANCIAL_SECTIONS,
  SERVICE_FILTERS,
  CATEGORY_COLORS,
  getCategoryStaticData,
};
