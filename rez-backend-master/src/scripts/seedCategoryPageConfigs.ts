/**
 * Seed Script for Category Page Configs
 * Populates the `pageConfig` field on root-level Category documents (main categories)
 * using the current hardcoded values from the frontend's categoryConfig.ts and data files.
 *
 * Run: npx ts-node src/scripts/seedCategoryPageConfigs.ts
 *
 * This script is idempotent -- safe to re-run. It will overwrite any existing pageConfig.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import model
import { Category } from '../models/Category';

// ─── Console Helpers ────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

const log = {
  info: (msg: string) => console.log(`${colors.cyan}[INFO] ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}[OK]   ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}[WARN] ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}[ERR]  ${msg}${colors.reset}`),
  header: (msg: string) =>
    console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
};

// ─── Generic Sections (shared across non-food categories) ────────────────────

function genericSections(): Array<{ type: string; enabled: boolean; sortOrder: number }> {
  return [
    { type: 'social-proof-ticker', enabled: true, sortOrder: 0 },
    { type: 'loyalty-hub', enabled: true, sortOrder: 1 },
    { type: 'browse-grid', enabled: true, sortOrder: 2 },
    { type: 'ai-search', enabled: true, sortOrder: 3 },
    { type: 'stores-list', enabled: true, sortOrder: 4 },
    { type: 'popular-items', enabled: true, sortOrder: 5 },
    { type: 'new-stores', enabled: true, sortOrder: 6 },
    { type: 'curated-collections', enabled: true, sortOrder: 7 },
    { type: 'ugc-social', enabled: true, sortOrder: 8 },
    { type: 'offers-section', enabled: true, sortOrder: 9 },
    { type: 'experiences-section', enabled: true, sortOrder: 10 },
    { type: 'footer-trust', enabled: true, sortOrder: 11 },
  ];
}

// ─── Page Config Definitions ─────────────────────────────────────────────────

interface PageConfigDef {
  slug: string;
  pageConfig: {
    isMainCategory: boolean;
    theme: { primaryColor: string; gradientColors: string[]; icon: string };
    banner: {
      title: string;
      subtitle: string;
      discount: string;
      tag: string;
      image?: string;
      ctaText?: string;
      ctaRoute?: string;
    };
    tabs: Array<{
      id: string;
      label: string;
      icon: string;
      serviceFilter?: string;
      enabled: boolean;
      sortOrder: number;
    }>;
    quickActions: Array<{
      id: string;
      label: string;
      icon: string;
      route: string;
      color: string;
      enabled: boolean;
      sortOrder: number;
    }>;
    sections: Array<{ type: string; enabled: boolean; sortOrder: number; config?: any }>;
    serviceTypes: Array<{
      id: string;
      label: string;
      icon: string;
      description: string;
      filterField: string;
      enabled: boolean;
      sortOrder: number;
    }>;
  };
}

// Helper: convert quickAction objects from the data files into the pageConfig format.
// The data files use mixed key names (some use "label", some use "name") so we normalise.
function normaliseQuickActions(
  items: Array<{
    id: string;
    label?: string;
    name?: string;
    icon: string;
    route: string;
    color: string;
  }>,
): PageConfigDef['pageConfig']['quickActions'] {
  return items.map((item, idx) => ({
    id: item.id,
    label: item.label || item.name || item.id,
    icon: item.icon,
    route: item.route,
    color: item.color,
    enabled: true,
    sortOrder: idx,
  }));
}

// ─── All 12 Category Configs ─────────────────────────────────────────────────

const PAGE_CONFIGS: PageConfigDef[] = [
  // ──────────────────────────────────────────────
  // 1. FOOD & DINING
  // ──────────────────────────────────────────────
  {
    slug: 'food-dining',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#FF6B35',
        gradientColors: ['#FF6B35', '#FF8C5A', '#FFF0E8'],
        icon: 'restaurant-outline',
      },
      banner: {
        title: 'Taste the Best',
        subtitle: 'Local Flavors',
        discount: '30%',
        tag: 'FRESH DEALS',
      },
      tabs: [
        { id: 'delivery', label: 'Delivery', icon: 'bicycle-outline', serviceFilter: 'homeDelivery', enabled: true, sortOrder: 0 },
        { id: 'dineIn', label: 'Dine-In', icon: 'restaurant-outline', serviceFilter: 'dineIn', enabled: true, sortOrder: 1 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 2 },
        { id: 'experiences', label: 'Experiences', icon: 'sparkles-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: [
        { id: 'book-table', label: 'Book Table', icon: 'restaurant-outline', route: '/MainCategory/food-dining/book-table', color: '#FF6B35', enabled: true, sortOrder: 0 },
        { id: 'fast-delivery', label: 'Fast Delivery', icon: 'bicycle-outline', route: '/MainCategory/food-dining/fast-delivery', color: '#22C55E', enabled: true, sortOrder: 1 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/food-dining/offers', color: '#F59E0B', enabled: true, sortOrder: 2 },
        { id: 'top-rated', label: 'Top Rated', icon: 'star-outline', route: '/MainCategory/food-dining/top-rated', color: '#3B82F6', enabled: true, sortOrder: 3 },
        { id: 'cuisines', label: 'Cuisines', icon: 'flame-outline', route: '/MainCategory/food-dining/search', color: '#EF4444', enabled: true, sortOrder: 4 },
        { id: 'food-stories', label: 'Food Stories', icon: 'camera-outline', route: '/MainCategory/food-dining/food-stories', color: '#8B5CF6', enabled: true, sortOrder: 5 },
        { id: 'saved', label: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EC4899', enabled: true, sortOrder: 6 },
        { id: 'loyalty', label: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/food-dining/loyalty', color: '#F97316', enabled: true, sortOrder: 7 },
      ],
      sections: [
        { type: 'social-proof-ticker', enabled: true, sortOrder: 0 },
        { type: 'loyalty-hub', enabled: true, sortOrder: 1 },
        { type: 'browse-grid', enabled: true, sortOrder: 2 },
        { type: 'ai-search', enabled: true, sortOrder: 3 },
        { type: 'stores-list', enabled: true, sortOrder: 4 },
        { type: 'popular-items', enabled: true, sortOrder: 5 },
        { type: 'new-stores', enabled: true, sortOrder: 6 },
        { type: 'curated-collections', enabled: true, sortOrder: 7 },
        { type: 'order-again', enabled: true, sortOrder: 8 },
        { type: 'ugc-social', enabled: true, sortOrder: 9 },
        { type: 'offers-section', enabled: true, sortOrder: 10 },
        { type: 'experiences-section', enabled: true, sortOrder: 11 },
        { type: 'footer-trust', enabled: true, sortOrder: 12 },
      ],
      serviceTypes: [
        { id: 'home-delivery', label: 'Home Delivery', icon: 'bicycle-outline', description: 'Get food delivered to your door', filterField: 'homeDelivery', enabled: true, sortOrder: 0 },
        { id: 'drive-thru', label: 'Drive-Thru', icon: 'car-outline', description: 'Quick pickup without leaving your car', filterField: 'driveThru', enabled: true, sortOrder: 1 },
        { id: 'table-booking', label: 'Book Table', icon: 'restaurant-outline', description: 'Reserve a table at your favorite restaurant', filterField: 'tableBooking', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 2. GROCERY & ESSENTIALS
  // ──────────────────────────────────────────────
  {
    slug: 'grocery-essentials',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#22C55E',
        gradientColors: ['#22C55E', '#16A34A', '#14532D'],
        icon: 'basket-outline',
      },
      banner: {
        title: 'Fresh Daily',
        subtitle: 'Essentials',
        discount: '25%',
        tag: 'DAILY DEALS',
      },
      tabs: [
        { id: 'delivery', label: 'Delivery', icon: 'bicycle-outline', serviceFilter: 'homeDelivery', enabled: true, sortOrder: 0 },
        { id: 'pickup', label: 'Pickup', icon: 'storefront-outline', serviceFilter: 'storePickup', enabled: true, sortOrder: 1 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 2 },
        { id: 'subscription', label: 'Subscribe', icon: 'repeat-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'fast-delivery', label: 'Fast Delivery', icon: 'bicycle-outline', route: '/MainCategory/grocery-essentials/fast-delivery', color: '#22C55E' },
        { id: 'compare', label: 'Compare', icon: 'git-compare-outline', route: '/MainCategory/grocery-essentials/compare', color: '#3B82F6' },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/grocery-essentials/offers', color: '#F59E0B' },
        { id: 'top-rated', label: 'Top Rated', icon: 'star-outline', route: '/MainCategory/grocery-essentials/top-rated', color: '#EF4444' },
        { id: 'organic', label: 'Organic', icon: 'leaf-outline', route: '/MainCategory/grocery-essentials/search?q=organic', color: '#10B981' },
        { id: 'grocery-stories', label: 'Stories', icon: 'camera-outline', route: '/MainCategory/grocery-essentials/grocery-stories', color: '#8B5CF6' },
        { id: 'saved', label: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EC4899' },
        { id: 'loyalty', label: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/grocery-essentials/loyalty', color: '#F97316' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'home-delivery', label: 'Home Delivery', icon: 'bicycle-outline', description: 'Get groceries delivered to your door', filterField: 'homeDelivery', enabled: true, sortOrder: 0 },
        { id: 'store-pickup', label: 'Store Pickup', icon: 'storefront-outline', description: 'Order online, pick up in store', filterField: 'storePickup', enabled: true, sortOrder: 1 },
        { id: 'subscription', label: 'Subscription', icon: 'repeat-outline', description: 'Auto-delivery on a schedule', filterField: 'subscription', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 3. BEAUTY & WELLNESS
  // ──────────────────────────────────────────────
  {
    slug: 'beauty-wellness',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#EC4899',
        gradientColors: ['#F472B6', '#F9A8D4', '#FDF2F8'],
        icon: 'flower-outline',
      },
      banner: {
        title: 'Glow Up',
        subtitle: 'Self Care',
        discount: '40%',
        tag: 'WELLNESS WEEK',
      },
      tabs: [
        { id: 'services', label: 'Services', icon: 'cut-outline', serviceFilter: 'beautyService', enabled: true, sortOrder: 0 },
        { id: 'appointments', label: 'Appointments', icon: 'calendar-outline', serviceFilter: 'appointment', enabled: true, sortOrder: 1 },
        { id: 'products', label: 'Products', icon: 'bag-outline', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'book', name: 'Book Now', icon: 'calendar-outline', route: '/MainCategory/beauty-wellness/book-appointment', color: '#EC4899' },
        { id: 'offers', name: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/beauty-wellness/offers', color: '#EF4444' },
        { id: 'top-rated', name: 'Top Rated', icon: 'star-outline', route: '/MainCategory/beauty-wellness/top-rated', color: '#F59E0B' },
        { id: 'bridal', name: 'Bridal', icon: 'heart-circle-outline', route: '/MainCategory/beauty-wellness/search?q=bridal', color: '#F43F5E' },
        { id: 'at-home', name: 'At Home', icon: 'home-outline', route: '/MainCategory/beauty-wellness/search?q=home+service', color: '#8B5CF6' },
        { id: 'trending', name: 'Trending', icon: 'trending-up-outline', route: '/MainCategory/beauty-wellness/search?q=trending', color: '#3B82F6' },
        { id: 'saved', name: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EC4899' },
        { id: 'loyalty', name: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/beauty-wellness/loyalty', color: '#22C55E' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'salon-visit', label: 'Salon Visit', icon: 'cut-outline', description: 'Visit a salon near you', filterField: 'salonVisit', enabled: true, sortOrder: 0 },
        { id: 'home-service', label: 'At Home', icon: 'home-outline', description: 'Get beauty services at home', filterField: 'homeService', enabled: true, sortOrder: 1 },
        { id: 'product-delivery', label: 'Product Delivery', icon: 'bag-outline', description: 'Order beauty products online', filterField: 'productDelivery', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 4. HEALTHCARE
  // ──────────────────────────────────────────────
  {
    slug: 'healthcare',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#0EA5E9',
        gradientColors: ['#0EA5E9', '#38BDF8', '#BAE6FD'],
        icon: 'medical-outline',
      },
      banner: {
        title: 'Health First',
        subtitle: 'Care for You',
        discount: '20%',
        tag: 'HEALTH WEEK',
      },
      tabs: [
        { id: 'consult', label: 'Consult', icon: 'chatbubbles-outline', serviceFilter: 'consultation', enabled: true, sortOrder: 0 },
        { id: 'pharmacy', label: 'Pharmacy', icon: 'medkit-outline', serviceFilter: 'pharmacy', enabled: true, sortOrder: 1 },
        { id: 'lab-tests', label: 'Lab Tests', icon: 'flask-outline', serviceFilter: 'labTest', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'book-doctor', name: 'Book Doctor', icon: 'person-outline', route: '/MainCategory/healthcare/book-doctor', color: '#0EA5E9' },
        { id: 'order-medicine', name: 'Medicine', icon: 'medkit-outline', route: '/MainCategory/healthcare/search?q=pharmacy', color: '#EF4444' },
        { id: 'lab-tests', name: 'Lab Tests', icon: 'flask-outline', route: '/MainCategory/healthcare/search?q=diagnostic', color: '#8B5CF6' },
        { id: 'health-tips', name: 'Health Tips', icon: 'bulb-outline', route: '/MainCategory/healthcare/health-stories', color: '#22C55E' },
        { id: 'emergency', name: 'Emergency', icon: 'alert-circle-outline', route: '/MainCategory/healthcare/search?q=emergency', color: '#EF4444' },
        { id: 'top-rated', name: 'Top Rated', icon: 'star-outline', route: '/MainCategory/healthcare/top-rated', color: '#F59E0B' },
        { id: 'saved', name: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EC4899' },
        { id: 'loyalty', name: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/healthcare/loyalty', color: '#D97706' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'online-consult', label: 'Online Consult', icon: 'videocam-outline', description: 'Video consultation with a doctor', filterField: 'onlineConsult', enabled: true, sortOrder: 0 },
        { id: 'clinic-visit', label: 'Clinic Visit', icon: 'medical-outline', description: 'Book an in-person visit', filterField: 'clinicVisit', enabled: true, sortOrder: 1 },
        { id: 'medicine-delivery', label: 'Medicine Delivery', icon: 'medkit-outline', description: 'Get medicines delivered', filterField: 'medicineDelivery', enabled: true, sortOrder: 2 },
        { id: 'home-sample', label: 'Home Sample', icon: 'home-outline', description: 'Lab sample collection at home', filterField: 'homeSample', enabled: true, sortOrder: 3 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 5. FASHION
  // ──────────────────────────────────────────────
  {
    slug: 'fashion',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#A855F7',
        gradientColors: ['#A855F7', '#C084FC', '#E9D5FF'],
        icon: 'shirt-outline',
      },
      banner: {
        title: 'Wedding Glam',
        subtitle: 'in a Flash',
        discount: '50%',
        tag: 'LIMITED TIME',
      },
      tabs: [
        { id: 'shop', label: 'Shop', icon: 'bag-outline', enabled: true, sortOrder: 0 },
        { id: 'try-and-buy', label: 'Try & Buy', icon: 'shirt-outline', serviceFilter: 'tryAndBuy', enabled: true, sortOrder: 1 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 2 },
        { id: 'trends', label: 'Trends', icon: 'trending-up-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'try-and-buy', label: 'Try & Buy', icon: 'shirt-outline', route: '/MainCategory/fashion/try-and-buy', color: '#A855F7' },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/fashion/offers', color: '#F59E0B' },
        { id: 'top-rated', label: 'Top Rated', icon: 'star-outline', route: '/MainCategory/fashion/top-rated', color: '#3B82F6' },
        { id: 'search', label: 'Explore', icon: 'search-outline', route: '/MainCategory/fashion/search', color: '#EC4899' },
        { id: 'fashion-stories', label: 'Style Diary', icon: 'camera-outline', route: '/MainCategory/fashion/fashion-stories', color: '#8B5CF6' },
        { id: 'brands', label: 'Brands', icon: 'storefront-outline', route: '/MainCategory/fashion/top-rated', color: '#06B6D4' },
        { id: 'saved', label: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EF4444' },
        { id: 'loyalty', label: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/fashion/loyalty', color: '#F97316' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'home-delivery', label: 'Home Delivery', icon: 'bicycle-outline', description: 'Get fashion delivered to your door', filterField: 'homeDelivery', enabled: true, sortOrder: 0 },
        { id: 'try-and-buy', label: 'Try & Buy', icon: 'shirt-outline', description: 'Try at home, pay for what you keep', filterField: 'tryAndBuy', enabled: true, sortOrder: 1 },
        { id: 'store-pickup', label: 'Store Pickup', icon: 'storefront-outline', description: 'Order online, pick up in store', filterField: 'storePickup', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 6. FITNESS & SPORTS
  // ──────────────────────────────────────────────
  {
    slug: 'fitness-sports',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#F97316',
        gradientColors: ['#F97316', '#FB923C', '#FED7AA'],
        icon: 'fitness-outline',
      },
      banner: {
        title: 'Get Fit',
        subtitle: 'Stay Strong',
        discount: '35%',
        tag: 'FITNESS SALE',
      },
      tabs: [
        { id: 'classes', label: 'Classes', icon: 'barbell-outline', serviceFilter: 'fitnessClass', enabled: true, sortOrder: 0 },
        { id: 'memberships', label: 'Memberships', icon: 'card-outline', serviceFilter: 'membership', enabled: true, sortOrder: 1 },
        { id: 'gear', label: 'Gear', icon: 'shirt-outline', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'book-class', name: 'Book Class', icon: 'calendar-outline', route: '/MainCategory/fitness-sports/book-class', color: '#F97316' },
        { id: 'offers', name: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/fitness-sports/offers', color: '#EF4444' },
        { id: 'top-rated', name: 'Top Rated', icon: 'star-outline', route: '/MainCategory/fitness-sports/top-rated', color: '#F59E0B' },
        { id: 'challenges', name: 'Challenges', icon: 'trophy-outline', route: '/MainCategory/fitness-sports/challenges', color: '#22C55E' },
        { id: 'gear-shop', name: 'Gear Shop', icon: 'cart-outline', route: '/MainCategory/fitness-sports/search?q=equipment', color: '#3B82F6' },
        { id: 'schedule', name: 'Schedule', icon: 'time-outline', route: '/MainCategory/fitness-sports/search?q=schedule', color: '#8B5CF6' },
        { id: 'saved', name: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EC4899' },
        { id: 'loyalty', name: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/fitness-sports/loyalty', color: '#D97706' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'gym-visit', label: 'Gym Visit', icon: 'barbell-outline', description: 'Work out at a gym near you', filterField: 'gymVisit', enabled: true, sortOrder: 0 },
        { id: 'online-class', label: 'Online Class', icon: 'videocam-outline', description: 'Join live virtual classes', filterField: 'onlineClass', enabled: true, sortOrder: 1 },
        { id: 'personal-training', label: 'Personal Training', icon: 'person-outline', description: 'One-on-one trainer sessions', filterField: 'personalTraining', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 7. EDUCATION & LEARNING
  // ──────────────────────────────────────────────
  {
    slug: 'education-learning',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#6366F1',
        gradientColors: ['#6366F1', '#818CF8', '#C7D2FE'],
        icon: 'school-outline',
      },
      banner: {
        title: 'Learn More',
        subtitle: 'Grow Skills',
        discount: '25%',
        tag: 'LEARNING FEST',
      },
      tabs: [
        { id: 'classes', label: 'Classes', icon: 'book-outline', serviceFilter: 'offlineClass', enabled: true, sortOrder: 0 },
        { id: 'online', label: 'Online', icon: 'laptop-outline', serviceFilter: 'onlineClass', enabled: true, sortOrder: 1 },
        { id: 'tutors', label: 'Tutors', icon: 'people-outline', serviceFilter: 'tutor', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'enroll-class', name: 'Enroll Class', icon: 'create-outline', route: '/MainCategory/education-learning/enroll-class', color: '#6366F1' },
        { id: 'offers', name: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/education-learning/offers', color: '#EF4444' },
        { id: 'top-rated', name: 'Top Rated', icon: 'star-outline', route: '/MainCategory/education-learning/top-rated', color: '#F59E0B' },
        { id: 'study-planner', name: 'Planner', icon: 'calendar-outline', route: '/MainCategory/education-learning/search?q=planner', color: '#22C55E' },
        { id: 'skill-test', name: 'Skill Test', icon: 'checkmark-circle-outline', route: '/MainCategory/education-learning/search?q=skill-test', color: '#3B82F6' },
        { id: 'free-trial', name: 'Free Trial', icon: 'gift-outline', route: '/MainCategory/education-learning/search?q=free-trial', color: '#8B5CF6' },
        { id: 'saved', name: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EC4899' },
        { id: 'loyalty', name: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/education-learning/loyalty', color: '#D97706' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'offline-class', label: 'Offline Class', icon: 'school-outline', description: 'Attend classes in person', filterField: 'offlineClass', enabled: true, sortOrder: 0 },
        { id: 'online-class', label: 'Online Class', icon: 'laptop-outline', description: 'Learn from home via video', filterField: 'onlineClass', enabled: true, sortOrder: 1 },
        { id: 'home-tutor', label: 'Home Tutor', icon: 'home-outline', description: 'Private tutor at your home', filterField: 'homeTutor', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 8. HOME SERVICES
  // ──────────────────────────────────────────────
  {
    slug: 'home-services',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#F59E0B',
        gradientColors: ['#F59E0B', '#FBBF24', '#FEF3C7'],
        icon: 'home-outline',
      },
      banner: {
        title: 'Home Help',
        subtitle: 'At Your Door',
        discount: '30%',
        tag: 'SERVICE DEALS',
      },
      tabs: [
        { id: 'repair', label: 'Repair', icon: 'construct-outline', serviceFilter: 'repair', enabled: true, sortOrder: 0 },
        { id: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline', serviceFilter: 'cleaning', enabled: true, sortOrder: 1 },
        { id: 'maintenance', label: 'AMC', icon: 'shield-checkmark-outline', serviceFilter: 'maintenance', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'book-service', name: 'Book Service', icon: 'create-outline', route: '/MainCategory/home-services/book-service', color: '#F59E0B' },
        { id: 'emergency', name: 'Emergency', icon: 'alert-circle-outline', route: '/MainCategory/home-services/search?q=emergency', color: '#EF4444' },
        { id: 'maintenance', name: 'AMC Plans', icon: 'calendar-outline', route: '/MainCategory/home-services/search?q=maintenance', color: '#8B5CF6' },
        { id: 'offers', name: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/home-services/offers', color: '#22C55E' },
        { id: 'top-rated', name: 'Top Rated', icon: 'star-outline', route: '/MainCategory/home-services/top-rated', color: '#3B82F6' },
        { id: 'schedule', name: 'Schedule', icon: 'time-outline', route: '/MainCategory/home-services/search?q=schedule', color: '#06B6D4' },
        { id: 'saved', name: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EC4899' },
        { id: 'loyalty', name: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/home-services/loyalty', color: '#D97706' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'at-home', label: 'At Home Visit', icon: 'home-outline', description: 'Service provider visits your home', filterField: 'homeVisit', enabled: true, sortOrder: 0 },
        { id: 'emergency', label: 'Emergency', icon: 'alert-circle-outline', description: '24/7 emergency service', filterField: 'emergency', enabled: true, sortOrder: 1 },
        { id: 'scheduled', label: 'Scheduled', icon: 'calendar-outline', description: 'Book for a convenient time', filterField: 'scheduled', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 9. TRAVEL & EXPERIENCES
  // ──────────────────────────────────────────────
  {
    slug: 'travel-experiences',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#06B6D4',
        gradientColors: ['#06B6D4', '#22D3EE', '#CFFAFE'],
        icon: 'airplane-outline',
      },
      banner: {
        title: 'Explore More',
        subtitle: 'Adventure Awaits',
        discount: '45%',
        tag: 'TRAVEL DEALS',
      },
      tabs: [
        { id: 'stays', label: 'Stays', icon: 'bed-outline', serviceFilter: 'accommodation', enabled: true, sortOrder: 0 },
        { id: 'transport', label: 'Transport', icon: 'car-outline', serviceFilter: 'transport', enabled: true, sortOrder: 1 },
        { id: 'packages', label: 'Packages', icon: 'map-outline', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'plan-trip', name: 'Plan Trip', icon: 'map-outline', route: '/MainCategory/travel-experiences/plan-trip', color: '#06B6D4' },
        { id: 'itinerary', name: 'Itinerary', icon: 'list-outline', route: '/MainCategory/travel-experiences/search?q=itinerary', color: '#8B5CF6' },
        { id: 'travel-guide', name: 'Guide', icon: 'book-outline', route: '/MainCategory/travel-experiences/search?q=guide', color: '#22C55E' },
        { id: 'offers', name: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/travel-experiences/offers', color: '#EF4444' },
        { id: 'top-rated', name: 'Top Rated', icon: 'star-outline', route: '/MainCategory/travel-experiences/top-rated', color: '#F59E0B' },
        { id: 'packages', name: 'Packages', icon: 'briefcase-outline', route: '/MainCategory/travel-experiences/search?q=packages', color: '#EC4899' },
        { id: 'saved', name: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#3B82F6' },
        { id: 'loyalty', name: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/travel-experiences/loyalty', color: '#D97706' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'booking', label: 'Booking', icon: 'bed-outline', description: 'Book hotels, homestays & more', filterField: 'booking', enabled: true, sortOrder: 0 },
        { id: 'transport', label: 'Transport', icon: 'car-outline', description: 'Cabs, rentals & intercity travel', filterField: 'transport', enabled: true, sortOrder: 1 },
        { id: 'tours', label: 'Tours & Activities', icon: 'map-outline', description: 'Guided tours and experiences', filterField: 'tours', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 10. ENTERTAINMENT
  // ──────────────────────────────────────────────
  {
    slug: 'entertainment',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#8B5CF6',
        gradientColors: ['#8B5CF6', '#A78BFA', '#DDD6FE'],
        icon: 'film-outline',
      },
      banner: {
        title: 'Fun Times',
        subtitle: 'Entertainment',
        discount: '40%',
        tag: 'FUN WEEK',
      },
      tabs: [
        { id: 'movies', label: 'Movies', icon: 'film-outline', serviceFilter: 'movies', enabled: true, sortOrder: 0 },
        { id: 'events', label: 'Events', icon: 'calendar-outline', serviceFilter: 'events', enabled: true, sortOrder: 1 },
        { id: 'gaming', label: 'Gaming', icon: 'game-controller-outline', serviceFilter: 'gaming', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'book-tickets', name: 'Book Tickets', icon: 'ticket-outline', route: '/MainCategory/entertainment/book-tickets', color: '#8B5CF6' },
        { id: 'events', name: 'Events', icon: 'calendar-outline', route: '/MainCategory/entertainment/search?q=events', color: '#EC4899' },
        { id: 'gaming', name: 'Gaming', icon: 'game-controller-outline', route: '/MainCategory/entertainment/search?q=gaming', color: '#3B82F6' },
        { id: 'offers', name: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/entertainment/offers', color: '#EF4444' },
        { id: 'trending', name: 'Trending', icon: 'trending-up-outline', route: '/MainCategory/entertainment/top-rated', color: '#F59E0B' },
        { id: 'new-releases', name: 'New', icon: 'sparkles-outline', route: '/MainCategory/entertainment/search?q=new', color: '#22C55E' },
        { id: 'saved', name: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#F43F5E' },
        { id: 'loyalty', name: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/entertainment/loyalty', color: '#D97706' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'tickets', label: 'Tickets', icon: 'ticket-outline', description: 'Book movie & event tickets', filterField: 'tickets', enabled: true, sortOrder: 0 },
        { id: 'gaming-zone', label: 'Gaming Zone', icon: 'game-controller-outline', description: 'Visit gaming cafes & VR zones', filterField: 'gamingZone', enabled: true, sortOrder: 1 },
        { id: 'streaming', label: 'Streaming', icon: 'play-circle-outline', description: 'OTT & streaming subscriptions', filterField: 'streaming', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 11. FINANCIAL LIFESTYLE
  // ──────────────────────────────────────────────
  {
    slug: 'financial-lifestyle',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#14B8A6',
        gradientColors: ['#14B8A6', '#2DD4BF', '#CCFBF1'],
        icon: 'wallet-outline',
      },
      banner: {
        title: 'Smart Money',
        subtitle: 'Save More',
        discount: '10%',
        tag: 'CASHBACK',
      },
      tabs: [
        { id: 'bills', label: 'Bills', icon: 'receipt-outline', serviceFilter: 'billPayment', enabled: true, sortOrder: 0 },
        { id: 'recharge', label: 'Recharge', icon: 'phone-portrait-outline', serviceFilter: 'recharge', enabled: true, sortOrder: 1 },
        { id: 'invest', label: 'Invest', icon: 'trending-up-outline', serviceFilter: 'investment', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'pay-bills', name: 'Pay Bills', icon: 'phone-portrait-outline', route: '/MainCategory/financial-lifestyle/search?q=bills', color: '#14B8A6' },
        { id: 'calculator', name: 'Calculator', icon: 'calculator-outline', route: '/MainCategory/financial-lifestyle/search?q=calculator', color: '#8B5CF6' },
        { id: 'compare', name: 'Compare', icon: 'git-compare-outline', route: '/MainCategory/financial-lifestyle/search?q=compare', color: '#3B82F6' },
        { id: 'offers', name: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/financial-lifestyle/offers', color: '#EF4444' },
        { id: 'top-rated', name: 'Top Rated', icon: 'star-outline', route: '/MainCategory/financial-lifestyle/top-rated', color: '#F59E0B' },
        { id: 'apply-service', name: 'Apply Now', icon: 'create-outline', route: '/MainCategory/financial-lifestyle/apply-service', color: '#22C55E' },
        { id: 'saved', name: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#EC4899' },
        { id: 'loyalty', name: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/financial-lifestyle/loyalty', color: '#D97706' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'bill-payment', label: 'Bill Payment', icon: 'receipt-outline', description: 'Pay electricity, gas, water bills', filterField: 'billPayment', enabled: true, sortOrder: 0 },
        { id: 'recharge', label: 'Recharge', icon: 'phone-portrait-outline', description: 'Mobile, DTH & broadband recharge', filterField: 'recharge', enabled: true, sortOrder: 1 },
        { id: 'investment', label: 'Investment', icon: 'trending-up-outline', description: 'Invest in gold, mutual funds & more', filterField: 'investment', enabled: true, sortOrder: 2 },
      ],
    },
  },

  // ──────────────────────────────────────────────
  // 12. ELECTRONICS
  // ──────────────────────────────────────────────
  {
    slug: 'electronics',
    pageConfig: {
      isMainCategory: true,
      theme: {
        primaryColor: '#3B82F6',
        gradientColors: ['#3B82F6', '#06B6D4', '#2563EB'],
        icon: 'phone-portrait-outline',
      },
      banner: {
        title: 'Tech Deals',
        subtitle: 'Latest Gadgets',
        discount: '25%',
        tag: 'ELECTRONICS SALE',
      },
      tabs: [
        { id: 'shop', label: 'Shop', icon: 'bag-outline', enabled: true, sortOrder: 0 },
        { id: 'compare', label: 'Compare', icon: 'git-compare-outline', enabled: true, sortOrder: 1 },
        { id: 'exchange', label: 'Exchange', icon: 'swap-horizontal-outline', serviceFilter: 'exchange', enabled: true, sortOrder: 2 },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', enabled: true, sortOrder: 3 },
      ],
      quickActions: normaliseQuickActions([
        { id: 'compare-devices', label: 'Compare', icon: 'git-compare-outline', route: '/MainCategory/electronics/compare-devices', color: '#3B82F6' },
        { id: 'offers', label: 'Offers', icon: 'pricetag-outline', route: '/MainCategory/electronics/offers', color: '#F59E0B' },
        { id: 'top-rated', label: 'Top Rated', icon: 'star-outline', route: '/MainCategory/electronics/top-rated', color: '#EF4444' },
        { id: 'search', label: 'Explore', icon: 'search-outline', route: '/MainCategory/electronics/search', color: '#EC4899' },
        { id: 'tech-stories', label: 'Tech Stories', icon: 'camera-outline', route: '/MainCategory/electronics/tech-stories', color: '#8B5CF6' },
        { id: 'brands', label: 'Brands', icon: 'storefront-outline', route: '/MainCategory/electronics/top-rated', color: '#06B6D4' },
        { id: 'saved', label: 'Saved', icon: 'heart-outline', route: '/wishlist', color: '#10B981' },
        { id: 'loyalty', label: 'Loyalty', icon: 'trophy-outline', route: '/MainCategory/electronics/loyalty', color: '#F97316' },
      ]),
      sections: genericSections(),
      serviceTypes: [
        { id: 'home-delivery', label: 'Home Delivery', icon: 'bicycle-outline', description: 'Get electronics delivered to your door', filterField: 'homeDelivery', enabled: true, sortOrder: 0 },
        { id: 'store-pickup', label: 'Store Pickup', icon: 'storefront-outline', description: 'Order online, pick up in store', filterField: 'storePickup', enabled: true, sortOrder: 1 },
        { id: 'exchange', label: 'Exchange', icon: 'swap-horizontal-outline', description: 'Trade in your old device', filterField: 'exchange', enabled: true, sortOrder: 2 },
      ],
    },
  },
];

// ─── Main Seed Function ──────────────────────────────────────────────────────

async function seedCategoryPageConfigs(): Promise<void> {
  log.header('Seed Category Page Configs');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-app';
  const dbName = process.env.DB_NAME || 'rez-app';

  log.info(`Connecting to MongoDB (${dbName})...`);
  await mongoose.connect(mongoUri, { dbName });
  log.success('Connected to MongoDB');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const def of PAGE_CONFIGS) {
    const { slug, pageConfig } = def;
    log.info(`Processing: ${slug}`);

    // Find the root-level category by slug (parentCategory is null)
    const category = await Category.findOne({ slug, parentCategory: null });

    if (!category) {
      // Fallback: try finding by slug without parentCategory constraint
      const fallback = await Category.findOne({ slug });
      if (fallback) {
        fallback.pageConfig = pageConfig as any;
        fallback.markModified('pageConfig');
        await fallback.save();
        log.success(`  Updated (fallback -- has parentCategory): ${slug}`);
        updated++;
      } else {
        log.warning(`  Category not found in DB: ${slug}`);
        notFound++;
      }
      continue;
    }

    // Set the pageConfig
    category.pageConfig = pageConfig as any;
    category.markModified('pageConfig');
    await category.save();
    log.success(`  Updated: ${slug}`);
    updated++;
  }

  log.header('Summary');
  log.info(`Total categories processed: ${PAGE_CONFIGS.length}`);
  log.success(`Updated: ${updated}`);
  if (skipped > 0) log.warning(`Skipped: ${skipped}`);
  if (notFound > 0) log.warning(`Not found: ${notFound}`);

  await mongoose.disconnect();
  log.success('Disconnected from MongoDB');
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

seedCategoryPageConfigs()
  .then(() => {
    console.log('\nDone.');
    process.exit(0);
  })
  .catch((err) => {
    log.error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
