/**
 * Seed Food & Dining Stores Script
 * Creates comprehensive food & dining stores with proper images, tags, and cuisine data
 *
 * Run with: npx ts-node src/scripts/seedFoodDiningStores.ts
 * Clear existing: npx ts-node src/scripts/seedFoodDiningStores.ts --clear
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Import models
import { Category } from '../models/Category';
import { Store } from '../models/Store';

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/rez-app';

// Colors for console output
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
  info: (msg: string) => console.log(`${colors.cyan}ℹ ${msg}${colors.reset}`),
  success: (msg: string) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  header: (msg: string) => console.log(`\n${colors.bright}${colors.blue}━━━ ${msg} ━━━${colors.reset}\n`),
};

// Check for --clear flag
const shouldClear = process.argv.includes('--clear');

// ========================================
// FOOD & DINING STORES DATA
// ========================================

const foodDiningStores = [
  // Indian Restaurants
  {
    name: 'The Table',
    slug: 'the-table',
    description: 'Modern Indian cuisine with a contemporary twist',
    logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
    banner: ['https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800'],
    tags: ['indian', 'fine-dining', 'restaurant', 'dine-in'],
    location: {
      address: 'UB City, Vittal Mallya Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
    },
    contact: { phone: '+919876543210', email: 'info@thetable.in' },
    ratings: { average: 4.5, count: 1250, distribution: { 5: 700, 4: 350, 3: 150, 2: 35, 1: 15 } },
    offers: { cashback: 18, minOrderAmount: 500, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '12:00', close: '23:00' },
        tuesday: { open: '12:00', close: '23:00' },
        wednesday: { open: '12:00', close: '23:00' },
        thursday: { open: '12:00', close: '23:00' },
        friday: { open: '12:00', close: '23:30' },
        saturday: { open: '12:00', close: '23:30' },
        sunday: { open: '12:00', close: '23:00' },
      },
      deliveryTime: '30-45 mins',
      minimumOrder: 400,
      deliveryFee: 50,
      freeDeliveryAbove: 800,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: false, budgetFriendly: false, premium: true, organic: false, mall: true, cashStore: false },
    analytics: { totalOrders: 3200, totalRevenue: 2560000, avgOrderValue: 800, repeatCustomers: 1800, followersCount: 4500, views: 12000 },
  },
  {
    name: 'Olive Bar & Kitchen',
    slug: 'olive-bar-kitchen',
    description: 'Mediterranean-inspired cuisine in a vibrant setting',
    logo: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=200',
    banner: ['https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800'],
    tags: ['continental', 'mediterranean', 'fine-dining', 'restaurant', 'dine-in'],
    location: {
      address: 'Koramangala 5th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      coordinates: [77.6101, 12.9352],
    },
    contact: { phone: '+919876543211', email: 'hello@olivebar.com' },
    ratings: { average: 4.5, count: 980, distribution: { 5: 550, 4: 280, 3: 100, 2: 35, 1: 15 } },
    offers: { cashback: 20, minOrderAmount: 600, isPartner: true, partnerLevel: 'platinum' },
    operationalInfo: {
      hours: {
        monday: { open: '12:00', close: '23:30' },
        tuesday: { open: '12:00', close: '23:30' },
        wednesday: { open: '12:00', close: '23:30' },
        thursday: { open: '12:00', close: '23:30' },
        friday: { open: '12:00', close: '00:00' },
        saturday: { open: '12:00', close: '00:00' },
        sunday: { open: '12:00', close: '23:30' },
      },
      deliveryTime: '30-45 mins',
      minimumOrder: 500,
      deliveryFee: 60,
      freeDeliveryAbove: 1000,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet'],
    },
    deliveryCategories: { fastDelivery: false, budgetFriendly: false, premium: true, organic: false, mall: false, cashStore: false },
    analytics: { totalOrders: 2100, totalRevenue: 1890000, avgOrderValue: 900, repeatCustomers: 1200, followersCount: 3800, views: 9800 },
  },
  {
    name: 'Punjab Grill',
    slug: 'punjab-grill',
    description: 'Authentic North Indian cuisine - rich flavors and aromatic spices',
    logo: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=200',
    banner: ['https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800'],
    tags: ['indian', 'north indian', 'punjabi', 'restaurant', 'dine-in', 'delivery'],
    location: {
      address: 'Phoenix Marketcity, Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560048',
      coordinates: [77.7527, 12.9698],
    },
    contact: { phone: '+919876543212', email: 'info@punjabgrill.com' },
    ratings: { average: 4.4, count: 1450, distribution: { 5: 800, 4: 400, 3: 180, 2: 50, 1: 20 } },
    offers: { cashback: 15, minOrderAmount: 400, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '11:30', close: '23:00' },
        tuesday: { open: '11:30', close: '23:00' },
        wednesday: { open: '11:30', close: '23:00' },
        thursday: { open: '11:30', close: '23:00' },
        friday: { open: '11:30', close: '23:30' },
        saturday: { open: '11:30', close: '23:30' },
        sunday: { open: '11:30', close: '23:00' },
      },
      deliveryTime: '35-50 mins',
      minimumOrder: 350,
      deliveryFee: 40,
      freeDeliveryAbove: 700,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: false, budgetFriendly: false, premium: true, organic: false, mall: true, cashStore: false },
    analytics: { totalOrders: 4100, totalRevenue: 2870000, avgOrderValue: 700, repeatCustomers: 2400, followersCount: 5200, views: 15000 },
  },
  {
    name: 'Shanghai Express',
    slug: 'shanghai-express',
    description: 'Authentic Chinese cuisine - noodles, dim sum, and more',
    logo: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=200',
    banner: ['https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800'],
    tags: ['chinese', 'szechuan', 'restaurant', 'dine-in', 'delivery'],
    location: {
      address: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      coordinates: [77.6408, 12.9784],
    },
    contact: { phone: '+919876543213', email: 'contact@shanghaiexpress.in' },
    ratings: { average: 4.3, count: 890, distribution: { 5: 480, 4: 280, 3: 100, 2: 25, 1: 5 } },
    offers: { cashback: 12, minOrderAmount: 300, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '12:00', close: '23:00' },
        tuesday: { open: '12:00', close: '23:00' },
        wednesday: { open: '12:00', close: '23:00' },
        thursday: { open: '12:00', close: '23:00' },
        friday: { open: '12:00', close: '23:30' },
        saturday: { open: '12:00', close: '23:30' },
        sunday: { open: '12:00', close: '23:00' },
      },
      deliveryTime: '30-45 mins',
      minimumOrder: 250,
      deliveryFee: 35,
      freeDeliveryAbove: 500,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: true, premium: false, organic: false, mall: false, cashStore: false },
    analytics: { totalOrders: 5600, totalRevenue: 2240000, avgOrderValue: 400, repeatCustomers: 3200, followersCount: 6800, views: 18000 },
  },
  {
    name: "Domino's Pizza",
    slug: 'dominos-pizza-food',
    description: "World's favorite pizza delivery - fresh, hot, and fast",
    logo: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=200',
    banner: ['https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800'],
    tags: ['italian', 'pizza', 'fast-food', 'delivery', 'quick-commerce'],
    location: {
      address: 'Koramangala 5th Block',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560034',
      coordinates: [77.6101, 12.9352],
    },
    contact: { phone: '+919876543214', email: 'support@dominos.in' },
    ratings: { average: 4.4, count: 1250, distribution: { 5: 600, 4: 400, 3: 150, 2: 70, 1: 30 } },
    offers: { cashback: 15, minOrderAmount: 300, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '10:00', close: '23:00' },
        tuesday: { open: '10:00', close: '23:00' },
        wednesday: { open: '10:00', close: '23:00' },
        thursday: { open: '10:00', close: '23:00' },
        friday: { open: '10:00', close: '23:00' },
        saturday: { open: '10:00', close: '23:30' },
        sunday: { open: '10:00', close: '23:30' },
      },
      deliveryTime: '30-45 mins',
      minimumOrder: 200,
      deliveryFee: 30,
      freeDeliveryAbove: 500,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: false, premium: false, organic: false, mall: false, cashStore: false },
    analytics: { totalOrders: 5600, totalRevenue: 2800000, avgOrderValue: 500, repeatCustomers: 2100, followersCount: 3500, views: 10000 },
  },
  {
    name: 'Sagar Ratna',
    slug: 'sagar-ratna',
    description: 'Authentic South Indian vegetarian cuisine',
    logo: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=200',
    banner: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800'],
    tags: ['south indian', 'indian', 'vegetarian', 'dosa', 'idli', 'restaurant', 'dine-in', 'delivery'],
    location: {
      address: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
    },
    contact: { phone: '+919876543215', email: 'info@sagarratna.com' },
    ratings: { average: 4.2, count: 2100, distribution: { 5: 1100, 4: 650, 3: 250, 2: 80, 1: 20 } },
    offers: { cashback: 10, minOrderAmount: 200, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '07:00', close: '23:00' },
        tuesday: { open: '07:00', close: '23:00' },
        wednesday: { open: '07:00', close: '23:00' },
        thursday: { open: '07:00', close: '23:00' },
        friday: { open: '07:00', close: '23:00' },
        saturday: { open: '07:00', close: '23:00' },
        sunday: { open: '07:00', close: '23:00' },
      },
      deliveryTime: '25-40 mins',
      minimumOrder: 150,
      deliveryFee: 25,
      freeDeliveryAbove: 400,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: true, premium: false, organic: false, mall: false, cashStore: false },
    analytics: { totalOrders: 8900, totalRevenue: 2670000, avgOrderValue: 300, repeatCustomers: 5200, followersCount: 9800, views: 25000 },
  },
  {
    name: 'Thai Basil',
    slug: 'thai-basil',
    description: 'Authentic Thai flavors - pad thai, green curry, and more',
    logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
    banner: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800'],
    tags: ['thai', 'asian', 'restaurant', 'dine-in', 'delivery'],
    location: {
      address: 'Indiranagar',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560038',
      coordinates: [77.6408, 12.9784],
    },
    contact: { phone: '+919876543216', email: 'hello@thaibasil.in' },
    ratings: { average: 4.5, count: 720, distribution: { 5: 420, 4: 220, 3: 60, 2: 15, 1: 5 } },
    offers: { cashback: 16, minOrderAmount: 400, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '12:00', close: '23:00' },
        tuesday: { open: '12:00', close: '23:00' },
        wednesday: { open: '12:00', close: '23:00' },
        thursday: { open: '12:00', close: '23:00' },
        friday: { open: '12:00', close: '23:30' },
        saturday: { open: '12:00', close: '23:30' },
        sunday: { open: '12:00', close: '23:00' },
      },
      deliveryTime: '35-50 mins',
      minimumOrder: 350,
      deliveryFee: 45,
      freeDeliveryAbove: 700,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet'],
    },
    deliveryCategories: { fastDelivery: false, budgetFriendly: false, premium: true, organic: false, mall: false, cashStore: false },
    analytics: { totalOrders: 1800, totalRevenue: 1080000, avgOrderValue: 600, repeatCustomers: 950, followersCount: 2100, views: 6800 },
  },
  {
    name: 'Sushi Zen',
    slug: 'sushi-zen',
    description: 'Authentic Japanese sushi and sashimi',
    logo: 'https://images.unsplash.com/photo-1579584425555-c3b17fa6c098?w=200',
    banner: ['https://images.unsplash.com/photo-1579584425555-c3b17fa6c098?w=800'],
    tags: ['japanese', 'sushi', 'fine-dining', 'restaurant', 'dine-in'],
    location: {
      address: 'UB City, Vittal Mallya Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
    },
    contact: { phone: '+919876543217', email: 'reservations@sushizen.in' },
    ratings: { average: 4.6, count: 560, distribution: { 5: 380, 4: 140, 3: 30, 2: 8, 1: 2 } },
    offers: { cashback: 22, minOrderAmount: 800, isPartner: true, partnerLevel: 'platinum' },
    operationalInfo: {
      hours: {
        monday: { open: '12:00', close: '23:00' },
        tuesday: { open: '12:00', close: '23:00' },
        wednesday: { open: '12:00', close: '23:00' },
        thursday: { open: '12:00', close: '23:00' },
        friday: { open: '12:00', close: '23:30' },
        saturday: { open: '12:00', close: '23:30' },
        sunday: { open: '12:00', close: '23:00' },
      },
      deliveryTime: '40-60 mins',
      minimumOrder: 700,
      deliveryFee: 80,
      freeDeliveryAbove: 1200,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet'],
    },
    deliveryCategories: { fastDelivery: false, budgetFriendly: false, premium: true, organic: false, mall: true, cashStore: false },
    analytics: { totalOrders: 950, totalRevenue: 855000, avgOrderValue: 900, repeatCustomers: 480, followersCount: 1200, views: 4200 },
  },
  {
    name: 'Taco Bell',
    slug: 'taco-bell-food',
    description: 'Mexican-inspired fast food - tacos, burritos, and more',
    logo: 'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=200',
    banner: ['https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=800'],
    tags: ['mexican', 'tex-mex', 'fast-food', 'delivery', 'quick-commerce'],
    location: {
      address: 'Phoenix Marketcity, Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560048',
      coordinates: [77.7527, 12.9698],
    },
    contact: { phone: '+919876543218', email: 'feedback@tacobell.in' },
    ratings: { average: 4.1, count: 1340, distribution: { 5: 670, 4: 420, 3: 180, 2: 55, 1: 15 } },
    offers: { cashback: 12, minOrderAmount: 250, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '23:30' },
        saturday: { open: '11:00', close: '23:30' },
        sunday: { open: '11:00', close: '23:00' },
      },
      deliveryTime: '25-40 mins',
      minimumOrder: 200,
      deliveryFee: 30,
      freeDeliveryAbove: 450,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: true, premium: false, organic: false, mall: true, cashStore: false },
    analytics: { totalOrders: 4200, totalRevenue: 1680000, avgOrderValue: 400, repeatCustomers: 2400, followersCount: 5100, views: 13500 },
  },
  {
    name: 'KFC',
    slug: 'kfc-food',
    description: "Finger lickin' good chicken - crispy, juicy, and delicious",
    logo: 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=200',
    banner: ['https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=800'],
    tags: ['chicken', 'fast-food', 'fried-chicken', 'delivery', 'quick-commerce'],
    location: {
      address: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      coordinates: [77.5946, 12.9716],
    },
    contact: { phone: '+919876543219', email: 'support@kfc.in' },
    ratings: { average: 4.5, count: 2340, distribution: { 5: 1200, 4: 700, 3: 300, 2: 100, 1: 40 } },
    offers: { cashback: 18, minOrderAmount: 300, isPartner: true, partnerLevel: 'gold' },
    operationalInfo: {
      hours: {
        monday: { open: '11:00', close: '23:00' },
        tuesday: { open: '11:00', close: '23:00' },
        wednesday: { open: '11:00', close: '23:00' },
        thursday: { open: '11:00', close: '23:00' },
        friday: { open: '11:00', close: '23:30' },
        saturday: { open: '11:00', close: '23:30' },
        sunday: { open: '11:00', close: '23:00' },
      },
      deliveryTime: '30-45 mins',
      minimumOrder: 250,
      deliveryFee: 35,
      freeDeliveryAbove: 500,
      acceptsWalletPayment: true,
      paymentMethods: ['upi', 'card', 'wallet', 'cash'],
    },
    deliveryCategories: { fastDelivery: true, budgetFriendly: false, premium: false, organic: false, mall: false, cashStore: false },
    analytics: { totalOrders: 8900, totalRevenue: 4450000, avgOrderValue: 500, repeatCustomers: 4200, followersCount: 5600, views: 15000 },
  },
];

// ========================================
// MAIN FUNCTION
// ========================================

async function main() {
  const startTime = Date.now();

  try {
    log.header('Food & Dining Stores Seeder');
    log.info(`Mode: ${shouldClear ? 'Clear & Seed' : 'Seed Only'}`);

    // Connect to database
    log.info(`Connecting to MongoDB...`);
    await mongoose.connect(MONGO_URI);
    log.success('Connected to MongoDB');

    // Find or create Food & Dining category
    log.info('Finding Food & Dining category...');
    let foodDiningCategory = await Category.findOne({ slug: 'food-dining' });

    if (!foodDiningCategory) {
      log.warning('Food & Dining category not found. Creating...');
      foodDiningCategory = await Category.create({
        name: 'Food & Dining',
        slug: 'food-dining',
        description: 'Restaurants, cafes, and food delivery',
        icon: '🍽️',
        image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
        type: 'going_out',
        isActive: true,
        sortOrder: 1,
        metadata: { color: '#FF6B35', tags: ['food', 'dining', 'restaurant'], featured: true },
        productCount: 0,
        storeCount: 0,
        maxCashback: 25,
      });
      log.success(`Created Food & Dining category (${foodDiningCategory._id})`);
    } else {
      log.success(`Found Food & Dining category (${foodDiningCategory._id})`);
    }

    // Clear existing stores if --clear flag
    if (shouldClear) {
      log.info('Clearing existing Food & Dining stores...');
      const deletedCount = await Store.deleteMany({ category: foodDiningCategory._id });
      log.success(`Cleared ${deletedCount.deletedCount} existing stores`);
    }

    // Seed stores
    log.header('Seeding Stores');
    const createdStores = [];
    let skippedCount = 0;

    for (const storeData of foodDiningStores) {
      // Check if store already exists
      const existingStore = await Store.findOne({ slug: storeData.slug });
      if (existingStore && !shouldClear) {
        log.warning(`Store "${storeData.name}" already exists, skipping...`);
        skippedCount++;
        continue;
      }

      // Create store with category reference
      const store = await Store.create({
        ...storeData,
        category: foodDiningCategory._id,
        isActive: true,
        isVerified: true,
        isFeatured: storeData.tags?.includes('fine-dining') || false,
      });

      createdStores.push(store);
      log.success(`Created store: ${storeData.name} (${storeData.tags?.join(', ')})`);
    }

    // Update category store count
    const totalStores = await Store.countDocuments({ category: foodDiningCategory._id });
    await Category.findByIdAndUpdate(foodDiningCategory._id, {
      storeCount: totalStores,
    });
    log.info(`Updated category store count to ${totalStores}`);

    // Summary
    log.header('Seeding Complete');
    console.log('\nSummary:');
    console.log('┌────────────────────────────┬───────┐');
    console.log('│ Metric                    │ Count │');
    console.log('├────────────────────────────┼───────┤');
    console.log(`│ Stores Created             │ ${String(createdStores.length).padStart(5)} │`);
    if (skippedCount > 0) {
      console.log(`│ Stores Skipped             │ ${String(skippedCount).padStart(5)} │`);
    }
    console.log(`│ Total Stores in Category   │ ${String(totalStores).padStart(5)} │`);
    console.log('└────────────────────────────┴───────┘');

    // Cuisine breakdown
    const cuisineBreakdown: Record<string, number> = {};
    createdStores.forEach(store => {
      const tags = (store.tags || []).map((t: string) => t.toLowerCase());
      if (tags.includes('indian')) cuisineBreakdown['Indian'] = (cuisineBreakdown['Indian'] || 0) + 1;
      if (tags.includes('chinese')) cuisineBreakdown['Chinese'] = (cuisineBreakdown['Chinese'] || 0) + 1;
      if (tags.includes('italian') || tags.includes('pizza')) cuisineBreakdown['Italian'] = (cuisineBreakdown['Italian'] || 0) + 1;
      if (tags.includes('thai')) cuisineBreakdown['Thai'] = (cuisineBreakdown['Thai'] || 0) + 1;
      if (tags.includes('mexican')) cuisineBreakdown['Mexican'] = (cuisineBreakdown['Mexican'] || 0) + 1;
      if (tags.includes('south indian')) cuisineBreakdown['South Indian'] = (cuisineBreakdown['South Indian'] || 0) + 1;
      if (tags.includes('japanese') || tags.includes('sushi')) cuisineBreakdown['Japanese'] = (cuisineBreakdown['Japanese'] || 0) + 1;
    });

    if (Object.keys(cuisineBreakdown).length > 0) {
      console.log('\nCuisine Breakdown:');
      Object.entries(cuisineBreakdown).forEach(([cuisine, count]) => {
        console.log(`  ${cuisine.padEnd(20)} ${count} stores`);
      });
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.success(`\nTotal stores seeded: ${createdStores.length}`);
    log.success(`Duration: ${duration}s`);
    log.success('\nFood & Dining stores are now ready for production!');

  } catch (error: any) {
    log.error(`Seeding failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.success('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
