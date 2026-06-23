/**
 * Flash Sale Seeds - Lightning Deals for Offers Page
 *
 * These are time-limited deals with stock tracking and promo codes
 * Links to existing stores in the database
 */

import mongoose from 'mongoose';

// Helper to create future dates
const futureDate = (hours: number) => new Date(Date.now() + hours * 60 * 60 * 1000);

// Flash Sale interface matching the FlashSale model
export interface FlashSaleSeed {
  title: string;
  description: string;
  image: string;
  banner?: string;
  discountPercentage: number;
  discountAmount?: number;
  priority: number;
  startTime: Date;
  endTime: Date;
  maxQuantity: number;
  soldQuantity: number;
  limitPerUser: number;
  lowStockThreshold: number;
  products: mongoose.Types.ObjectId[];
  stores: mongoose.Types.ObjectId[];
  originalPrice: number;
  flashSalePrice: number;
  enabled: boolean;
  status: 'scheduled' | 'active' | 'ending_soon' | 'ended' | 'sold_out';
  termsAndConditions: string[];
  minimumPurchase?: number;
  maximumDiscount?: number;
  viewCount: number;
  clickCount: number;
  purchaseCount: number;
  uniqueCustomers: number;
  notifyOnStart: boolean;
  notifyOnEndingSoon: boolean;
  notifyOnLowStock: boolean;
  // Custom field for promo code
  promoCode?: string;
}

// Store IDs will be populated dynamically when running the seed
// These are placeholder values that will be replaced with actual DB store IDs
export const flashSaleSeeds: Partial<FlashSaleSeed>[] = [
  // Flash Deal 1: Pizza Deal
  {
    title: 'Flash Pizza Deal',
    description: 'Large Pizza + 2 Sides - Limited time offer! Get our best-selling pizza combo at an unbeatable price.',
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
    banner: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    discountPercentage: 33,
    priority: 10,
    startTime: new Date(),
    endTime: futureDate(2), // 2 hours from now
    maxQuantity: 100,
    soldQuantity: 67, // 67/100 claimed (matches screenshot)
    limitPerUser: 2,
    lowStockThreshold: 20,
    products: [],
    stores: [], // Will be populated with Domino's Pizza ID
    originalPrice: 15,
    flashSalePrice: 10,
    enabled: true,
    status: 'active',
    termsAndConditions: [
      'Valid for dine-in and delivery',
      'Cannot be combined with other offers',
      'Valid until stock lasts',
    ],
    minimumPurchase: 0,
    maximumDiscount: 5,
    viewCount: 1250,
    clickCount: 456,
    purchaseCount: 67,
    uniqueCustomers: 65,
    notifyOnStart: true,
    notifyOnEndingSoon: true,
    notifyOnLowStock: true,
    promoCode: 'FLASH33',
  },

  // Flash Deal 2: Burger Deal (McDonald's instead of Burger King)
  {
    title: 'Burger Bonanza',
    description: 'Double Whopper Combo - Get the ultimate burger experience at flash sale prices!',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    banner: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    discountPercentage: 33,
    priority: 9,
    startTime: new Date(),
    endTime: futureDate(1), // 1 hour from now (more urgent)
    maxQuantity: 50,
    soldQuantity: 42, // 42/50 claimed (matches screenshot)
    limitPerUser: 2,
    lowStockThreshold: 20,
    products: [],
    stores: [], // Will be populated with McDonald's ID
    originalPrice: 12,
    flashSalePrice: 8,
    enabled: true,
    status: 'active',
    termsAndConditions: [
      'Valid for delivery only',
      'Max 2 per customer',
      'While stocks last',
    ],
    minimumPurchase: 0,
    maximumDiscount: 4,
    viewCount: 2100,
    clickCount: 789,
    purchaseCount: 42,
    uniqueCustomers: 40,
    notifyOnStart: true,
    notifyOnEndingSoon: true,
    notifyOnLowStock: true,
    promoCode: 'BKFLASH',
  },

  // Flash Deal 3: Coffee Rush
  {
    title: 'Coffee Rush Hour',
    description: 'Any Grande Drink - Premium coffee at flash sale prices! Perfect for your morning boost.',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    banner: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
    discountPercentage: 33,
    priority: 8,
    startTime: new Date(),
    endTime: futureDate(0.5), // 30 mins from now (ending soon!)
    maxQuantity: 200,
    soldQuantity: 156, // 156/200 claimed
    limitPerUser: 3,
    lowStockThreshold: 25,
    products: [],
    stores: [], // Will be populated with Starbucks ID
    originalPrice: 6,
    flashSalePrice: 4,
    enabled: true,
    status: 'ending_soon',
    termsAndConditions: [
      'Valid on all Grande drinks',
      'In-store only',
      'One per customer per visit',
    ],
    minimumPurchase: 0,
    maximumDiscount: 2,
    viewCount: 3400,
    clickCount: 890,
    purchaseCount: 156,
    uniqueCustomers: 145,
    notifyOnStart: true,
    notifyOnEndingSoon: true,
    notifyOnLowStock: true,
    promoCode: 'COFFEE33',
  },

  // Flash Deal 4: Chicken Deal
  {
    title: 'Crispy Chicken Special',
    description: '8pc Bucket Meal - Finger-lickin good chicken at amazing flash sale prices!',
    image: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=400',
    banner: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800',
    discountPercentage: 33,
    priority: 7,
    startTime: new Date(),
    endTime: futureDate(3), // 3 hours from now
    maxQuantity: 75,
    soldQuantity: 23, // 23/75 claimed
    limitPerUser: 2,
    lowStockThreshold: 20,
    products: [],
    stores: [], // Will be populated with KFC ID
    originalPrice: 18,
    flashSalePrice: 12,
    enabled: true,
    status: 'active',
    termsAndConditions: [
      'Valid for delivery and dine-in',
      'Cannot combine with other offers',
      'Subject to availability',
    ],
    minimumPurchase: 0,
    maximumDiscount: 6,
    viewCount: 890,
    clickCount: 234,
    purchaseCount: 23,
    uniqueCustomers: 22,
    notifyOnStart: true,
    notifyOnEndingSoon: true,
    notifyOnLowStock: true,
    promoCode: 'CRISPY33',
  },
];

export default flashSaleSeeds;
